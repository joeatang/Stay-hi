// /api/journal/route.js
import { NextResponse } from 'next/server'; // Vercel Edge/Node compat (works in Vercel functions too)

// If you are not on Next, Vercel Node functions still expose Request/Response.
// We'll keep code framework-agnostic:
const COOKIE_NAME = 'stayhi_session';

function json(data, init = 200) {
  return new Response(JSON.stringify(data), {
    status: typeof init === 'number' ? init : (init?.status || 200),
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
  });
}

function parseCookies(req) {
  const h = req.headers.get('cookie') || '';
  return Object.fromEntries(h.split(/;\s*/).filter(Boolean).map(kv => {
    const i = kv.indexOf('=');
    return [decodeURIComponent(kv.slice(0, i)), decodeURIComponent(kv.slice(i + 1))];
  }));
}

async function getBody(req) {
  try { return await req.json(); } catch { return {}; }
}

function requireEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return { url, key };
}

async function sb() {
  const { url, key } = requireEnv();
  // lightweight client without imports: call REST directly
  return {
    insertEntry: async (entry) => {
      const r = await fetch(`${url}/rest/v1/entries`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(entry)
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || 'Insert failed');
      return data?.[0];
    },
    listEntries: async (user_id) => {
      const r = await fetch(`${url}/rest/v1/entries?user_id=eq.${encodeURIComponent(user_id)}&order=created_at.desc&limit=50`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Accept': 'application/json'
        }
      });
      const data = await r.json().catch(() => []);
      if (!r.ok) throw new Error(data?.message || 'List failed');
      return data;
    }
  };
}

// Basic session decode: your /api/auth should set a JSON { user:{ id, email, username } } in cookie.
// If your cookie is a signed token, swap this decode accordingly.
function readSessionCookie(req) {
  try {
    const cookies = parseCookies(req);
    const raw = cookies[COOKIE_NAME];
    if (!raw) return null;
    // Try straight JSON first; if base64, decode.
    const val = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(val);
    return parsed;
  } catch {
    return null;
  }
}

export const config = { runtime: 'nodejs18.x' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const body = await getBody(req);
  const action = body?.action;

  if (action === 'health') {
    return json({ ok: true, route: 'journal', time: new Date().toISOString() });
  }

  // require user session for list/create
  const sess = readSessionCookie(req);
  const user = sess?.user;
  if (!user?.id) return json({ error: 'Not signed in' }, 401);

  try {
    const client = await sb();

    if (action === 'list') {
      const entries = await client.listEntries(user.id);
      return json({ entries });
    }

    if (action === 'create') {
      const emotion_from = String(body?.emotion_from || '').slice(0, 64);
      const emotion_to = String(body?.emotion_to || '').slice(0, 64);
      const note = String(body?.note || '').slice(0, 2000);

      if (!emotion_from || !emotion_to) return json({ error: 'Missing emotions' }, 400);

      const created = await client.insertEntry({
        user_id: user.id,
        emotion_from,
        emotion_to,
        note
      });
      return json({ entry: created });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: err.message || 'Server error' }, 500);
  }
}
