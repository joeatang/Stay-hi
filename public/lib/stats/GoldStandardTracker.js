/**
 * 🏆 GOLD STANDARD: Share Submission Tracker
 * MISSION: Simple, reliable Total His increment for ALL share submissions
 * Works for: Hi-Dashboard, Hi-Island, Hi-Muscle
 */
export async function trackShareSubmission(source = 'dashboard', metadata = {}) {
  console.log(`🎯 [GOLD STANDARD] Share submitted from ${source}:`, metadata);
  console.log('🔍 Current Total His before tracking:', window.gTotalHis || 0);
  
  // � EMERGENCY FIX: Use unified HiDB client to prevent multiple client creation
  const supabase = window.hiDB?.getSupabase?.() || window.supabaseClient || window.sb || 
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
        // ✅ SUCCESS: Update global counter and UI with smooth transition
        const oldValue = window.gTotalHis;
        window.gTotalHis = data;
        window._gTotalHisIsTemporary = false; // Mark as authoritative
        
        console.log('✅ Total His updated from database:', `${oldValue} → ${window.gTotalHis}`);
        
        // Update UI displays with smooth transition for large jumps
        document.querySelectorAll('.total-his-count, #globalTotalHis, #totalHis').forEach(el => {
          const diff = window.gTotalHis - oldValue;
          if (diff > 50 && oldValue < 100) {
            // Smooth large jumps from temporary values
            el.style.transition = 'all 0.8s ease-out';
            setTimeout(() => {
              el.textContent = window.gTotalHis.toLocaleString();
              setTimeout(() => el.style.transition = '', 1000);
            }, 100);
          } else {
            el.textContent = window.gTotalHis.toLocaleString();
          }
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
      
      // 🎯 CRITICAL FIX: NO LOCAL INCREMENT - Only track to database
      // Local increments cause stats skewing on page refresh
      console.log('❌ Database operation failed - no local fallback to maintain accuracy');
      
      // Keep current database value, don't increment locally
      console.log('📊 Current Total His (unchanged):', window.gTotalHis);
      
      return { success: false, error: error.message, fallback: true, newTotal: window.gTotalHis };
    }
  } else {
    // 🎯 CRITICAL FIX: NO LOCAL INCREMENT - Database-only tracking
    console.warn('⚠️ No Supabase client available - cannot track share submission');
    
    // Keep database values unchanged to prevent skewing
    console.log('📊 Total His unchanged (no database connection):', window.gTotalHis);
    
    return { success: false, error: 'No database connection', fallback: true, newTotal: window.gTotalHis };
  }
}

// Export for use by share sheets
window.trackShareSubmission = trackShareSubmission;