// Wrapper: Re-exports window globals set by HiSupabase.v3.js for ES module imports
// HiSupabase.v3.js sets window.hiSupabase, window.supabase, window.HiSupabase
export const supabase = window.hiSupabase || window.supabase;
export const getHiSupabase = () => window.hiSupabase || window.supabase;
export const getClient = () => window.hiSupabase || window.supabase;
export default supabase;
