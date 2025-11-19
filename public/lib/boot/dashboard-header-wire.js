// Dashboard Header Wiring: calendar + home navigation (CSP-safe, reusable)
(function(){
  'use strict';

  function safeDispatchOpenCalendar(){
    try {
      if (window.hiCalendarInstance && typeof window.hiCalendarInstance.show === 'function') {
        window.hiCalendarInstance.show();
      } else if (typeof window.openHiCalendar === 'function') {
        window.openHiCalendar();
      } else {
        window.dispatchEvent(new CustomEvent('open-calendar'));
      }
    } catch (err) {
      console.warn('[HI DEV] Calendar open fallback due to error:', err);
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
      try { window.location.href = 'hi-dashboard.html'; } catch(_) { /* no-op */ }
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
