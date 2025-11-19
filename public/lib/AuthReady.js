// AuthReady - Unified session + membership orchestrator
// HI-OS: Emits 'hi:auth-ready' once with { session, membership }
import { getHiSupabase } from './HiSupabase.v3.js';

let _ready = false;
let _emitted = false;
let _result = null;

async function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function salvageTokens(sb){
  const access = localStorage.getItem('sb-access-token');
  const refresh = localStorage.getItem('sb-refresh-token');
  if (access && refresh) {
    try {
      const { data, error } = await sb.auth.setSession({ access_token: access, refresh_token: refresh });
      if (error) console.warn('[AuthReady] setSession error', error);
      else console.log('[AuthReady] session salvaged');
    } catch(e){ console.warn('[AuthReady] salvage exception', e); }
  }
}

async function fetchMembership(sb){
  try {
    const { data, error } = await sb.rpc('get_unified_membership');
    if (error) { console.warn('[AuthReady] membership error', error); return null; }
    if (data) {
      try {
        localStorage.setItem('hi_membership_tier', data.tier || '');
        localStorage.setItem('hi_membership_is_admin', data.is_admin ? '1':'0');
      } catch(_){}
    }
    return data;
  } catch(e){ console.warn('[AuthReady] membership exception', e); return null; }
}

async function initialize(){
  if (_ready) return _result;
  const sb = getHiSupabase();

  let { data: { session } } = await sb.auth.getSession();
  if (!session) {
    await salvageTokens(sb);
    ({ data: { session } } = await sb.auth.getSession());
  }

  // If still no session, we continue but membership will be null
  const membership = session ? await fetchMembership(sb) : null;

  _result = { session, membership };
  _ready = true;
  if (!_emitted) {
    window.dispatchEvent(new CustomEvent('hi:auth-ready', { detail: _result }));
    console.log('[AuthReady] ready', { user: session?.user?.id, tier: membership?.tier, admin: membership?.is_admin });
    _emitted = true;
  }
  return _result;
}

// Kick off immediately (non-blocking)
initialize();

export async function waitAuthReady(){
  if (_ready) return _result;
  while(!_ready){ await wait(50); }
  return _result;
}

export function getAuthState(){ return _result; }
