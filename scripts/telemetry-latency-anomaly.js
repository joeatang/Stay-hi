#!/usr/bin/env node
/**
 * telemetry-latency-anomaly.js
 * Computes p95 decision latency for the last 15 minutes and compares to a 24h baseline.
 * Inserts a row into access_telemetry_perf_alerts on threshold breach.
 */
import { createClient } from '@supabase/supabase-js';

async function main(){
  const DRY = process.env.TELEMETRY_DRY_RUN === '1';
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  let sb = null;
  if(!DRY){
    if(!url || !key){ console.error('[Perf] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }
    sb = createClient(url, key, { auth:{ autoRefreshToken:false, persistSession:false } });
  } else {
    console.log('[Perf] DRY RUN mode enabled (no DB writes)');
  }

  const end = new Date();
  const start = new Date(end.getTime() - 15*60*1000);
  const baselineStart = new Date(start.getTime() - 24*60*60*1000);
  const isoStart = start.toISOString(); const isoEnd = end.toISOString(); const isoBaseline = baselineStart.toISOString();

  // Fetch recent decision events with latency (allowed or blocked)
  let windowLatencies;
  if(DRY){
    windowLatencies = Array.from({length: 120}, ()=> 150 + Math.floor(Math.random()*200)); // 150-350ms
  } else {
    const { data: winRows, error: winErr } = await sb.from('access_telemetry')
      .select('decision_latency_ms')
      .gte('ts', isoStart).lt('ts', isoEnd)
      .in('type', ['access-allowed','access-blocked'])
      .not('decision_latency_ms', 'is', null);
    if(winErr){ console.error('[Perf] Window fetch error:', winErr.message); process.exit(1); }
    windowLatencies = (winRows||[]).map(r=> Number(r.decision_latency_ms)).filter(n=> !isNaN(n));
  }

  // Baseline 24h
  let baselineLatencies;
  if(DRY){
    baselineLatencies = Array.from({length: 1000}, ()=> 160 + Math.floor(Math.random()*140)); // 160-300ms
  } else {
    const { data: baseRows, error: baseErr } = await sb.from('access_telemetry')
      .select('decision_latency_ms')
      .gte('ts', isoBaseline).lt('ts', isoStart)
      .in('type', ['access-allowed','access-blocked'])
      .not('decision_latency_ms', 'is', null);
    if(baseErr){ console.error('[Perf] Baseline fetch error:', baseErr.message); process.exit(1); }
    baselineLatencies = (baseRows||[]).map(r=> Number(r.decision_latency_ms)).filter(n=> !isNaN(n));
  }

  function p95(arr){ if(!arr.length) return null; const s=arr.slice().sort((a,b)=>a-b); const idx=Math.ceil(0.95*(s.length))-1; return s[Math.max(0, Math.min(idx, s.length-1))]; }
  const p95Win = p95(windowLatencies);
  const p95Base = p95(baselineLatencies);

  if(p95Win === null){ console.log('[Perf] No latency data in window'); return; }

  const THRESHOLD_MS = 400; // absolute ceiling for decision latency p95
  const MULT_MAJOR = 1.5; const MULT_CRIT = 2.0; // relative multipliers vs baseline
  let triggered=false; let severity='warning';

  if(p95Win >= THRESHOLD_MS){
    triggered=true;
  }
  if(p95Base != null){
    if(p95Win >= p95Base * MULT_CRIT) severity='critical', triggered=true;
    else if(p95Win >= p95Base * MULT_MAJOR) severity='major', triggered=true;
  }

  if(!triggered){ console.log('[Perf] No perf alert. p95:', p95Win, 'baseline:', p95Base); return; }

  const row = {
    window_start: isoStart,
    window_end: isoEnd,
    p95_latency_ms: p95Win,
    baseline_p95_ms: p95Base,
    threshold_ms: THRESHOLD_MS,
    total_decisions: windowLatencies.length,
    triggered: true,
    context: 'all',
    severity
  };
  if(DRY){
    console.log('[Perf][DRY] Would insert perf alert:', row);
  } else {
    const { error: insErr } = await sb.from('access_telemetry_perf_alerts').insert(row);
    if(insErr){ console.error('[Perf] Insert error:', insErr.message); process.exit(1); }
    console.log('[Perf] Perf alert inserted:', row);
  }

  // Optional webhook notify
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if(!DRY && webhook && (severity==='critical' || severity==='major')){
    try {
      await fetch(webhook, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ text:`Access latency ${severity}: p95=${p95Win}ms (baseline=${p95Base||'n/a'}ms)` }) });
      console.log('[Perf] Webhook sent');
    } catch(e){ console.error('[Perf] Webhook failed', e.message); }
  }
}

main().catch(e=>{ console.error('[Perf] Fatal:', e); process.exit(1); });
