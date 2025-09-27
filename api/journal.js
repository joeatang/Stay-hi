// api/journal.js
// Plain Node.js style for Vercel functions

export const config = { runtime: 'nodejs' };

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

const COOKIE_NAME = 'stayhi_session';

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
    const raw = cookies[COOKIE_NAME];
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
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const body = await readBody(req);
  const action = body?.action;

  if (action === 'health') {
    return send(res, 200, { ok: true, route: 'journal', time: new Date().toISOString() });
  }

  const sess = readSession(req);
  const user = sess?.user;
  if (!user?.id) return send(res, 401, { error: 'Not signed in' });

  try {
    const { url, key } = env();

    if (action === 'list') {
      const r = await fetch(
        `${url}/rest/v1/entries?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=50`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const data = await r.json().catch(() => []);
      if (!r.ok) return send(res, 500, { error: data?.message || 'List failed' });
      return send(res, 200, { entries: data });
    }

    if (action === 'create') {
      const emotion_from = String(body?.emotion_from || '').slice(0, 64);
      const emotion_to   = String(body?.emotion_to   || '').slice(0, 64);
      const note         = String(body?.note || '').slice(0, 2000);
      if (!emotion_from || !emotion_to) return send(res, 400, { error: 'Missing emotions' });

      const r = await fetch(`${url}/rest/v1/entries`, {
        method: 'POST',
        headers: {
          apikey: key, Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json', Prefer: 'return=representation'
        },
        body: JSON.stringify({ user_id: user.id, emotion_from, emotion_to, note, kind: 'session' })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return send(res, 500, { error: data?.message || 'Insert failed' });
      return send(res, 200, { entry: data?.[0] || null });
    }

    return send(res, 400, { error: 'Unknown action' });
  } catch (e) {
    return send(res, 500, { error: e.message || 'Server error' });
  }
}
