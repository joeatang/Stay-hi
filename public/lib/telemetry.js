// Hi Telemetry Persistence Module
// Persists perf, error, integrity, and track events to Supabase tables (if client available)
(function(){
  'use strict';
  const QUEUE = [];
  const MAX_QUEUE = 200;
  const FLUSH_INTERVAL = 4000;
  const STATE = { lastClientCheck: 0 };

  function findClient(){
    // Attempt to locate an existing Supabase client instance
    const cands = [window.supabaseClient, window.db, window.client, window.sb, window.supabaseClient, window.supabase];
    for (const c of cands){
      if (c && typeof c === 'object' && typeof c.from === 'function') return c;
    }
    return null;
  }

  function enqueue(kind, data){
    if (QUEUE.length >= MAX_QUEUE) QUEUE.shift();
    QUEUE.push({ kind, data });
  }

  async function flush(){
    const client = findClient();
    if (!client || !QUEUE.length) return;
    while(QUEUE.length){
      const item = QUEUE.shift();
      try {
        if (item.kind === 'perf') {
          await client.from('perf_beacons').insert(item.data);
        } else if (item.kind === 'error') {
          await client.from('error_events').insert(item.data);
        } else if (item.kind === 'integrity') {
          await client.from('integrity_events').insert(item.data);
        } else if (item.kind === 'track') {
          await client.from('track_events').insert(item.data);
        }
      } catch(e){
        // Requeue once if transient
        if (!item._retry){ item._retry = true; QUEUE.unshift(item); break; }
      }
    }
  }

  setInterval(flush, FLUSH_INTERVAL);

  const api = {
    persistPerf(vitals){
      if (!vitals || !vitals.ts) return;
      const row = {
        ts: vitals.ts,
        build_tag: vitals.buildTag || vitals.build_tag || '',
        path: vitals.url || location.pathname,
        ttfb: vitals.ttfb,
        lcp: vitals.lcp,
        fid: vitals.fid,
        cls: vitals.cls,
        fcp: vitals.fcp,
        tbt: vitals.tbt,
        long_tasks: vitals.longTasks,
        resources: vitals.resources ? JSON.stringify(vitals.resources) : null
      };
      enqueue('perf', row);
    },
    persistError(evt){
      if (!evt || !evt.ts) return;
      const row = {
        ts: evt.ts,
        build_tag: evt.build || evt.build_tag || '',
        path: evt.path || location.pathname,
        type: evt.type,
        message: evt.message,
        stack: evt.stack,
        src: evt.src,
        line: evt.line,
        col: evt.col
      };
      enqueue('error', row);
    },
    persistIntegrity(evt){
      if (!evt || !evt.ts) return;
      const row = {
        ts: evt.ts,
        build_tag: evt.build || evt.build_tag || '',
        path: evt.path || location.pathname,
        src: evt.src,
        event_type: evt.type,
        expected: evt.expected,
        actual: evt.actual
      };
      enqueue('integrity', row);
    },
    persistTrack(evt){
      if (!evt || !evt.ts) return;
      const row = {
        ts: evt.ts,
        build_tag: evt.build || evt.build_tag || '',
        path: evt.path || location.pathname,
        event: evt.event,
        data: evt.data ? JSON.stringify(evt.data) : null
      };
      enqueue('track', row);
    }
  };

  window.HiTelemetry = api;
})();
