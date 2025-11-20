// avatar-precache.js - dispatches avatar precache message to SW
(function(){
  function sendToSW(avatarUrl){
    try {
      if (!avatarUrl) return;
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type:'AVATAR_PRECACHE', avatarUrl });
      }
      try { // BroadcastChannel fallback for when controller not yet ready
        const channel = new BroadcastChannel('hi-avatar-precache');
        channel.postMessage({ type:'AVATAR_PRECACHE', avatarUrl });
      } catch(_){}
    } catch(e){ console.warn('[avatar-precache] failed', e.message); }
  }
  window.addEventListener('hi:avatar-precache', e => {
    sendToSW(e.detail?.avatarUrl);
  });
  window.__HiAvatarPrecache = { precache: sendToSW };
})();
