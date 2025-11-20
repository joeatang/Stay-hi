#!/usr/bin/env node
/**
 * invite-mint.js
 * Mint invite codes with tier grant, expiry, and usage caps.
 * Usage: node scripts/invite-mint.js --tier T2 --days 1 --uses 1 [--code ABC123]
 */
const { createClient } = require('@supabase/supabase-js');

function parseArgs(){
  const args = process.argv.slice(2);
  const out = { tier: 'T1', days: 1, uses: 1, code: null, note: null };
  for(let i=0;i<args.length;i++){
    const k = args[i]; const v = args[i+1];
    if(k === '--tier'){ out.tier = v; i++; }
    else if(k === '--days'){ out.days = parseInt(v,10); i++; }
    else if(k === '--uses'){ out.uses = parseInt(v,10); i++; }
    else if(k === '--code'){ out.code = v; i++; }
    else if(k === '--note'){ out.note = v; i++; }
  }
  return out;
}

function randomCode(len=8){
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<len;i++){ s += alphabet[Math.floor(Math.random()*alphabet.length)]; }
  return s;
}

async function main(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if(!url || !key){
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  const { tier, days, uses, code, note } = parseArgs();
  const expires = new Date(Date.now() + days*24*60*60*1000).toISOString();
  const sb = createClient(url, key, { auth:{ autoRefreshToken:false, persistSession:false } });

  const row = { code: code || randomCode(), tier_grant: tier.toUpperCase(), expires_at: expires, max_uses: uses, note: note || null };
  const { data, error } = await sb.from('invite_codes').insert(row).select('*');
  if(error){ console.error('Insert error:', error.message); process.exit(1); }
  console.log('Invite minted:', data[0]);
}

main().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
