// Secure local telemetry admin server for Hi-OS
// - Uses Supabase service role to read telemetry tables (server-side only)
// - Exposes read-only JSON endpoints for the admin dashboard page
// - Do NOT expose service role to the browser or commit it; load via env or .env.local

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadDotEnv() {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, '.env.local'),
    resolve(cwd, '.env'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const txt = readFileSync(p, 'utf8');
        for (const line of txt.split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
          if (!m) continue;
          const key = m[1];
          let val = m[2];
          // Remove optional surrounding quotes
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!(key in process.env)) process.env[key] = val;
        }
      } catch {}
    }
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT || 5055);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in env (.env.local recommended).');
  console.error('Create a .env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE before starting.');
}

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

function json(res, code, obj, corsOrigin) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function ok(res, obj, corsOrigin) { json(res, 200, obj, corsOrigin); }
function bad(res, msg, corsOrigin) { json(res, 400, { error: msg }, corsOrigin); }
function serverError(res, msg, corsOrigin) { json(res, 500, { error: msg }, corsOrigin); }

function corsOriginFor(req) {
  const origin = req.headers.origin || '';
  const allowed = new Set([
    'http://localhost:3030',
    'http://127.0.0.1:3030',
  ]);
  return allowed.has(origin) ? origin : '*';
}

function quantiles(arr, qs = [0.5, 0.95, 0.99]) {
  const a = arr.filter((x) => typeof x === 'number' && Number.isFinite(x)).slice().sort((x, y) => x - y);
  const n = a.length;
  const out = {};
  for (const q of qs) {
    if (n === 0) out[q] = null; else {
      const i = Math.max(0, Math.min(n - 1, Math.floor(q * (n - 1))));
      out[q] = a[i];
    }
  }
  return { count: n, ...out };
}

async function getSummary(hours = 24) {
  if (!supabase) return { ready: false };
  const now = Date.now();
  const cutoff = now - (Number(hours) * 3600 * 1000);

  // Perf beacons: limit ingestion for local summary to 2000 recent rows
  const { data: perfRows, error: perfErr } = await supabase
    .from('perf_beacons')
    .select('ttfb,lcp,fid,cls,fcp,tbt,long_tasks,build_tag,ts,path')
    .gt('ts', cutoff)
    .order('ts', { ascending: false })
    .limit(2000);
  if (perfErr) throw new Error(`perf_beacons query failed: ${perfErr.message}`);

  const ttfb = perfRows.map(r => r.ttfb).filter(x => x != null);
  const lcp = perfRows.map(r => r.lcp).filter(x => x != null);
  const fid = perfRows.map(r => r.fid).filter(x => x != null);
  const cls = perfRows.map(r => r.cls).filter(x => x != null);
  const fcp = perfRows.map(r => r.fcp).filter(x => x != null);
  const tbt = perfRows.map(r => r.tbt).filter(x => x != null);

  // Error count (exact, without pulling all rows)
  const { count: errorCount, error: errCountErr } = await supabase
    .from('error_events')
    .select('id', { count: 'exact', head: true })
    .gt('ts', cutoff);
  if (errCountErr) throw new Error(`error_events count failed: ${errCountErr.message}`);

  // Integrity count
  const { count: integrityCount, error: intCountErr } = await supabase
    .from('integrity_events')
    .select('id', { count: 'exact', head: true })
    .gt('ts', cutoff);
  if (intCountErr) throw new Error(`integrity_events count failed: ${intCountErr.message}`);

  return {
    ready: true,
    windowHours: Number(hours),
    totals: {
      perf_samples: perfRows.length,
      error_events: errorCount ?? null,
      integrity_events: integrityCount ?? null,
    },
    vitals: {
      ttfb: quantiles(ttfb),
      lcp: quantiles(lcp),
      fid: quantiles(fid),
      cls: quantiles(cls),
      fcp: quantiles(fcp),
      tbt: quantiles(tbt),
    },
  };
}

const ALLOWED_TABLES = new Set(['error_events', 'integrity_events', 'perf_beacons', 'track_events']);

async function getRecent(table, limit = 100) {
  if (!supabase) return { ready: false };
  if (!ALLOWED_TABLES.has(table)) throw new Error('Invalid table');
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('ts', { ascending: false })
    .limit(Math.min(Number(limit) || 100, 500));
  if (error) throw new Error(`${table} query failed: ${error.message}`);
  return { ready: true, rows: data };
}

const server = http.createServer(async (req, res) => {
  const corsOrigin = corsOriginFor(req);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/health') {
      return ok(res, { ok: true, supabaseConfigured: !!supabase }, corsOrigin);
    }
    if (url.pathname === '/api/summary') {
      const hours = url.searchParams.get('hours') || '24';
      if (!supabase) return bad(res, 'Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE.', corsOrigin);
      const data = await getSummary(hours);
      return ok(res, data, corsOrigin);
    }
    if (url.pathname === '/api/recent') {
      const table = url.searchParams.get('table') || '';
      const limit = url.searchParams.get('limit') || '100';
      if (!supabase) return bad(res, 'Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE.', corsOrigin);
      const data = await getRecent(table, limit);
      return ok(res, data, corsOrigin);
    }
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (e) {
    serverError(res, e?.message || 'Server error', corsOrigin);
  }
});

server.listen(PORT, () => {
  console.log(`Hi-OS Telemetry Admin server running on http://localhost:${PORT}`);
  console.log('CORS allowed from http://localhost:3030');
});
