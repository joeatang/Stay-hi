(function(){
  try { console.debug('⚡ mc-quick-access boot'); } catch {}

  function getClient(){
    try {
      return (window.HiSupabase && typeof window.HiSupabase.getClient === 'function')
        ? window.HiSupabase.getClient()
        : (window.supabaseClient || null);
    } catch { return null; }
  }

  function redirectToMC(){
    window.location.href = 'hi-mission-control.html';
  }

  async function verifyAndMaybeRedirect(msgEl){
    try {
      const st = await window.AdminAccessManager?.checkAdmin({ force:true });
      if (st?.isAdmin){ redirectToMC(); return true; }
      if (msgEl) msgEl.textContent = 'No admin access yet. Enter invite or passcode.';
      return false;
    } catch(e){ if (msgEl) msgEl.textContent = e?.message || 'Could not verify admin access.'; return false; }
  }

  function buildModal(){
    const overlay = document.createElement('div');
    overlay.id = 'mcQuickAccessModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(2px)';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');

    const box = document.createElement('div');
    box.style.cssText = 'width:min(520px,90vw);background:#0b1020;border:1px solid #2b3155;border-radius:14px;padding:18px 18px 16px;color:#e6e9ff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.35)';
    box.innerHTML = [
      '<h2 style="margin:0 0 8px;font-size:18px">🏛️ Mission Control Access</h2>',
      '<p style="margin:0 0 12px;color:#cfd2ea">Admins only. If you have access, we\'ll verify now or you can use an invite code or admin passcode.</p>',
      '<div style="display:flex;gap:10px;flex-wrap:wrap">',
      '  <input id="mcInviteInput" type="text" inputmode="text" placeholder="Invite code" style="flex:1;min-width:200px;padding:10px 12px;border-radius:10px;border:1px solid #38406d;background:#0e1530;color:#e6e9ff;outline:none">',
      '  <button id="mcInviteBtn" style="padding:10px 14px;border-radius:10px;border:1px solid #5560a8;background:#1a2150;color:#fff;cursor:pointer">Enter Invite</button>',
      '</div>',
      '<div style="height:10px"></div>',
      '<div style="display:flex;gap:10px;flex-wrap:wrap">',
      '  <input id="mcPassInput" type="password" inputmode="numeric" placeholder="Admin passcode" style="flex:1;min-width:200px;padding:10px 12px;border-radius:10px;border:1px solid #38406d;background:#0e1530;color:#e6e9ff;outline:none">',
      '  <button id="mcPassBtn" style="padding:10px 14px;border-radius:10px;border:1px solid #5560a8;background:#1a2150;color:#fff;cursor:pointer">Unlock</button>',
      '</div>',
      '<div style="height:12px"></div>',
      '<div id="mcMsg" style="min-height:18px;color:#9fb0ff;font-size:13px"></div>',
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px">',
      '  <button id="mcVerifyBtn" style="padding:8px 12px;border-radius:10px;border:1px solid #39406a;background:#121938;color:#c7d0ff;cursor:pointer">Verify Access</button>',
      '  <button id="mcCancelBtn" style="padding:8px 12px;border-radius:10px;border:1px solid #5d2a2a;background:#24121a;color:#ffb2b2;cursor:pointer">Cancel</button>',
      '</div>'
    ].join('');
    overlay.appendChild(box);
    return overlay;
  }

  function openModal(){
    let modal = document.getElementById('mcQuickAccessModal');
    if (modal){ modal.remove(); }
    modal = buildModal();
    document.body.appendChild(modal);
    const msg = modal.querySelector('#mcMsg');
    const inviteInput = modal.querySelector('#mcInviteInput');
    const passInput = modal.querySelector('#mcPassInput');
    const inviteBtn = modal.querySelector('#mcInviteBtn');
    const passBtn = modal.querySelector('#mcPassBtn');
    const verifyBtn = modal.querySelector('#mcVerifyBtn');
    const cancelBtn = modal.querySelector('#mcCancelBtn');

    function close(){ modal.remove(); }
    cancelBtn.addEventListener('click', close);
    modal.addEventListener('click', (e)=>{ if(e.target === modal) close(); });

    verifyBtn.addEventListener('click', ()=> verifyAndMaybeRedirect(msg));

    inviteBtn.addEventListener('click', async ()=>{
      const code = (inviteInput.value||'').trim(); if (!code){ msg.textContent = 'Enter an invite code.'; inviteInput.focus(); return; }
      try{
        const sb = getClient(); if(!sb){ msg.textContent='Supabase unavailable'; return; }
        const { error } = await sb.rpc('activate_unified_invite_code', { invite_code: code });
        if (error){ msg.textContent = error.message || 'Invite redemption failed.'; return; }
        msg.textContent='Invite redeemed. Rechecking access…';
        await verifyAndMaybeRedirect(msg);
      } catch(e){ msg.textContent = e?.message || 'Error redeeming invite.'; }
    });

    passBtn.addEventListener('click', async ()=>{
      const passcode = (passInput.value||'').trim(); if (!passcode){ msg.textContent = 'Enter an admin passcode.'; passInput.focus(); return; }
      try{
        const sb = getClient(); if(!sb){ msg.textContent='Supabase unavailable'; return; }
        const { data, error } = await sb.rpc('admin_unlock_with_passcode', { p_passcode: passcode });
        if (error){ msg.textContent = error.message || 'Passcode verification failed.'; return; }
        if (data?.success){ msg.textContent='Access granted. Opening Mission Control…'; try { await window.AdminAccessManager?.checkAdmin({ force:true }); } catch {} redirectToMC(); }
        else { msg.textContent = data?.message || 'Invalid passcode.'; }
      } catch(e){ msg.textContent = e?.message || 'Error unlocking admin access.'; }
    });

    // Initial check
    verifyAndMaybeRedirect(msg);
  }

  async function openQuickAccess(){
    try {
      // Fast-path
      const st = await window.AdminAccessManager?.checkAdmin();
      if (st?.isAdmin){ redirectToMC(); return; }
    } catch {}
    openModal();
  }

  // Keyboard: Cmd+Shift+M (Mac) or Ctrl+Shift+M (Win/Linux)
  window.addEventListener('keydown', (e)=>{
    try {
      const isCombo = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'M' || e.key === 'm');
      if (!isCombo) return;
      e.preventDefault();
      openQuickAccess();
    } catch {}
  }, { passive:false });

  // No auto-open by URL param to avoid surprising users.
  // Use keyboard shortcut or explicit UI link to open.

  // Expose for programmatic use
  window.HiMissionControlQuick = { open: openQuickAccess };
})();
