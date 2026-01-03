// Helper to call Supabase RPC: get_user_share_count(period TEXT)
// Returns JSON with count of public shares for the authenticated user in the given period.
// Function uses auth.uid() internally - no user_id parameter needed.

export async function getUserShareCount(supabase, userId = null, period = 'month') {
  try {
    if (!supabase) {
      console.warn('[getUserShareCount] Missing supabase client');
      return 0;
    }

    // Call RPC with period parameter (function uses auth.uid() internally)
    const { data, error } = await supabase.rpc('get_user_share_count', { period });
    
    if (error) {
      console.warn('[getUserShareCount] RPC error:', error.message || error);
      return 0;
    }

    // Function returns JSON: { success, count, period, start_date }
    if (data && typeof data === 'object' && data.success) {
      return data.count || 0;
    }

    // Fallback if response shape is unexpected
    return 0;
  } catch (e) {
    console.warn('[getUserShareCount] Exception:', e);
    return 0;
  }
}
