// mission-control-gate.js
// Purpose: Ensure Mission Control link in nav modal is always visible but gated.
// - If user is admin, navigate immediately.
// - If not, show a lightweight modal to redeem invite or enter admin passcode.
(function(){
  function getClient(){
    return (window.HiSupabase && window.HiSupabase.getClient && window.HiSupabase.getClient())
      || window.hiSupabase
      || window.__HI_SUPABASE_CLIENT
      || null;
  }
  function ensureAdminSectionVisible(){
    const adminSection = document.getElementById('adminSection');
    if (adminSection) adminSection.style.display = 'block';
  }
  function attachHandler(){
    ensureAdminSectionVisible();
    document.querySelectorAll('a.nav-item.admin-item[href*="hi-mission-control.html"]').forEach(anchor => {
      if (anchor.__hiGateAttached) return; anchor.__hiGateAttached = true;
      anchor.addEventListener('click', async (e)=>{
        e.preventDefault();
        // Hold: if debug/self-check active, do not gate
        if (sessionStorage.getItem('hi_admin_debug')==='1' || /self-check/i.test(location.hash)){
          window.location.href = 'hi-mission-control.html#self-check';
          return;
        }
        // NEW: Require authenticated session before any gating flows to prevent navigating to Mission Control unauthenticated.
        try {
          const sbPre = getClient();
          if (sbPre?.auth?.getSession) {
            const { data: { session: preSession } } = await sbPre.auth.getSession();
            if (!preSession) {
              // Direct user to sign-in with redirect preserving self-check for diagnostics
              window.location.href = '/signin.html?redirect=/hi-mission-control.html#self-check';
              return;
            }
          }
        } catch {}
        try{
          if (window.AdminAccessManager){
            const st = await window.AdminAccessManager.checkAdmin({ force:true });
            if (st?.isAdmin){ window.location.href = 'hi-mission-control.html'; return; }
          }
        } catch {}
        // Not confirmed admin — open gate modal
        openGateModal();
      });
    });
  }

  function openGateModal(){
    let modal = document.getElementById('mcAccessGateModal');
    let previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!modal){
      modal = document.createElement('div');
      modal.id = 'mcAccessGateModal';
      modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:10000';
      modal.innerHTML = `
        <div role="dialog" aria-modal="true" aria-labelledby="mcAccessTitle" aria-describedby="mcAccessDesc" tabindex="-1" style="max-width:420px;width:92%;background:#0f1228;border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,0.4)">
          <h3 id="mcAccessTitle" style="margin:0 0 8px;font-size:18px">Admin Access Required</h3>
          <p id="mcAccessDesc" style="margin:0 0 12px;color:#cfd2ea">Enter the admin passcode to unlock Mission Control. If you already have access, tap Recheck.</p>
          <div style="display:flex;gap:8px;align-items:center;margin:6px 0 6px">
            <input id="mcPasscode" placeholder="Admin passcode" inputmode="numeric" autocomplete="one-time-code" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px;color:#fff" />
            <button id="mcUnlock" class="menu-item-btn" style="background:#7AE582;color:#0f1228;border:none;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer">Unlock</button>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button id="mcClose" class="menu-item-btn" aria-label="Close admin access dialog" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#cfd2ea;border-radius:10px;padding:8px 12px;cursor:pointer">Close</button>
            <button id="mcRecheck" class="menu-item-btn" style="background:#00d4ff;color:#0f172a;border:none;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer">Recheck Access</button>
          </div>
          <div id="mcMsg" style="margin-top:8px;color:#a7b0ff;font-size:12px;min-height:16px"></div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); });
      modal.querySelector('#mcClose').addEventListener('click', ()=> closeModal());
      modal.querySelector('#mcRecheck').addEventListener('click', async ()=>{
        const msg = modal.querySelector('#mcMsg'); msg.textContent = 'Rechecking…';
        try{ const st = await window.AdminAccessManager?.checkAdmin({ force:true }); if (st?.isAdmin){ window.location.href='hi-mission-control.html'; } else { msg.textContent = 'No admin access on this account.'; } } catch(e){ msg.textContent = e.message || 'Could not verify admin access.'; }
      });
      // Invite UI removed per current policy (passcode only)
      modal.querySelector('#mcUnlock').addEventListener('click', async ()=>{
        const msg = modal.querySelector('#mcMsg'); const passcode = (modal.querySelector('#mcPasscode').value||'').trim(); if(!passcode){ msg.textContent='Enter the admin passcode.'; return; }
        msg.textContent = 'Verifying passcode…';
        try{ const sb = getClient(); if(!sb){ msg.textContent='Supabase unavailable'; return; } const { data, error } = await sb.rpc('admin_unlock_with_passcode', { p_passcode: passcode }); if (error){ msg.textContent = error.message || 'Passcode verification failed.'; return; } if (data?.success){
            msg.textContent='Access granted. Opening Mission Control…';
            // Optional debug escalation when ?admindebug=1 present to bypass legacy ambiguity until role + v2 RPC fixed
            if (/admindebug=1/i.test(location.search)){
              try {
                sessionStorage.setItem('hi_admin_access','true');
                localStorage.setItem('hi_admin_state', JSON.stringify({ isAdmin:true, ts: Date.now() }));
                window.dispatchEvent(new CustomEvent('hi:admin-state-changed', { detail:{ status:'granted', isAdmin:true, reason:null, lastChecked: Date.now(), user: null } }));
              } catch {}
            }
            try { await window.AdminAccessManager?.checkAdmin({ force:true }); } catch {}
            window.location.href='hi-mission-control.html';
          } else { msg.textContent = data?.message || 'Invalid passcode.'; } } catch(e){ msg.textContent = e.message || 'Error unlocking admin access.'; }
      });
    }
    modal.style.display = 'flex';
    try { document.body.style.overflow = 'hidden'; } catch {}
    const dialogEl = modal.querySelector('[role="dialog"]');
    const focusables = Array.from(dialogEl.querySelectorAll('a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.offsetParent!==null);
    (focusables[0] || dialogEl).focus();

    function closeModal(){
      modal.remove();
      try { document.body.style.overflow = ''; } catch {}
      if (previouslyFocused && previouslyFocused.focus) {
        setTimeout(()=>{ try { previouslyFocused.focus(); } catch {} }, 0);
      }
      document.removeEventListener('keydown', keyHandler, true);
    }
    function keyHandler(e){
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key === 'Tab'){
        const f = Array.from(dialogEl.querySelectorAll('a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.offsetParent!==null);
        if (!f.length) return;
        const first=f[0], last=f[f.length-1];
        if (e.shiftKey){ if (document.activeElement===first || !dialogEl.contains(document.activeElement)){ e.preventDefault(); last.focus(); } }
        else { if (document.activeElement===last || !dialogEl.contains(document.activeElement)){ e.preventDefault(); first.focus(); } }
      }
    }
    document.addEventListener('keydown', keyHandler, true);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attachHandler, { once:true });
  } else {
    attachHandler();
  }
  // Disable gate if already on mission control and debug flag active
  if (/hi-mission-control\.html/.test(location.pathname) && (sessionStorage.getItem('hi_admin_debug')==='1' || /self-check/i.test(location.hash))){
    try { document.querySelectorAll('#mcAccessGateModal').forEach(m=>m.remove()); } catch {}
  }
})();
