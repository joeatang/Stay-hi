// Hi Monitoring Init (Sentry placeholder + Plausible events + error boundary)
(function(){
  'use strict';
  const env = window.HI_ENV || {};
  const sentryDsn = env.SENTRY_DSN || '';
  const plausibleDomain = env.PLAUSIBLE_DOMAIN || '';
  // Unified beacon helper (reused by perf/error/integrity/custom events)
  if (!window.hiBeacon) {
    window.hiBeacon = function(path, payload){
      try {
        const host = location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
        if (isLocal) {
          // Silence network beacons on local dev server (python http.server has no routes)
          console.debug('[hiBeacon:dev]', path, payload);
          return;
        }
        // 🔧 FIX: Disable all beaconing by default (no endpoints exist in production)
        // Enable via ?enable-beacons=1 for debugging only
        const beaconsEnabled = location.search.includes('enable-beacons=1');
        if (!beaconsEnabled) {
          console.debug('[hiBeacon:disabled]', path);
          return;
        }
        const data = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(path, new Blob([data], { type:'application/json' }));
        } else {
          fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body:data }).catch(()=>{});
        }
      } catch(_) {}
    };
  }

  // Lightweight global error capture -> beacon
  function sendErrorBeacon(payload){
    hiBeacon('/error-beacon', payload);
  }

  window.addEventListener('error', (e) => {
    const payload = {
      type:'error',
      message: e.message,
      stack: e.error && e.error.stack,
      src: e.filename,
      line: e.lineno,
      col: e.colno,
      build: window.HI_BUILD || window.__BUILD_STAMP || '',
      path: location.pathname,
      ts: Date.now()
    };
    sendErrorBeacon(payload);
    if (window.HiTelemetry) { try { window.HiTelemetry.persistError(payload); } catch(_) {} }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const payload = {
      type:'promise',
      message: (e.reason && e.reason.message) || String(e.reason),
      stack: e.reason && e.reason.stack,
      build: window.HI_BUILD || window.__BUILD_STAMP || '',
      path: location.pathname,
      ts: Date.now()
    };
    sendErrorBeacon(payload);
    if (window.HiTelemetry) { try { window.HiTelemetry.persistError(payload); } catch(_) {} }
  });

  // Sentry placeholder (lazy init only if DSN present)
  if (sentryDsn) {
    import('https://browser.sentry-cdn.com/7.108.0/bundle.tracing.min.js').then(() => {
      if (window.Sentry) {
        window.Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.1 });
        window.Sentry.setTag('build', window.HI_BUILD || window.__BUILD_STAMP || '');
      }
    }).catch(()=>{});
  } else {
    // No DSN yet: expose noop API for future code
    window.Sentry = { captureException:()=>{}, captureMessage:()=>{}, setTag:()=>{} };
  }

  // Plausible minimal loader (deferred) if domain provided
  if (plausibleDomain) {
    const s = document.createElement('script');
    s.src = 'https://plausible.io/js/script.js';
    s.defer = true;
    s.setAttribute('data-domain', plausibleDomain);
    // Optional SRI for Plausible (may break on upstream updates). Provide via env.PLAUSIBLE_SRI or window.__HI_SRI?.plausible
    const sri = env.PLAUSIBLE_SRI || (window.__HI_SRI && window.__HI_SRI.plausible);
    if (sri) {
      s.integrity = 'sha384-' + sri.replace(/^sha384-/,'');
      s.crossOrigin = 'anonymous';
    }
    document.head.appendChild(s);
  }

  // Unified custom event helper
  window.hiTrack = function(eventName, data){
    try {
      if (window.plausible) {
        window.plausible(eventName, { props: data || {} });
      }
      if (window.Sentry && window.Sentry.addBreadcrumb) {
        window.Sentry.addBreadcrumb({ category:'hiTrack', message:eventName, data });
      }
      const payload = { event:eventName, data, build: window.HI_BUILD || window.__BUILD_STAMP || '', path: location.pathname, ts: Date.now() };
      hiBeacon('/track-beacon', payload);
      if (window.HiTelemetry) { try { window.HiTelemetry.persistTrack(payload); } catch(_) {} }
    } catch(_) {}
  };

})();