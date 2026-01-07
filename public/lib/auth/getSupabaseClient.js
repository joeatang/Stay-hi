// Thin, canonical Supabase client getter
// Prefer this over ad-hoc globals/fallbacks. Non-breaking with existing aliases.
import { getHiSupabase } from '../HiSupabase.js';

export function getSupabaseClient(options = {}) {
  const client = getHiSupabase();
  if (options?.log) {
    console.debug('[getSupabaseClient] delivering canonical client');
  }
  return client;
}

// Convenience default export
export default getSupabaseClient;
