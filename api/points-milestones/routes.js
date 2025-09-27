import { json } from '../_utils.js';
export const config = { runtime: 'nodejs18.x' };
export default async function handler(req){ if(req.method!=='POST') return json({error:'Method not allowed'},405); return json({ points:0, milestones:[] }); }

