import { supabase } from "./HiSupabase.js";

// HI-OS S10: v3-only stats fetch, behind flag
export async function getGlobalStats() {
  try {
    const flags = (window && window.hiFlags) || {};
    if (!flags.hifeed_enabled) throw new Error("hifeed_enabled flag off (used as v3 stats gate)");

    // Prefer a single stable backend entrypoint:
    // 1) RPC (recommended), else 2) view fallback
    let data = null, error = null;

    // Attempt RPC first (create it server-side if not present):
    // CREATE OR REPLACE FUNCTION public.get_welcome_stats()
    // RETURNS TABLE(total_his bigint, total_waves bigint) ...
    const rpc = await supabase.rpc("get_welcome_stats");
    if (!rpc.error && rpc.data) {
      data = rpc.data;
    } else {
      // Fallback to a view that returns one row { total_his, total_waves }
      const view = await supabase
        .from("hi_welcome_stats_view")
        .select("total_his,total_waves")
        .single();
      error = view.error;
      data = view.data;
    }

    if (!data || error) throw error || new Error("No stats data");

    // Normalize both RPC/table return shapes
    const row = Array.isArray(data) ? data[0] : data;
    const totalHis = Number(row.total_his ?? row.totalHis ?? 0);
    const totalWaves = Number(row.total_waves ?? row.totalWaves ?? 0);

    console.log("hibase.stats.fetch.ok", { totalHis, totalWaves });
    return { totalHis, totalWaves };
  } catch (e) {
    console.error("hibase.stats.fetch.err", e);
    return { totalHis: 0, totalWaves: 0 };
  }
}