/**
 * 📈 EmotionalJourneyChart.js — Line chart showing Hi Scale over time
 * 
 * **Architecture:**
 * - Canvas rendering (lightweight, no Chart.js dependency)
 * - Respects tier limits (Bronze: 7 days, Silver: 30 days, Gold: unlimited)
 * - Touch-friendly (mobile gestures for tooltips)
 * - Matches existing design system
 * 
 * **Data Flow:**
 * 1. Query: get_user_emotional_journey(days) RPC
 * 2. Parse: [{snapshot_date, hi_scale_rating, activity_count}, ...]
 * 3. Render: Line chart with gradient fill
 * 4. Tooltip: Show date + rating on hover/tap
 * 
 * @version 2.0.0
 * @date 2026-01-18
 */

class EmotionalJourneyChart {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      days: 7,
      tier: 'bronze',
      showEmotions: false,
      ...options
    };
    
    this.data = [];
    this.canvas = null;
    this.ctx = null;
    this.tooltip = null;
    this.hoveredPoint = null;
  }

  /**
   * Render the chart
   * @param {Array} data - Array of {snapshot_date, hi_scale_rating, activity_count}
   */
  async render(data) {
    if (!this.container) {
      console.error('[EmotionalJourneyChart] Container not found');
      return;
    }

    this.data = data || [];

    // Create canvas if needed
    if (!this.canvas) {
      this.createCanvas();
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.data.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Draw chart
    this.drawGrid();
    this.drawLine();
    this.drawPoints();
    this.drawAxes();
  }

  /**
   * Create canvas element
   * @private
   */
  createCanvas() {
    // Remove existing canvas
    const existing = this.container.querySelector('canvas');
    if (existing) existing.remove();

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '300px';
    this.canvas.style.cursor = 'crosshair';
    
    // Set actual size (2x for retina)
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * 2;
    this.canvas.height = 600; // 300px * 2
    
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(2, 2);
    
    this.container.appendChild(this.canvas);

    // Create tooltip
    this.createTooltip();

    // Add event listeners
    this.canvas.addEventListener('mousemove', (e) => this.handleHover(e));
    this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
    this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
  }

  /**
   * Create tooltip element
   * @private
   */
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'chart-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      background: rgba(15, 16, 36, 0.95);
      border: 1px solid rgba(255, 209, 102, 0.3);
      border-radius: 8px;
      padding: 8px 12px;
      color: #e8ebff;
      font-size: 0.85rem;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 1000;
      backdrop-filter: blur(10px);
    `;
    this.container.style.position = 'relative';
    this.container.appendChild(this.tooltip);
  }

  /**
   * Draw grid lines
   * @private
   */
  drawGrid() {
    const rect = this.container.getBoundingClientRect();
    const padding = 40;
    const width = rect.width - padding * 2;
    const height = 300 - padding * 2;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    // Horizontal grid lines (5 levels: 1, 2, 3, 4, 5)
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height / 4) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(padding + width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw line
   * @private
   */
  drawLine() {
    if (this.data.length < 2) return;

    const rect = this.container.getBoundingClientRect();
    const padding = 40;
    const width = rect.width - padding * 2;
    const height = 300 - padding * 2;

    // Calculate points
    const points = this.data.map((d, i) => {
      const x = padding + (width / (this.data.length - 1)) * i;
      const y = padding + height - ((d.hi_scale_rating - 1) / 4) * height;
      return { x, y, data: d };
    });

    // Draw gradient fill
    const gradient = this.ctx.createLinearGradient(0, padding, 0, padding + height);
    gradient.addColorStop(0, 'rgba(78, 205, 196, 0.3)');
    gradient.addColorStop(1, 'rgba(78, 205, 196, 0.05)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, padding + height);
    points.forEach((p, i) => {
      if (i === 0) {
        this.ctx.lineTo(p.x, p.y);
      } else {
        // Smooth curve
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        this.ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + p.y) / 2);
        this.ctx.quadraticCurveTo(cpx, (prev.y + p.y) / 2, p.x, p.y);
      }
    });
    this.ctx.lineTo(points[points.length - 1].x, padding + height);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw line
    this.ctx.strokeStyle = '#4ECDC4';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) {
        this.ctx.moveTo(p.x, p.y);
      } else {
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        this.ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + p.y) / 2);
        this.ctx.quadraticCurveTo(cpx, (prev.y + p.y) / 2, p.x, p.y);
      }
    });
    this.ctx.stroke();

    this.points = points;
  }

  /**
   * Draw data points
   * @private
   */
  drawPoints() {
    if (!this.points) return;

    this.points.forEach((p, i) => {
      const isHovered = this.hoveredPoint === i;
      const radius = isHovered ? 6 : 4;

      // Outer circle (glow)
      if (isHovered) {
        this.ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Inner circle
      this.ctx.fillStyle = '#4ECDC4';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = '#0f1024';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });
  }

  /**
   * Draw axes
   * @private
   */
  drawAxes() {
    const rect = this.container.getBoundingClientRect();
    const padding = 40;
    const height = 300 - padding * 2;

    this.ctx.fillStyle = 'rgba(232, 235, 255, 0.6)';
    this.ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'right';

    // Y-axis labels (1-5)
    for (let i = 1; i <= 5; i++) {
      const y = padding + height - ((i - 1) / 4) * height;
      this.ctx.fillText(i, padding - 10, y + 4);
    }

    // X-axis labels (dates)
    this.ctx.textAlign = 'center';
    if (this.points) {
      this.points.forEach((p, i) => {
        const date = new Date(p.data.snapshot_date);
        const label = this.options.days > 14
          ? `${date.getMonth() + 1}/${date.getDate()}`
          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        
        // Only show every Nth label to avoid crowding
        const step = Math.ceil(this.points.length / 6);
        if (i % step === 0 || i === this.points.length - 1) {
          this.ctx.fillText(label, p.x, 300 - 15);
        }
      });
    }
  }

  /**
   * Handle hover
   * @private
   */
  handleHover(e) {
    if (!this.points) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * 2;
    const y = (e.clientY - rect.top) * 2;

    // Find closest point
    let closest = null;
    let minDist = Infinity;

    this.points.forEach((p, i) => {
      const dist = Math.sqrt(Math.pow(x - p.x * 2, 2) + Math.pow(y - p.y * 2, 2));
      if (dist < minDist && dist < 40) {
        minDist = dist;
        closest = i;
      }
    });

    if (closest !== null && closest !== this.hoveredPoint) {
      this.hoveredPoint = closest;
      this.showTooltip(this.points[closest], e.clientX, e.clientY);
      this.render(this.data);
    } else if (closest === null && this.hoveredPoint !== null) {
      this.hoveredPoint = null;
      this.hideTooltip();
      this.render(this.data);
    }
  }

  /**
   * Handle touch
   * @private
   */
  handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleHover({ clientX: touch.clientX, clientY: touch.clientY });
  }

  /**
   * Show tooltip
   * @private
   */
  showTooltip(point, x, y) {
    const date = new Date(point.data.snapshot_date);
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });

    this.tooltip.innerHTML = `
      <div style="font-weight: 700; color: #4ECDC4; margin-bottom: 4px;">
        ${point.data.hi_scale_rating}/5
      </div>
      <div style="font-size: 0.8rem; opacity: 0.8;">
        ${dateStr}
      </div>
      ${point.data.activity_count ? `
        <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 4px;">
          ${point.data.activity_count} activities
        </div>
      ` : ''}
    `;

    this.tooltip.style.left = `${x + 10}px`;
    this.tooltip.style.top = `${y - 60}px`;
    this.tooltip.style.opacity = '1';
  }

  /**
   * Hide tooltip
   * @private
   */
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
    }
  }

  /**
   * Render empty state
   * @private
   */
  renderEmptyState() {
    const rect = this.container.getBoundingClientRect();
    this.ctx.fillStyle = 'rgba(232, 235, 255, 0.5)';
    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'No data yet. Share your Hi Scale ratings to see your journey!',
      rect.width / 2,
      150
    );
  }
}

// Export for use in HiAnalytics
window.EmotionalJourneyChart = EmotionalJourneyChart;
console.log('✅ EmotionalJourneyChart.js loaded');
