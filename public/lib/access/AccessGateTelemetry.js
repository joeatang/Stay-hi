// AccessGateTelemetry - Woz-grade lightweight funnel instrumentation
// Captures gating lifecycle events without external dependencies.
// Data model: session counters + recent events ring buffer for quick inspection.
(function(){
  const storeKey = '__hiAccessTelemetry';
  const session = JSON.parse(sessionStorage.getItem(storeKey) || '{}');
  const state = {
    counts: Object.assign({ requested:0, allowed:0, blocked:0, upgradeIntent:0 }, session.counts || {}),
    recent: session.recent || [], // [{t,type,context,reason}]
    version: '1.0.0'
  };
  const allowedContexts = new Set(['dashboard','muscle','island','profile','calendar','upgrade-flow','admin','streaks','share','auth','unknown']);
  const allowedReasons = new Set(['membership-upgrade','not-authenticated','tier-required','admin-only','quota','limit','success','blocked','upgrade-click','unknown']);
  function normalize(val,set){
    if(!val) return 'unknown';
    const cleaned = String(val).toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    return set.has(cleaned) ? cleaned : 'unknown';
  }
  function persist(){
    try { sessionStorage.setItem(storeKey, JSON.stringify(state)); } catch(_){}
  }
  function push(type, detail){
    const rawContext = detail?.context || detail?.decision?.context || 'unknown';
    const rawReason = detail?.decision?.reason || 'unknown';
    const entry = { t: Date.now(), type, context: normalize(rawContext, allowedContexts), reason: normalize(rawReason, allowedReasons) };
    state.recent.unshift(entry);
    if(state.recent.length>40) state.recent.splice(40);
    persist();
  }
  function inc(key){ state.counts[key] = (state.counts[key]||0)+1; persist(); }
  function expose(){ window.__hiAccessTelemetry = {
    get: ()=> JSON.parse(JSON.stringify(state)),
    reset: ()=>{ state.counts={ requested:0, allowed:0, blocked:0, upgradeIntent:0 }; state.recent=[]; persist(); },
    export: ()=> ({ timestamp: Date.now(), data: state })
  }; }
  expose();
  window.addEventListener('hi:access-requested', e=>{ inc('requested'); push('requested', e.detail); });
  window.addEventListener('hi:access-allowed', e=>{ inc('allowed'); push('allowed', e.detail); });
  window.addEventListener('hi:access-blocked', e=>{ inc('blocked'); push('blocked', e.detail); });
  window.addEventListener('hi:membership-changed', e=>{ if(e.detail?.tier !== 'anonymous'){ inc('upgradeIntent'); push('upgradeIntent', { context:'membership-changed', decision:{ reason:'membership-upgrade' } }); } });
})();
