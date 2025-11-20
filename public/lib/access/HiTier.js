(function(){
  const allowedTiers = ['T1','T2','T3'];
  let currentTier = 'T1';

  function normalizeTier(t){
    if(!t) return 'T1';
    const up = String(t).toUpperCase();
    return allowedTiers.includes(up) ? up : 'T1';
  }

  function tierRank(t){
    return { T1: 1, T2: 2, T3: 3 }[normalizeTier(t)] || 1;
  }

  async function resolveTier(){
    try {
      // Prefer existing membership bridge if present
      if(window.__hiMembership && window.__hiMembership.tier){
        return normalizeTier(window.__hiMembership.tier);
      }
      // Try Supabase user metadata
      const client = window.supabaseClient;
      if(client && client.auth){
        const { data } = await client.auth.getUser();
        const user = data?.user;
        const metaTier = user?.user_metadata?.tier || user?.app_metadata?.tier;
        if(metaTier) return normalizeTier(metaTier);
        if(user?.id){
          const { data: mrow, error } = await client.from('user_membership').select('tier').eq('user_id', user.id).maybeSingle();
          if(!error && mrow?.tier) return normalizeTier(mrow.tier);
        }
      }
    } catch(_){}
    // Fallback localStorage (optional overrides)
    try {
      const stored = localStorage.getItem('__hiTier');
      if(stored) return normalizeTier(stored);
    } catch(_){ }
    return 'T1';
  }

  async function refresh(){
    const t = await resolveTier();
    if(t !== currentTier){
      currentTier = t;
      document.dispatchEvent(new CustomEvent('hi:tier-changed', { detail:{ tier: currentTier } }));
    }
    return currentTier;
  }

  function isAtLeast(t){ return tierRank(currentTier) >= tierRank(t); }
  function getTier(){ return currentTier; }

  // Initial
  refresh();
  window.addEventListener('hi:membership-changed', refresh);
  window.addEventListener('hi:auth-ready', refresh, { once:true });

  window.HiTier = { getTier, isAtLeast, refresh, tierRank };
  document.dispatchEvent(new CustomEvent('hi:tier-ready'));
})();
