/* ==========================================================================
   Stay Hi — Premium Calendar Modal System
   Tesla-style calendar popup for tracking Hi Moments
   ========================================================================== */

class PremiumCalendar {
  constructor() {
    if (typeof window !== 'undefined' && /[?&]debug=1/.test(window.location.search)) {
      window.__HI_DEBUG__ = true;
    }
    this._dbg = (...a)=> { if (window.__HI_DEBUG__) console.log(...a); };
    this.currentMonth = new Date();
    this.hiMoments = {}; // Will load from localStorage/Supabase
    this.isOpen = false;
    this.remoteStreak = null; // HiBase-backed streak info (auth-aware)
    this.lastStreakValue = null; // For milestone announcements
    this.lastMilestoneThreshold = null; // Track previously announced milestone
    this.init();
  }

  init() {
    this.createCalendarModal();
    this.loadHiMoments();
    this.setupEventListeners();
    this.setupGlobalInstance();
    // Attempt to hydrate with real streaks/milestones if available
    this.loadRemoteStreaks();
    this._dbg('📅 Premium Calendar initialized');
  }
  
  setupGlobalInstance() {
    // Prevent multiple instances - force singleton pattern
    if (window.hiCalendarInstance && window.hiCalendarInstance !== this) {
      this._dbg('📅 Replacing existing calendar instance to prevent conflicts');
      if (window.hiCalendarInstance.isOpen) {
        window.hiCalendarInstance.hide();
      }
    }
    window.hiCalendarInstance = this;
    this._dbg('📅 Global calendar instance established (singleton enforced)');
  }

  createCalendarModal() {
    // HI DEV: Prevent modal stacking - Remove ALL existing calendar modals
    const existing = document.querySelectorAll('.premium-calendar-modal');
    if (existing.length > 0) {
      this._dbg(`[HI DEV] Removing ${existing.length} existing calendar modals to prevent stacking`);
      existing.forEach(modal => modal.remove());
    }

    const modal = document.createElement('div');
    modal.className = 'premium-calendar-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','calTitle');
    modal.setAttribute('aria-describedby','calendarDescription');
    modal.innerHTML = `
      <div class="calendar-backdrop"></div>
      <div class="calendar-container glass-card">
        <div class="calendar-header">
          <button class="calendar-nav-btn" id="calPrevBtn" aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </button>
          <h2 class="calendar-title text-gradient" id="calTitle" role="heading" aria-level="2">October 2025</h2>
          <span id="calMilestoneBadge" class="milestone-badge" style="display:none" aria-hidden="false"></span>
          <div class="calendar-nav-controls">
            <button class="calendar-nav-btn" id="calNextBtn" aria-label="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </div>
        </div>
        <button class="calendar-close-btn" id="calCloseBtn" aria-label="Close calendar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <p id="calendarDescription" style="position:absolute;left:-9999px;top:-9999px;">Interactive monthly Hi activity calendar. Use Arrow keys to change months, Tab to move between controls and days, and Escape to close.</p>
        <div id="calendarLiveRegion" class="sr-only" aria-live="polite" aria-atomic="true"></div>
        
        <div class="calendar-stats">
          <div class="stat-pill">
            <span class="stat-number" id="monthCompleted">0</span>
            <span class="stat-label">This Month</span>
          </div>
          <div class="stat-pill">
            <span class="stat-number" id="currentStreak">0</span>
            <span class="stat-label">🔥 Streak</span>
          </div>
          <div class="stat-pill">
            <span class="stat-number" id="todayCount">0</span>
            <span class="stat-label">Today</span>
          </div>
        </div>

        <div class="milestone-hint" id="calMilestoneHint" aria-live="polite"></div>

        <div class="calendar-grid">
          <div class="calendar-weekdays">
            <div class="weekday">S</div>
            <div class="weekday">M</div>
            <div class="weekday">T</div>
            <div class="weekday">W</div>
            <div class="weekday">T</div>
            <div class="weekday">F</div>
            <div class="weekday">S</div>
          </div>
          <div class="calendar-days" id="calendarDays">
            <!-- Days will be generated by JavaScript -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  setupEventListeners() {
    // Listen for calendar open event from header
    window.addEventListener('open-calendar', () => this.show());

    // Modal event listeners
    document.addEventListener('click', (e) => {
      if (e.target.matches('#calCloseBtn, .calendar-backdrop')) {
        this.hide();
      }
      if (e.target.matches('#calPrevBtn')) {
        this.previousMonth();
      }
      if (e.target.matches('#calNextBtn')) {
        this.nextMonth();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      
      if (e.key === 'Escape') {
        this.hide();
      }
      if (e.key === 'ArrowLeft') {
        this.previousMonth();
      }
      if (e.key === 'ArrowRight') {
        this.nextMonth();
      }
    });
  }

  async loadRemoteStreaks() {
    try {
      console.log('📡 [STREAK DEBUG] Starting loadRemoteStreaks...');
      console.log('📡 [STREAK DEBUG] HiBase available:', !!window.HiBase);
      console.log('📡 [STREAK DEBUG] getMyStreaks available:', !!window.HiBase?.streaks?.getMyStreaks);
      
      // Wait for HiBase to be available (max 10 seconds)
      if (!window.HiBase?.streaks?.getMyStreaks) {
        console.log('⏳ [STREAK DEBUG] Waiting for HiBase to load...');
        let attempts = 0;
        const maxAttempts = 50; // 50 * 200ms = 10 seconds max wait
        
        while (!window.HiBase?.streaks?.getMyStreaks && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        
        if (!window.HiBase?.streaks?.getMyStreaks) {
          console.warn('⚠️ [STREAK DEBUG] HiBase not available after 10s, skipping streak load');
          this.updateDashboardStreakPill(0);
          return;
        }
        
        console.log(`✅ [STREAK DEBUG] HiBase loaded after ${attempts * 200}ms`);
      }
      
      // Prefer auth-aware streak fetch
      if (window.HiBase?.streaks?.getMyStreaks) {
        console.log('📡 [STREAK DEBUG] Calling getMyStreaks()...');
        const res = await window.HiBase.streaks.getMyStreaks();
        console.log('📡 [STREAK DEBUG] getMyStreaks response:', res);
        
        if (res?.error) {
          console.warn('⚠️ [STREAK DEBUG] getMyStreaks returned error:', res.error);
        }
        
        if (!res?.error && res?.data) {
          console.log('✅ [STREAK DEBUG] Valid streak data received:', res.data);
          this.remoteStreak = res.data; // { current, longest, lastHiDate, ... }
          // Re-render stats/grid with real data where applicable
          this.updateCalendar();
          // Gold Standard: Update dashboard stat pill
          const streakValue = res.data.current;
          console.log('📊 [STREAK DEBUG] Updating pill with value:', streakValue);
          this.updateDashboardStreakPill(streakValue);
        } else {
          console.warn('⚠️ [STREAK DEBUG] No valid data in response, defaulting to 0');
          this.updateDashboardStreakPill(0);
        }
      } else if (window.HiBase?.getUserStreak) {
        const currentUser = window.hiAuth?.getCurrentUser?.();
        if (currentUser?.id && currentUser.id !== 'anonymous') {
          const res = await window.HiBase.getUserStreak(currentUser.id);
          if (!res?.error && res?.data) {
            this.remoteStreak = res.data;
            this.updateCalendar();
            // Gold Standard: Update dashboard stat pill
            const streakValue = res.data?.current ?? res.data?.streak?.current;
            if (Number.isFinite(streakValue)) {
              this.updateDashboardStreakPill(streakValue);
            }
            try { const cur = this.remoteStreak?.current ?? this.remoteStreak?.streak?.current; if (Number.isFinite(cur)) window.HiMilestoneToast?.maybeAnnounce?.(cur, { source: 'calendar-remote' }); } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Calendar: failed to load remote streaks', e);
    }
  }
  
  updateDashboardStreakPill(streakValue) {
    // 🎯 NEW: Use StreakEvents for synchronized atomic updates
    if (window.StreakEvents) {
      console.log(`🔥 [STREAK SYNC] Broadcasting via StreakEvents: ${streakValue}`);
      window.StreakEvents.broadcast(streakValue);
    } else {
      // Fallback: Direct update if StreakEvents not loaded yet
      const statEl = document.getElementById('userStreak');
      if (statEl && Number.isFinite(streakValue)) {
        this.animateNumber(statEl, streakValue);
        console.log(`🔥 Dashboard streak pill updated (fallback): ${streakValue} days`);
      }
      
      // Also trigger grid update if available
      if (window.setupWeeklyProgress && typeof window.setupWeeklyProgress === 'function') {
        window.setupWeeklyProgress();
      }
    }
  }

  show() {
    const modal = document.querySelector('.premium-calendar-modal');
    if (!modal) {
      console.error('❌ Calendar modal not found - reinitializing...');
      this.createCalendarModal();
      setTimeout(() => this.show(), 100);
      return;
    }

    if (this.isOpen) {
      this._dbg('📅 Calendar already open');
      return;
    }

    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.isOpen = true;
    modal.style.display = 'flex';
    modal.classList.add('show');
    this.updateCalendar();
    
    // Gold Standard: Update dashboard pill when calendar opens
    const currentStreak = this.remoteStreak?.current ?? this.remoteStreak?.streak?.current ?? this.calculateStreak();
    if (Number.isFinite(currentStreak)) {
      this.updateDashboardStreakPill(currentStreak);
    }
    
    try { const cur = this.remoteStreak?.current ?? this.remoteStreak?.streak?.current; if (Number.isFinite(cur)) window.HiMilestoneToast?.maybeAnnounce?.(cur, { source: 'calendar-show' }); } catch {}
    // Prevent background scroll on mobile
    try { document.body.style.overflow = 'hidden'; } catch {}
    
    // Premium entrance animation
    if (window.PremiumUX) {
      window.PremiumUX.triggerHapticFeedback('light');
    }

    // Focus management for accessibility (first focusable element)
    const focusables = this.getFocusableElements(modal);
    (focusables[0] || modal).focus();
    this.focusTrapHandler = (e)=> this.handleFocusTrap(e);
    document.addEventListener('keydown', this.focusTrapHandler, true);
    
    this._dbg('📅 Premium Calendar opened successfully');
  }

  hide() {
    const modal = document.querySelector('.premium-calendar-modal');
    if (!modal) return;

    this.isOpen = false;
    modal.classList.remove('show');
    // Hide explicitly to avoid inline/CSS conflicts
    modal.style.display = 'none';
    // Restore body scroll
    try { document.body.style.overflow = ''; } catch {}
    
    // Premium exit animation
    if (window.PremiumUX) {
      window.PremiumUX.triggerHapticFeedback('light');
    }
    document.removeEventListener('keydown', this.focusTrapHandler, true);
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      try { this.previousFocus.focus({ preventScroll: true }); } catch {}
    }
  }

  previousMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.updateCalendar();
    
    if (window.PremiumUX) {
      window.PremiumUX.triggerHapticFeedback('light');
    }
  }

  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.updateCalendar();
    
    if (window.PremiumUX) {
      window.PremiumUX.triggerHapticFeedback('light');
    }
  }

  updateCalendar() {
    this.updateTitle();
    this.updateStats();
    this.renderCalendarGrid();
  }

  updateTitle() {
    const title = document.getElementById('calTitle');
    if (title) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const label = `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
      title.textContent = label;
      const live = document.getElementById('calendarLiveRegion');
      if (live) live.textContent = `Showing ${label}`;
      // Update milestone badge if available
      const badge = document.getElementById('calMilestoneBadge');
      if (badge) {
        const streak = (this.remoteStreak?.current ?? null);
        const effective = Number.isFinite(streak) ? streak : this.calculateStreak();
        const m = this.getMilestoneInfo(effective);
        if (m) {
          badge.style.display = 'inline-flex';
          badge.textContent = `${m.emoji} ${m.name}`;
          badge.setAttribute('aria-label', `Milestone: ${m.name}`);
        } else {
          badge.style.display = 'none';
        }
      }
    }
  }

  updateStats() {
    const monthKey = this.getMonthKey(this.currentMonth);
    const monthData = this.hiMoments[monthKey] || {};
    
    // 🎯 GOLD STANDARD: Count from HiBase streak data, not localStorage
    // If user has remoteStreak, count actual active days this month
    let completedDays = 0;
    if (this.remoteStreak?.current && this.remoteStreak?.lastHiDate) {
      const lastHi = new Date(this.remoteStreak.lastHiDate);
      const currentMonth = this.currentMonth;
      const streakLength = this.remoteStreak.current;
      
      // Count how many streak days fall in the current displayed month
      for (let i = 0; i < streakLength; i++) {
        const streakDay = new Date(lastHi);
        streakDay.setDate(lastHi.getDate() - i);
        if (streakDay.getMonth() === currentMonth.getMonth() && 
            streakDay.getFullYear() === currentMonth.getFullYear()) {
          completedDays++;
        }
      }
    } else {
      // Fallback to localStorage count
      completedDays = Object.keys(monthData).length;
    }
    
    // Calculate streak (prefer remote streaks if available)
    const streak = (this.remoteStreak?.current ?? null);
    const effectiveStreak = Number.isFinite(streak) ? streak : this.calculateStreak();
    
    // Today's status: Show checkmark if completed, 0 if not
    const today = this.getTodayKey();
    const todayCompleted = this.remoteStreak?.lastHiDate === today;
    const todayDisplay = todayCompleted ? '✓' : '0';

    // Update stats with Tesla-style animations
    const monthEl = document.getElementById('monthCompleted');
    const streakEl = document.getElementById('currentStreak');
    const todayEl = document.getElementById('todayCount');
    
    if (monthEl) {
      this.animateNumber(monthEl, completedDays);
      monthEl.parentElement.classList.toggle('streak-stat', false);
    }
    
    if (streakEl) {
      this.animateNumber(streakEl, effectiveStreak);
      streakEl.parentElement.classList.toggle('streak-stat', effectiveStreak > 0);
    }
    
    if (todayEl) {
      // Show checkmark or 0 based on completion
      if (todayCompleted) {
        todayEl.textContent = '✓';
        todayEl.style.fontSize = '24px';
      } else {
        todayEl.textContent = '0';
        todayEl.style.fontSize = '';
      }
    }

    // Update milestone hint and live announce on crossing
    const hint = document.getElementById('calMilestoneHint');
    if (hint) {
      const nextM = this.getNextMilestoneInfo(effectiveStreak);
      if (nextM) {
        const remaining = nextM.threshold - effectiveStreak;
        hint.style.display = 'block';
        hint.textContent = `Next milestone: ${nextM.emoji} ${nextM.name} in ${remaining} day${remaining === 1 ? '' : 's'}`;
      } else {
        hint.style.display = 'none';
        hint.textContent = '';
      }
    }

    // Announce milestone when newly reached
    const currentMilestone = this.getMilestoneInfo(effectiveStreak);
    const previousMilestone = this.getMilestoneInfo(this.lastStreakValue ?? 0);
    if (currentMilestone && (!previousMilestone || currentMilestone.threshold !== previousMilestone.threshold)) {
      const live = document.getElementById('calendarLiveRegion');
      if (live) {
        live.textContent = `Milestone reached: ${currentMilestone.name} at ${effectiveStreak} days`;
      }
      this.lastMilestoneThreshold = currentMilestone.threshold;
    }
    this.lastStreakValue = effectiveStreak;
  }

  animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === targetValue) return;
    
    const duration = 600;
    const startTime = Date.now();
    const difference = targetValue - currentValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      const current = Math.round(currentValue + (difference * easeProgress));
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  renderCalendarGrid() {
    const daysContainer = document.getElementById('calendarDays');
    if (!daysContainer) return;

    daysContainer.innerHTML = '';

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const monthKey = this.getMonthKey(this.currentMonth);
    const monthData = this.hiMoments[monthKey] || {};
    const streakDays = this.getStreakDays();

    // Generate 42 days (6 weeks) with enhanced visualization
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayElement = document.createElement('div');
      const dayKey = this.getDayKey(date);
      const hiCount = monthData[dayKey] || 0;
      const isCurrentMonth = date.getMonth() === month;
      const isToday = this.isToday(date);
      const hasHiMoments = hiCount > 0;
      const isStreakDay = streakDays.includes(dayKey);
      const hasMultipleHi = hiCount > 1;

      // Enhanced class names for better styling
      let className = 'calendar-day';
      if (!isCurrentMonth) className += ' other-month';
      if (isToday) className += ' today';
      if (hasHiMoments) className += ' has-hi-moments';
      if (isStreakDay) className += ' streak-day';
      if (hasMultipleHi) className += ' multiple-hi-moments';

      dayElement.className = className;
      dayElement.setAttribute('tabindex','0');
      dayElement.setAttribute('role','button');
      dayElement.setAttribute('aria-label', `${date.toDateString()}${hasHiMoments? ' – '+hiCount+' Hi moment'+(hiCount>1?'s':''):''}`);
      if (isToday) dayElement.setAttribute('aria-current','date');
      dayElement.innerHTML = `
        <span class="day-number">${date.getDate()}</span>
        ${hasHiMoments ? `<div class="hi-indicator"><span class="hi-count">${hiCount}</span></div>` : ''}
      `;

      // Enhanced click interaction with premium feedback
      dayElement.addEventListener('click', () => {
        this.selectDay(date, hiCount);
        
        // Tesla-style haptic feedback
        if (window.PremiumUX) {
          window.PremiumUX.triggerHapticFeedback(hasHiMoments ? 'medium' : 'light');
          
          if (hasHiMoments) {
            window.PremiumUX.glow(dayElement, '#4ECDC4');
          }
        }
      });

      // Staggered entrance animation
      dayElement.style.animationDelay = `${i * 10}ms`;
      dayElement.style.animation = 'dayFadeIn 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards';

      daysContainer.appendChild(dayElement);
    }
  }

  getMilestoneInfo(streak){
    if (!Number.isFinite(streak) || streak <= 0) return null;
    const milestones = this.getMilestoneSet();
    let current = null;
    for (const m of milestones){ if (streak >= m.threshold) current = m; }
    return current;
  }

  getNextMilestoneInfo(streak){
    if (!Number.isFinite(streak) || streak < 0) return null;
    const milestones = this.getMilestoneSet();
    for (const m of milestones){
      if (streak < m.threshold) return m;
    }
    return null; // No next milestone beyond the highest
  }

  getMilestoneSet(){
    if (window.HiStreakMilestones){
      return window.HiStreakMilestones.list();
    }
    return [
      { threshold: 3,  name: 'Hi Habit',      emoji: '🔥' },
      { threshold: 7,  name: 'Week Keeper',   emoji: '🔥' },
      { threshold: 15, name: 'Momentum Build',emoji: '⚡' },
      { threshold: 30, name: 'Monthly Hi',    emoji: '🌙' },
      { threshold: 50, name: 'Hi Champion',   emoji: '🏆' },
      { threshold: 100,name: 'Steady Light',  emoji: '🔥' }
    ];
  }

  getStreakDays() {
    // Calculate which days are part of current streak
    const streakDays = [];
    const today = new Date();
    // Prefer remote count when present; otherwise infer from local moments
    const remoteCount = this.remoteStreak?.current ?? null;
    const count = Number.isFinite(remoteCount) ? remoteCount : this.calculateStreak();

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayKey = this.getDayKey(date);

      if (Number.isFinite(remoteCount)) {
        // If we only know the count, mark the last N days as streak days
        streakDays.push(dayKey);
      } else {
        // Local inference: only mark days with recorded Hi moments
        const monthKey = this.getMonthKey(date);
        const monthData = this.hiMoments[monthKey] || {};
        if (monthData[dayKey] > 0) streakDays.push(dayKey);
      }
    }
    return streakDays;
  }

  getFocusableElements(container){
    const selectors = [
      'button', '[href]', '[tabindex]:not([tabindex="-1"])', '[role="button"]'
    ];
    return Array.from(container.querySelectorAll(selectors.join(',')))
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  handleFocusTrap(e){
    if (!this.isOpen) return;
    if (e.key === 'Tab') {
      const modal = document.querySelector('.premium-calendar-modal');
      if (!modal) return;
      const focusables = this.getFocusableElements(modal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    } else if (e.key === 'Escape') {
      this.hide();
    }
  }

  selectDay(date, hiCount) {
    if (window.PremiumUX) {
      window.PremiumUX.glow(event.target, '#4ECDC4');
      window.PremiumUX.triggerHapticFeedback('medium');
    }

    // Could add day detail view here later
    this._dbg(`Selected ${date.toDateString()} with ${hiCount} Hi Moments`);
  }

  // Data management methods
  loadHiMoments() {
    // Load from localStorage for now, will integrate with Supabase later
    const stored = localStorage.getItem('hi-moments-data');
    if (stored) {
      try {
        this.hiMoments = JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to parse Hi Moments data');
        this.hiMoments = {};
      }
    }
  }

  saveHiMoments() {
    localStorage.setItem('hi-moments-data', JSON.stringify(this.hiMoments));
  }

  addHiMoment(date = new Date()) {
    const monthKey = this.getMonthKey(date);
    const dayKey = this.getDayKey(date);
    
    if (!this.hiMoments[monthKey]) {
      this.hiMoments[monthKey] = {};
    }
    
    this.hiMoments[monthKey][dayKey] = (this.hiMoments[monthKey][dayKey] || 0) + 1;
    this.saveHiMoments();
    
    if (this.isOpen) {
      this.updateCalendar();
    }
  }

  // Helper methods
  getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  getDayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getTodayKey() {
    return this.getDayKey(new Date());
  }

  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  calculateStreak() {
    // Simple streak calculation - can be enhanced
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      const monthKey = this.getMonthKey(checkDate);
      const dayKey = this.getDayKey(checkDate);
      
      if (this.hiMoments[monthKey]?.[dayKey] > 0) {
        streak++;
      } else if (i > 0) {
        break; // Streak broken
      }
    }
    
    return streak;
  }
}

// Expose PremiumCalendar class to window for manual instantiation
window.PremiumCalendar = PremiumCalendar;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PremiumCalendar;
}

// NOTE: Calendar is initialized by dashboard-init.js to prevent duplicate instances
// Auto-init removed to fix double-sheet visual bug