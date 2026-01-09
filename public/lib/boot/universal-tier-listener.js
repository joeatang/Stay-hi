// Universal Tier Listener - Single Source of Truth for ALL pages
// Used by: Dashboard, Island, Muscle, Profile, and all future pages
// Listens for hi:auth-ready and updates tier pill using HiBrandTiers

console.log('🎯 [Universal Tier Listener] Loading...');

window.addEventListener('hi:auth-ready', async (e) => {
  const { session, membership, fromCache } = e.detail || {};
  console.log('[Universal Tier] hi:auth-ready received', { 
    user: session?.user?.id, 
    tier: membership?.tier, 
    adminFlag: membership?.is_admin, 
    fromCache 
  });
  
  try {
    // 🚀 FAST PATH: Check cache first for instant tier display
    let tierToDisplay = membership?.tier;
    
    if (!tierToDisplay && window.NavCache) {
      const cachedTier = window.NavCache.getTier();
      if (cachedTier) {
        console.log('[Universal Tier] Using cached tier for instant display:', cachedTier);
        tierToDisplay = cachedTier.tier || cachedTier;
      }
    }
    
    // 🎯 CRITICAL: Use HiBrandTiers to display tier name (not raw database value)
    const tierIndicator = document.getElementById('hi-tier-indicator');
    if (!tierIndicator) {
      console.warn('[Universal Tier] No #hi-tier-indicator found on this page');
      return;
    }
    
    if (tierToDisplay && window.HiBrandTiers) {
      window.HiBrandTiers.updateTierPill(tierIndicator, tierToDisplay, {
        showEmoji: false,
        useGradient: false
      });
      console.log('[Universal Tier] ✅ Tier updated via HiBrandTiers:', tierToDisplay);
      
      // Cache the tier for next navigation
      if (window.NavCache && membership?.tier) {
        window.NavCache.setTier(membership.tier);
      }
    } else if (tierToDisplay) {
      // Fallback if HiBrandTiers not loaded yet - use branded name or capitalize tier
      const fallbackName = window.HiBrandTiers?.getName?.(tierToDisplay) || tierToDisplay.charAt(0).toUpperCase() + tierToDisplay.slice(1);
      const tierText = tierIndicator.querySelector('.tier-text');
      if (tierText) {
        tierText.textContent = fallbackName;
      } else {
        tierIndicator.textContent = fallbackName;
      }
      console.warn('[Universal Tier] HiBrandTiers not available, using fallback name:', fallbackName);
      
      // Cache the tier for next navigation
      if (window.NavCache && membership?.tier) {
        window.NavCache.setTier(membership.tier);
      }
    }
    
    // Remove loading spinner if present
    tierIndicator.removeAttribute('data-auth-loading');
    const tierText = tierIndicator.querySelector('.tier-text');
    if (tierText && tierText.classList.contains('tier-loading')) {
      tierText.classList.remove('tier-loading');
    }
    
    // 🔑 ADMIN ACCESS: Show/hide admin nav items (Dashboard specific)
    const adminLinks = document.querySelectorAll('.admin-item');
    if (adminLinks.length > 0) {
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
            console.log('[Universal Tier] Elevated via DB admin access');
            // Cache result to avoid repeated RPCs this session
            sessionStorage.setItem('hi_admin_access', 'true');
          } else if (error) {
            console.warn('[Universal Tier] DB admin access check failed:', error.message || error);
          }
        } catch (rpcErr) {
          console.warn('[Universal Tier] RPC admin check exception:', rpcErr);
        }
      } else if (sessionStorage.getItem('hi_admin_access') === 'true') {
        hasDbAdminAccess = true;
      }
      
      const effectiveAdmin = isMembershipAdmin || hasDbAdminAccess;
      adminLinks.forEach(a => { a.style.display = effectiveAdmin ? '' : 'none'; });
      console.log('[Universal Tier] Admin access:', effectiveAdmin);
    }
    
  } catch(err) { 
    console.warn('[Universal Tier] UI update error', err); 
  }
});

// Also listen for membership status changes (for tier upgrades/downgrades)
window.addEventListener('membershipStatusChanged', (e) => {
  console.log('[Universal Tier] membershipStatusChanged event', e.detail);
  const tierIndicator = document.getElementById('hi-tier-indicator');
  if (!tierIndicator) return;
  
  const tier = e.detail?.tier || e.detail?.membership?.tier;
  if (tier && window.HiBrandTiers) {
    window.HiBrandTiers.updateTierPill(tierIndicator, tier, {
      showEmoji: false,
      useGradient: false
    });
    console.log('[Universal Tier] ✅ Tier updated from membershipStatusChanged:', tier);
  }
});

// Listen for hi:membership-changed (from AuthReady.js)
window.addEventListener('hi:membership-changed', (e) => {
  console.log('[Universal Tier] hi:membership-changed event', e.detail);
  const tierIndicator = document.getElementById('hi-tier-indicator');
  if (!tierIndicator) return;
  
  const tier = e.detail?.tier;
  if (tier && window.HiBrandTiers) {
    window.HiBrandTiers.updateTierPill(tierIndicator, tier, {
      showEmoji: false,
      useGradient: false
    });
    console.log('[Universal Tier] ✅ Tier updated from hi:membership-changed:', tier);
  }
});

console.log('✅ [Universal Tier Listener] Loaded and listening for hi:auth-ready, membershipStatusChanged, hi:membership-changed');
