/**
 * 🏆 GOLD STANDARD: Share Submission Tracker
 * MISSION: Track PUBLIC share submissions and refresh Total His from database
 * Works for: Hi-Dashboard, Hi-Island, Hi-Muscle
 * 
 * 🎯 CRITICAL DISCOVERY (Dec 3, 2025):
 * Database has TRIGGER on public_shares table: AFTER INSERT → increment_total_hi()
 * This means Total His auto-increments when HiDB.insertPublicShare() runs
 * 
 * 🔬 SURGICAL FIX:
 * - Do NOT call increment_total_hi() manually (causes double increment)
 * - Just call get_global_stats() to refresh UI with new value
 * - Only for submissionType === 'public' (private/anonymous don't increment)
 */
export async function trackShareSubmission(source = 'dashboard', metadata = {}) {
  console.log(`🎯 [GOLD STANDARD] Share submitted from ${source}:`, metadata);
  console.log('🔍 Current Total His before tracking:', window.gTotalHis || 0);
  
  // 🎯 CRITICAL FILTER: Only increment Total His for PUBLIC shares
  const submissionType = metadata.submissionType || metadata.type || 'unknown';
  if (submissionType !== 'public') {
    console.log(`⏭️ Skipping Total His increment (${submissionType} share - only public shares count)`);
    return { success: true, skipped: true, reason: 'non-public share', submissionType };
  }
  
  console.log('✅ Public share confirmed - database trigger will auto-increment Total His');
  
  // 🎯 SURGICAL FIX (Dec 3, 2025): Database has TRIGGER on public_shares that AUTO-increments
  // Do NOT call increment_total_hi() manually - just refresh stats from DB
  const supabase = window.hiDB?.getSupabase?.() || window.supabaseClient || window.sb || 
                  window.HiSupabase?.getClient?.() || window.__HI_SUPABASE_CLIENT;
  
  if (supabase) {
    try {
      console.log('🔄 Refreshing stats from database (trigger already incremented)...');
      const { data, error } = await supabase.rpc('get_global_stats');
      
      if (error) {
        console.error('❌ Database increment failed:', error);
        throw error;
      }
      
      // 🎯 CRITICAL FIX: get_global_stats() returns TABLE (array of rows), not object
      // Expected format: data = [{ total_his: 123, hi_waves: 456, updated_at: ... }]
      console.log('🔍 Raw database response:', data);
      
      if (Array.isArray(data) && data.length > 0 && typeof data[0].total_his === 'number') {
        // ✅ SUCCESS: Extract total_his from first row
        const stats = data[0];
        const oldValue = window.gTotalHis;
        window.gTotalHis = stats.total_his;
        window._gTotalHisIsTemporary = false;
        
        console.log('✅ Total His refreshed from database:', `${oldValue} → ${window.gTotalHis}`);
        
        // Update UI displays
        document.querySelectorAll('.total-his-count, #globalTotalHis, #totalHis').forEach(el => {
          el.textContent = window.gTotalHis.toLocaleString();
        });
        
        // Update cache if available
        if (window.HiMetrics?.updateCache) {
          try {
            await window.HiMetrics.updateCache('totalHis', window.gTotalHis);
          } catch (cacheError) {
            console.warn('⚠️ Cache update failed (non-critical):', cacheError);
          }
        }
        
        console.log('🎯 GOLD STANDARD SUCCESS: Total His updated to', window.gTotalHis);
        return { success: true, newTotal: window.gTotalHis };
        
      } else if (data && typeof data.total_his === 'number') {
        // Handle alternate format (single object - shouldn't happen but fallback)
        window.gTotalHis = data.total_his;
        window._gTotalHisIsTemporary = false;
        console.log('🎯 GOLD STANDARD SUCCESS (alt format): Total His =', window.gTotalHis);
        return { success: true, newTotal: window.gTotalHis };
      } else {
        console.warn('⚠️ Unexpected database response format:', { data, error });
        throw new Error('Invalid database response - missing total_his field');
      }
      
    } catch (error) {
      console.error('❌ Stats refresh failed:', error);
      console.log('📊 Total His unchanged (keeping current value):', window.gTotalHis);
      
      return { success: false, error: error.message, fallback: true, newTotal: window.gTotalHis };
    }
  } else {
    console.warn('⚠️ No Supabase client - cannot refresh stats');
    console.log('📊 Total His unchanged (no database connection):', window.gTotalHis);
    
    return { success: false, error: 'No database connection', fallback: true, newTotal: window.gTotalHis };
  }
}

// Export for use by share sheets
window.trackShareSubmission = trackShareSubmission;