// Hi Island Header Navigation + Utilities
(function(){
  function openNavigation(){
    const modal = document.getElementById('navigationModal');
    if (!modal) return;
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    const content = modal.querySelector('.navigation-content');
    const closeBtn = document.getElementById('closeNavigation');
    (content||modal).setAttribute('tabindex','-1');
    setTimeout(()=>{ try { (closeBtn||content||modal).focus({preventScroll:true}); } catch(_){} },0);

    // Admin gating parity with dashboard
    try {
      const adminSection = document.getElementById('adminSection');
      const isAdmin = localStorage.getItem('isAdmin') === 'true' || window.location.href.includes('admin');
      if (adminSection && isAdmin) adminSection.style.display = 'block';
    } catch(_) {}
  }

  function closeNavigation(){
    const modal = document.getElementById('navigationModal');
    if (!modal) return;
    modal.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(()=>{ if(!modal.classList.contains('show')) modal.style.display='none'; }, 300);
  }

  function showCalendar(){
    try {
      const log = (...args)=>{ try{ console.log('[Hi Island] Calendar:', ...args); }catch{} };
      // Fast path: instance exists
      if (window.hiCalendarInstance && typeof window.hiCalendarInstance.show === 'function') {
        log('using existing instance');
        window.hiCalendarInstance.show();
        return;
      }

      // If constructor exists, create once
      if (window.PremiumCalendar && typeof window.PremiumCalendar === 'function') {
        log('creating new PremiumCalendar');
        try {
          window.hiCalendarInstance = new window.PremiumCalendar();
          window.hiCalendarInstance.show();
          return;
        } catch(e) {
          console.warn('Calendar init failed:', e);
        }
      }

      // Fallback: dynamically load assets then open
      log('dynamic load fallback starting');
      const ensureCSS = () => {
        if (document.querySelector('link[href*="premium-calendar.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'assets/premium-calendar.css?v=20241222-streak-fix';
        document.head.appendChild(link);
      };
      ensureCSS();

      const loadScript = () => {
        if (window.PremiumCalendar) return Promise.resolve();
        if (window.HiLazy) {
          return window.HiLazy.loadPremiumCalendar();
        }
        return new Promise((resolve, reject) => {
          const existing = Array.from(document.scripts).find(s => (s.getAttribute('src')||'').includes('assets/premium-calendar.js'));
          if (existing) { resolve(); return; }
          const s = document.createElement('script');
          s.src = 'assets/premium-calendar.js?v=20241222-streak-fix';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('calendar script load failed'));
          document.body.appendChild(s);
        });
      };

      loadScript().then(() => {
        setTimeout(() => {
          try {
            if (!window.hiCalendarInstance && window.PremiumCalendar) {
              window.hiCalendarInstance = new window.PremiumCalendar();
            }
            if (window.hiCalendarInstance?.show) {
              log('dynamic instance ready, showing');
              window.hiCalendarInstance.show();
            } else {
              // Last resort: event bus open
              window.dispatchEvent(new CustomEvent('open-calendar'));
              log('dispatched open-calendar event');
            }
          } catch(e) { console.warn('Calendar post-load open failed:', e); }
        }, 50);
      }).catch(() => {
        alert('📅 Calendar is loading... Please try again in a moment.');
      });
    } catch(_) {
      alert('📅 Calendar is loading... Please try again in a moment.');
    }
  }

  function navigateToHome(){
    window.location.href = 'hi-dashboard.html';
  }

  function openHiffirmations(){
    try {
      // Navigate explicitly to Dashboard and auto-open Hiffirmations modal
      window.location.href = 'hi-dashboard.html?open=hiffirmations';
    } catch (_) {
      // Fallback: absolute path for odd base-url cases
      window.location.assign('/public/hi-dashboard.html?open=hiffirmations');
    }
  }

  // Wire up backdrop and close button
  function attachNavHandlers(){
    const backdrop = document.getElementById('navigationBackdrop');
    const closeBtn = document.getElementById('closeNavigation');
    if (backdrop) backdrop.addEventListener('click', closeNavigation);
    if (closeBtn) closeBtn.addEventListener('click', closeNavigation);
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') closeNavigation();
    });

    // Mark active nav item based on current path
    try {
      const current = window.location.pathname.split('/').pop();
      const links = document.querySelectorAll('.navigation-menu a.nav-item[href]');
      links.forEach(a => {
        try {
          const rawHref = a.getAttribute('href') || '';
          const hasInline = a.hasAttribute('onclick');
          // Do not mark action-only items (modal triggers, '#', javascript:)
          if (!rawHref || rawHref === '#' || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || hasInline) {
            a.classList.remove('active');
            return;
          }
          const hrefPath = new URL(rawHref, window.location.href).pathname.split('/').pop();
          if (hrefPath === current) a.classList.add('active');
          else a.classList.remove('active');
        } catch(_) { a.classList.remove('active'); }
      });
    } catch(_) {}
  }

  // Expose globally for inline handlers in markup
  window.openNavigation = openNavigation;
  window.closeNavigation = closeNavigation;
  window.showCalendar = showCalendar;
  window.navigateToHome = navigateToHome;
  window.openHiffirmations = openHiffirmations;

  // Initialize
  document.addEventListener('DOMContentLoaded', attachNavHandlers);
})();
