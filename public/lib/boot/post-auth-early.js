(function(){
  try {
    var qp = new URLSearchParams(location.search);
    if (qp.get('no-sw') === '1' && !qp.get('swcleared')) {
      console.log('[POST-AUTH][SW-Debug] Unregistering SW before auth flow');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs){
          regs.forEach(function(r){ r.unregister(); });
          var url = new URL(location.href);
          url.searchParams.set('swcleared','1');
          setTimeout(function(){ location.replace(url.toString()); }, 30);
        });
      }
    } else if (qp.get('no-sw') === '1' && qp.get('swcleared') === '1') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.warn('[POST-AUTH][SW-Debug] Controller still active, second unregister pass');
        navigator.serviceWorker.getRegistrations().then(function(regs){ regs.forEach(function(r){ r.unregister(); }); });
      } else {
        console.log('[POST-AUTH][SW-Debug] SW disabled (controller null)');
      }
    }
  } catch(e){ console.warn('[POST-AUTH][SW-Debug] Error during unregister', e); }
})();