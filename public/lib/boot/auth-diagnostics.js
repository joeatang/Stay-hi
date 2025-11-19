// auth-diagnostics.js
// Lightweight diagnostic overlay for auth/admin event flow.
// Enables visibility into: session state, AdminAccessManager state transitions,
// dispatched events (hi:auth-ready, hi:admin-state-changed, hi:admin-confirmed),
// and token refresh attempts. Activated with ?authdebug=1.
(function(){
  try {
    const qp = new URLSearchParams(location.search);
    if (qp.get('authdebug') !== '1') return;
  } catch { return; }

  const logs = [];
  function log(type, msg, extra){
    const entry = { ts: new Date().toISOString(), type, msg, extra }; logs.push(entry); render(); }

  function render(){
    if (!panel) return;
    panelBody.textContent = logs.map(l=> `[${l.ts}] ${l.type}: ${l.msg}` + (l.extra?` | ${JSON.stringify(l.extra)}`:'')).join('\n');
  }

  const panel = document.createElement('div');
  panel.style.cssText='position:fixed;bottom:10px;right:10px;width:360px;max-height:40vh;display:flex;flex-direction:column;z-index:100000;font-size:11px;font-family:Menlo,monospace;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;box-shadow:0 8px 28px -6px rgba(0,0,0,.6);overflow:hidden;';
  panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#1e293b;font-weight:600;">Auth Diagnostics <div style="display:flex;gap:6px;">\n    <button id="authDiagRefresh" style="background:#0ea5e9;border:none;color:#fff;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:600;">Recheck</button>\n    <button id="authDiagExport" style="background:#64748b;border:none;color:#fff;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:600;">Export</button>\n    <button id="authDiagClose" style="background:#dc2626;border:none;color:#fff;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:600;">×</button></div></div>';
  const panelBody = document.createElement('pre');
  panelBody.style.cssText='margin:0;padding:8px 10px;overflow:auto;flex:1;white-space:pre-wrap;';
  panel.appendChild(panelBody);
  document.body.appendChild(panel);

  document.getElementById('authDiagClose').onclick = ()=> panel.remove();
  document.getElementById('authDiagExport').onclick = ()=>{
    const blob = new Blob([panelBody.textContent], { type:'text/plain' });
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='auth-diagnostics.log'; a.click();
  };
  document.getElementById('authDiagRefresh').onclick = async ()=>{
    try { const st = await window.AdminAccessManager?.checkAdmin({ force:true }); log('manual-recheck','Forced admin recheck', st); } catch(e){ log('error','Recheck failed',{ error:e.message }); }
  };

  // Hook Supabase session changes if available
  try {
    const client = (window.hiSupabase) || (window.HiSupabase?.getClient && window.HiSupabase.getClient()) || window.supabase || null;
    if (client?.auth?.onAuthStateChange){
      client.auth.onAuthStateChange((event, session)=>{
        log('supabase-auth', `Auth state: ${event}`, { user: session?.user?.id, email: session?.user?.email });
      });
    }
  } catch {}

  window.addEventListener('hi:auth-ready', ()=> log('event','hi:auth-ready received'));
  window.addEventListener('hi:admin-state-changed', e=> log('event','hi:admin-state-changed', e.detail));
  window.addEventListener('hi:admin-confirmed', e=> log('event','hi:admin-confirmed', { user: e.detail?.user?.id }));

  // Initial snapshot
  try { const st = window.AdminAccessManager?.getState?.(); log('snapshot','Initial admin state', st); } catch {}
  try { const client = (window.hiSupabase) || (window.HiSupabase?.getClient && window.HiSupabase.getClient()) || window.supabase || null; if (client){ client.auth.getSession().then(({ data })=>{ log('snapshot','Supabase session', { user:data?.session?.user?.id }); }); } } catch {}
})();
