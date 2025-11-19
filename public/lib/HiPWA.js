// lib/HiPWA.js
// CONSOLIDATED: 2025-11-01 from assets/pwa-manager.js
// 🚀 PWA Registration & Update Manager
(function() {
  'use strict';
  // Performance mark: PWA init
  try { performance.mark && performance.mark('sw:init'); } catch(_) {}
  // Build tag (version) surfaced early for integrity banner / telemetry
  const hiBuildTag = window.HI_BUILD || window.__BUILD_STAMP || '';
  const commitShaShort = (window.__COMMIT_SHA || '').slice(0,7);
  
  // Allow SW only on prod and local to prevent preview pollution
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const isProd = host === 'stay-hi.vercel.app';
  // Debug override: allow disabling Service Worker via ?no-sw=1 to troubleshoot auth/storage issues
  const searchParams = new URLSearchParams(window.location.search);
  const disableSW = searchParams.get('no-sw') === '1';
  const enableLocalSW = searchParams.get('sw') === '1';
  const swlog = searchParams.get('swlog') === '1';
  const swforceprompt = searchParams.get('swprompt') === '1';
  const swLog = (...args) => { if (swlog) console.log('[HiPWA]', ...args); };
  const path = window.location.pathname;
  const isAuthRoute = /post-auth\.html|signin\.html|invite-admin|invite-admin-deprecated/.test(path);
  if (!isLocal && !isProd) {
    console.log('🚫 Skipping Service Worker on non-prod host:', host);
    return;
  }
  // Default: do NOT register SW on localhost to prevent stale caches during development.
  if (isLocal && !enableLocalSW) {
    console.log('🚫 Skipping Service Worker on localhost (dev). Append ?sw=1 to enable temporarily.');
    return;
  }
  if (disableSW || isAuthRoute) {
    console.log('🔧 SW disabled via ?no-sw=1 for debugging');
    // Unregister any existing SW so we truly bypass cache for this tab
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }
    return; // Skip registration entirely (auth or debug route)
  }
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Support both docroots: '/' (prod/dev public-root) and '/public' (repo-root servers)
        const underPublicPath = window.location.pathname.startsWith('/public/');
        const swPath = underPublicPath ? '/public/sw.js' : '/sw.js';
        const scope = underPublicPath ? '/public/' : '/';
        // Versioned registration to bust stale caches on deploy.
        // Previous logic used Date.now() every load locally, which caused a new SW version each refresh
        // and could trigger perceived reload loops. We now persist a stable local build tag for the session.
        let buildTag = window.HI_BUILD || window.__BUILD_STAMP || '';
        if (isLocal) {
          // Use a single stable tag for all local sessions to prevent churn
          buildTag = 'local-dev';
        }
        const versionedSwPath = buildTag ? `${swPath}?v=${encodeURIComponent(buildTag)}` : swPath;

        try { performance.mark && performance.mark('sw:register:start'); } catch(_) {}
        let registration = await navigator.serviceWorker.register(versionedSwPath, { scope });
        try { performance.mark && performance.mark('sw:register:end'); performance.measure && performance.measure('sw:register', 'sw:register:start', 'sw:register:end'); } catch(_) {}
        swLog('✅ Service Worker registered:', registration.scope, 'path:', versionedSwPath);

        // Scope mismatch recovery (handles switching between '/' and '/public' servers)
        try {
          const expectedScope = location.origin + scope;
          if (registration.scope !== expectedScope && !sessionStorage.getItem('hi-sw-scope-fixed')) {
            swLog('Scope mismatch detected. Re-registering with expected scope:', expectedScope);
            await registration.unregister();
            sessionStorage.setItem('hi-sw-scope-fixed', '1');
            registration = await navigator.serviceWorker.register(versionedSwPath, { scope });
          } else {
            sessionStorage.removeItem('hi-sw-scope-fixed');
          }
        } catch(_) {}
        // Update checks only after the SW is ready to avoid noisy dev errors
        const safeUpdate = (reg) => { try { reg.update(); } catch(_) {} };
        navigator.serviceWorker.ready.then(reg => {
          safeUpdate(reg);
          // Periodic update check (every 30 minutes) once ready
          setInterval(() => safeUpdate(reg), 30 * 60 * 1000);
          // Opportunistic check when tab becomes visible
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') safeUpdate(reg);
          });
          try { performance.mark && performance.mark('sw:ready'); performance.measure && performance.measure('sw:init->ready', 'sw:init', 'sw:ready'); } catch(_) {}
        });
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (isLocal && !swforceprompt) {
                try { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch {}
              } else {
                showUpdateNotification(registration);
              }
            }
          });
        });

        // If there's already a waiting worker (e.g., page loaded with an update ready), prompt user
        if (registration.waiting && navigator.serviceWorker.controller) {
          if (isLocal && !swforceprompt) {
            try { registration.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
          } else {
            showUpdateNotification(registration);
          }
        }

        // When the new SW takes control, reload once to activate fresh assets
        // Only reload if the page was already controlled (avoid first-install reload loop)
        const hadController = !!navigator.serviceWorker.controller;
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return;
          if (!hadController) {
            // First-time install taking control; do not force reload
            reloaded = true;
            return;
          }
          reloaded = true;
          window.location.reload();
        });

        // Optional: handle SW -> page messages for diagnostics/UX
        navigator.serviceWorker.addEventListener('message', (event) => {
          const data = event.data || {};
          if (data.type === 'CACHE_UPDATED') {
            console.log('♻️ Caches updated by SW');
          } else if (data.type === 'CACHES_CLEARED') {
            console.log('🧹 Caches cleared');
          }
        });
        
      } catch (error) {
        console.log('❌ Service Worker registration failed:', error);
      }
    });
  }
  
  // Show update notification with Hi‑OS‑grade UX
  function showUpdateNotification(registration) {
    // In local dev, auto-update silently unless explicitly asked via ?swprompt=1
    if (isLocal && !swforceprompt) {
      try { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch {}
      return;
    }
    // One-per-version prompt guard using worker scriptURL
    try {
      const ver = (registration?.waiting && registration.waiting.scriptURL) || (registration?.installing && registration.installing.scriptURL) || '';
      if (ver && sessionStorage.getItem('hi-sw-prompted:' + ver)) {
        swLog('Already prompted for this SW version:', ver);
        return;
      }
      if (ver) sessionStorage.setItem('hi-sw-prompted:' + ver, '1');
    } catch(_) {}

    if (window.PremiumUX) {
      window.PremiumUX.showNotice(`
        <div role="dialog" aria-modal="true" aria-labelledby="hi-sw-update-title" style="text-align: center; padding: 20px;">
          <h3 id="hi-sw-update-title" style="color: #FFD166; margin-bottom: 12px;">🚀 App Update Available</h3>
          <p style="margin-bottom: 16px;">A new version of Hi Collective is ready!</p>
          <button id="hi-sw-update-now" onclick="updateApp()" style="
            background: linear-gradient(135deg, #FFD166, #FF7B24);
            border: none; color: #111; padding: 12px 24px; border-radius: 8px;
            font-size: 16px; cursor: pointer; font-weight: bold; margin-right: 8px;
          ">✨ Update Now</button>
          <button id="hi-sw-update-later" onclick="dismissUpdate()" style="
            background: transparent; border: 1px solid #666; color: #666;
            padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;
          ">Later</button>
        </div>
      `, { duration: 0, persistent: true });
      // Move focus to the primary action for screen readers/keyboard users
      setTimeout(() => {
        try {
          const primary = document.getElementById('hi-sw-update-now');
          if (primary) primary.focus();
        } catch(_) {}
      }, 0);
    } else {
      // Non-blocking fallback banner when PremiumUX is not available
      try {
        const bar = document.createElement('div');
        bar.setAttribute('role','dialog');
        bar.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;background:#111;color:#fff;border:1px solid #444;border-radius:10px;padding:10px 12px;box-shadow:0 6px 20px rgba(0,0,0,.35);font:14px/1.4 -apple-system,system-ui,Segoe UI,Roboto;display:flex;gap:8px;align-items:center;';
        const text = document.createElement('span');
        text.textContent = 'An update is available.';
        const btnNow = document.createElement('button');
        btnNow.textContent = 'Update now';
        btnNow.style.cssText = 'background:#FFD166;color:#111;border:0;border-radius:8px;padding:6px 10px;font-weight:600;cursor:pointer;';
        const btnLater = document.createElement('button');
        btnLater.textContent = 'Later';
        btnLater.style.cssText = 'background:transparent;color:#bbb;border:1px solid #555;border-radius:8px;padding:6px 10px;cursor:pointer;';
        bar.append(text, btnNow, btnLater);
        document.body.appendChild(bar);
        btnNow.addEventListener('click', () => { try { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch {}; bar.remove(); });
        btnLater.addEventListener('click', () => bar.remove());
      } catch(_) {}
      return;
    }

    // Make functions available globally for button clicks (cleanup afterwards)
    function cleanup() {
      try { delete window.updateApp; } catch(_){ window.updateApp = undefined; }
      try { delete window.dismissUpdate; } catch(_){ window.dismissUpdate = undefined; }
    }
    window.updateApp = () => {
      try { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch {}
      cleanup();
      window.location.reload();
    };
    window.dismissUpdate = () => {
      if (window.PremiumUX) {
        window.PremiumUX.hideNotice();
      }
      cleanup();
    };
  }
  
  // Install prompt handling
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });
  
  function showInstallButton() {
    // Create install button if it doesn't exist
    if (document.getElementById('installApp')) return;
    
    const installBtn = document.createElement('button');
    installBtn.id = 'installApp';
    installBtn.innerHTML = '📱 Install App';
    installBtn.setAttribute('aria-label', 'Install app');
    installBtn.setAttribute('title', 'Install app');
    installBtn.setAttribute('type', 'button');
    installBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
      z-index: 1000;
      animation: installPulse 2s infinite;
    `;
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes installPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3); }
        50% { transform: scale(1.05); box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5); }
      }
    `;
    document.head.appendChild(style);
    
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installed');
        if (window.PremiumUX) {
          window.PremiumUX.celebrate(installBtn, '🎉 Installed!');
        }
      }
      
      deferredPrompt = null;
      installBtn.remove();
    });
    
    document.body.appendChild(installBtn);
  }
  
  // Handle app installed event
  window.addEventListener('appinstalled', () => {
    console.log('✅ Hi Collective PWA installed');
    
    if (window.PremiumUX) {
      window.PremiumUX.showNotice(`
        <div style="text-align: center; padding: 20px;">
          <h3 style="color: #10b981; margin-bottom: 12px;">🎉 Hi Collective Installed!</h3>
          <p>Welcome to the Hi revolution on your device!</p>
        </div>
      `, { duration: 3000 });
    }
    
    // Remove install button if it exists
    const installBtn = document.getElementById('installApp');
    if (installBtn) {
      installBtn.remove();
    }
  });
  
  // Detect if running as PWA
  function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
  
  // Add PWA-specific styling
  if (isPWA()) {
    document.documentElement.classList.add('pwa-mode');
    
    // Add PWA-specific styles
    const pwaStyle = document.createElement('style');
    pwaStyle.textContent = `
      .pwa-mode {
        --header-padding-top: env(safe-area-inset-top);
        --footer-padding-bottom: env(safe-area-inset-bottom);
      }
      
      .pwa-mode .admin-header,
      .pwa-mode .header {
        padding-top: calc(1rem + var(--header-padding-top));
      }
      
      .pwa-mode .footer,
      .pwa-mode .fixed-bottom {
        padding-bottom: calc(1rem + var(--footer-padding-bottom));
      }
    `;
    document.head.appendChild(pwaStyle);
  }

  // Offline / Online banner for real-time connectivity state
  (function initOfflineBanner(){
    const id = 'hi-offline-banner';
    function ensure(){
      let b = document.getElementById(id);
      if (!b){
        b = document.createElement('div');
        b.id = id;
        b.setAttribute('role','status');
        b.setAttribute('aria-live','polite');
        b.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);background:#FF7B24;color:#111;padding:6px 14px;font:600 13px system-ui;border-radius:0 0 10px 10px;z-index:100000;box-shadow:0 4px 12px rgba(0,0,0,.25);display:none;';
        b.textContent = 'Offline mode: showing cached content';
        document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(b));
      }
      return b;
    }
    function show(){ const b = ensure(); b.style.display='block'; }
    function hide(){ const b = document.getElementById(id); if (b) b.style.display='none'; }
    window.addEventListener('offline', show);
    window.addEventListener('online', hide);
    if (!navigator.onLine) show();
  })();

  // Expose perf report helper (non-invasive)
  if (!window.__perfReport){
    window.__perfReport = function(){
      if (!performance || !performance.getEntriesByType) return {};
      const measures = performance.getEntriesByType('measure').map(m => ({ name: m.name, duration: m.duration }));
      const marks = performance.getEntriesByType('mark').map(m => ({ name: m.name, time: m.startTime }));
      return { marks, measures };
    };
  }

  // Hi Performance Vitals (LCP, FID, CLS) instrumentation
  (function initPerfVitals(){
    if (!('PerformanceObserver' in window)) return;
    try { performance.mark && performance.mark('perf:vitals:init'); } catch(_) {}

    let lcpValue = null;
    let fidValue = null;
    let clsValue = 0;
    let clsSessionValue = 0;
    let clsSessionEntries = [];
    let fcpValue = null;
    let longTasks = 0; // count
    let tbtValue = 0; // Total Blocking Time approximation (sum of (duration-50ms) for tasks >50ms)

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) lcpValue = lastEntry.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch(_) {}

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        if (firstInput) {
          fidValue = firstInput.processingStart - firstInput.startTime;
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch(_) {}

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // Only count if not triggered by recent user input
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsSessionValue += entry.value;
            clsSessionEntries.push(entry);
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch(_) {}
    // First Contentful Paint (from buffered entries)
    try {
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entry = entryList.getEntries().pop();
        if (entry) fcpValue = entry.startTime;
      });
      fcpObserver.observe({ type: 'first-contentful-paint', buffered: true });
    } catch(_) {}

    // Long Tasks (for TBT approximation)
    try {
      const ltObserver = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach(e => {
          longTasks++;
          if (e.duration > 50) tbtValue += (e.duration - 50);
        });
      });
      ltObserver.observe({ type: 'longtask', buffered: true });
    } catch(_) {}

    function summarizeResources(){
      if (!performance.getEntriesByType) return null;
      const resources = performance.getEntriesByType('resource') || [];
      const jsCss = resources.filter(r => /\.js$|\.css$/.test(r.name));
      const top = jsCss.sort((a,b)=> (b.transferSize||0)-(a.transferSize||0)).slice(0,10).map(r => ({
        name: r.name.split('/').slice(-1)[0],
        transfer: r.transferSize,
        dur: Number(r.duration.toFixed(1))
      }));
      const totalTransfer = resources.reduce((sum,r)=> sum + (r.transferSize||0),0);
      return { totalTransfer, top };
    }

    function getFCPFallback(){
      if (fcpValue) return fcpValue;
      try {
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) return fcpEntry.startTime;
      } catch(_) {}
      return null;
    }

    function finalizeVitals(){
      try { performance.mark && performance.mark('perf:vitals:finalize'); } catch(_) {}
      const nav = performance.getEntriesByType('navigation')[0];
      const ttfb = nav ? nav.responseStart : null;
      const resSummary = summarizeResources();
      const data = {
        ttfb,
        lcp: lcpValue,
        fid: fidValue,
        cls: Number(clsValue.toFixed(4)),
        fcp: getFCPFallback(),
        tbt: Number(tbtValue.toFixed(1)),
        longTasks,
        buildTag: window.HI_BUILD || window.__BUILD_STAMP || '',
        url: location.pathname,
        ts: Date.now()
      };
      if (resSummary) data.resources = resSummary;
      window.__perfVitals = data;
        // Persist to telemetry tables if available
        if (window.HiTelemetry) {
          try { window.HiTelemetry.persistPerf(data); } catch(_) {}
        }
      if (location.search.includes('perf=1')) {
        console.log('[PerfVitals]', data);
      }
      // Beacon endpoint placeholder; only send on prod host
      const endpoint = '/perf-beacon';
      if (navigator.sendBeacon && (location.hostname === 'stay-hi.vercel.app')) {
        try { navigator.sendBeacon(endpoint, JSON.stringify(data)); } catch(_) {}
      }
    }

    // Send when page hidden or after timeout whichever comes first
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !window.__perfVitals) {
        finalizeVitals();
      }
    });
    setTimeout(() => { if (!window.__perfVitals) finalizeVitals(); }, 8000);
  })();

  // Build Tag Banner & Script Integrity Scanner (optional, non-blocking)
  (function initIntegrity(){
    const host = location.hostname;
    const isProdHost = host === 'stay-hi.vercel.app';
    const searchParams = new URLSearchParams(location.search);
    const showBanner = !!hiBuildTag && (searchParams.get('show-build') === '1' || !isProdHost);
    function injectBanner(){
      if (!showBanner) return;
      if (document.getElementById('hi-build-banner')) return;
      const b = document.createElement('div');
      b.id = 'hi-build-banner';
      b.style.cssText = 'position:fixed;bottom:6px;left:6px;font:600 11px system-ui;background:rgba(17,17,17,.75);color:#FFD166;padding:4px 8px;border-radius:6px;z-index:99999;backdrop-filter:blur(4px);-webkit-font-smoothing:antialiased;';
      const env = isProdHost ? 'prod' : (host === 'localhost' ? 'local' : host);
      b.textContent = `build:${hiBuildTag}${commitShaShort?'.'+commitShaShort:''} • ${env}`;
      document.body.appendChild(b);
    }

    // External script integrity audit (advisory only)
    const expectedHashes = {
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1/dist/umd/supabase.min.js': 'sha384-XLEuzmdNfK1V09d59bu+Uv3EFtEp5kFP8BmseBq85CUpeFZXhUfqjk4ZeR/biZmS',
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1': 'sha384-XLEuzmdNfK1V09d59bu+Uv3EFtEp5kFP8BmseBq85CUpeFZXhUfqjk4ZeR/biZmS',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js': 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH',
      'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js': 'sha384-RLIyj5q1b5XJTn0tqUhucRZe40nFTocRP91R/NkRJHwAe4XxnTV77FXy/vGLiec2'
    };
    const integrity = {
      audit(){
        const results = [];
        const scripts = document.querySelectorAll('script[src]');
        const origin = location.origin;
        scripts.forEach(s => {
          const src = s.getAttribute('src') || '';
          if (!src || src.startsWith(origin) || src.startsWith('/') || src.startsWith('data:')) return;
          const hasIntegrity = s.hasAttribute('integrity');
          const hasCrossOrigin = s.hasAttribute('crossorigin') || s.hasAttribute('crossOrigin');
          const expected = expectedHashes[src];
          const actual = hasIntegrity ? s.getAttribute('integrity') : '';
          const matches = expected ? expected === actual : null;
          results.push({ src, hasIntegrity, hasCrossOrigin, expected, actual, matches });
          if (isProdHost) {
            if (!hasIntegrity) {
              console.warn('[HiIntegrity] Missing integrity attribute for external script:', src);
              try { navigator.sendBeacon && navigator.sendBeacon('/integrity-beacon', new Blob([JSON.stringify({ type:'missing', src, build: hiBuildTag, ts: Date.now() })], { type:'application/json' })); } catch(_) {}
                // Telemetry persistence
                if (window.HiTelemetry) {
                  try { window.HiTelemetry.persistIntegrity({ type:'missing', src, build: hiBuildTag, ts: Date.now() }); } catch(_) {}
                }
            } else if (expected && hasIntegrity && !matches) {
              console.warn('[HiIntegrity] Integrity hash mismatch:', { src, expected, actual });
              try { navigator.sendBeacon && navigator.sendBeacon('/integrity-beacon', new Blob([JSON.stringify({ type:'mismatch', src, expected, actual, build: hiBuildTag, ts: Date.now() })], { type:'application/json' })); } catch(_) {}
                if (window.HiTelemetry) {
                  try { window.HiTelemetry.persistIntegrity({ type:'mismatch', src, expected, actual, build: hiBuildTag, ts: Date.now() }); } catch(_) {}
                }
            }
          }
        });
        return results;
      },
      summary(){
        const list = integrity.audit();
        const missing = list.filter(r => !r.hasIntegrity);
        const mismatched = list.filter(r => r.matches === false);
        return { total: list.length, missing: missing.length, mismatched: mismatched.length, details: list };
      },
      expected: expectedHashes
    };
    window.HiIntegrity = integrity;

    function runAuditSoon(){
      try { integrity.audit(); } catch(_) {}
    }
    document.addEventListener('DOMContentLoaded', () => {
      injectBanner();
      runAuditSoon();
    });
    // Fallback if DOMContentLoaded already fired
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      injectBanner();
      runAuditSoon();
    }
  })();
  
})();