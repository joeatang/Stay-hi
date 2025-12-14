// Helper to call Supabase RPC: get_user_share_count(UUID, TIMESTAMPTZ)
// Returns an integer count of public shares for a user since optional timestamp.

export async function getUserShareCount(supabase, userId, since = null) {
  try {
    if (!supabase || !userId) {
      console.warn('[getUserShareCount] Missing supabase or userId');
      return 0;
    }

    const params = { p_user_id: userId };
    if (since) {
      // Ensure ISO string acceptable by PostgREST
      params.p_since = new Date(since).toISOString();
    }

    const { data, error } = await supabase.rpc('get_user_share_count', params);
    if (error) {
      console.warn('[getUserShareCount] RPC error:', error.message || error);
      return 0;
    }

    // Supabase returns scalar as `data`
    if (typeof data === 'number') return data;

    // Fallback if response shape is unexpected
    return Number(data) || 0;
  } catch (e) {
    console.warn('[getUserShareCount] Exception:', e);
    return 0;
  }
}
