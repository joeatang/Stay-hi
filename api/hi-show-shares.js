// api/hi-show-shares.js
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
  if (body?.action === 'health') return send(res, 200, { ok: true, route: 'hi-show-shares' });

  // Same shape as /api/shares for now
  return send(res, 200, { items: [] });
}

