
import { json, readSession, requireEnv } from '../_utils.js';
export const config = { runtime: 'nodejs18.x' };

export default async function handler(req) {
  if (req.method !== 'POST' && req.method !== 'PUT') return json({ error:'Method not allowed' }, 405);
  const sess = readSession(req);
  const user = sess?.user; if (!user?.id) return json({ error:'Not signed in' }, 401);

  const body = await req.json().catch(()=>({}));
  const action = body?.action || 'update_username';
  if (action !== 'update_username') return json({ ok:true, note:'password change not implemented in MVP' });

  const username = String(body?.username||'').trim();
  if (username.length < 3 || username.length > 20) return json({ error:'Username must be 3–20 chars' }, 400);

  const { url, key } = requireEnv();
  // ensure unique
  const taken = await fetch(`${url}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id`, {
    headers:{ apikey:key, Authorization:`Bearer ${key}` }
  }).then(r=>r.json());
  if (Array.isArray(taken) && taken.length && taken[0].id !== user.id) return json({ error:'Username taken' }, 409);

  const r = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`,{
    method:'PATCH',
    headers:{ apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ username })
  });
  if (!r.ok) return json({ error:'Update failed' }, 500);
  return json({ ok:true, username });
}
