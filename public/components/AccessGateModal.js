// AccessGateModal - minimal UI responding to hi:access-requested
// Non-invasive: only appears for anonymous users when explicitly triggered.
(function(){
  function emit(name, detail){
    try { window.dispatchEvent(new CustomEvent(name,{ detail })); } catch(_){}
  }
  function ensureContainer(){
    let el = document.getElementById('hi-access-gate-modal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'hi-access-gate-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(12px);';
    el.innerHTML = '<div style="max-width:380px;width:90%;background:#0F0F23;border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:28px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,system-ui;box-shadow:0 20px 50px rgba(0,0,0,.5);">\n  <h2 style="margin:0 0 12px;font-size:22px;letter-spacing:-.5px;background:linear-gradient(135deg,#FFD93D,#4ECDC4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Join Hi Collective</h2>\n  <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:rgba(255,255,255,.75)">Create an account or sign in to unlock full access and personalized features.</p>\n  <div style="display:flex;flex-direction:column;gap:12px">\n    <button id="hiAccessSignIn" style="background:linear-gradient(135deg,#FFD93D,#FF7B24);border:none;color:#111;padding:14px 20px;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer">🚀 Sign In / Magic Link</button>\n    <button id="hiAccessExplore" style="background:transparent;border:1px solid rgba(255,255,255,.3);color:#fff;padding:12px 20px;border-radius:12px;font-weight:500;font-size:14px;cursor:pointer">🌟 Explore Anonymously</button>\n    <button id="hiAccessClose" style="background:transparent;border:none;color:rgba(255,255,255,.5);padding:8px 4px;font-size:12px;cursor:pointer">← Close</button>\n  </div>\n</div>';
    document.body.appendChild(el);
    el.querySelector('#hiAccessClose').addEventListener('click', ()=> hide());
    el.querySelector('#hiAccessExplore').addEventListener('click', ()=> { hide(); window.dispatchEvent(new CustomEvent('hi:access-explore')); });
    el.querySelector('#hiAccessSignIn').addEventListener('click', ()=> { hide(); const dest=(window.hiPaths?.resolve?window.hiPaths.resolve('signin.html'):'/signin.html'); window.location.href=dest+'?next='+encodeURIComponent(location.pathname); });
    return el;
  }
  function show(){ const el=ensureContainer(); el.style.display='flex'; requestAnimationFrame(()=>{ el.style.opacity='1'; }); }
  function hide(){ const el=document.getElementById('hi-access-gate-modal'); if(!el) return; el.style.opacity='0'; setTimeout(()=>{ if(el.style.opacity==='0') el.style.display='none'; },250); }

  // Trigger only when explicit access request event signals anonymous block
  function routeDecision(d){
    if(!d || !d.decision) return;
    const { decision, context } = d;
    if(decision.allow){ emit('hi:access-allowed', { context, decision }); return; }
    emit('hi:access-blocked', { context, decision });
    switch(decision.reason){
      case 'anonymous':
        show();
        break;
      case 'error':
        console.warn('[AccessGateModal] Access error context:', context);
        show();
        break;
      default:
        show();
    }
  }

  window.addEventListener('hi:access-requested', (e)=>{ routeDecision(e.detail); });

  window.AccessGateModal = { show, hide, routeDecision };
})();
