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
  function injectFooterLink(){
    if (document.getElementById('hi-contrast-toggle')) return;
    
    const link = document.createElement('button');
    link.id = 'hi-contrast-toggle';
    link.type = 'button';
    link.setAttribute('aria-pressed', enabled ? 'true':'false');
    link.setAttribute('aria-label','Toggle high-contrast accessibility mode');
    link.textContent = enabled ? 'High Contrast: ON' : 'Accessibility';
    link.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:1000;background:transparent;color:rgba(255,255,255,0.4);font:500 11px system-ui;padding:4px 8px;border:none;border-radius:4px;cursor:pointer;text-decoration:underline;transition:all 0.2s ease;';
    
    link.addEventListener('mouseenter', ()=>{
      link.style.color = 'rgba(255,255,255,0.8)';
    });
    link.addEventListener('mouseleave', ()=>{
      link.style.color = 'rgba(255,255,255,0.4)';
    });
    link.addEventListener('click', ()=>{
      toggle();
      const active = document.documentElement.classList.contains('hi-a11y-contrast');
      link.textContent = active ? 'High Contrast: ON' : 'Accessibility';
      link.setAttribute('aria-pressed', active ? 'true':'false');
    });
    
    document.addEventListener('DOMContentLoaded',()=>{
      // Insert before footer or at end of body
      const footer = document.querySelector('footer, .footer, [role="contentinfo"]');
      if (footer && footer.parentNode) {
        footer.parentNode.insertBefore(link, footer);
      } else {
        document.body.appendChild(link);
      }
    });
  }
  injectFooterLink();
})();
