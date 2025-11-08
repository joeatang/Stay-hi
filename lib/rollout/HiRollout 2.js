/**
 * lib/rollout/HiRollout.js
 * Deterministic cohort bucketing + rollout percent checks
 * 
 * Tesla-grade rollout system with stable identity hashing
 * for controlled feature flag deployment
 */

// Lightweight stable hash (no crypto deps)
export function stableHash(str) {
    // djb2-ish algorithm for deterministic hashing
    let h = 5381;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h) + s.charCodeAt(i);
    }
    // Convert to 0..2^31-1
    return (h >>> 0);
}

function getSessionId() {
    const KEY = 'hi_session_id';
    let sid = localStorage.getItem(KEY);
    if (!sid) {
        sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(KEY, sid);
    }
    return sid;
}

// In-memory rollout table (percent 0..100); defaults at 10%
const rollout = {
    hifeed_enabled: 10,
    hibase_shares_enabled: 10,
    hibase_profile_enabled: 10,
    hibase_referrals_enabled: 10,
};

// Mutators (for ops scripts / dev)
export function setRollout(key, percent) {
    if (rollout[key] == null) rollout[key] = 0;
    rollout[key] = Math.max(0, Math.min(100, Number(percent || 0)));
}

export function getRollout(key) {
    return rollout[key] ?? 0;
}

// Core decision: is flag enabled for this user/session?
export function isEnabledFor(identity, key) {
    const percent = getRollout(key);
    const basis = identity?.id || identity?.email || identity?.anonId || getSessionId();
    const bucket = stableHash(basis) % 100;
    return bucket < percent;
}

// Helper: build identity object from known sources
export function getIdentity() {
    const anonId = getSessionId();
    // Try Supabase if available
    const user = window?.supabaseClient?.auth?.getUser
        ? null : null; // never sync-block; callers may pass userId

    return { anonId }; // callers can augment { id, email } when known
}