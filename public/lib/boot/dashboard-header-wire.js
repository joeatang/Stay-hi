// Dashboard Header Wiring: calendar + home navigation (CSP-safe, reusable)
(function(){
  'use strict';

  function safeDispatchOpenCalendar(){
    try {
      // Try direct instance first
      if (window.hiCalendarInstance && typeof window.hiCalendarInstance.show === 'function') {
        console.log('📅 Opening calendar via direct instance');
        window.hiCalendarInstance.show();
        return;
      }
      
      // Try helper function
      if (typeof window.openHiCalendar === 'function') {
        console.log('📅 Opening calendar via helper function');
        window.openHiCalendar();
        return;
      }
      
      // Lazy init if calendar class exists but no instance
      if (typeof PremiumCalendar === 'function' && !window.hiCalendarInstance) {
        console.log('📅 Lazy-initializing calendar');
        window.hiCalendarInstance = new PremiumCalendar();
        setTimeout(() => window.hiCalendarInstance.show(), 100);
        return;
      }
      
      // Event dispatch fallback
      console.log('📅 Opening calendar via event dispatch');
      window.dispatchEvent(new CustomEvent('open-calendar'));
    } catch (err) {
      console.warn('[HI DEV] Calendar open error:', err);
      // Last resort: try event dispatch
      window.dispatchEvent(new CustomEvent('open-calendar'));
    }
  }

  function setupCalendarIntegration(){
    const btnCal = document.getElementById('btnCal');
    if (!btnCal) return;
    // Prevent double-binding across soft reloads
    if (btnCal.__hiCalendarBound) return;
    btnCal.__hiCalendarBound = true;
    btnCal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      safeDispatchOpenCalendar();
    }, { passive: false });
  }

  function setupHomeNavigation(){
    const btnHome = document.getElementById('btnHome');
    if (!btnHome) return;
    if (btnHome.__hiHomeBound) return;
    btnHome.__hiHomeBound = true;
    btnHome.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { window.location.href = (window.hiPaths?.page ? window.hiPaths.page('dashboard') : 'hi-dashboard.html'); } catch(_) { /* no-op */ }
    }, { passive: false });
  }

  // Expose to dashboard-init.js which calls these on DOMContentLoaded
  window.setupCalendarIntegration = setupCalendarIntegration;
  window.setupHomeNavigation = setupHomeNavigation;

  // Also attempt eager setup in case init script loads before dashboard-init.js
  document.addEventListener('DOMContentLoaded', () => {
    try { setupCalendarIntegration(); setupHomeNavigation(); } catch (e) { /* no-op */ }
  });
})();
