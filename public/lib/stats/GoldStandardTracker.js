/**
 * 🏆 GOLD STANDARD: Share Submission Tracker
 * MISSION: Simple, reliable Total His increment for ALL share submissions
 * Works for: Hi-Dashboard, Hi-Island, Hi-Muscle
 */
export async function trackShareSubmission(source = 'dashboard', metadata = {}) {
  console.log(`🎯 [GOLD STANDARD] Share submitted from ${source}:`, metadata);
  console.log('🔍 Current Total His before tracking:', window.gTotalHis || 0);
  
  // 🚀 TESLA GRADE: Direct database increment - no complexity, just results
  const supabase = window.getSupabase?.() || window.supabaseClient || window.sb || 
                  window.HiSupabase?.getClient?.() || window.__HI_SUPABASE_CLIENT;
  
  if (supabase) {
    try {
      console.log('⚡ Calling increment_total_hi()...');
      const { data, error } = await supabase.rpc('increment_total_hi');
      
      if (error) {
        console.error('❌ Database increment failed:', error);
        throw error;
      }
      
      if (data && typeof data === 'number') {
        // ✅ SUCCESS: Update global counter and UI
        window.gTotalHis = data;
        console.log('✅ Total His updated from database:', window.gTotalHis);
        
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
        
        console.log('🎯 GOLD STANDARD SUCCESS: Total His incremented to', window.gTotalHis);
        return { success: true, newTotal: window.gTotalHis };
        
      } else {
        console.warn('⚠️ Unexpected database response:', { data, error });
        throw new Error('Invalid database response');
      }
      
    } catch (error) {
      console.error('❌ Database operation failed:', error);
      
      // 🔄 FALLBACK: Local increment for UI responsiveness
      window.gTotalHis = (window.gTotalHis || 0) + 1;
      console.log('🔄 Fallback increment - Total His now:', window.gTotalHis);
      
      // Update UI with fallback value
      document.querySelectorAll('.total-his-count, #globalTotalHis, #totalHis').forEach(el => {
        el.textContent = window.gTotalHis.toLocaleString();
      });
      
      return { success: false, error: error.message, fallback: true, newTotal: window.gTotalHis };
    }
  } else {
    // ⚠️ No database connection - local fallback only
    console.warn('⚠️ No Supabase client available - using local fallback');
    window.gTotalHis = (window.gTotalHis || 0) + 1;
    
    document.querySelectorAll('.total-his-count, #globalTotalHis, #totalHis').forEach(el => {
      el.textContent = window.gTotalHis.toLocaleString();
    });
    
    return { success: false, error: 'No database connection', fallback: true, newTotal: window.gTotalHis };
  }
}

// Export for use by share sheets
window.trackShareSubmission = trackShareSubmission;