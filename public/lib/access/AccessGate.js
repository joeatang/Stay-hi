// AccessGate - non-invasive scaffold for unified access requests
// Provides AccessGate.request(context) that decides whether to prompt sign-in/upgrade later.
// For now, it logs and emits an event; UI integration will be added in a later step.

(function(){
  function request(context = 'general'){
    try {
      const mem = (window.HiMembership && window.HiMembership.get && window.HiMembership.get()) || { tier:'anonymous', isAnonymous:true };
      
      // 🎯 CRITICAL FIX: Check BOTH isAnonymous AND tier
      // Authenticated users with 'free' tier should NOT be blocked
      const isReallyAnonymous = mem.isAnonymous || mem.tier === 'anonymous';
      
      const decision = {
        allow: !isReallyAnonymous,
        reason: isReallyAnonymous ? 'anonymous' : 'ok',
        context
      };
      window.dispatchEvent(new CustomEvent('hi:access-requested', { detail: { context, decision, membership: mem } }));
      return decision;
    } catch (e){
      return { allow: false, reason: 'error', context, error: e.message };
    }
  }

  window.AccessGate = { request };
})();
