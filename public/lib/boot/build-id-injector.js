(function(){
  try {
    const buildTag = window.HI_BUILD || window.__BUILD_STAMP || new Date().toISOString().split('T')[0];
    const el = document.createElement('div');
    el.id = 'hi-build-id';
    el.textContent = 'Build: ' + buildTag;
    el.style.cssText = 'position:fixed;bottom:4px;left:8px;font:11px system-ui;color:#888;z-index:9999;pointer-events:none;';
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(el));
  } catch(e){ console.warn('[Dashboard][BuildID] injection failed', e); }
})();
