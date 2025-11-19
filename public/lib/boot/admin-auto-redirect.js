// admin-auto-redirect.js
// Purpose: Seamless admin fast-path to Mission Control using unified AdminAccessManager.
// Behavior: One redirect per session, respects ?stay=1 and explicit next, no-ops on MC page.
(function(){
  try {
    const FLAG = 'hi_admin_redirect_done';
    if (sessionStorage.getItem(FLAG) === 'true') return;

    const params = new URLSearchParams(location.search);
    if (params.get('stay') === '1') return; // user opted out

    const here = location.pathname;
    if (/hi-mission-control\.html$/i.test(here)) return; // already there

    function targetUrl(){
      const next = params.get('next');
      if (next && !/hi-dashboard\.html$/i.test(next)) return next;
      return '/public/hi-mission-control.html';
    }

    function tryRedirect(reason){
      if (sessionStorage.getItem(FLAG) === 'true') return;
      const isAdmin = sessionStorage.getItem('hi_admin_access') === 'true' || !!window.AdminAccessManager?.getState?.()?.isAdmin;
      if (!isAdmin) return;
      sessionStorage.setItem(FLAG, 'true');
      const dest = targetUrl();
      try { console.debug('[AdminAutoRedirect] Redirecting to Mission Control', { dest, reason }); } catch {}
      window.location.href = dest;
    }

    window.addEventListener('hi:admin-confirmed', () => tryRedirect('event:confirmed'));
    window.addEventListener('hi:admin-state-changed', (e) => { if (e?.detail?.isAdmin) tryRedirect('event:state-changed'); });
    window.addEventListener('hi:auth-ready', () => setTimeout(() => tryRedirect('auth-ready'), 300));
    setTimeout(() => tryRedirect('timer-fallback'), 2500);
  } catch (e) {
    try { console.warn('[AdminAutoRedirect] suppressed error', e); } catch {}
  }
})();
