// AdminAccessManager.js
// Woz-grade unified, idempotent administrative access orchestrator.
// Goal: Eliminate race conditions, duplicate Supabase clients, scattered flags.
// Provides a single async path to determine admin status with caching + events.
// Exposes: window.AdminAccessManager
// Events dispatched on window: 'hi:admin-state-changed', 'hi:admin-confirmed'
// Cache keys: localStorage('hi_admin_state' { isAdmin, ts }), sessionStorage('hi_admin_access') for legacy consumers.

(function(){
  if (window.AdminAccessManager) return; // singleton guard
  const CACHE_KEY = 'hi_admin_state';
  const LEGACY_FLAG = 'hi_admin_access';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes freshness window
  const STATE = { status: 'idle', isAdmin: false, reason: null, lastChecked: 0, user: null, roleType: null };
  const listeners = new Set();

  function getClient(){
    const candidates = [
      window.hiSupabase,
      (window.HiSupabase?.getClient && window.HiSupabase.getClient()),
      window.supabaseClient,
      window.sb
    ];
    for (const c of candidates){
      if (c && c.auth && typeof c.auth.getSession === 'function') return c;
    }
    return null;
  }

  function loadCache(){
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.ts !== 'number') return;
      if (Date.now() - parsed.ts > CACHE_TTL_MS) return; // stale
      STATE.status = 'cached';
      STATE.isAdmin = !!parsed.isAdmin;
      STATE.lastChecked = parsed.ts;
      if (STATE.isAdmin){
        sessionStorage.setItem(LEGACY_FLAG,'true');
        dispatchState();
      }
    } catch {}
  }

  function writeCache(){
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ isAdmin: STATE.isAdmin, ts: STATE.lastChecked, roleType: STATE.roleType || null })); } catch {}
  }

  function dispatchState(){
    window.dispatchEvent(new CustomEvent('hi:admin-state-changed', { detail: { ...STATE } }));
    listeners.forEach(fn => { try { fn({ ...STATE }); } catch{} });
    if (STATE.isAdmin){
      window.dispatchEvent(new CustomEvent('hi:admin-confirmed', { detail: { user: STATE.user } }));
    }
  }

  async function fetchRoleType(client){
    if (!STATE.isAdmin) return null;
    try {
      const { data, error } = await client
        .from('admin_roles')
        .select('role_type')
        .eq('user_id', STATE.user?.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data.role_type || null;
    } catch { return null; }
  }

  async function checkAdmin({ force=false } = {}){
    const client = getClient();
    if (!client || !client.rpc){
      STATE.status='error'; STATE.reason='supabase_unavailable'; dispatchState(); return STATE;
    }
    if (!force && STATE.status==='cached' && STATE.isAdmin){
      // If cached but roleType missing, attempt lightweight fetch (non-blocking)
      if (!STATE.roleType){
        fetchRoleType(client).then(rt=>{ if(rt){ STATE.roleType=rt; writeCache(); window.dispatchEvent(new CustomEvent('hi:admin-role-known', { detail:{ roleType: rt } })); dispatchState(); } });
      }
      return STATE; // already good (cached path)
    }
    STATE.status='checking'; dispatchState();
    try {
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData?.session?.user || null;
      STATE.user = user;
      if (!user){ STATE.status='denied'; STATE.isAdmin=false; STATE.reason='no_session'; STATE.lastChecked=Date.now(); STATE.roleType=null; writeCache(); dispatchState(); return STATE; }
      // v2-only: deterministic signature; legacy overloads dropped
      let rpcData=null, rpcError=null;
      try {
        const { data, error } = await client.rpc('check_admin_access_v2', { p_required_role: 'admin', p_ip_address: null });
        rpcData = data; rpcError = error;
      } catch(e){ rpcError = e; }
      STATE.lastChecked = Date.now();
      const data = rpcData; const error = rpcError;
      // Support legacy { has_access } or new { access_granted }
      const granted = (!!data?.has_access) || (!!data?.access_granted);
      if (!error && granted){
        STATE.status='granted'; STATE.isAdmin=true; STATE.reason=null;
        // Fetch roleType (parallel but we await briefly for immediate banner specialization)
        try { STATE.roleType = await fetchRoleType(client); } catch { STATE.roleType=null; }
        writeCache(); sessionStorage.setItem(LEGACY_FLAG,'true');
        if (STATE.roleType){ window.dispatchEvent(new CustomEvent('hi:admin-role-known', { detail:{ roleType: STATE.roleType } })); }
        dispatchState(); return STATE;
      }
      const reason = data?.reason || data?.error || error?.message || 'unauthorized';
      STATE.status='denied'; STATE.isAdmin=false; STATE.reason=reason; STATE.roleType=null; writeCache(); dispatchState(); return STATE;
    } catch(e){
      STATE.status='error'; STATE.isAdmin=false; STATE.reason=e.message||'unknown'; STATE.lastChecked=Date.now(); STATE.roleType=null; writeCache(); dispatchState(); return STATE;
    }
  }

  async function requireAdmin(opts={}){
    const st = await checkAdmin(opts);
    if (!st.isAdmin){ throw new Error(st.reason || 'admin_required'); }
    return st;
  }

  function onChange(fn){ listeners.add(fn); return () => listeners.delete(fn); }

  function init(){ loadCache(); if (STATE.status!=='cached'){ // warm check asynchronously
      setTimeout(()=>{ checkAdmin().catch(()=>{}); }, 200); }
    // Also revalidate on auth-ready and client upgrade to avoid stub false-negatives
    window.addEventListener('hi:auth-ready', ()=>{ checkAdmin({ force:true }); });
    window.addEventListener('hi:auth-updated', ()=>{ checkAdmin({ force:true }); });
    window.addEventListener('supabase-upgraded', ()=>{ checkAdmin({ force:true }); });
  }

  window.AdminAccessManager = { init, checkAdmin, requireAdmin, getState: () => ({ ...STATE }), onChange };

  init();
})();
