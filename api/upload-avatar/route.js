import { json, readSession, requireEnv } from '../_utils.js';
export const config = { runtime: 'nodejs18.x' };

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error:'Method not allowed' }, 405);
  const sess = readSession(req);
  const user = sess?.user; if (!user?.id) return json({ error:'Not signed in' }, 401);

  const { url, key } = requireEnv();
  const body = await req.json().catch(()=>({}));
  const { base64, mimeType } = body || {};
  if (!base64) return json({ error:'Missing base64' }, 400);

  const bin = Buffer.from(base64.split(',').pop() || base64, 'base64');
  const path = `u/${user.id}/${Date.now()}.png`; // adjust ext by mimeType if you want

  // upload to storage
  const r = await fetch(`${url}/storage/v1/object/avatars/${encodeURIComponent(path)}`, {
    method:'POST',
    headers:{ apikey:key, Authorization:`Bearer ${key}`, 'Content-Type': mimeType || 'image/png' },
    body: bin
  });
  if (!r.ok) return json({ error:'Upload failed' }, 500);

  const publicUrl = `${url}/storage/v1/object/public/avatars/${encodeURIComponent(path)}`;

  // save to users.avatar_url
  await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`, {
    method:'PATCH',
    headers:{ apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ avatar_url: publicUrl })
  });

  return json({ ok:true, url: publicUrl });
}

