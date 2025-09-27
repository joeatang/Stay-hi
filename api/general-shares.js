// api/general-shares.js
// Plain Node: returns a list of public shares (stub for now)

export const config = { runtime: 'nodejs' };

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = ''; for await (const c of req) raw += c;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const body = await readBody(req);
  if (body?.action === 'health') return send(res, 200, { ok: true, route: 'general-shares' });

  // Empty for now; we’ll wire this to Supabase soon.
  // Shape matches a simple card: { id, user, text, created_at, lat, lng }
  return send(res, 200, { items: [] });
}

