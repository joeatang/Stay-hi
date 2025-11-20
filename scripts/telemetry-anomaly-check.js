#!/usr/bin/env node
/**
 * telemetry-anomaly-check.js
 * Computes a 5-minute access gating window and compares blocked ratio against a 24h baseline.
 * Inserts an alert row in access_telemetry_alerts if thresholds exceeded.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_KEY env vars (service role for insert/select).
 */
import { createClient } from '@supabase/supabase-js';

async function main(){
  const DRY = process.env.TELEMETRY_DRY_RUN === '1';
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  let sb = null;
  if(!DRY){
    if(!url || !key){
      console.error('[Anomaly] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
      process.exit(1);
    }
    sb = createClient(url, key, { auth:{ autoRefreshToken:false, persistSession:false } });
  } else {
    console.log('[Anomaly] DRY RUN mode enabled (no DB writes)');
  }

  const now = new Date();
  const windowEnd = now; // current time
  const windowStart = new Date(windowEnd.getTime() - 5*60*1000); // last 5 minutes
  const baselineStart = new Date(windowStart.getTime() - 24*60*60*1000); // previous 24h excluding current window

  const isoWindowStart = windowStart.toISOString();
  const isoWindowEnd = windowEnd.toISOString();
  const isoBaselineStart = baselineStart.toISOString();

  console.log('[Anomaly] Window', isoWindowStart, '→', isoWindowEnd);
  console.log('[Anomaly] Baseline', isoBaselineStart, '→', isoWindowStart);

  // Helper to count events by type within range
  async function countType(type, start, end){
    if(DRY){
      // Simple synthetic distribution: fewer requested in small windows
      const base = type === 'access-requested' ? 120 : 30;
      return base + Math.floor(Math.random()*20) - 10;
    }
    const { count, error } = await sb.from('access_telemetry')
      .select('*', { count: 'exact', head: true })
      .gte('ts', start)
      .lt('ts', end)
      .eq('type', type);
    if(error){ throw new Error('Count error for '+type+': '+error.message); }
    return count || 0;
  }

  // Current window counts
  const [windowRequested, windowBlocked] = await Promise.all([
    countType('access-requested', isoWindowStart, isoWindowEnd),
    countType('access-blocked', isoWindowStart, isoWindowEnd)
  ]);
  const windowRatio = windowRequested > 0 ? (windowBlocked / windowRequested) : 0;

  // Baseline counts (previous 24h excluding current window)
  const [baselineRequested, baselineBlocked] = await Promise.all([
    countType('access-requested', isoBaselineStart, isoWindowStart),
    countType('access-blocked', isoBaselineStart, isoWindowStart)
  ]);
  const baselineRatio = baselineRequested > 0 ? (baselineBlocked / baselineRequested) : null; // null if no baseline data

  console.log('[Anomaly] Window requested:', windowRequested, 'blocked:', windowBlocked, 'ratio:', windowRatio.toFixed(4));
  console.log('[Anomaly] Baseline requested:', baselineRequested, 'blocked:', baselineBlocked, 'ratio:', baselineRatio === null ? 'n/a' : baselineRatio.toFixed(4));

  // Threshold configuration (could externalize later)
  const THRESHOLD_RATIO = 0.35; // absolute ratio trigger (base)
  const MIN_BLOCKED = 50; // minimum blocked events in window
  const RELATIVE_MULTIPLIER = 1.5; // window ratio must exceed baseline * multiplier when baseline exists
  const SEVERITY_MAJOR_MULT = 2.0; // ratio >= baseline*2 or >= THRESHOLD_RATIO*2
  const SEVERITY_CRITICAL_MULT = 3.0; // ratio >= baseline*3 or >= THRESHOLD_RATIO*3

  let triggered = false; let severity = 'warning';
  if(windowBlocked >= MIN_BLOCKED && windowRatio >= THRESHOLD_RATIO){
    if(baselineRatio === null){
      triggered = true; // no baseline yet, rely on absolute thresholds
    } else if(windowRatio >= baselineRatio * RELATIVE_MULTIPLIER){
      triggered = true;
    }
  }

  if(triggered){
    if(baselineRatio !== null){
      if(windowRatio >= Math.max(THRESHOLD_RATIO*SEVERITY_CRITICAL_MULT, baselineRatio*SEVERITY_CRITICAL_MULT)) severity='critical';
      else if(windowRatio >= Math.max(THRESHOLD_RATIO*SEVERITY_MAJOR_MULT, baselineRatio*SEVERITY_MAJOR_MULT)) severity='major';
    } else {
      if(windowRatio >= THRESHOLD_RATIO*SEVERITY_CRITICAL_MULT) severity='critical';
      else if(windowRatio >= THRESHOLD_RATIO*SEVERITY_MAJOR_MULT) severity='major';
    }
  }

  console.log('[Anomaly] Trigger evaluation:', { triggered, THRESHOLD_RATIO, MIN_BLOCKED, RELATIVE_MULTIPLIER });

  if(!triggered){
    console.log('[Anomaly] No alert triggered for this window.');
    return; // exit silently; could optionally insert non-triggered row for auditing later
  }

  const alertRow = {
    window_start: isoWindowStart,
    window_end: isoWindowEnd,
    total_requested: windowRequested,
    total_blocked: windowBlocked,
    blocked_ratio: windowRatio,
    baseline_ratio: baselineRatio,
    threshold_ratio: THRESHOLD_RATIO,
    min_blocked_threshold: MIN_BLOCKED,
    triggered: true,
    context: 'all',
    severity
  };

  if(DRY){
    console.log('[Anomaly][DRY] Would insert alert:', alertRow);
  } else {
    const { error: insertError } = await sb.from('access_telemetry_alerts').insert(alertRow);
    if(insertError){
      console.error('[Anomaly] Insert error:', insertError.message);
      process.exit(1);
    }
    console.log('[Anomaly] Alert inserted:', alertRow);
  }

  // Per-context evaluation (simple pass) for contexts contributing spikes
  const contexts = ['dashboard','muscle','island','profile','calendar','admin'];
  for(const ctx of contexts){
    const [ctxReq, ctxBlk] = DRY ? [
      40 + Math.floor(Math.random()*10) - 5,
      10 + Math.floor(Math.random()*6) - 3
    ] : await Promise.all([
      sb.from('access_telemetry').select('*', { count: 'exact', head: true })
        .gte('ts', isoWindowStart).lt('ts', isoWindowEnd).eq('type','access-requested').eq('context', ctx),
      sb.from('access_telemetry').select('*', { count: 'exact', head: true })
        .gte('ts', isoWindowStart).lt('ts', isoWindowEnd).eq('type','access-blocked').eq('context', ctx)
    ]).then(results => results.map(r => (r.count||0))); // results[0], results[1]
    const ctxRatio = ctxReq>0 ? ctxBlk/ctxReq : 0;
    if(ctxBlk >= MIN_BLOCKED && ctxRatio >= THRESHOLD_RATIO){
      let ctxSeverity='warning';
      if(ctxRatio >= THRESHOLD_RATIO*SEVERITY_CRITICAL_MULT) ctxSeverity='critical';
      else if(ctxRatio >= THRESHOLD_RATIO*SEVERITY_MAJOR_MULT) ctxSeverity='major';
      if(DRY){
        console.log('[Anomaly][DRY] Would insert context alert', ctx, { requested: ctxReq, blocked: ctxBlk, severity: ctxSeverity });
      } else {
        const { error: ctxInsertErr } = await sb.from('access_telemetry_alerts').insert({
          window_start: isoWindowStart,
          window_end: isoWindowEnd,
          total_requested: ctxReq,
          total_blocked: ctxBlk,
          blocked_ratio: ctxRatio,
          baseline_ratio: baselineRatio, // reuse global baseline for now
          threshold_ratio: THRESHOLD_RATIO,
          min_blocked_threshold: MIN_BLOCKED,
          triggered: true,
          context: ctx,
          severity: ctxSeverity
        });
        if(ctxInsertErr){ console.error('[Anomaly] Context alert insert error', ctx, ctxInsertErr.message); }
        else { console.log('[Anomaly] Context alert inserted', ctx, ctxBlk+'/'+ctxReq, ctxSeverity); }
      }
    }
  }

  // Optional webhook notification for critical severity
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if(!DRY && webhook && severity === 'critical'){
    try {
      const payload = { text: `Critical access anomaly: ${(windowRatio*100).toFixed(1)}% blocked (${windowBlocked}/${windowRequested}) window ending ${isoWindowEnd}` };
      await fetch(webhook, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      console.log('[Anomaly] Critical webhook dispatched');
    } catch(e){ console.error('[Anomaly] Webhook dispatch failed', e.message); }
  }
}

main().catch(e=>{ console.error('[Anomaly] Fatal:', e); process.exit(1); });
