// HiMembershipBridge - unify membership signals and provide a simple API
// Listens to AuthReady (session + membership) and UnifiedMembershipSystem events
// Exposes window.HiMembership with get(), onChange(), isAdmin(), tier(), refresh()

(function(){
  const listeners = new Set();
  let last = null;

  function emit(detail){
    last = detail || last;
    try { window.dispatchEvent(new CustomEvent('hi:membership-changed', { detail: last })); } catch(_){ }
    for (const cb of Array.from(listeners)) { try { cb(last); } catch(_){} }
  }

  function fromUnified(){
    try{
      const u = window.unifiedMembership;
      if (!u) return null;
      const info = u.getMembershipInfo?.();
      if (!info) return null;
      return {
        tier: info.tier,
        isAnonymous: !!info.isAnonymous,
        features: info.features || {},
        remaining: info.remaining || null
      };
    } catch { return null; }
  }

  // Listen to existing events
  window.addEventListener('hi:auth-ready', (e)=>{
    const mem = e?.detail?.membership;
    if (mem) {
      const detail = {
        tier: mem.tier || (mem.is_admin ? 'admin' : 'member'),
        isAnonymous: !e.detail.session,
        is_admin: !!mem.is_admin
      };
      emit(detail);
      try { localStorage.setItem('hi_membership_tier', detail.tier || ''); } catch{}
      try { localStorage.setItem('hi_membership_is_admin', detail.is_admin ? '1':'0'); } catch{}
    }
  });

  window.addEventListener('membershipStatusChanged', ()=>{
    const mapped = fromUnified();
    if (mapped) emit(mapped);
  });

  const HiMembership = {
    get(){
      if (last) return last;
      const mapped = fromUnified();
      if (mapped) { last = mapped; return mapped; }
      try {
        const tier = localStorage.getItem('hi_membership_tier') || 'anonymous';
        return { tier, isAnonymous: tier==='anonymous' };
      } catch { return { tier: 'anonymous', isAnonymous: true }; }
    },
    onChange(cb){ if (typeof cb==='function'){ listeners.add(cb); return ()=>listeners.delete(cb); } return ()=>{}; },
    isAdmin(){ const s=this.get(); return !!(s && (s.is_admin || s.tier==='admin')); },
    tier(){ const s=this.get(); return s?.tier || 'anonymous'; },
    async refresh(){ try { if (window.refreshMembership) await window.refreshMembership(); } catch(_){} }
  };

  window.HiMembership = HiMembership;
})();
