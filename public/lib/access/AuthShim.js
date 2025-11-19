// AuthShim - replaces legacy ProgressiveAuth globals with unified implementations
// Provides window.isAuthenticated() and window.requireAuth(action) backed by HiMembership + AccessGate.
(function(){
  function isAuthenticated(){
    try { return !!(window.HiMembership && !window.HiMembership.get().isAnonymous); } catch { return false; }
  }
  async function requireAuth(action){
    const decision = window.AccessGate ? window.AccessGate.request(action||'general') : { allow:false };
    return !!decision.allow;
  }
  window.isAuthenticated = isAuthenticated;
  window.requireAuth = requireAuth;
})();
