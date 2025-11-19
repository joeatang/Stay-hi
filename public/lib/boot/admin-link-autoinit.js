// admin-link-autoinit.js
// Purpose: Reveal admin affordances using the unified AdminAccessManager and avoid UI overlap.
// Strategy: Listen for AdminAccessManager events and cached state; no direct RPCs here.
(function(){
  const ADMIN_FLAG_KEY = 'hi_admin_access';

  function revealAdminUI(){
    const adminSection = document.getElementById('adminSection');
    if (adminSection) adminSection.style.display = 'block';
    document.querySelectorAll('.admin-item').forEach(a => { a.style.display = ''; });
    injectFloatingMissionButton();
    ensureAdminEntryExists();
  }

  function computeFooterAwareBottom(){
    const hasFooter = !!(document.querySelector('.hi-footer-nav') || document.getElementById('hiFooter') || document.querySelector('.hi-footer'));
    return hasFooter
      ? 'calc(env(safe-area-inset-bottom, 0px) + 84px)'
      : 'calc(env(safe-area-inset-bottom, 0px) + 18px)';
  }

  function injectFloatingMissionButton(){
    if (document.getElementById('floatingMissionBtn')) return;
    if (location.pathname.includes('hi-mission-control.html')) return; // avoid on Mission Control itself
    const btn = document.createElement('button');
    btn.id = 'floatingMissionBtn';
    btn.textContent = '🛡️ Mission Control';
    btn.setAttribute('aria-label','Open Mission Control (Admin)');
    const bottom = computeFooterAwareBottom();
    btn.style.cssText = [
      'position:fixed',
      `bottom:${bottom}`,
      'right:18px',
      'background:#00d4ff',
      'color:#0f172a',
      'border:none',
      'padding:10px 14px',
      'font-weight:600',
      'border-radius:12px',
      'box-shadow:0 4px 16px rgba(0,212,255,0.4)',
      'cursor:pointer',
      'z-index:10000',
      'font-size:13px'
    ].join(';');
    btn.addEventListener('click', ()=>{ window.location.href = '/public/hi-mission-control.html'; });
    document.body.appendChild(btn);

    // Recompute position if footer mounts later (e.g., deferred init)
    const maybeAdjust = () => {
      const el = document.getElementById('floatingMissionBtn');
      if (!el) return;
      el.style.bottom = computeFooterAwareBottom();
    };
    setTimeout(maybeAdjust, 400);
    document.addEventListener('DOMContentLoaded', maybeAdjust);
  }

  function getClient(){
    return (window.HiSupabase && window.HiSupabase.getClient && window.HiSupabase.getClient())
      || window.hiSupabase
      || window.__HI_SUPABASE_CLIENT
      || null;
  }

  function ensureAdminEntryExists(){
    // Ensure a Mission Control link exists inside any navigation modal
    const navMenu = document.querySelector('.navigation-menu');
    if (!navMenu) return;
    let adminSection = document.getElementById('adminSection');
    if (!adminSection){
      adminSection = document.createElement('div');
      adminSection.id = 'adminSection';
      adminSection.className = 'nav-section';
      adminSection.innerHTML = '<div class="nav-section-title">Admin</div>';
      navMenu.appendChild(adminSection);
    }
    adminSection.style.display = 'block';
    let link = adminSection.querySelector('a.nav-item.admin-item');
    if (!link){
      link = document.createElement('a');
      link.href = 'hi-mission-control.html';
      link.className = 'nav-item admin-item';
      link.innerHTML = '<span class="nav-icon">🎛️</span><span>Hi Mission Control</span>';
      adminSection.appendChild(link);
    }
    attachGateHandler(link);
  }

  function observeNavigationMenus(){
    try {
      const target = document.body;
      if (!target || !window.MutationObserver) return;
      const mo = new MutationObserver((mutations)=>{
        for (const m of mutations){
          if (m.type === 'childList'){
            if ([...m.addedNodes].some(n=> n.nodeType===1 && (n.matches?.('#navigationModal') || n.querySelector?.('.navigation-menu')))){
              // Drawer (re)added; ensure admin entry exists
              ensureAdminEntryExists();
            }
          }
        }
      });
      mo.observe(target, { childList: true, subtree: true });
      // initial ensure in case modal already present
      ensureAdminEntryExists();
    } catch {}
  }

  function attachGateHandler(anchor){
    if (!anchor || anchor.__hiGateAttached) return; anchor.__hiGateAttached = true;
    anchor.addEventListener('click', async (e)=>{
      e.preventDefault();
      try{
        if (window.AdminAccessManager){
          const st = await window.AdminAccessManager.checkAdmin({ force:true });
          if (st?.isAdmin){ window.location.href = 'hi-mission-control.html'; return; }
        }
      } catch {}
      // If a global gate opener exists, use it; otherwise inline fallback
      if (window.openMcAccessGateModal){ window.openMcAccessGateModal(); return; }
      openInlineGateModal();
    });
  }

  function openInlineGateModal(){
    let modal = document.getElementById('mcAccessGateModal');
    if (!modal){
      modal = document.createElement('div');
      modal.id = 'mcAccessGateModal';
      modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:10000';
      modal.innerHTML = `
        <div role="dialog" aria-modal="true" style="max-width:420px;width:92%;background:#0f1228;border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,0.4)">
          <h3 style="margin:0 0 8px;font-size:18px">Admin Access Required</h3>
          <p style="margin:0 0 12px;color:#cfd2ea">Enter an admin invite code or passcode to proceed. If you already have access, tap Recheck.</p>
          <div style="display:flex;gap:8px;align-items:center;margin:10px 0 6px">
            <input id="mcInviteCode" placeholder="Invite code (optional)" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px;color:#fff" />
            <button id="mcRedeemInvite" class="menu-item-btn" style="background:#FFD166;color:#0f1228;border:none;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer">Redeem</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin:6px 0 6px">
            <input id="mcPasscode" placeholder="Admin passcode" inputmode="numeric" autocomplete="one-time-code" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px;color:#fff" />
            <button id="mcUnlock" class="menu-item-btn" style="background:#7AE582;color:#0f1228;border:none;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer">Unlock</button>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button id="mcClose" class="menu-item-btn" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#cfd2ea;border-radius:10px;padding:8px 12px;cursor:pointer">Close</button>
            <button id="mcRecheck" class="menu-item-btn" style="background:#00d4ff;color:#0f172a;border:none;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer">Recheck Access</button>
          </div>
          <div id="mcMsg" style="margin-top:8px;color:#a7b0ff;font-size:12px;min-height:16px"></div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e)=>{ if (e.target === modal) modal.remove(); });
      modal.querySelector('#mcClose').addEventListener('click', ()=> modal.remove());
      modal.querySelector('#mcRecheck').addEventListener('click', async ()=>{
        const msg = modal.querySelector('#mcMsg'); msg.textContent = 'Rechecking…';
        try{ const st = await window.AdminAccessManager?.checkAdmin({ force:true }); if (st?.isAdmin){ window.location.href='hi-mission-control.html'; } else { msg.textContent = 'No admin access on this account.'; } } catch(e){ msg.textContent = e.message || 'Could not verify admin access.'; }
      });
      modal.querySelector('#mcRedeemInvite').addEventListener('click', async ()=>{
        const msg = modal.querySelector('#mcMsg'); const code = (modal.querySelector('#mcInviteCode').value||'').trim(); if(!code){ msg.textContent='Enter an invite code first.'; return; }
        msg.textContent = 'Redeeming…';
        try{ const sb = getClient(); if(!sb){ msg.textContent='Supabase unavailable'; return; } const { error } = await sb.rpc('activate_unified_invite_code', { invite_code: code }); if (error){ msg.textContent = error.message || 'Invite redemption failed.'; return; } msg.textContent='Invite redeemed. Rechecking access…'; const st = await window.AdminAccessManager?.checkAdmin({ force:true }); if (st?.isAdmin){ window.location.href='hi-mission-control.html'; } else { msg.textContent='Upgraded membership applied. Admin access not detected.'; } } catch(e){ msg.textContent = e.message || 'Error redeeming code.'; }
      });
      modal.querySelector('#mcUnlock').addEventListener('click', async ()=>{
        const msg = modal.querySelector('#mcMsg'); const passcode = (modal.querySelector('#mcPasscode').value||'').trim(); if(!passcode){ msg.textContent='Enter the admin passcode.'; return; }
        msg.textContent = 'Verifying passcode…';
        try{ const sb = getClient(); if(!sb){ msg.textContent='Supabase unavailable'; return; } const { data, error } = await sb.rpc('admin_unlock_with_passcode', { p_passcode: passcode }); if (error){ msg.textContent = error.message || 'Passcode verification failed.'; return; } if (data?.success){ msg.textContent='Access granted. Opening Mission Control…'; try { await window.AdminAccessManager?.checkAdmin({ force:true }); } catch {} window.location.href='hi-mission-control.html'; } else { msg.textContent = data?.message || 'Invalid passcode.'; } } catch(e){ msg.textContent = e.message || 'Error unlocking admin access.'; }
      });
    }
    modal.style.display = 'flex';
  }

  function tryRevealFromState(){
    if (sessionStorage.getItem(ADMIN_FLAG_KEY) === 'true') { revealAdminUI(); return; }
    const mgr = window.AdminAccessManager;
    if (mgr && typeof mgr.getState === 'function'){
      const st = mgr.getState();
      if (st?.isAdmin){ sessionStorage.setItem(ADMIN_FLAG_KEY,'true'); revealAdminUI(); return; }
    }
  }

  // React to unified admin events
  window.addEventListener('hi:admin-confirmed', ()=>{ sessionStorage.setItem(ADMIN_FLAG_KEY,'true'); revealAdminUI(); });
  window.addEventListener('hi:admin-state-changed', (e)=>{ if (e?.detail?.isAdmin){ sessionStorage.setItem(ADMIN_FLAG_KEY,'true'); revealAdminUI(); } });

  // Kick off after DOM ready to ensure body exists
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ tryRevealFromState(); ensureAdminEntryExists(); observeNavigationMenus(); }, { once:true });
  } else {
    tryRevealFromState();
    ensureAdminEntryExists();
    observeNavigationMenus();
  }

  // Expose helpers for late callers (e.g., when drawer opens)
  window.ensureAdminEntryExists = ensureAdminEntryExists;
  window.openMcAccessGateModal = openInlineGateModal;
  window.attachMissionGate = attachGateHandler;
})();
