// Hi-OS Performance Budget Check
// Reads recent perf_beacons from Supabase and enforces thresholds defined in perf-budget.json.
// Threshold structure: perf-budget.json with windowHours, sampleLimit, thresholds{metric:{p50,p95,p99?}}, units map.
// Metrics assumed: seconds for ttfb/lcp/fcp, milliseconds for fid/tbt, cls as unitless score.
// Exits non-zero if any threshold breached. Prints table summary.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function loadConfig() {
  const p = resolve(process.cwd(), 'perf-budget.json');
  const raw = readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function quantiles(values, qs = [0.5, 0.95, 0.99]) {
  const arr = values.filter(v => typeof v === 'number' && Number.isFinite(v)).sort((a,b)=>a-b);
  const n = arr.length;
  const out = { count: n };
  if (n === 0) {
    for (const q of qs) out[q] = null;
    return out;
  }
  for (const q of qs) {
    const idx = Math.round((n - 1) * q);
    out[q] = arr[idx];
  }
  return out;
}

function formatMetric(name, q, units) {
  const unit = units[name] || '';
  const fmt = (v) => v == null ? '—' : (unit === 'milliseconds' ? Math.round(v) + 'ms' : v.toFixed(2) + (unit === 'seconds' ? 's' : ''));
  return `${name.padEnd(6)} p50=${fmt(q[0.5])} p95=${fmt(q[0.95])} p99=${fmt(q[0.99])} samples=${q.count}`;
}

async function main() {
  const cfg = loadConfig();
  const { windowHours = 24, sampleLimit = 3000, thresholds = {}, units = {}, failIfNoSamples = false, warnIfNoSamples = true } = cfg;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars.');
    process.exit(2);
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
  const cutoff = Date.now() - windowHours * 3600 * 1000;

  const { data: rows, error } = await client
    .from('perf_beacons')
    .select('ttfb,lcp,fid,cls,fcp,tbt,ts')
    .gt('ts', cutoff)
    .order('ts', { ascending: false })
    .limit(sampleLimit);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(3);
  }

  if (!rows || rows.length === 0) {
    const msg = `No perf_beacons samples in last ${windowHours}h.`;
    if (failIfNoSamples) {
      console.error(msg + ' Failing due to failIfNoSamples=true');
      process.exit(4);
    }
    if (warnIfNoSamples) console.warn(msg + ' (warning only)');
    console.log('PASS (no samples).');
    return;
  }

  const metrics = {
    ttfb: rows.map(r => r.ttfb).filter(v => v != null),
    lcp: rows.map(r => r.lcp).filter(v => v != null),
    fid: rows.map(r => r.fid).filter(v => v != null),
    cls: rows.map(r => r.cls).filter(v => v != null),
    fcp: rows.map(r => r.fcp).filter(v => v != null),
    tbt: rows.map(r => r.tbt).filter(v => v != null)
  };

  const results = {};
  for (const name of Object.keys(metrics)) {
    results[name] = quantiles(metrics[name]);
  }

  console.log('--- Performance Budget Summary ---');
  for (const name of Object.keys(results)) {
    console.log(formatMetric(name, results[name], units));
  }

  let failed = false;
  const breaches = [];
  for (const [metric, spec] of Object.entries(thresholds)) {
    const q = results[metric];
    if (!q) continue;
    for (const [quant, limit] of Object.entries(spec)) {
      const qKey = quant === 'p50' ? 0.5 : quant === 'p95' ? 0.95 : quant === 'p99' ? 0.99 : null;
      if (qKey == null) continue;
      const val = q[qKey];
      if (val == null) continue; // no samples
      if (val > limit) {
        failed = true;
        breaches.push(`${metric} ${quant}=${val} > ${limit}`);
      }
    }
  }

  if (failed) {
    console.error('Budget FAIL:');
    for (const b of breaches) console.error(' - ' + b);
    process.exit(1);
  } else {
    console.log('Budget PASS: No thresholds breached.');
  }
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(99);
});
