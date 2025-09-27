// api/check-in.js
// Plain Node.js function: creates one "check-in" per day for the signed-in user

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
  if (body?.action === 'health') return send(res, 200, { ok: true, route: 'check-in' });

  const sess = readSession(req);
  const user = sess?.user;
  if (!user?.id) return send(res, 401, { error: 'Not signed in' });

  try {
    const { url, key } = env();

    // UTC day window for "one per day"
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const from = `${today}T00:00:00Z`;
    const to   = `${today}T23:59:59Z`;

    // already checked in?
    const existing = await fetch(
      `${url}/rest/v1/entries?user_id=eq.${encodeURIComponent(user.id)}&kind=eq.checkin&created_at=gte.${from}&created_at=lte.${to}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    ).then(r => r.json()).catch(() => []);
    if (Array.isArray(existing) && existing.length) {
      return send(res, 200, { ok: true, already: true });
    }

    const emotion_from = String(body?.emotion_from || 'Okay').slice(0, 64);
    const emotion_to   = String(body?.emotion_to   || 'Grateful').slice(0, 64);
    const note         = body?.note ? String(body.note).slice(0, 2000) : null;

    // insert new check-in
    const r = await fetch(`${url}/rest/v1/entries`, {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json', Prefer: 'return=representation'
      },
      body: JSON.stringify({
        user_id: user.id,
        emotion_from, emotion_to, note,
        kind: 'checkin'
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return send(res, 500, { error: data?.message || 'Insert failed' });

    return send(res, 200, { ok: true, entry: data?.[0] || null });
  } catch (e) {
    return send(res, 500, { error: e.message || 'Server error' });
  }
}

