import '../AuthReady.js';
window.addEventListener('hi:auth-ready', async (e) => {
  const { session, membership, fromCache } = e.detail || {};
  console.log('[Dashboard][AuthReady] received', { user: session?.user?.id, tier: membership?.tier, adminFlag: membership?.is_admin, fromCache });
  
  try {
    // 🚀 FAST PATH: Check cache first for instant tier display
    let tierToDisplay = membership?.tier;
    
    if (!tierToDisplay && window.NavCache) {
      const cachedTier = window.NavCache.getTier();
      if (cachedTier) {
        console.log('[Dashboard][AuthReady] Using cached tier for instant display:', cachedTier);
        tierToDisplay = cachedTier;
      }
    }
    
    // 🎯 CRITICAL FIX: Use HiBrandTiers to display tier name (not raw database value)
    const tierIndicator = document.getElementById('hi-tier-indicator');
    if (tierIndicator && tierToDisplay && window.HiBrandTiers) {
      window.HiBrandTiers.updateTierPill(tierIndicator, tierToDisplay, {
        showEmoji: false,
        useGradient: false
      });
      console.log('[Dashboard][AuthReady] Tier updated via HiBrandTiers:', tierToDisplay);
      
      // Cache the tier for next navigation
      if (window.NavCache && membership?.tier) {
        window.NavCache.setTier(membership.tier);
      }
    } else if (tierIndicator && tierToDisplay) {
      // Fallback if HiBrandTiers not loaded yet - use branded name or capitalize tier
      const fallbackName = window.HiBrandTiers?.getName?.(tierToDisplay) || tierToDisplay.charAt(0).toUpperCase() + tierToDisplay.slice(1);
      const tierText = tierIndicator.querySelector('.tier-text');
      if (tierText) {
        tierText.textContent = fallbackName;
      } else {
        tierIndicator.textContent = fallbackName;
      }
      console.warn('[Dashboard][AuthReady] HiBrandTiers updateTierPill not available, using fallback name:', fallbackName);
      
      // Cache the tier for next navigation
      if (window.NavCache && membership?.tier) {
        window.NavCache.setTier(membership.tier);
      }
    }
    
    const adminLinks = document.querySelectorAll('.admin-item');
    const isMembershipAdmin = !!membership?.is_admin;
    let hasDbAdminAccess = false;
    // Fallback: if membership flag not set, verify via authoritative DB RPC
    if (!isMembershipAdmin && window.hiSupabase?.rpc) {
      try {
        const clientIP = null; // Optional: supply if available
        let data=null, error=null;
        try {
          const resV2 = await window.hiSupabase.rpc('check_admin_access_v2', { p_required_role: 'admin', p_ip_address: clientIP });
          data = resV2.data; error = resV2.error;
        } catch(v2Err){
          const missing=/does not exist|not found/i.test(v2Err.message||'');
          if(!missing){ error=v2Err; } else {
            try { const resLegacy = await window.hiSupabase.rpc('check_admin_access', { p_required_role: 'admin', p_ip_address: clientIP }); data=resLegacy.data; error=resLegacy.error; } catch(legacyErr){ error=legacyErr; }
          }
        }
        if (!error && (data?.has_access || data?.access_granted)) {
          hasDbAdminAccess = true;
          console.log('[Dashboard][AuthReady] Elevated via DB admin access');
          // Cache result to avoid repeated RPCs this session
          sessionStorage.setItem('hi_admin_access', 'true');
        } else if (error) {
          console.warn('[Dashboard][AuthReady] DB admin access check failed:', error.message || error);
        }
      } catch (rpcErr) {
        console.warn('[Dashboard][AuthReady] RPC admin check exception:', rpcErr);
      }
    } else if (sessionStorage.getItem('hi_admin_access') === 'true') {
      hasDbAdminAccess = true;
    }
    const effectiveAdmin = isMembershipAdmin || hasDbAdminAccess;
    adminLinks.forEach(a => { a.style.display = effectiveAdmin ? '' : 'none'; });
  } catch(err){ console.warn('[Dashboard][AuthReady] UI update error', err); }
});
