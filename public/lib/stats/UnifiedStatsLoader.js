// UnifiedStatsLoader.js
// Canonical, single-source stats loader for Global Waves, Total His, Total Users
// - Tries HiMetrics.getStats() first
// - Falls back to Supabase RPC get_user_stats
// - Falls back to table global_stats
// - Falls back to cache
// Emits: window.dispatchEvent(new CustomEvent('hi:stats-updated', { detail }))

export async function getSupabaseClient() {
  try {
    if (window.HiSupabase?.getClient) return window.HiSupabase.getClient();
    if (window.hiSupabase) return window.hiSupabase;
    if (typeof window.getSupabase === 'function') return window.getSupabase();
    if (window.supabase) return window.supabase;
  } catch {}
  return null;
}

function readCache() {
  return {
    waves: Number(localStorage.getItem('globalHiWaves')) || null,
    totalHis: Number(localStorage.getItem('globalTotalHis')) || null,
    totalUsers: Number(localStorage.getItem('globalTotalUsers')) || null,
    _source: {
      waves: localStorage.getItem('globalHiWaves') ? 'cache' : 'none',
      totalHis: localStorage.getItem('globalTotalHis') ? 'cache' : 'none',
      totalUsers: localStorage.getItem('globalTotalUsers') ? 'cache' : 'none'
    }
  };
}

function writeCache({ waves, totalHis, totalUsers }) {
  try {
    if (waves != null) localStorage.setItem('globalHiWaves', String(waves));
    if (totalHis != null) localStorage.setItem('globalTotalHis', String(totalHis));
    if (totalUsers != null) localStorage.setItem('globalTotalUsers', String(totalUsers));
  } catch {}
}

function setGlobals({ waves, totalHis, totalUsers }) {
  // Write globals and mark as authoritative
  if (waves != null) window.gWaves = waves;
  if (totalHis != null) window.gTotalHis = totalHis;
  if (totalUsers != null) window.gUsers = totalUsers;
  
  // Mark as authoritative (prevents other loaders from overwriting)
  if (typeof window.markStatsAuthoritative === 'function') {
    window.markStatsAuthoritative();
  }
}

export async function loadGlobalStats(options = {}) {
  const t0 = performance.now();
  const attempts = [];
  const result = { waves: null, totalHis: null, totalUsers: null, _source: { waves: 'none', totalHis: 'none', totalUsers: 'none' }, overall: 'none', _timing: { start: t0, end: null, totalMs: null, attempts } };

  // 🚀 CACHE-FIRST: Return cached values immediately for instant page loads
  const cache = readCache();
  if (cache.totalHis != null || cache.waves != null || cache.totalUsers != null) {
    console.log('[UnifiedStats] ⚡ Using cache-first for instant load');
    result.waves = cache.waves;
    result.totalHis = cache.totalHis;
    result.totalUsers = cache.totalUsers;
    result._source = cache._source;
    result.overall = 'cache-first';
    finalizeTiming(result);
    dispatch(result);
    
    // Refresh in background (don't await)
    setTimeout(() => refreshStatsInBackground(t0, attempts), 0);
    
    return result;
  }

  // Fallback: No cache, do full load
  return await refreshStatsInBackground(t0, attempts);
}

async function refreshStatsInBackground(t0, attempts) {
  const result = { waves: null, totalHis: null, totalUsers: null, _source: { waves: 'none', totalHis: 'none', totalUsers: 'none' }, overall: 'none', _timing: { start: t0, end: null, totalMs: null, attempts } };

  // 1) HiMetrics adapter
  try {
    if (window.HiMetrics?.getStats) {
      const aStart = performance.now();
      const m = await window.HiMetrics.getStats();
      attempts.push({ source: 'HiMetrics', start: aStart, end: performance.now(), durationMs: performance.now()-aStart, success: !!m });
      if (m) {
        result.waves = Number(m.waves ?? m.globalStats?.hiWaves ?? null);
        result.totalHis = Number(m.totalHis ?? m.globalStats?.totalHis ?? null);
        result.totalUsers = Number(m.users ?? m.globalStats?.totalUsers ?? null);
        if ([result.waves, result.totalHis, result.totalUsers].some(v => Number.isFinite(v))) {
          result._source = { waves: 'HiMetrics', totalHis: 'HiMetrics', totalUsers: 'HiMetrics' };
          result.overall = 'HiMetrics';
          setGlobals(result);
          writeCache(result);
          finalizeTiming(result);
          dispatch(result);
          return result;
        }
      }
    }
  } catch (e) { console.warn('[UnifiedStats] HiMetrics failed', e); }

  // 2) Supabase RPC
  try {
    const sb = await getSupabaseClient();
    if (sb?.rpc) {
      const aStart = performance.now();
      const { data, error } = await sb.rpc('get_user_stats');
      attempts.push({ source: 'rpc:get_user_stats', start: aStart, end: performance.now(), durationMs: performance.now()-aStart, success: !error && !!data });
      if (!error && data) {
        result.waves = Number(data.waves ?? data.globalStats?.hiWaves ?? null);
        result.totalHis = Number(data.total_his ?? data.globalStats?.totalHis ?? null);
        result.totalUsers = Number(data.users ?? data.globalStats?.totalUsers ?? null);
        result._source = {
          waves: 'rpc:get_user_stats',
          totalHis: 'rpc:get_user_stats',
          totalUsers: 'rpc:get_user_stats'
        };
        setGlobals(result);
        result.overall = 'rpc';
        writeCache(result);
        finalizeTiming(result);
        dispatch(result);
        return result;
      }
    }
  } catch (e) { console.warn('[UnifiedStats] RPC failed', e); }

  // 3) Table fallback: global_stats
  try {
    const sb = await getSupabaseClient();
    if (sb?.from) {
      const aStart = performance.now();
      const { data, error } = await sb.from('global_stats').select('hi_waves, total_his, total_users').single();
      attempts.push({ source: 'table:global_stats', start: aStart, end: performance.now(), durationMs: performance.now()-aStart, success: !error && !!data });
      if (!error && data) {
        result.waves = Number(data.hi_waves ?? null);
        result.totalHis = Number(data.total_his ?? null);
        result.totalUsers = Number(data.total_users ?? null);
        result._source = { waves: 'table:global_stats', totalHis: 'table:global_stats', totalUsers: 'table:global_stats' };
        setGlobals(result);
        result.overall = 'table';
        writeCache(result);
        finalizeTiming(result);
        dispatch(result);
        return result;
      }
    }
  } catch (e) { console.warn('[UnifiedStats] table fallback failed', e); }

  // 4) Cache fallback
  const cache = readCache();
  result.waves = cache.waves;
  result.totalHis = cache.totalHis;
  result.totalUsers = cache.totalUsers;
  result._source = cache._source;
  result.overall = 'cache';
  finalizeTiming(result);
  dispatch(result);
  return result;
}

export function dispatch(payload) {
  try {
    // Maintain legacy event name for existing listeners
    window.dispatchEvent(new CustomEvent('hi:stats-updated', { detail: payload }));
    // New canonical global bridge event (alias)
    window.dispatchEvent(new CustomEvent('hi:global-stats', { detail: payload }));
  } catch {}
}

function finalizeTiming(result){
  result._timing.end = performance.now();
  result._timing.totalMs = +(result._timing.end - result._timing.start).toFixed(2);
  // Derive fastest successful source
  const successes = result._timing.attempts.filter(a=>a.success);
  if (successes.length){
    const fastest = successes.reduce((min,a)=> a.durationMs < min.durationMs ? a : min, successes[0]);
    result._timing.fastest = { source: fastest.source, durationMs: +fastest.durationMs.toFixed(2) };
  }
}

export function format(n) {
  return Number.isFinite(n) ? Number(n).toLocaleString() : '...';
}
