(function() {
  try {
    var qp = new URLSearchParams(location.search);
    var host = location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1';
    var allowLocalSW = qp.get('sw') === '1';
    if (qp.get('no-sw') === '1' && !qp.get('swcleared')) {
      console.log('[HI-OS][SW-Debug] Detected ?no-sw=1 — unregistering all Service Workers early');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          regs.forEach(function(r){ r.unregister(); });
          var url = new URL(location.href);
          url.searchParams.set('swcleared','1');
          setTimeout(function(){ location.replace(url.toString()); }, 50);
        });
      }
    } else if (qp.get('no-sw') === '1' && qp.get('swcleared') === '1') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.warn('[HI-OS][SW-Debug] Controller still present after unregister. Forcing second pass.');
        navigator.serviceWorker.getRegistrations().then(function(regs){ regs.forEach(function(r){ r.unregister(); }); });
      } else {
        console.log('[HI-OS][SW-Debug] SW successfully disabled for this tab (controller null)');
      }
    } else if (isLocal && !allowLocalSW && !sessionStorage.getItem('hi-local-sw-disabled')) {
      // Default: disable SW entirely on localhost to prevent stale caches during dev
      console.log('[HI-OS][SW-Debug] Local dev detected. Disabling Service Worker by default. Append ?sw=1 to opt-in.');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          regs.forEach(function(r){ r.unregister(); });
          sessionStorage.setItem('hi-local-sw-disabled','1');
          // Do not auto-reload; keep it quiet to avoid loops
        });
      }
    }
  } catch (e) {
    console.warn('[HI-OS][SW-Debug] Unregister script error:', e);
  }
})();
