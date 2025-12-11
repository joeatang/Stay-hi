// Optional: resource error tracer (enable with ?debug=1)
(function(){
  try {
    if (location.search.includes('debug=1')) {
      window.addEventListener('error', function(e){
        const t = e.target || {};
        const url = t.src || t.href || '';
        if (url) console.error('[HI-OS][RESOURCE-404]', url);
      }, true);
    }
  } catch(_){}
})();

// Pass criteria: location.pathname must contain "/public/"
(function() {
  const inPublic = location.pathname.includes('/public/');
  const isProdHost = location.hostname === 'stay-hi.vercel.app';
  const looksLocalRoot = !inPublic && location.pathname.startsWith('/hi-');
  const PASS = inPublic || isProdHost || looksLocalRoot;
  const msg  = PASS ? 'GREEN — valid webroot (prod or /public)' : 'RED — unexpected webroot (adjust dev server)';
  window.__HI_WEBROOT_OK = PASS;
  const tag = '[HI-OS][WEBROOT]';
  if (PASS) console.log(`${tag} ${msg}`); else console.error(`${tag} ${msg}`);
  try {
    const injectBadge = () => {
      // Only show badge in dev (localhost) - hide in production
      if (isProdHost) {
        console.log('[HI-OS][WEBROOT] Badge hidden in production');
        return;
      }
      
      const badge = document.createElement('div');
      badge.textContent = msg;
      badge.setAttribute('id', 'hi-webroot-guard');
      badge.style.position = 'fixed';
      badge.style.bottom = '12px';
      badge.style.right = '12px';
      badge.style.zIndex = '99999';
      badge.style.padding = '8px 10px';
      badge.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,Arial';
      badge.style.fontSize = '12px';
      badge.style.borderRadius = '6px';
      badge.style.border = PASS ? '1px solid #1f7a1f' : '1px solid #a00';
      badge.style.background = PASS ? '#eaffea' : '#ffecec';
      badge.style.color = PASS ? '#0c540c' : '#7a0000';
      document.body.appendChild(badge);
    };
    if (document.body) {
      injectBadge();
    } else {
      document.addEventListener('DOMContentLoaded', injectBadge);
    }
  } catch (e) {
    console.warn('[HI-OS][WEBROOT] badge inject failed:', e);
  }
})();
