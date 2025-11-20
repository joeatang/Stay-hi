(function(){
  // mc-quick-access.js (DEPRECATED) – replaced by header.js modal + keyboard shortcut handling.
  function resolve(p){ return (window.hiPaths?.resolve ? window.hiPaths.resolve(p) : p); }
  async function isAdmin(){ try { return !!(await window.AdminAccessManager?.checkAdmin())?.isAdmin; } catch { return false; } }
  function openFallback(){
    const btn=document.getElementById('openMissionControl'); if(btn){ btn.click(); return; }
    // Minimal fallback modal if header not yet mounted
    if(document.getElementById('mcQuickStub')) return;
    const ov=document.createElement('div'); ov.id='mcQuickStub'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:10000';
    ov.innerHTML=`<div style="max-width:360px;width:92%;background:#0b1020;border:1px solid #2b3155;border-radius:14px;padding:16px;color:#e6e9ff;font:14px/1.5 system-ui,sans-serif">
      <h3 style="margin:0 0 8px;font-size:17px">Mission Control Access</h3>
      <input id="mcPassQuickStub" placeholder="Admin passcode" inputmode="numeric" style="width:100%;padding:10px 12px;border:1px solid #394060;border-radius:10px;background:#121b35;color:#e6e9ff" />
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
        <button id="mcQuickRecheck" style="padding:8px 12px;border-radius:10px;border:1px solid #394060;background:#121938;color:#c7d0ff;font-weight:600;cursor:pointer">Recheck</button>
        <button id="mcQuickUnlock" style="padding:8px 12px;border-radius:10px;border:1px solid #5560a8;background:#1a2150;color:#fff;font-weight:600;cursor:pointer">Unlock</button>
        <button id="mcQuickClose" style="padding:8px 12px;border-radius:10px;border:1px solid #5d2a2a;background:#24121a;color:#ffb2b2;font-weight:600;cursor:pointer">Close</button>
      </div>
      <div id="mcQuickMsg" style="margin-top:8px;min-height:16px;font-size:12px;color:#9fb0ff"></div>
    </div>`;
    document.body.appendChild(ov);
    const msg=ov.querySelector('#mcQuickMsg');
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.remove(); });
    ov.querySelector('#mcQuickClose').addEventListener('click',()=> ov.remove());
    ov.querySelector('#mcQuickRecheck').addEventListener('click', async()=>{ msg.textContent='Rechecking…'; if(await isAdmin()){ msg.textContent='Access confirmed.'; window.location.href=resolve('hi-mission-control.html'); } else { msg.textContent='No admin access.'; } });
    ov.querySelector('#mcQuickUnlock').addEventListener('click', async()=>{
      const pass=(ov.querySelector('#mcPassQuickStub').value||'').trim(); if(!pass){ msg.textContent='Enter passcode.'; return; }
      msg.textContent='Verifying…';
      try { const sb=(window.HiSupabase?.getClient&&window.HiSupabase.getClient())||window.hiSupabase||window.supabaseClient; if(!sb){ msg.textContent='Supabase unavailable'; return; }
        const { data,error } = await sb.rpc('admin_unlock_with_passcode',{ p_passcode: pass });
        if(error){ msg.textContent=error.message||'Failed.'; return; }
        if(data?.success){ msg.textContent='Granted.'; try{ await window.AdminAccessManager?.checkAdmin({ force:true }); }catch{} window.location.href=resolve('hi-mission-control.html'); }
        else { msg.textContent=data?.message||'Invalid passcode.'; }
      } catch(e){ msg.textContent=e.message||'Error.'; }
    });
  }
  function shortcut(){ window.addEventListener('keydown', async e=>{ if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==='M'||e.key==='m')){ e.preventDefault(); if(await isAdmin()) window.location.href=resolve('hi-mission-control.html'); else openFallback(); } }, { passive:false }); }
  shortcut();
  window.HiMissionControlQuick = { open: openFallback };
})();
