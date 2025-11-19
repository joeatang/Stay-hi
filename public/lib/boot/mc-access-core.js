(function(){
  'use strict';
  try { console.debug('[MC-Core] init'); } catch {}

  // --- Helpers ------------------------------------------------------------
  function getClient(){
    try {
      return (window.HiSupabase && typeof window.HiSupabase.getClient === 'function')
        ? window.HiSupabase.getClient()
        : (window.supabaseClient || window.__HI_SUPABASE_CLIENT || null);
    } catch { return null; }
  }
  async function checkAdmin(force){
    try {
      const mgr = window.AdminAccessManager;
      if (!mgr) return null;
      const st = await mgr.checkAdmin({ force: !!force });
      return st;
    } catch { return null; }
  }
  function ensureFooterAdminTab(){
    if (document.querySelector('.hi-footer-tab[href="hi-mission-control.html"]')) return;
    if (window.HiFooter?.appendAdminTab) { try { window.HiFooter.appendAdminTab(true); } catch {} }
  }

  // --- Modal --------------------------------------------------------------
  function buildGateModal(){
    const overlay = document.createElement('div');
    overlay.id = 'mcUnifiedGate';
    overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);z-index:2147483647;padding:24px';
    overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true');
    const box = document.createElement('div');
    box.style.cssText = 'width:min(520px,92vw);background:#0b1020;border:1px solid #2b3155;border-radius:16px;padding:20px 20px 18px;color:#e6e9ff;font:14px/1.5 Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.4)';
    box.innerHTML = [
      '<h2 style="margin:0 0 8px;font-size:18px">🛡️ Mission Control Access</h2>',
      '<p style="margin:0 0 14px;color:#cfd2ea">Admins only. Verify access or use an invite code / admin passcode. Your unlock persists for this session.</p>',
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">',
      '  <input id="mcInviteUnified" placeholder="Invite code" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid #394060;border-radius:10px;background:#121b35;color:#e6e9ff" />',
      '  <button id="mcInviteUnifiedBtn" style="padding:10px 14px;border-radius:10px;border:1px solid #5560a8;background:#1a2150;color:#fff;font-weight:600;cursor:pointer">Redeem Invite</button>',
      '</div>',
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px">',
      '  <input id="mcPassUnified" type="password" inputmode="numeric" placeholder="Admin passcode" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid #394060;border-radius:10px;background:#121b35;color:#e6e9ff" />',
      '  <button id="mcPassUnifiedBtn" style="padding:10px 14px;border-radius:10px;border:1px solid #5560a8;background:#1a2150;color:#fff;font-weight:600;cursor:pointer">Unlock</button>',
      '</div>',
      '<div id="mcUnifiedMsg" style="min-height:18px;font-size:12px;color:#9fb0ff;margin:4px 0 6px"></div>',
      '<div style="display:flex;gap:8px;justify-content:flex-end">',
      '  <button id="mcUnifiedVerify" style="padding:8px 12px;border-radius:10px;border:1px solid #394060;background:#121938;color:#c7d0ff;font-weight:600;cursor:pointer">Verify Access</button>',
      '  <button id="mcUnifiedClose" style="padding:8px 12px;border-radius:10px;border:1px solid #5d2a2a;background:#24121a;color:#ffb2b2;font-weight:600;cursor:pointer">Cancel</button>',
      '</div>'
    ].join('');
    overlay.appendChild(box);
    return overlay;
  }
  function closeGate(){ const m = document.getElementById('mcUnifiedGate'); if (m) m.remove(); }
  async function verifyAdmin(msgEl){
    const st = await checkAdmin(true);
    if (st?.isAdmin){
      try { sessionStorage.setItem('hi_admin_session','1'); } catch {}
      msgEl && (msgEl.textContent='Access confirmed. Redirecting…');
      setTimeout(()=>{ window.location.href='hi-mission-control.html'; }, 50);
      return true;
    }
    msgEl && (msgEl.textContent='No admin access yet. Enter invite or passcode.');
    return false;
  }
  async function redeemInvite(code, msg){
    try {
      const sb = getClient(); if(!sb){ msg.textContent='Supabase unavailable'; return; }
      const { error } = await sb.rpc('activate_unified_invite_code', { invite_code: code });
      if (error){ msg.textContent = error.message || 'Invite redemption failed.'; return; }
      msg.textContent = 'Invite redeemed. Rechecking…';
      const ok = await verifyAdmin(msg);
      if (!ok){ msg.textContent += ' If this invite elevates membership, access may appear after refresh.'; }
    } catch(e){ msg.textContent = e.message || 'Error redeeming invite.'; }
  }
  async function unlockPasscode(pass, msg){
    try {
      const sb = getClient(); if(!sb){ msg.textContent='Supabase unavailable'; return; }
      const { data, error } = await sb.rpc('admin_unlock_with_passcode', { p_passcode: pass });
      if (error){ msg.textContent = error.message || 'Passcode verification failed.'; return; }
      if (data?.success){
        msg.textContent = 'Access granted. Redirecting…';
        try { await checkAdmin(true); sessionStorage.setItem('hi_admin_session','1'); } catch {}
        setTimeout(()=>{ window.location.href='hi-mission-control.html'; }, 80);
      } else { msg.textContent = data?.message || 'Invalid passcode.'; }
    } catch(e){ msg.textContent = e.message || 'Error unlocking admin access.'; }
  }
  function openGate(){
    let modal = document.getElementById('mcUnifiedGate');
    if (modal){ modal.remove(); }
    modal = buildGateModal();
    document.body.appendChild(modal);
    const msg = modal.querySelector('#mcUnifiedMsg');
    modal.addEventListener('click', (e)=>{ if(e.target===modal) closeGate(); });
    modal.querySelector('#mcUnifiedClose').addEventListener('click', closeGate);
    modal.querySelector('#mcUnifiedVerify').addEventListener('click', ()=> verifyAdmin(msg));
    modal.querySelector('#mcInviteUnifiedBtn').addEventListener('click', ()=>{
      const v = (modal.querySelector('#mcInviteUnified').value||'').trim(); if(!v){ msg.textContent='Enter an invite code first.'; return; }
      msg.textContent='Redeeming invite…'; redeemInvite(v, msg);
    });
    modal.querySelector('#mcPassUnifiedBtn').addEventListener('click', ()=>{
      const v = (modal.querySelector('#mcPassUnified').value||'').trim(); if(!v){ msg.textContent='Enter passcode.'; return; }
      msg.textContent='Verifying passcode…'; unlockPasscode(v, msg);
    });
    // Initial quick check (non-force to avoid churn)
    checkAdmin(false).then(st=>{ if(st?.isAdmin){ msg.textContent='Access confirmed. Redirecting…'; setTimeout(()=>{ window.location.href='hi-mission-control.html'; }, 50); } });
  }

  // --- Attach Points ------------------------------------------------------
  function gateClick(e){
    e.preventDefault();
    // If session already unlocked, fast-path
    try { if (sessionStorage.getItem('hi_admin_session')==='1'){ window.location.href='hi-mission-control.html'; return; } } catch {}
    checkAdmin(true).then(st=>{
      if(st?.isAdmin){
        try { sessionStorage.setItem('hi_admin_session','1'); } catch {}
        window.location.href='hi-mission-control.html';
      } else {
        openGate();
      }
    });
  }
  function attachFooterGate(){
    ensureFooterAdminTab();
    const a = document.querySelector('.hi-footer-tab[href="hi-mission-control.html"]');
    if (a && !a.__mcGate){ a.__mcGate=true; a.addEventListener('click', gateClick); }
  }
  function attachInlineButtons(){
    ['openMissionControlInline','openMissionControlInlineTop'].forEach(id=>{
      const el = document.getElementById(id); if(el && !el.__mcGate){ el.__mcGate=true; el.addEventListener('click', gateClick); }
    });
  }
  function attachNavModalLinks(){
    document.querySelectorAll('a.nav-item.admin-item[href*="hi-mission-control.html"]').forEach(a=>{ if(!a.__mcGate){ a.__mcGate=true; a.addEventListener('click', gateClick); }});
  }
  function observeMutations(){
    if (!window.MutationObserver) return;
    const mo = new MutationObserver(()=>{ attachNavModalLinks(); attachFooterGate(); attachInlineButtons(); });
    mo.observe(document.body, { childList:true, subtree:true });
  }
  function periodicIntegrity(){
    let tries=0; const max=8; const iv = setInterval(()=>{ tries++; attachFooterGate(); if (document.querySelector('.hi-footer-tab[href="hi-mission-control.html"]') || tries>=max){ clearInterval(iv); } }, 1500);
  }
  function keyboardShortcut(){
    window.addEventListener('keydown', (e)=>{
      try {
        const combo = (e.metaKey||e.ctrlKey) && e.shiftKey && (e.key==='M'||e.key==='m');
        if(!combo) return; e.preventDefault(); gateClick(e);
      } catch {}
    }, { passive:false });
  }

  // --- Init ---------------------------------------------------------------
  function init(){ attachFooterGate(); attachInlineButtons(); attachNavModalLinks(); observeMutations(); periodicIntegrity(); keyboardShortcut(); }
  // Auto-fast-path redirect if on mission control gate attempt after prior unlock
  try {
    if (sessionStorage.getItem('hi_admin_session')==='1' && /hi-mission-control\.html$/i.test(window.location.pathname) === false){
      // Do not auto-redirect if already on MC, just ensure footer tab active state handled
      // Optional future enhancement: show brief toast "Admin session active"
    }
  } catch {}
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init, { once:true }); } else { init(); }
  window.HiMissionControlAccess = { openGate, checkAdmin, ensureFooterAdminTab };
})();
