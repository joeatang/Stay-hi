// AdminAudit.js - lightweight client-side audit event helper
// Requires authenticated admin (AdminAccessManager). Inserts structured rows into admin_access_logs.
// NOTE: Relies on existing table columns: action_type, resource_accessed, success, failure_reason.
(function(){
  function getClient(){
    return (window.HiSupabase?.getClient && window.HiSupabase.getClient()) || window.hiSupabase || window.supabaseClient || window.sb || null;
  }
  async function log(event, meta={}, { success=true, failureReason=null }={}){
    try {
      const st = window.AdminAccessManager?.getState?.();
      if (!st?.isAdmin) return; // only log for admins
      const sb = getClient(); if (!sb?.from) return;
      const payload = {
        action_type: `client_${event}`.slice(0,64),
        resource_accessed: (meta.resource || event).slice(0,128),
        success: !!success,
        failure_reason: failureReason || null
      };
      await sb.from('admin_access_logs').insert(payload).select();
    } catch(e){ /* swallow to avoid UI disruption */ }
  }
  window.HiAudit = window.HiAudit || { log };
})();