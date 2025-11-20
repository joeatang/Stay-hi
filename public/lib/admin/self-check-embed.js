(function(){
  const style = `
  .hi-selfcheck-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;z-index:100000}
  .hi-selfcheck{width:min(920px,92vw);max-height:88vh;overflow:auto;background:#0f1424;border:1px solid #263657;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.6);padding:18px;color:#e2e8f0}
  .hi-selfcheck h2{margin:0 0 12px;font-size:18px;background:linear-gradient(90deg,#00d4ff,#7ae582);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .hi-selfcheck .grid{display:grid;gap:12px}
  .hi-selfcheck .card{background:#121b33;border:1px solid #263657;border-radius:12px;padding:12px}
  .hi-selfcheck pre{background:#0b1120;padding:10px;border-radius:10px;font-size:12px;overflow:auto;margin:0}
  .hi-selfcheck .row{display:flex;align-items:center;gap:8px}
  .hi-selfcheck .badge{display:inline-block;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;background:#1e293b;color:#e2e8f0}
  .hi-selfcheck .ok{color:#10b981;font-weight:600}
  .hi-selfcheck .bad{color:#ef4444;font-weight:600}
  .hi-selfcheck .controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
  .hi-selfcheck button{background:#334155;color:#fff;border:1px solid #556372;padding:8px 12px;border-radius:8px;font-weight:600;cursor:pointer}
  `;
  const ensure = ()=>{
    if (document.getElementById('hiSelfcheckBackdrop')) return;
    const s = document.createElement('style'); s.textContent = style; document.head.appendChild(s);
    const bg = document.createElement('div'); bg.id='hiSelfcheckBackdrop'; bg.className='hi-selfcheck-backdrop';
    bg.innerHTML = `<div class="hi-selfcheck" role="dialog" aria-modal="true" aria-label="Admin Self-Check">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
        <h2>🛡️ Admin Self-Check</h2>
        <button id="hiSelfcheckClose">Close</button>
      </div>
      <div class="grid">
        <div class="card"><div class="row"><span class="badge">Session</span><span id="scSession">Loading…</span></div><pre id="scSessionRaw">(pending)</pre></div>
        <div class="card"><div class="row"><span class="badge">Membership</span><span id="scMember">Loading…</span></div><pre id="scMemberRaw">(pending)</pre></div>
        <div class="card"><div class="row"><span class="badge">Admin Role</span><span id="scAdmin">Loading…</span></div><pre id="scAdminRaw">(pending)</pre></div>
        <div class="card"><div class="row"><span class="badge">Next</span><span id="scNext">Assessing…</span></div><div id="scNextBody" style="font-size:13px;opacity:.9"></div></div>
      </div>
    </div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', (e)=>{ if(e.target===bg) window.HiAdminSelfCheck.close(); });
    bg.querySelector('#hiSelfcheckClose').addEventListener('click', ()=> window.HiAdminSelfCheck.close());
  };
  async function run(){
    try{
      const delay = (ms)=> new Promise(r=>setTimeout(r,ms));
      let sb = window.hiSupabase || (window.HiSupabase&&window.HiSupabase.getClient&&window.HiSupabase.getClient());
      for (let i=0;i<10 && (!sb||!sb.auth);i++){ await delay(150); sb = window.hiSupabase || (window.HiSupabase&&window.HiSupabase.getClient&&window.HiSupabase.getClient()); }
      const S = (id)=> document.getElementById(id);
      if(!sb){ S('scSession').innerHTML='<span class="bad">Supabase unavailable</span>'; return; }
      const { data:{ session } } = await sb.auth.getSession();
      if(!session){ S('scSession').innerHTML='<span class="bad">No active session</span>'; S('scSessionRaw').textContent='null'; }
      else { S('scSession').innerHTML='<span class="ok">Active</span>'; S('scSessionRaw').textContent=JSON.stringify({ user:session.user.id, email:session.user.email }, null, 2); }
      let membership=null; try{ const { data, error } = await sb.rpc('get_unified_membership'); if(error){ S('scMember').innerHTML='<span class="bad">RPC error</span>'; S('scMemberRaw').textContent=error.message||String(error);} else { membership=data; S('scMember').innerHTML=data?`<span class="ok">${data.tier||'NONE'}</span>`:'<span class="bad">None</span>'; S('scMemberRaw').textContent=JSON.stringify(data,null,2);} } catch(e){ S('scMember').innerHTML='<span class="bad">Exception</span>'; S('scMemberRaw').textContent=e.message; }
      let admin=null; try{ const { data, error } = await sb.rpc('check_admin_access', { p_required_role: 'admin', p_ip_address: null }); if(error){ S('scAdmin').innerHTML='<span class="bad">RPC error</span>'; S('scAdminRaw').textContent=error.message||String(error);} else { admin=data; S('scAdmin').innerHTML = data?.access_granted?`<span class="ok">GRANTED (${data.role_type})</span>`:'<span class="bad">DENIED</span>'; S('scAdminRaw').textContent=JSON.stringify(data,null,2);} } catch(e){ S('scAdmin').innerHTML='<span class="bad">Exception</span>'; S('scAdminRaw').textContent=e.message; }
      if(!session){ S('scNext').textContent='Blocked'; S('scNextBody').innerHTML='Sign in, then reload this page.'; return; }
      if(admin?.access_granted){ S('scNext').textContent='Success'; S('scNextBody').innerHTML='Admin access confirmed. Reload Mission Control.'; return; }
      const email = session.user.email; S('scNext').textContent='Admin Role Missing';
      S('scNextBody').innerHTML = `User <code>${email}</code> lacks an admin role.<br><br>1) Run super-admin grant for this email in Supabase SQL.<br>2) Verify with <code>select check_admin_access('admin', null);</code>.<br>3) Reload page with Shift+Reload.`;
    } catch(e){ /* noop */ }
  }
  function open(){ ensure(); document.getElementById('hiSelfcheckBackdrop').style.display='flex'; run(); }
  // Set debug flag to suppress gating redirects site-wide
  try { sessionStorage.setItem('hi_admin_debug','1'); } catch {}
  function close(){ const el=document.getElementById('hiSelfcheckBackdrop'); if(el) el.style.display='none'; }
  window.HiAdminSelfCheck = { open, close };
  // Auto-open via hash
  if (location.hash && /self(-)?check/i.test(location.hash)){
    window.addEventListener('DOMContentLoaded', ()=> setTimeout(open, 50));
  }
})();
