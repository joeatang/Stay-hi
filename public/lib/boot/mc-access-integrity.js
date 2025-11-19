(function(){
  // Mission Control access integrity watchdog
  try { console.debug('[MC-Access-Integrity] starting'); } catch {}
  const CHECK_INTERVAL = 2500; // ms
  function hasFooterAdmin(){
    return !!document.querySelector('.hi-footer-tab[href="hi-mission-control.html"]');
  }
  function injectIfMissing(){
    if (hasFooterAdmin()) return;
    // Attempt footer re-init if component exposes API
    if (window.HiFooter?.appendAdminTab){
      try { window.HiFooter.appendAdminTab(true); } catch {}
    } else if (window.HiFooter?.init){
      try { window.HiFooter.init(); } catch {}
    }
    // Fallback: inject minimal anchor at bottom-right
    if (!hasFooterAdmin()){
      if (!document.getElementById('mcAccessFallback')){
        const a = document.createElement('button');
        a.id = 'mcAccessFallback';
        a.type = 'button';
        a.textContent = '🛡️ Mission Control';
        a.style.cssText = 'position:fixed;right:14px;bottom:64px;z-index:9999;background:#FFD166;color:#111;padding:10px 14px;border:none;border-radius:12px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.4);cursor:pointer;font-size:13px';
        a.addEventListener('click', ()=>{ if (window.HiMissionControlQuick){ window.HiMissionControlQuick.open(); } else { window.location.href='hi-mission-control.html'; }});
        document.body.appendChild(a);
        try { console.warn('[MC-Access-Integrity] Fallback button injected'); } catch {}
      }
    }
  }
  // Periodic check (clears itself once footer admin appears)
  const interval = setInterval(()=>{
    if (hasFooterAdmin()) { clearInterval(interval); return; }
    injectIfMissing();
  }, CHECK_INTERVAL);
  // One immediate attempt
  injectIfMissing();
})();
