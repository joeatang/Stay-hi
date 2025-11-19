import '../AuthReady.js';
window.addEventListener('hi:auth-ready', async (e) => {
  const { session, membership } = e.detail || {};
  console.log('[Dashboard][AuthReady] received', { user: session?.user?.id, tier: membership?.tier, adminFlag: membership?.is_admin });
  try {
    const pill = document.querySelector('[data-tier-pill]');
    if (pill && membership?.tier) pill.textContent = membership.tier.toUpperCase();
    const adminLinks = document.querySelectorAll('.admin-item');
    const isMembershipAdmin = !!membership?.is_admin;
    let hasDbAdminAccess = false;
    // Fallback: if membership flag not set, verify via authoritative DB RPC
    if (!isMembershipAdmin && window.hiSupabase?.rpc) {
      try {
        const clientIP = null; // Optional: supply if available
        const { data, error } = await window.hiSupabase.rpc('check_admin_access', { p_required_role: 'admin', p_ip_address: clientIP });
        if (!error && data?.has_access) {
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
