// Load HiSupabase.v3.js (with autoRefreshToken: true fix)
console.log('[island-supabase-prime] Starting HiSupabase load...');
try {
  await import('../HiSupabase.v3.js');
  console.log('✅ Tesla: HiSupabase.v3 initialized before HiDB');
} catch (err) {
  console.error('[island-supabase-prime] FAILED to load HiSupabase.v3:', err);
  throw err;
}
