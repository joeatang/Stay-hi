(function(){
  // mc-access-core.js (DEPRECATED) – consolidated into header.js modal & AdminAccessManager.
  function resolve(p){ return (window.hiPaths?.resolve ? window.hiPaths.resolve(p) : p); }
  async function isAdmin(){ try { return !!(await window.AdminAccessManager?.checkAdmin())?.isAdmin; } catch { return false; } }
  function openFallback(){
    const btn = document.getElementById('openMissionControl'); if(btn){ btn.click(); return; }
    if(document.getElementById('mcUnifiedGateStub')) return;
    const overlay=document.createElement('div'); overlay.id='mcUnifiedGateStub'; overlay.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:10000';
    overlay.innerHTML=`<div style="max-width:380px;width:92%;background:#0b1020;border:1px solid #2b3155;border-radius:14px;padding:18px;color:#e6e9ff;font:14px/1.5 system-ui,sans-serif">
      <h3 style="margin:0 0 8px;font-size:17px">Mission Control Access</h3>
      <p style="margin:0 0 12px;color:#cfd2ea">Enter admin passcode to continue.</p>
      <div style="display:flex;gap:8px;margin:4px 0 10px">
        <input id="mcPassStub2" placeholder="Passcode" inputmode="numeric" style="flex:1;padding:10px 12px;border:1px solid #394060;border-radius:10px;background:#121b35;color:#e6e9ff" />
        <button id="mcUnlockStub2" style="padding:10px 14px;border-radius:10px;border:1px solid #5560a8;background:#1a2150;color:#fff;font-weight:600;cursor:pointer">Unlock</button>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="mcRecheckStub2" style="padding:8px 12px;border-radius:10px;border:1px solid #394060;background:#121938;color:#c7d0ff;font-weight:600;cursor:pointer">Recheck</button>
        <button id="mcCloseStub2" style="padding:8px 12px;border-radius:10px;border:1px solid #5d2a2a;background:#24121a;color:#ffb2b2;font-weight:600;cursor:pointer">Close</button>
      </div>
      <div id="mcMsgStub2" style="margin-top:8px;min-height:16px;font-size:12px;color:#9fb0ff"></div>
    </div>`;
    document.body.appendChild(overlay);
    const msg=overlay.querySelector('#mcMsgStub2');
    overlay.addEventListener('click',e=>{ if(e.target===overlay) overlay.remove(); });
    overlay.querySelector('#mcCloseStub2').addEventListener('click',()=> overlay.remove());
    overlay.querySelector('#mcRecheckStub2').addEventListener('click', async()=>{ msg.textContent='Rechecking…'; if(await isAdmin()){ msg.textContent='Access confirmed.'; window.location.href=resolve('hi-mission-control.html'); } else { msg.textContent='No admin access.'; } });
    overlay.querySelector('#mcUnlockStub2').addEventListener('click', async()=>{
      const pass=(overlay.querySelector('#mcPassStub2').value||'').trim(); if(!pass){ msg.textContent='Enter passcode.'; return; }
      msg.textContent='Verifying…';
      try{ const sb=(window.HiSupabase?.getClient&&window.HiSupabase.getClient())||window.hiSupabase||window.supabaseClient; if(!sb){ msg.textContent='Supabase unavailable'; return; }
        const { data,error } = await sb.rpc('admin_unlock_with_passcode',{ p_passcode: pass });
        if(error){ msg.textContent=error.message||'Failed.'; return; }
        if(data?.success){ msg.textContent='Granted.'; try{ await window.AdminAccessManager?.checkAdmin({ force:true }); }catch{} window.location.href=resolve('hi-mission-control.html'); }
        else { msg.textContent=data?.message||'Invalid passcode.'; }
      }catch(e){ msg.textContent=e.message||'Error.'; }
    });
  }
  function bindLinks(){
    document.querySelectorAll('a.nav-item.admin-item[href*="hi-mission-control.html"], .hi-footer-tab[href="hi-mission-control.html"]').forEach(a=>{
      if(a.__mcCoreStub) return; a.__mcCoreStub=true; a.addEventListener('click', async e=>{ e.preventDefault(); if(await isAdmin()){ window.location.href=resolve('hi-mission-control.html'); } else { openFallback(); } });
    });
  }
  function shortcut(){ window.addEventListener('keydown', async e=>{ if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==='M'||e.key==='m')){ e.preventDefault(); if(await isAdmin()) window.location.href=resolve('hi-mission-control.html'); else openFallback(); } }); }
  function init(){ bindLinks(); shortcut(); }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init, { once:true }); } else { init(); }
  window.HiMissionControlAccess = { openGate: openFallback, checkAdmin: isAdmin };
})();
