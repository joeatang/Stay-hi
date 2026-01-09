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

    // 🎨 GOLD STANDARD: Tesla-grade update modal
    try {
      // Create overlay backdrop
      const overlay = document.createElement('div');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'hi-update-title');
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 999999;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
      `;

      // Create modal card
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: linear-gradient(135deg, rgba(26, 29, 58, 0.98), rgba(37, 43, 82, 0.98));
        border-radius: 24px;
        padding: 40px 32px;
        max-width: 420px;
        width: 100%;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 209, 102, 0.2);
        animation: slideUp 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // Icon
      const icon = document.createElement('div');
      icon.style.cssText = `
        font-size: 64px;
        margin-bottom: 20px;
        animation: pulse 2s ease-in-out infinite;
      `;
      icon.textContent = '✨';

      // Title
      const title = document.createElement('h3');
      title.id = 'hi-update-title';
      title.style.cssText = `
        color: #FFD166;
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 12px 0;
        letter-spacing: -0.5px;
      `;
      title.textContent = 'Update Available';

      // Description
      const desc = document.createElement('p');
      desc.style.cssText = `
        color: rgba(255, 255, 255, 0.9);
        font-size: 16px;
        line-height: 1.5;
        margin: 0 0 32px 0;
      `;
      desc.textContent = 'A new version of Stay Hi is ready with improvements and fixes.';

      // Button container
      const btnContainer = document.createElement('div');
      btnContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;

      // Update Now button
      const btnUpdate = document.createElement('button');
      btnUpdate.id = 'hi-sw-update-now';
      btnUpdate.style.cssText = `
        background: linear-gradient(135deg, #FFD166, #FF7B24);
        border: none;
        color: #111;
        padding: 16px 32px;
        border-radius: 12px;
        font-size: 17px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(255, 209, 102, 0.3);
      `;
      btnUpdate.textContent = '✨ Update Now';
      btnUpdate.onmouseover = () => {
        btnUpdate.style.transform = 'translateY(-2px)';
        btnUpdate.style.boxShadow = '0 6px 16px rgba(255, 209, 102, 0.4)';
      };
      btnUpdate.onmouseout = () => {
        btnUpdate.style.transform = 'translateY(0)';
        btnUpdate.style.boxShadow = '0 4px 12px rgba(255, 209, 102, 0.3)';
      };
      btnUpdate.onclick = () => {
        try { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch {}
        overlay.remove();
        setTimeout(() => window.location.reload(), 500);
      };

      // Later button
      const btnLater = document.createElement('button');
      btnLater.style.cssText = `
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.7);
        padding: 14px 32px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      btnLater.textContent = 'Later';
      btnLater.onmouseover = () => {
        btnLater.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        btnLater.style.color = 'rgba(255, 255, 255, 0.9)';
      };
      btnLater.onmouseout = () => {
        btnLater.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        btnLater.style.color = 'rgba(255, 255, 255, 0.7)';
      };
      btnLater.onclick = () => overlay.remove();

      // Assemble modal
      btnContainer.appendChild(btnUpdate);
      btnContainer.appendChild(btnLater);
      modal.appendChild(icon);
      modal.appendChild(title);
      modal.appendChild(desc);
      modal.appendChild(btnContainer);
      overlay.appendChild(modal);

      // Add CSS animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `;
      document.head.appendChild(style);

      // Add to DOM
      document.body.appendChild(overlay);

      // Focus primary action for accessibility
      setTimeout(() => btnUpdate.focus(), 100);

    } catch(error) {
      console.error('Failed to show update modal:', error);
      // Fallback: Simple banner
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
    }
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
    installBtn.setAttribute('aria-label', 'Install Stay Hi app to your device');
    installBtn.setAttribute('title', 'Install Stay Hi app');
    installBtn.setAttribute('type', 'button');
    installBtn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #FFD166, #FF7B24);
      color: #111;
      border: none;
      padding: 14px 24px;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(255, 209, 102, 0.4);
      z-index: 10000;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Hover effect
    installBtn.onmouseover = () => {
      installBtn.style.transform = 'translateY(-3px) scale(1.05)';
      installBtn.style.boxShadow = '0 8px 25px rgba(255, 209, 102, 0.5)';
    };
    installBtn.onmouseout = () => {
      installBtn.style.transform = 'translateY(0) scale(1)';
      installBtn.style.boxShadow = '0 6px 20px rgba(255, 209, 102, 0.4)';
    };
    
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      // Animate button click
      installBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        installBtn.style.transform = 'scale(1)';
      }, 100);
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installed');
        installBtn.textContent = '✨ Installed!';
        installBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        installBtn.style.color = '#fff';
        setTimeout(() => installBtn.remove(), 2000);
      }
      
      deferredPrompt = null;
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
      // 🔧 FIX: Disable perf beaconing by default to prevent request storms
      // Enable via ?perf-beacon=1 for debugging only
      const endpoint = '/perf-beacon';
      const perfBeaconEnabled = location.search.includes('perf-beacon=1');
      if (navigator.sendBeacon && perfBeaconEnabled && (location.hostname === 'stay-hi.vercel.app')) {
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
    // 🔧 FIX: Disable integrity beaconing by default to prevent request storms
    // Enable via ?integrity-beacon=1 for debugging only
    const integrityBeaconEnabled = searchParams.get('integrity-beacon') === '1';
    window.__HI_BEACON_DISABLED = !integrityBeaconEnabled;
    
    // Detect beacon endpoint availability (public-root deployments lack /api functions)
    if (isProdHost && integrityBeaconEnabled) {
      try {
        fetch('/integrity-beacon', { method:'HEAD' }).then(r => {
          if (!r.ok) { window.__HI_BEACON_DISABLED = true; }
        }).catch(()=> { window.__HI_BEACON_DISABLED = true; });
      } catch { window.__HI_BEACON_DISABLED = true; }
    }
    function sendIntegrityBeacon(payload){
      if (!isProdHost || window.__HI_BEACON_DISABLED) return;
      try { navigator.sendBeacon && navigator.sendBeacon('/integrity-beacon', new Blob([JSON.stringify(payload)], { type:'application/json' })); } catch(_) {}
    }
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
              sendIntegrityBeacon({ type:'missing', src, build: hiBuildTag, ts: Date.now() });
                // Telemetry persistence
                if (window.HiTelemetry) {
                  try { window.HiTelemetry.persistIntegrity({ type:'missing', src, build: hiBuildTag, ts: Date.now() }); } catch(_) {}
                }
            } else if (expected && hasIntegrity && !matches) {
              console.warn('[HiIntegrity] Integrity hash mismatch:', { src, expected, actual });
              sendIntegrityBeacon({ type:'mismatch', src, expected, actual, build: hiBuildTag, ts: Date.now() });
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