// api/emotions.js
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
  if (body?.action === 'health') return send(res, 200, { ok: true, route: 'emotions' });

  const now  = ['Worried','Anxious','Overwhelmed','Tired','Okay','Grateful','Excited','Peaceful','Confident'];
  const next = ['Calm','Grounded','Hopeful','Grateful','Inspired','Confident','Joyful','Peaceful','Proud'];

  return send(res, 200, { now, next });
}

