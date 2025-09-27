
import { json, readSession, requireEnv } from '../_utils.js';
export const config = { runtime: 'nodejs18.x' };

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error:'Method not allowed' }, 405);
  const sess = readSession(req); const user = sess?.user;
  if (!user?.id) return json({ error:'Not signed in' }, 401);
  const { url, key } = requireEnv();
  const rows = await fetch(`${url}/rest/v1/entries?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=50`, {
    headers:{ apikey:key, Authorization:`Bearer ${key}` }
  }).then(r=>r.json());
  return json({ items: rows || [] });
}
