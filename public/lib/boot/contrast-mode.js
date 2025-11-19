// Optional High-Contrast Accessibility Mode Toggle (Hi-OS non-destructive)
// Activation: query param a11y=1 OR localStorage hiA11yContrast=1
// Adds a floating toggle button; persists preference.
(function(){
  const PARAM_KEY = 'a11y';
  const LS_KEY = 'hiA11yContrast';
  const url = new URL(location.href);
  if (url.searchParams.get(PARAM_KEY) === '1') {
    try { localStorage.setItem(LS_KEY,'1'); } catch(_) {}
  }
  const enabled = (()=>{ try { return localStorage.getItem(LS_KEY) === '1'; } catch(_) { return false; } })();
  if (enabled) {
    document.documentElement.classList.add('hi-a11y-contrast');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/a11y-contrast.css';
    document.head.appendChild(link);
  }
  function toggle(){
    const currently = document.documentElement.classList.contains('hi-a11y-contrast');
    if (currently){
      document.documentElement.classList.remove('hi-a11y-contrast');
      try { localStorage.removeItem(LS_KEY); } catch(_){ }
      const existing = document.querySelector('link[href="assets/a11y-contrast.css"]');
      if (existing) existing.remove();
    } else {
      document.documentElement.classList.add('hi-a11y-contrast');
      try { localStorage.setItem(LS_KEY,'1'); } catch(_) {}
      if (!document.querySelector('link[href="assets/a11y-contrast.css"]')){
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'assets/a11y-contrast.css';
        document.head.appendChild(link);
      }
    }
  }
  function injectButton(){
    if (document.getElementById('hi-contrast-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'hi-contrast-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-pressed', enabled ? 'true':'false');
    btn.setAttribute('aria-label','Toggle high-contrast accessibility mode');
    btn.textContent = enabled ? 'A11y Contrast: ON' : 'A11y Contrast: OFF';
    btn.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:100001;background:#111;color:#FFD166;font:600 12px system-ui;padding:8px 12px;border:1px solid #FFD166;border-radius:8px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);';
    btn.addEventListener('click', ()=>{
      toggle();
      const active = document.documentElement.classList.contains('hi-a11y-contrast');
      btn.textContent = active ? 'A11y Contrast: ON' : 'A11y Contrast: OFF';
      btn.setAttribute('aria-pressed', active ? 'true':'false');
    });
    document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(btn));
  }
  injectButton();
})();
