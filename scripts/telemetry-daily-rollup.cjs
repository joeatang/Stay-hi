#!/usr/bin/env node
/**
 * telemetry-daily-rollup.js
 * Aggregates previous day's access_telemetry rows into access_telemetry_daily.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_KEY env vars (service role for upsert).
 */
const { createClient } = require('@supabase/supabase-js');

async function main(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if(!url || !key){
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  // Previous day (UTC)
  const now = new Date();
  const dayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()-1));
  const dayStr = dayDate.toISOString().slice(0,10);
  console.log('[Rollup] Aggregating day', dayStr);

  // Fetch rows for that day
  const start = dayStr + 'T00:00:00.000Z';
  const endDate = new Date(Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate()+1));
  const end = endDate.toISOString().slice(0,10) + 'T00:00:00.000Z';

  const { data, error } = await sb.from('access_telemetry')
    .select('*')
    .gte('ts', start)
    .lt('ts', end);
  if(error){
    console.error('[Rollup] Fetch error:', error.message);
    process.exit(1);
  }
  console.log('[Rollup] Fetched', data.length, 'rows');

  // Aggregate
  const byType = {};
  for(const row of data){
    const t = row.type || 'unknown';
    const bucket = byType[t] || (byType[t] = { total_count:0, users:new Set(), first_ts: null, last_ts: null });
    bucket.total_count++;
    if(row.user_id) bucket.users.add(row.user_id);
    const ts = new Date(row.ts);
    if(!bucket.first_ts || ts < bucket.first_ts) bucket.first_ts = ts;
    if(!bucket.last_ts || ts > bucket.last_ts) bucket.last_ts = ts;
  }

  const payload = Object.entries(byType).map(([type, bucket]) => ({
    day: dayStr,
    type,
    total_count: bucket.total_count,
    user_count: bucket.users.size, // same as unique_users for clarity
    unique_users: bucket.users.size,
    first_ts: bucket.first_ts ? bucket.first_ts.toISOString() : null,
    last_ts: bucket.last_ts ? bucket.last_ts.toISOString() : null
  }));

  if(payload.length === 0){
    console.log('[Rollup] No data for day', dayStr, '— inserting zero rows skipped.');
    return;
  }

  console.log('[Rollup] Upserting', payload.length, 'aggregated rows');
  const { error: upsertError } = await sb.from('access_telemetry_daily').upsert(payload, { onConflict: 'day,type' });
  if(upsertError){
    console.error('[Rollup] Upsert error:', upsertError.message);
    process.exit(1);
  }
  console.log('[Rollup] Completed successfully');
}

main().catch(e => { console.error('[Rollup] Fatal:', e); process.exit(1); });
