/* ===================================================================
   📅 HI CALENDAR COMPONENT
   Tesla-grade bottom sheet calendar with activity tracking
   Displays monthly view with Hi moments, streaks, and milestones
=================================================================== */

export class HiCalendar {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = null;
    this.activityData = {};
    this.isOpen = false;
    this._isReady = false; // A2: Hi System readiness tracking
  }

  // Initialize component (Hi System Pattern)
  async init() {
    // A3: Single-init guard (Hi System Standard)
    if (this._isReady) {
      console.log('✅ HiCalendar already initialized, skipping');
      return;
    }

    try {
      // Wait for HiFlags system if available (Hi System Pattern)
      if (window.HiFlags?.waitUntilReady) {
        await window.HiFlags.waitUntilReady();
      }

      this.render();
      this.attachEventListeners();
      this.loadMonthData();
      
      // Expose to global for header button (Hi System Pattern)
      window.openHiCalendar = () => this.open();

      this._isReady = true;
      console.log('✅ HiCalendar initialized (Tesla-grade Hi System)');

    } catch (error) {
      console.error('❌ HiCalendar initialization failed:', error);
      this._isReady = false;
    }
  }

  // A2: Standardized isReady method (Hi System Interface)
  isReady() {
    return this._isReady;
  }

  // Render calendar HTML
  render() {
    const container = document.createElement('div');
    container.className = 'hi-calendar-container';
    container.innerHTML = `
      <div class="hi-calendar-overlay" id="hi-calendar-overlay">
        <div class="hi-calendar-sheet">
          <div class="hi-calendar-handle"></div>
          
          <div class="hi-calendar-header">
            <h2 class="hi-calendar-title" id="calendar-month-title"></h2>
            <div class="hi-calendar-nav">
              <button class="hi-calendar-nav-btn" id="calendar-prev-month" aria-label="Previous month">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button class="hi-calendar-nav-btn" id="calendar-next-month" aria-label="Next month">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <div class="hi-calendar-body">
            <div class="hi-calendar-weekdays">
              <div class="hi-calendar-weekday">Sun</div>
              <div class="hi-calendar-weekday">Mon</div>
              <div class="hi-calendar-weekday">Tue</div>
              <div class="hi-calendar-weekday">Wed</div>
              <div class="hi-calendar-weekday">Thu</div>
              <div class="hi-calendar-weekday">Fri</div>
              <div class="hi-calendar-weekday">Sat</div>
            </div>
            <div class="hi-calendar-days" id="calendar-days-grid"></div>
          </div>

          <div class="hi-calendar-stats">
            <div class="hi-calendar-stat">
              <span class="hi-calendar-stat-value" id="stat-month-count">0</span>
              <span class="hi-calendar-stat-label">This Month</span>
            </div>
            <div class="hi-calendar-stat">
              <span class="hi-calendar-stat-value" id="stat-current-streak">0</span>
              <span class="hi-calendar-stat-label">🔥 Streak</span>
            </div>
            <div class="hi-calendar-stat">
              <span class="hi-calendar-stat-value" id="stat-best-streak">0</span>
              <span class="hi-calendar-stat-label">⭐ Best</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.updateMonthTitle();
    this.renderDays();
  }

  // Attach event listeners
  attachEventListeners() {
    const overlay = document.getElementById('hi-calendar-overlay');
    const prevBtn = document.getElementById('calendar-prev-month');
    const nextBtn = document.getElementById('calendar-next-month');

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Month navigation
    prevBtn.addEventListener('click', () => this.previousMonth());
    nextBtn.addEventListener('click', () => this.nextMonth());

    // Touch gestures for swipe-down to close
    let startY = 0;
    const sheet = overlay.querySelector('.hi-calendar-sheet');
    
    sheet.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    });

    sheet.addEventListener('touchmove', (e) => {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 0 && sheet.scrollTop === 0) {
        e.preventDefault();
        sheet.style.transform = `translateY(${diff}px)`;
      }
    });

    sheet.addEventListener('touchend', (e) => {
      const currentY = e.changedTouches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 100) {
        this.close();
      } else {
        sheet.style.transform = '';
      }
    });
  }

  // Open calendar (A2: Standardized interface)
  open() {
    if (!this._isReady) {
      console.error('❌ HiCalendar not ready, call init() first');
      return;
    }

    const overlay = document.getElementById('hi-calendar-overlay');
    if (overlay) {
      overlay.classList.add('active');
      this.isOpen = true;
      document.body.style.overflow = 'hidden';
      this.loadMonthData();
    }
  }

  // Close calendar (A2: Standardized interface)
  close() {
    if (!this._isReady) return;

    const overlay = document.getElementById('hi-calendar-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      this.isOpen = false;
      document.body.style.overflow = '';
    }
  }

  // Navigate to previous month
  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.updateMonthTitle();
    this.renderDays();
    this.loadMonthData();
  }

  // Navigate to next month
  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.updateMonthTitle();
    this.renderDays();
    this.loadMonthData();
  }

  // Update month title
  updateMonthTitle() {
    const title = document.getElementById('calendar-month-title');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    title.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  // Render calendar days
  renderDays() {
    const grid = document.getElementById('calendar-days-grid');
    grid.innerHTML = '';

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // First day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const btn = this.createDayButton(day, true, false);
      grid.appendChild(btn);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();
      const btn = this.createDayButton(day, false, isToday);
      grid.appendChild(btn);
    }

    // Next month days to fill grid
    const totalCells = grid.children.length;
    const remainingCells = 42 - totalCells; // 6 weeks max
    for (let day = 1; day <= remainingCells; day++) {
      const btn = this.createDayButton(day, true, false);
      grid.appendChild(btn);
    }
  }

  // Create day button
  createDayButton(day, isOtherMonth, isToday) {
    const btn = document.createElement('button');
    btn.className = 'hi-calendar-day';
    
    if (isOtherMonth) btn.classList.add('other-month');
    if (isToday) btn.classList.add('today');

    const dateKey = this.getDateKey(day, isOtherMonth);
    const activity = this.activityData[dateKey];

    if (activity && activity.count > 0) {
      btn.classList.add('has-activity');
    }
    if (activity && activity.hasStreak) {
      btn.classList.add('has-streak');
    }
    if (activity && activity.hasMilestone) {
      btn.classList.add('has-milestone');
    }

    btn.innerHTML = `
      <span class="hi-calendar-day-number">${day}</span>
      <div class="hi-calendar-indicators">
        ${activity && activity.count > 0 ? '<span class="hi-calendar-dot"></span>'.repeat(Math.min(activity.count, 3)) : ''}
      </div>
    `;

    btn.addEventListener('click', () => {
      if (!isOtherMonth) {
        this.selectDay(day);
      }
    });

    return btn;
  }

  // Get date key for activity lookup
  getDateKey(day, isOtherMonth) {
    let month = this.currentDate.getMonth();
    let year = this.currentDate.getFullYear();

    if (isOtherMonth) {
      if (day > 15) {
        month = month - 1;
        if (month < 0) {
          month = 11;
          year--;
        }
      } else {
        month = month + 1;
        if (month > 11) {
          month = 0;
          year++;
        }
      }
    }

    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Select a day
  selectDay(day) {
    this.selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
    console.log('📅 Selected day:', this.selectedDate);
    
    // TODO: Show day detail view with Hi moments
  }

  // Load month activity data
  async loadMonthData() {
    if (!window.hiDB) {
      console.warn('hiDB not available');
      return;
    }

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;

    try {
      const data = await window.hiDB.fetchMonthActivity(year, month);
      this.activityData = data.days || {};
      
      // Update stats
      document.getElementById('stat-month-count').textContent = data.monthCount || 0;
      document.getElementById('stat-current-streak').textContent = data.currentStreak || 0;
      document.getElementById('stat-best-streak').textContent = data.bestStreak || 0;

      // Re-render days with activity data
      this.renderDays();
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  }
}

// Auto-initialize on hi-island page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  if (document.body.dataset.page === 'hi-island') {
    const calendar = new HiCalendar();
    calendar.init();
    console.log('✅ Hi Calendar component initialized');
  }
}
