// public/js/welcome-cta.js
// HI DEV: Surgical fix for Welcome CTA reliability (P1)
(function () {
  if (window.__hiWelcomeCtaBound) {
    console.log('[HI DEV] CTA already bound, skipping duplicate handler');
    return;
  }
  window.__hiWelcomeCtaBound = true;

  const el = document.getElementById('cta-experience-anon');
  if (!el) { 
    console.warn('[HI DEV] CTA element not found'); 
    return; 
  }

  // Prefer letting the browser handle the relative href to avoid path rewriting bugs.
  el.addEventListener('click', (e) => {
    console.log('[HI DEV] CTA click →', el.href);
    
    // Mark as anonymous discovery session (preserve existing logic)
    localStorage.setItem('hi_discovery_mode', 'anonymous');
    localStorage.setItem('hi_welcome_experienced', 'true');
    sessionStorage.setItem('from-welcome', 'true');
    
    // Let browser handle navigation via href - no preventDefault needed
  }, { once: false });

  console.log('[HI DEV] Welcome CTA handler bound successfully');
})();