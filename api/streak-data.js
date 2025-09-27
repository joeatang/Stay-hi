// api/streak-data.js
// Plain Node.js function: computes current & best streak from entries

export const config = { runtime: 'nodejs' };

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

const COOKIE = 'stayhi_session';

function parseCookies(header) {
  const raw = header || '';
  return Object.fromEntries(
    raw.split(/;\s*/).filter(Boolean).map(kv => {
      const i = kv.indexOf('=');
      return [decodeURIComponent(kv.slice(0, i)), decodeURIComponent(kv.slice(i + 1))];
    })
  );
}

function readSession(req) {
  try {
    const cookies = parseCookies(req.headers?.cookie || '');
    const raw = cookies[COOKIE];
    if (!raw) return null;
    if (raw.startsWith('{')) return JSON.parse(raw);
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const buf = Buffer.from(b64, 'base64');
    return JSON.parse(buf.toString('utf8'));
  } catch { return null; }
}

function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return { url, key };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = ''; for await (const c of req) raw += c;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const body = await readBody(req);
  if (body?.action === 'health') return send(res, 200, { ok: true, route: 'streak-data' });

  const sess = readSession(req);
  const user = sess?.user;
  if (!user?.id) return send(res, 401, { error: 'Not signed in' });

  try {
    const { url, key } = env();

    // last ~120 days of entries (both session & checkin)
    const from = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const r = await fetch(
      `${url}/rest/v1/entries?user_id=eq.${encodeURIComponent(user.id)}&created_at=gte.${from}&select=created_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await r.json().catch(() => []);
    if (!r.ok) return send(res, 500, { error: rows?.message || 'Fetch failed' });

    // set of YYYY-MM-DD that have at least one entry
    const days = new Set(rows.map(x => String(x.created_at).slice(0, 10)));

    const keyDay = d => d.toISOString().slice(0, 10);
    const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };

    // best streak (scan ascending)
    let best = 0, run = 0, prev = null;
    const sorted = Array.from(days).sort();
    for (const ymd of sorted) {
      const d = new Date(ymd + 'T00:00:00Z');
      run = prev && keyDay(addDays(prev, 1)) === ymd ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }

    // current streak (count back from today)
    let current = 0;
    let probe = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    while (days.has(keyDay(probe))) { current += 1; probe = addDays(probe, -1); }

    return send(res, 200, { current, best, totalDays: days.size });
  } catch (e) {
    return send(res, 500, { error: e.message || 'Server error' });
  }
}

