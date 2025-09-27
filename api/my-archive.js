// api/my-archive.js
export const config = { runtime: 'nodejs' };

const COOKIE_NAME = 'stayhi_session';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return Object.fromEntries(raw.split(/;\s*/).filter(Boolean).map(kv => {
    const i = kv.indexOf('=');
    return [decodeURIComponent(kv.slice(0, i)), decodeURIComponent(kv.slice(i + 1))];
  }));
}

function readSession(req) {
  try {
    const raw = parseCookies(req)[COOKIE_NAME];
    if (!raw) return null;
    const val = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64url').toString('utf8');
    return JSON.parse(val);
  } catch { return null; }
}

function requireEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return { url, key };
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const body = await req.json().catch(()=>({}));
  if (body?.action === 'health') return json({ ok: true, route: 'my-archive' });

  const sess = readSession(req);
  const user = sess?.user;
  if (!user?.id) return json({ error: 'Not signed in' }, 401);

  try {
    const { url, key } = requireEnv();
    const r = await fetch(
      `${url}/rest/v1/entries?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=50`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await r.json().catch(()=>[]);
    if (!r.ok) return json({ error: rows?.message || 'Fetch failed' }, 500);
    return json({ items: rows });
  } catch (e) {
    return json({ error: e.message || 'Server error' }, 500);
  }
}

