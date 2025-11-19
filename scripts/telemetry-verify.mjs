#!/usr/bin/env node
// Verify telemetry tables accept inserts via Supabase anon key (RLS inserts allowed)
// Env required: SUPABASE_URL, SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(url, key);

function nowMs(){ return Date.now(); }
function randTag(){ return 'verify-' + Math.random().toString(36).slice(2,8); }

async function insertPerf(){
  const payload = {
    ts: nowMs(),
    build_tag: randTag(),
    path: '/verify',
    ttfb: 100.1,
    lcp: 1200.5,
    fid: 12.3,
    cls: 0.01,
    fcp: 600.2,
    tbt: 45.6,
    long_tasks: 0,
    resources: { sample: true }
  };
  const { error } = await supabase.from('perf_beacons').insert(payload);
  if (error) throw new Error('perf_beacons insert failed: ' + error.message);
}

async function insertIntegrity(){
  const payload = {
    ts: nowMs(),
    build_tag: randTag(),
    path: '/verify',
    src: 'https://cdn.example.com/lib.js',
    event_type: 'missing',
    expected: null,
    actual: null
  };
  const { error } = await supabase.from('integrity_events').insert(payload);
  if (error) throw new Error('integrity_events insert failed: ' + error.message);
}

async function insertError(){
  const payload = {
    ts: nowMs(),
    build_tag: randTag(),
    path: '/verify',
    type: 'error',
    message: 'Telemetry verify test',
    stack: 'stack...',
    src: 'verify.js',
    line: 1,
    col: 1
  };
  const { error } = await supabase.from('error_events').insert(payload);
  if (error) throw new Error('error_events insert failed: ' + error.message);
}

async function insertTrack(){
  const payload = {
    ts: nowMs(),
    build_tag: randTag(),
    path: '/verify',
    event: 'verify_event',
    data: { ok: true }
  };
  const { error } = await supabase.from('track_events').insert(payload);
  if (error) throw new Error('track_events insert failed: ' + error.message);
}

(async () => {
  try {
    await insertPerf();
    await insertIntegrity();
    await insertError();
    await insertTrack();
    console.log('✅ Telemetry verify: all inserts succeeded');
    process.exit(0);
  } catch (e) {
    console.error('❌ Telemetry verify failed:', e.message);
    process.exit(1);
  }
})();
