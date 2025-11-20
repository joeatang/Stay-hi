// mission-control-gate.js (DEPRECATED)
// Consolidated into header.js passcode modal. This stub preserves legacy references
// and funnels all interactions to the canonical Mission Control access flow.
(function(){
  function resolve(p){ return (window.hiPaths?.resolve ? window.hiPaths.resolve(p) : p); }
  function getClient(){
    return (window.HiSupabase && window.HiSupabase.getClient && window.HiSupabase.getClient())
      || window.hiSupabase
      || window.__HI_SUPABASE_CLIENT
      || null;
  }
  async function fastCheck(){
    try { const st = await window.AdminAccessManager?.checkAdmin(); return !!st?.isAdmin; } catch { return false; }
  }
  function openCanonicalModal(){
    // Trigger header modal if present
    const btn = document.getElementById('openMissionControl');
    if (btn){ btn.click(); return; }
    // Fallback lightweight modal (passcode only)
    if (document.getElementById('mcAccessGateModal')) return;
    const modal = document.createElement('div');
    modal.id='mcAccessGateModal';
    modal.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);z-index:10000';
    modal.innerHTML=`<div role="dialog" aria-modal="true" style="max-width:380px;width:92%;background:#0f1228;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:18px;color:#fff;font:14px/1.5 system-ui,sans-serif">
      <h3 style="margin:0 0 8px;font-size:17px">Admin Access</h3>
      <p style="margin:0 0 12px;color:#cfd2ea">Enter passcode to unlock Mission Control.</p>
      <div style="display:flex;gap:8px;margin:4px 0 10px">
        <input id="mcPassStub" placeholder="Admin passcode" inputmode="numeric" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px;color:#fff" />
        <button id="mcUnlockStub" style="background:#7AE582;color:#0f1228;border:none;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer">Unlock</button>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="mcCloseStub" style="background:transparent;border:1px solid rgba(255,255,255,.25);color:#cfd2ea;border-radius:10px;padding:8px 12px;cursor:pointer">Close</button>
        <button id="mcRecheckStub" style="background:#00d4ff;color:#0f172a;border:none;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer">Recheck</button>
      </div>
      <div id="mcMsgStub" style="margin-top:8px;color:#a7b0ff;font-size:12px;min-height:16px"></div>
    </div>`;
    document.body.appendChild(modal);
    const msg = modal.querySelector('#mcMsgStub');
    modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
    modal.querySelector('#mcCloseStub').addEventListener('click', ()=> modal.remove());
    modal.querySelector('#mcRecheckStub').addEventListener('click', async ()=>{
      msg.textContent='Rechecking…'; const ok = await fastCheck(); msg.textContent = ok ? 'Access confirmed.' : 'No admin access.'; if(ok) window.location.href=resolve('hi-mission-control.html');
    });
    modal.querySelector('#mcUnlockStub').addEventListener('click', async ()=>{
      const pass = (modal.querySelector('#mcPassStub').value||'').trim(); if(!pass){ msg.textContent='Enter passcode.'; return; }
      msg.textContent='Verifying…';
      try {
        const sb=getClient(); if(!sb){ msg.textContent='Supabase unavailable'; return; }
        const { data, error } = await sb.rpc('admin_unlock_with_passcode', { p_passcode: pass });
        if(error){ msg.textContent= error.message || 'Failed.'; return; }
        if(data?.success){ msg.textContent='Granted. Opening…'; try{ await window.AdminAccessManager?.checkAdmin({ force:true }); }catch{} window.location.href=resolve('hi-mission-control.html'); }
        else { msg.textContent = data?.message || 'Invalid passcode.'; }
      } catch(e){ msg.textContent = e.message || 'Error.'; }
    });
  }
  function attach(){
    document.querySelectorAll('a.nav-item.admin-item[href*="hi-mission-control.html"]').forEach(a=>{
      if(a.__mcStub) return; a.__mcStub=true;
      a.addEventListener('click', async e=>{
        e.preventDefault(); if(await fastCheck()){ window.location.href=resolve('hi-mission-control.html'); return; } openCanonicalModal();
      });
    });
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', attach, { once:true }); } else { attach(); }
  window.openMcAccessGateModal = openCanonicalModal; // legacy global
})();
