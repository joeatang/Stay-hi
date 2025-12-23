/**
 * 🎨 Hi Shareable Card Generator - Tesla-Grade
 * Purpose: Generate beautiful branded share cards from feed items
 * Features: Canvas-based rendering, native share API, viral growth
 * Author: Stay Hi Team
 * Date: 2024-12-23
 */

class HiShareableCard {
  constructor() {
    this.brandColors = {
      // Core Hi Brand Palette
      primary: '#FFD166',      // Warm amber
      secondary: '#FF7A18',    // Vivid tangerine
      accent: '#4ECDC4',       // Teal accent
      background: '#0F1022',   // Deep space
      backgroundLight: '#1A1D3A',
      text: '#FFFFFF',
      textMuted: 'rgba(255, 255, 255, 0.7)',
      
      // Hi Scale Badge Colors (matching our implementation)
      opportunity: '#A8DADC',  // Blue-green (1-2)
      neutral: '#888888',      // Gray (3)
      hiEnergy: '#FFD166',     // Orange (4)
      highlyInspired: '#F4A261' // Deep orange (5)
    };
    
    // Card dimensions (Instagram Story optimized: 9:16)
    this.cardWidth = 1080;
    this.cardHeight = 1920;
    
    console.log('✅ HiShareableCard initialized');
  }
  
  /**
   * Generate shareable card from share data
   * @param {Object} shareData - Share object from feed
   * @returns {Promise<Blob>} - Card image as blob
   */
  async generateCard(shareData) {
    const canvas = document.createElement('canvas');
    canvas.width = this.cardWidth;
    canvas.height = this.cardHeight;
    const ctx = canvas.getContext('2d');
    
    // Enable antialiasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw card layers
    await this.drawBackground(ctx);
    await this.drawContent(ctx, shareData);
    await this.drawBadges(ctx, shareData);
    await this.drawUserInfo(ctx, shareData);
    await this.drawBranding(ctx);
    
    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  }
  
  /**
   * Draw gradient background
   */
  async drawBackground(ctx) {
    const { cardWidth: width, cardHeight: height } = this;
    
    // Create Hi-branded gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1A1D3A');    // Deep purple-blue
    gradient.addColorStop(0.3, '#252B52');  // Mid blue
    gradient.addColorStop(0.7, '#2D1E4F');  // Purple
    gradient.addColorStop(1, '#FF7A18');    // Hi orange glow at bottom
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add subtle texture overlay
    this.addTexture(ctx);
  }
  
  /**
   * Add subtle noise texture for premium feel
   */
  addTexture(ctx) {
    const { cardWidth: width, cardHeight: height } = this;
    ctx.globalAlpha = 0.03;
    
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(x, y, size, size);
    }
    
    ctx.globalAlpha = 1.0;
  }
  
  /**
   * Draw main content (share text) - GOLD STANDARD: Smart sizing + fixed zones
   */
  async drawContent(ctx, shareData) {
    const { cardWidth: width } = this;
    const text = shareData.text || shareData.content || '';
    
    // 🎯 FIXED LAYOUT ZONES (prevent overlap)
    const contentZone = {
      startY: 400,
      endY: 1000,  // Stop before badges at Y=1100
      maxHeight: 600,
      padding: 80
    };
    
    const maxWidth = width - (contentZone.padding * 2);
    
    // 🧠 SMART FONT SIZING: Adjust based on content length
    const { fontSize, lineHeight, maxLines } = this.calculateTextSize(text, contentZone.maxHeight);
    
    // Draw content with intelligent wrapping and truncation
    ctx.fillStyle = this.brandColors.text;
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    
    const lines = this.wrapText(ctx, text, maxWidth);
    const truncatedLines = lines.slice(0, maxLines);
    
    // Add ellipsis if truncated
    if (lines.length > maxLines) {
      const lastLine = truncatedLines[truncatedLines.length - 1];
      truncatedLines[truncatedLines.length - 1] = lastLine.substring(0, lastLine.length - 3) + '...';
    }
    
    // Center text vertically in content zone
    const totalTextHeight = truncatedLines.length * lineHeight;
    let currentY = contentZone.startY + (contentZone.maxHeight - totalTextHeight) / 2;
    
    truncatedLines.forEach((line) => {
      ctx.fillText(line, width / 2, currentY);
      currentY += lineHeight;
    });
    
    return currentY;
  }
  
  /**
   * 🧠 Calculate optimal font size based on text length
   * Longer text = smaller font (but never below minimum for readability)
   */
  calculateTextSize(text, maxHeight) {
    const textLength = text.length;
    
    // Text length ranges and corresponding font sizes
    if (textLength <= 100) {
      // Short text: Large, bold
      return { fontSize: 56, lineHeight: 72, maxLines: 8 };
    } else if (textLength <= 200) {
      // Medium text: Balanced
      return { fontSize: 48, lineHeight: 64, maxLines: 9 };
    } else if (textLength <= 350) {
      // Long text: Smaller but readable
      return { fontSize: 42, lineHeight: 56, maxLines: 10 };
    } else {
      // Very long text: Minimum readable size
      return { fontSize: 38, lineHeight: 52, maxLines: 11 };
    }
  }
  
  /**
   * Wrap text to fit width
   */
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach((word) => {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine.trim());
    }
    
    return lines;
  }
  
  /**
   * Draw Hi Scale badge and emotional journey
   */
  async drawBadges(ctx, shareData) {
    const { cardWidth: width } = this;
    const badgeY = 1100;
    
    // Hi Scale Badge
    if (shareData.hi_intensity && shareData.hi_intensity >= 1 && shareData.hi_intensity <= 5) {
      const intensityBadge = this.getIntensityBadge(shareData.hi_intensity);
      this.drawBadge(ctx, width / 2 - 220, badgeY, intensityBadge);
    }
    
    // 🎯 CRITICAL FIX: Use actual data (camelCase from feed processing)
    // Feed processes: share.current_emoji → processed.currentEmoji
    const currentEmoji = shareData.currentEmoji || shareData.current_emoji || '👋';
    const desiredEmoji = shareData.desiredEmoji || shareData.desired_emoji || '✨';
    const emotionalBadge = {
      emoji: `${currentEmoji} → ${desiredEmoji}`,
      label: 'Emotional Journey',
      color: this.brandColors.accent
    };
    this.drawBadge(ctx, width / 2 + 220, badgeY, emotionalBadge);
  }
  
  /**
   * Get Hi Scale badge configuration
   */
  getIntensityBadge(intensity) {
    const badges = {
      1: { emoji: '🌱', label: 'Opportunity', color: this.brandColors.opportunity },
      2: { emoji: '🌱', label: 'Opportunity', color: this.brandColors.opportunity },
      3: { emoji: '⚖️', label: 'Neutral', color: this.brandColors.neutral },
      4: { emoji: '⚡', label: 'Hi Energy', color: this.brandColors.hiEnergy },
      5: { emoji: '⚡', label: 'Highly Inspired', color: this.brandColors.highlyInspired }
    };
    return badges[intensity];
  }
  
  /**
   * Draw individual badge - LARGE PILLS to ensure content fits
   */
  drawBadge(ctx, x, y, badge) {
    // DRAMATICALLY LARGER container to fit emojis and text comfortably
    const containerWidth = 450;
    const containerHeight = 140;
    const borderRadius = 28;
    
    ctx.save();
    
    // Badge background (large fixed size)
    ctx.fillStyle = `${badge.color}33`; // 20% opacity
    ctx.beginPath();
    ctx.roundRect(x - containerWidth/2, y - containerHeight/2, containerWidth, containerHeight, borderRadius);
    ctx.fill();
    
    // Badge border
    ctx.strokeStyle = `${badge.color}66`; // 40% opacity
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Clip to badge container to prevent bleeding
    ctx.clip();
    
    // Emoji (comfortable size, centered in container)
    ctx.font = '52px -apple-system';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = badge.color;
    ctx.fillText(badge.emoji, x, y - 22);
    
    // Label (readable size, centered, with plenty of room)
    ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = badge.color;
    
    // Truncate text if needed (but larger container gives more room)
    let labelText = badge.label;
    const maxLabelWidth = containerWidth - 80; // Generous padding
    let textWidth = ctx.measureText(labelText).width;
    
    if (textWidth > maxLabelWidth) {
      // Truncate with ellipsis
      while (textWidth > maxLabelWidth && labelText.length > 3) {
        labelText = labelText.substring(0, labelText.length - 1);
        textWidth = ctx.measureText(labelText + '...').width;
      }
      labelText = labelText + '...';
    }
    
    ctx.fillText(labelText, x, y + 38);
    
    ctx.restore();
  }
  
  /**
   * Draw user info
   */
  async drawUserInfo(ctx, shareData) {
    const { cardWidth: width } = this;
    const userY = 280;
    
    // Username
    const username = shareData.username || shareData.display_name || 'Anonymous';
    ctx.font = '600 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = this.brandColors.primary;
    ctx.textAlign = 'center';
    ctx.fillText(`@${username}`, width / 2, userY);
    
    // Timestamp (absolute date/time for sharing)
    if (shareData.created_at) {
      const formattedDate = this.formatDateTime(shareData.created_at);
      ctx.font = '400 32px -apple-system';
      ctx.fillStyle = this.brandColors.textMuted;
      ctx.fillText(formattedDate, width / 2, userY + 50);
    }
  }
  
  /**
   * Format date/time for shareable cards - USES DEVICE LOCAL TIMEZONE
   */
  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    // Use device's local timezone and locale
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    // Let browser auto-detect user's locale and timezone
    return date.toLocaleString(undefined, options);
  }
  
  /**
   * Draw Stay Hi branding - GOLD STANDARD: Clear value prop for external viewers
   */
  async drawBranding(ctx) {
    const { cardWidth: width, cardHeight: height } = this;
    const brandingY = height - 240;
    
    // "Stay Hi" logo text (no logo icon - cleaner)
    ctx.font = '700 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = this.brandColors.primary;
    ctx.textAlign = 'center';
    ctx.fillText('Stay Hi', width / 2, brandingY);
    
    // Clear, concise tagline (what the app does)
    ctx.font = '500 34px -apple-system';
    ctx.fillStyle = this.brandColors.textMuted;
    ctx.fillText('Track how you feel & inspire others', width / 2, brandingY + 50);
    
    // Production URL
    ctx.font = '600 40px -apple-system';
    ctx.fillStyle = this.brandColors.secondary;
    ctx.fillText('stay-hi.vercel.app', width / 2, brandingY + 100);
  }
  
  /**
   * Open share modal with preview and options
   */
  async shareCard(shareData) {
    try {
      // Generate card
      const blob = await this.generateCard(shareData);
      if (!blob) {
        console.error('❌ Card generation returned empty blob');
        return;
      }
      
      const url = URL.createObjectURL(blob);
      
      // Create modal
      this.showShareModal(url, blob, shareData);
      
    } catch (error) {
      console.error('❌ Card generation failed:', error);
      // Silent fail with console log only
    }
  }
  
  /**
   * Show share modal with preview
   */
  showShareModal(imageUrl, blob, shareData) {
    const modal = document.createElement('div');
    modal.className = 'hi-share-card-modal';
    modal.innerHTML = `
      <div class="hi-share-card-backdrop"></div>
      <div class="hi-share-card-content">
        <button class="hi-share-card-close" aria-label="Close">×</button>
        
        <h2 class="hi-share-card-title">Share Your Hi Moment ✨</h2>
        
        <div class="hi-share-card-preview">
          <img src="${imageUrl}" alt="Share card preview" />
        </div>
        
        <div class="hi-share-card-actions">
          ${navigator.share ? `
          <button class="hi-share-card-btn primary" data-action="share">
            <span>📤</span>
            Share (Save or Send)
          </button>
          ` : `
          <button class="hi-share-card-btn primary" data-action="download">
            <span>💾</span>
            Download Image
          </button>
          `}
          <button class="hi-share-card-btn secondary" data-action="copy">
            <span>📋</span>
            Copy Text
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.addModalStyles();
    
    // Animate in
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.querySelector('.hi-share-card-content').style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // Event listeners
    this.attachModalListeners(modal, imageUrl, blob, shareData);
  }
  
  /**
   * Attach modal event listeners
   */
  attachModalListeners(modal, imageUrl, blob, shareData) {
    // Close button
    modal.querySelector('.hi-share-card-close').addEventListener('click', () => {
      this.closeModal(modal, imageUrl);
    });
    
    // Backdrop click
    modal.querySelector('.hi-share-card-backdrop').addEventListener('click', () => {
      this.closeModal(modal, imageUrl);
    });
    
    // Share button (mobile only)
    const shareBtn = modal.querySelector('[data-action="share"]');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        await this.handleNativeShare(blob, shareData);
      });
    }
    
    // Download button (desktop only)
    const downloadBtn = modal.querySelector('[data-action="download"]');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.handleDownload(imageUrl, shareData);
      });
    }
    
    // Copy text button (always present)
    const copyBtn = modal.querySelector('[data-action="copy"]');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        await this.handleCopyText(shareData);
      });
    }
    
    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal(modal, imageUrl);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  /**
   * Handle native share (mobile)
   */
  async handleNativeShare(blob, shareData) {
    if (!navigator.share) {
      alert('Sharing not supported on this device. Try downloading instead!');
      return;
    }
    
    try {
      const file = new File([blob], 'hi-moment.png', { type: 'image/png' });
      const shareText = `${shareData.text}\n\nShared from Stay Hi ✨\nstay-hi.app`;
      
      await navigator.share({
        title: 'My Hi Moment',
        text: shareText,
        files: [file]
      });
      
      console.log('✅ Share successful');
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Share failed:', error);
      }
    }
  }
  
  /**
   * Handle download
   */
  handleDownload(imageUrl, shareData) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `hi-moment-${Date.now()}.png`;
    link.click();
    
    console.log('✅ Download started');
  }
  
  /**
   * Handle copy text
   */
  async handleCopyText(shareData) {
    const text = `${shareData.text}\n\nShared from Stay Hi ✨\nstay-hi.app`;
    
    try {
      await navigator.clipboard.writeText(text);
      
      // Show success feedback
      const btn = document.querySelector('[data-action="copy"]');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<span>✓</span> Copied!';
      btn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
      }, 2000);
      
    } catch (error) {
      console.error('❌ Copy failed:', error);
      alert('Failed to copy text');
    }
  }
  
  /**
   * Close modal
   */
  closeModal(modal, imageUrl) {
    modal.style.opacity = '0';
    modal.querySelector('.hi-share-card-content').style.transform = 'translate(-50%, -50%) scale(0.95)';
    
    setTimeout(() => {
      modal.remove();
      URL.revokeObjectURL(imageUrl);
    }, 300);
  }
  
  /**
   * Add modal styles
   */
  addModalStyles() {
    if (document.getElementById('hi-share-card-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'hi-share-card-styles';
    style.textContent = `
      .hi-share-card-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .hi-share-card-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
      }
      
      .hi-share-card-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        background: linear-gradient(135deg, #1A1D3A, #252B52);
        border-radius: 24px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        transition: transform 0.3s ease;
      }
      
      .hi-share-card-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 28px;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .hi-share-card-close:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: rotate(90deg);
      }
      
      .hi-share-card-title {
        color: #FFD166;
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 24px 0;
        text-align: center;
      }
      
      .hi-share-card-preview {
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 24px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }
      
      .hi-share-card-preview img {
        width: 100%;
        height: auto;
        display: block;
      }
      
      .hi-share-card-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .hi-share-card-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px 24px;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .hi-share-card-btn.primary {
        background: linear-gradient(135deg, #FF7A18, #FFD166);
        color: white;
      }
      
      .hi-share-card-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(255, 122, 24, 0.3);
      }
      
      .hi-share-card-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
      }
      
      .hi-share-card-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .hi-share-card-btn span {
        font-size: 20px;
      }
      
      @media (max-width: 600px) {
        .hi-share-card-content {
          padding: 24px;
          width: 95%;
        }
        
        .hi-share-card-title {
          font-size: 20px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}

// Initialize global instance
window.HiShareableCard = new HiShareableCard();

console.log('✅ HiShareableCard component loaded');
