// Wrapper: Re-exports window globals set by HiSupabase.v3.js for ES module imports
// CRITICAL: Use getters so evaluation happens AFTER HiSupabase.v3.js sets window.hiSupabase

// Lazy getter - evaluates when accessed, not at module load time
let _cachedClient = null;
function getClientLazy() {
  if (_cachedClient) return _cachedClient;
  _cachedClient = window.hiSupabase || window.supabase || window.HiSupabase?.getClient();
  return _cachedClient;
}

export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getClientLazy();
    return client?.[prop];
  }
});

export const getHiSupabase = getClientLazy;
export const getClient = getClientLazy;
export default supabase;
