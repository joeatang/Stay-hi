// upgrade-cta.js — unify all upgrade buttons/taps to AccessGate
(function(){
  function onClick(e){
    const t = e.target.closest('[data-upgrade], .js-upgrade, .upgrade-btn');
    if(!t) return;
    e.preventDefault();
    try {
      const ctx = t.getAttribute('data-upgrade') || 'membership:upgrade';
      const d = window.AccessGate?.request ? window.AccessGate.request(ctx) : { allow:false };
      if (d.allow) {
        window.dispatchEvent(new CustomEvent('hi:upgrade-allowed', { detail:{ context: ctx, decision: d } }));
      }
    } catch(_){ }
  }
  document.addEventListener('click', onClick);
})();
