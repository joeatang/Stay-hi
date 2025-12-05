// AccessGateTelemetryExport - batches and persists access telemetry to Supabase
(function(){
  // 🎯 CRITICAL FIX: Disable telemetry if table doesn't exist (prevents 404 spam)
  const TELEMETRY_ENABLED = false; // Set to true when access_telemetry table is deployed
  
  const EXPORT_INTERVAL = 15000; // 15s batching window base
  const MAX_BATCH = 20;
  const TABLE = 'access_telemetry';
  let pending = [];
  let lastFlush = Date.now();
  let flushing = false;
  let retryDelay = 5000; // start 5s
  const MAX_RETRY_DELAY = 300000; // 5 min cap
  let sessionMeta = { session_id: null, user_id: null };
  let failureCycle = 0; // increments each consecutive failed flush, resets on success
  // Track request timestamps per context to compute decision latency
  const requestStartByContext = new Map();
  const allowedContexts = new Set(['dashboard','muscle','island','profile','calendar','upgrade-flow','admin','streaks','share','auth','unknown']);
  const allowedReasons = new Set(['membership-upgrade','not-authenticated','tier-required','admin-only','quota','limit','success','blocked','upgrade-click','unknown']);
  function normalizeEnum(val, set){
    if(!val) return 'unknown';
    const cleaned = String(val).toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    return set.has(cleaned) ? cleaned : 'unknown';
  }

  // Attempt asynchronous enrichment from Supabase auth
  async function hydrateSessionMeta(){
    try {
      const client = window.supabaseClient;
      if (!client || !client.auth) return;
      const { data } = await client.auth.getSession();
      const sess = data?.session;
      if (sess) {
        sessionMeta.session_id = sess?.access_token ? hashToken(sess.access_token) : null;
        sessionMeta.user_id = sess.user?.id || null;
      }
    } catch(e){ /* silent */ }
  }
  function hashToken(token){
    try {
      // lightweight non-cryptographic hash to avoid storing raw token
      let h = 0; for (let i=0;i<token.length;i++){ h = (h<<5)-h + token.charCodeAt(i); h|=0; }
      return '00000000-0000-0000-0000-' + Math.abs(h).toString().padStart(12,'0').slice(0,12);
    } catch(_) { return null; }
  }
  hydrateSessionMeta();
  window.addEventListener('hi:auth-ready', hydrateSessionMeta, { once: true });

  function capture(evt){
    try {
      const detail = evt.detail || {};
      const rawContext = detail.context || detail.decision?.context || 'unknown';
      const normContext = normalizeEnum(rawContext, allowedContexts);
      let decisionLatencyMs = null;
      if(evt.type === 'hi:access-requested'){
        requestStartByContext.set(normContext, performance.now());
      } else if(evt.type === 'hi:access-allowed' || evt.type === 'hi:access-blocked'){
        if(requestStartByContext.has(normContext)){
          const start = requestStartByContext.get(normContext);
          decisionLatencyMs = Math.round(performance.now() - start);
          requestStartByContext.delete(normContext);
        }
      }
      const record = {
        ts: new Date().toISOString(),
        type: evt.type.replace('hi:',''),
        context: normContext,
        reason: normalizeEnum(detail.decision?.reason || 'unknown', allowedReasons),
        session_id: sessionMeta.session_id,
        user_id: sessionMeta.user_id,
        ingest_source: 'client-exporter',
        failure_cycle: failureCycle,
        decision_latency_ms: decisionLatencyMs
      };
      pending.push(record);
      if (pending.length >= MAX_BATCH) flush();
    } catch(e){ console.warn('Telemetry capture error', e); }
  }

  async function flush(){
    if (!TELEMETRY_ENABLED) return; // Skip if disabled
    if (flushing || pending.length === 0) return;
    if (!window.supabaseClient) { return; }
    flushing = true;
    const batch = pending.splice(0, MAX_BATCH);
    // Enrich any missing user/session before send
    if (!sessionMeta.user_id || !sessionMeta.session_id) {
      await hydrateSessionMeta();
      batch.forEach(r => {
        if (!r.user_id) r.user_id = sessionMeta.user_id;
        if (!r.session_id) r.session_id = sessionMeta.session_id;
        r.context = normalizeEnum(r.context, allowedContexts);
        r.reason = normalizeEnum(r.reason, allowedReasons);
      });
    }
    try {
      const enrichedBatch = batch.map(r => ({ ...r, ingest_source: 'client-exporter', failure_cycle: failureCycle }));
      const { error } = await window.supabaseClient.from(TABLE).insert(enrichedBatch);
      if (error) {
        console.error('Telemetry export failed:', error.message);
        // Re-queue batch for later retry
        pending = batch.concat(pending);
        failureCycle++;
        scheduleRetry();
      } else {
        lastFlush = Date.now();
        retryDelay = 5000; // reset on success
        failureCycle = 0;
      }
    } catch(e){
      console.error('Telemetry export exception:', e);
      pending = batch.concat(pending);
      failureCycle++;
      scheduleRetry();
    } finally { flushing = false; }
  }

  function schedule(){
    if (!TELEMETRY_ENABLED) return; // Skip scheduling if disabled
    setInterval(()=>{ if(Date.now()-lastFlush >= EXPORT_INTERVAL) flush(); }, 5000);
  }
  function scheduleRetry(){
    if (!TELEMETRY_ENABLED) return; // Skip retry scheduling if disabled
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
    setTimeout(()=>{ flush(); }, retryDelay);
  }

  if (TELEMETRY_ENABLED) {
    ['hi:access-requested','hi:access-allowed','hi:access-blocked','hi:membership-changed'].forEach(ev=>{
      window.addEventListener(ev, capture);
    });
  }

  window.__hiAccessTelemetryExport = {
    flush,
    pending: ()=> pending.slice(),
    status: ()=> ({ pending: pending.length, flushing, retryDelay, sessionMeta, failureCycle })
  };

  schedule();
  document.dispatchEvent(new CustomEvent('hi:telemetry-export-ready'));
})();
