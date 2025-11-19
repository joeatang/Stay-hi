// auth-flow-qa.js
// Automated scenario harness for observing auth/admin event sequencing.
// Activate via query param: ?runAuthQA=1 (optionally with &authdebug=1 to see overlays).
// Provides a panel summarizing pass/fail for core flows.
// NOTE: Some scenarios (real login/logout, invite redemption) require manual input; harness will guide.
(function(){
  try { const qp = new URLSearchParams(location.search); if (qp.get('runAuthQA') !== '1') return; } catch { return; }
  const panel = document.createElement('div');
  panel.style.cssText='position:fixed;left:10px;bottom:10px;width:380px;max-height:55vh;display:flex;flex-direction:column;z-index:100001;font-size:11px;font-family:Menlo,monospace;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;box-shadow:0 8px 26px -6px rgba(0,0,0,.65);overflow:hidden;';
  panel.innerHTML = '<div style="padding:6px 10px;background:#1e293b;font-weight:600;display:flex;justify-content:space-between;align-items:center;">Auth Flow QA <div style="display:flex;gap:6px;"><button id="afqaRun" style="background:#0ea5e9;border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:600;">Run</button><button id="afqaExport" style="background:#64748b;border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:600;">Export</button><button id="afqaClose" style="background:#dc2626;border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:600;">×</button></div></div>';
  const body = document.createElement('pre'); body.style.cssText='margin:0;padding:8px 10px;overflow:auto;flex:1;white-space:pre-wrap;'; panel.appendChild(body); document.body.appendChild(panel);
  const results = []; const log = (phase, msg, extra)=>{ results.push(`[${new Date().toISOString()}] ${phase}: ${msg}${extra?` | ${extra}`:''}`); flush(); };
  function flush(){ body.textContent = results.join('\n'); }
  document.getElementById('afqaClose').onclick = ()=> panel.remove();
  document.getElementById('afqaExport').onclick = ()=>{ const blob=new Blob([body.textContent],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='auth-flow-qa.log'; a.click(); };
  document.getElementById('afqaRun').onclick = ()=> runHarness();

  // Capture events
  window.addEventListener('hi:auth-ready', ()=> log('event','hi:auth-ready'));  
  window.addEventListener('hi:admin-state-changed', e=> log('event','admin-state-changed', JSON.stringify(e.detail)));  
  window.addEventListener('hi:admin-confirmed', e=> log('event','admin-confirmed', JSON.stringify({ user: e.detail?.user?.id })));

  async function runHarness(){
    results.length=0; log('start','Auth Flow QA starting');
    await snapshot('initial');
    await scenarioCachedAdmin();
    await scenarioForceRecheck();
    await scenarioPasscodeUnlockSimulation();
    await scenarioInviteElevationSimulation();
    await scenarioDemotionSimulation();
    await scenarioTokenRefreshSimulation();
    log('done','QA harness complete (manual login/logout scenarios require user action).');
    log('action-required','Perform manual: login, logout, real passcode unlock, real invite redemption, then click Run again for capture.');
  }

  async function snapshot(label){
    try {
      const state = window.AdminAccessManager?.getState?.();
      log('snapshot', `${label}-admin-state`, JSON.stringify(state));
      const client = window.HiSupabase?.getClient?.() || window.supabase;
      const sess = await client?.auth?.getSession();
      log('snapshot', `${label}-session`, JSON.stringify({ user: sess?.data?.session?.user?.id }));
    } catch(e){ log('error', 'snapshot-failed', e.message); }
  }

  async function scenarioCachedAdmin(){
    log('scenario','cached-admin-check');
    try { const st = await window.AdminAccessManager?.checkAdmin(); log('result','cached-admin', JSON.stringify(st)); } catch(e){ log('error','cached-admin', e.message); }
  }

  async function scenarioForceRecheck(){
    log('scenario','force-recheck');
    try { const st = await window.AdminAccessManager?.checkAdmin({ force:true }); log('result','force-recheck', JSON.stringify(st)); } catch(e){ log('error','force-recheck', e.message); }
  }

  async function scenarioPasscodeUnlockSimulation(){
    log('scenario','passcode-unlock-sim');
    log('info','Manual step required: use gate modal to unlock with real passcode, then re-run harness.');
  }

  async function scenarioInviteElevationSimulation(){
    log('scenario','invite-elevation-sim');
    log('info','Manual step: generate invite as admin, redeem in separate profile, then return and run harness to capture new state.');
  }

  async function scenarioDemotionSimulation(){
    log('scenario','demotion-sim');
    log('info','Manual step: remove admin role in DB; refresh page; run harness to verify denied state transitions.');
  }

  async function scenarioTokenRefreshSimulation(){
    log('scenario','token-refresh-sim');
    log('info','Manual step: wait for token refresh interval or trigger via Supabase dev tools; run harness again to ensure no duplicate admin-confirmed spam.');
  }

  // Auto-run once on load for immediate snapshot
  setTimeout(()=> runHarness(), 300);
})();
