#!/usr/bin/env node
/**
 * telemetry-purge.js
 * Deletes raw telemetry rows older than 30 days.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_KEY (service role) env vars.
 */
const { createClient } = require('@supabase/supabase-js');

async function main(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if(!url || !key){
    console.error('[Purge] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth:{ autoRefreshToken:false, persistSession:false } });
  // We cannot directly issue DELETE with filters using supabase-js RPC unless row-level policies allow it.
  // Ensure RLS has a delete policy for service_role or rely on service_role bypassing RLS.
  const olderThan = new Date(Date.now() - 30*24*60*60*1000).toISOString();
  console.log('[Purge] Deleting rows older than', olderThan);
  const { error } = await sb.from('access_telemetry').delete().lt('ts', olderThan);
  if(error){
    console.error('[Purge] Delete error:', error.message);
    process.exit(1);
  }
  console.log('[Purge] Completed successfully');
}

main().catch(e=>{ console.error('[Purge] Fatal:', e); process.exit(1); });
