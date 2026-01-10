// hi-paths.js - Environment-aware path resolver for dev (/public) vs prod (root)
(function(){
  function isLocalhost(){
    try { return /localhost|127\.0\.0\.1/.test(location.hostname); } catch { return false; }
  }
  function basePrefix(){
    try {
      const path = location.pathname || '';
      // If serving repository root via python http.server, pages live under /public
      if (isLocalhost() && path.includes('/public/')) return '/public/';
      // Some dev setups serve root /public as root; detect index path
      if (isLocalhost() && path.endsWith('/')) return '/public/';
      return '/';
    } catch { return '/'; }
  }
  function resolve(file, params){
    try {
      if (!file) return '/';
      if (/^https?:\/\//.test(file)) return file; // absolute URL passthrough
      const base = basePrefix();
      const cleaned = String(file).replace(/^\/+/, '');
      const url = base + cleaned;
      if (params && typeof params === 'object') {
        const u = new URL(url, location.origin);
        Object.entries(params).forEach(([k,v])=>{ if (v!==undefined && v!==null) u.searchParams.set(k, String(v)); });
        return u.pathname + (u.search?u.search:'') + (u.hash?u.hash:'');
      }
      return url;
    } catch { return '/' + String(file).replace(/^\/+/, ''); }
  }
  function getPostAuthURL(next){
    try {
      const page = next || 'hi-dashboard.html';
      const base = resolve('post-auth.html');
      const u = new URL(base, location.origin);
      u.searchParams.set('next', page);
      return u.href;
    } catch { return `${location.origin}/post-auth.html?next=${encodeURIComponent(next||'hi-dashboard.html')}`; }
  }
  
  // Page key to filename mapping (single source of truth)
  const PAGE_MAP = {
    'dashboard': 'hi-dashboard.html',
    'today': 'hi-dashboard.html',
    'island': 'hi-island-NEW.html',
    'explore': 'hi-island-NEW.html',
    'muscle': 'hi-muscle.html',
    'gym': 'hi-muscle.html',
    'profile': 'profile.html',
    'me': 'profile.html',
    'admin': 'hi-mission-control.html',
    'signin': 'signin.html',
    'signup': 'signup.html'
  };
  
  function page(key, params){
    try {
      const filename = PAGE_MAP[String(key).toLowerCase()] || key;
      return resolve(filename, params);
    } catch { return resolve(key, params); }
  }
  
  // Diagnostics: log resolved URLs when ?diag=1
  function diagnose(){
    if (!/[?&]diag=1/.test(location.search)) return;
    console.group('🔍 [hiPaths] Diagnostics');
    console.log('Environment:', isLocalhost() ? 'LOCAL' : 'PRODUCTION');
    console.log('Base prefix:', basePrefix());
    console.log('\n📄 Page resolver tests:');
    Object.keys(PAGE_MAP).forEach(key => {
      console.log(`  ${key.padEnd(12)} → ${page(key)}`);
    });
    console.groupEnd();
  }
  
  // Run diagnostics if requested
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', diagnose);
  } else {
    diagnose();
  }
  
  window.hiPaths = { resolve, getPostAuthURL, page, PAGE_MAP };
})();
