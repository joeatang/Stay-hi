// StatsDebugOverlay.js
// Tiny overlay to show stat values and their source for debugging.
// Enabled when ?debugstats=1 or window.__HI_STATS_DEBUG__ = true
(function(){
  try {
    const qp = new URLSearchParams(location.search);
    const enabled = qp.get('debugstats') === '1' || window.__HI_STATS_DEBUG__ === true;
    if (!enabled) return;

    let prev = null; // previous stats snapshot for diffing
    let history = []; // last 10 diffs
    try {
      const stored = sessionStorage.getItem('hi_stats_diff_history');
      if (stored) history = JSON.parse(stored);
    } catch {}

    const root = document.createElement('div');
    root.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;background:rgba(0,0,0,0.75);color:#fff;padding:10px 12px;border-radius:10px;font:12px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);backdrop-filter:blur(6px)';
    root.innerHTML = '<div style="font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:8px">Hi Stats Debug <button id="_sd_refresh" style="background:#2563eb;color:#fff;border:none;padding:2px 8px;border-radius:6px;font-size:11px;cursor:pointer">Refresh</button></div>'+
      '<div id="_sd_waves">Waves: ...</div>'+
      '<div id="_sd_his">Total His: ...</div>'+
      '<div id="_sd_users">Users: ...</div>'+
      '<div id="_sd_src" style="opacity:.8;margin-top:6px">source: ...</div>'+
      '<div id="_sd_time" style="opacity:.6">—</div>'+
      '<div id="_sd_latency" style="opacity:.6">latency: —</div>'+
      '<div id="_sd_diff" style="margin-top:6px;opacity:.75;font-size:11px"></div>'+
      '<div id="_sd_history" style="margin-top:6px;max-height:120px;overflow:auto;font-size:11px;line-height:1.3"></div>';
    document.body.appendChild(root);

    async function manualRefresh(){
      const btn = document.getElementById('_sd_refresh');
      if (!btn) return;
      btn.disabled = true; btn.textContent = '...';
      try {
        const { loadGlobalStats } = await import('./UnifiedStatsLoader.js');
        await loadGlobalStats({ force:true });
      } catch (e) { console.warn('[StatsDebugOverlay] manual refresh failed', e); }
      btn.disabled = false; btn.textContent = 'Refresh';
    }
    root.querySelector('#_sd_refresh').addEventListener('click', manualRefresh);

    function diffStats(prev, next){
      if (!prev) return 'initial load';
      const fields = ['waves','totalHis','totalUsers'];
      const changes = fields.map(f => {
        const a = prev[f]; const b = next[f];
        if (a === b) return null;
        return `${f}: ${a ?? '∅'} → ${b ?? '∅'}`;
      }).filter(Boolean);
      return changes.length ? changes.join(', ') : 'no change';
    }

    function renderHistory(){
      const el = root.querySelector('#_sd_history');
      if (!el) return;
      if (!history.length){ el.textContent='(no diffs yet)'; return; }
      el.innerHTML = history.map(h => `<div>${h.ts} · ${h.text}</div>`).join('');
    }

    function pushHistory(diffText, timing){
      if (!diffText || diffText==='no change') return;
      const entry = { text: diffText, ts: new Date().toLocaleTimeString(), latency: timing?.totalMs ?? null, source: timing?.fastest?.source || null };
      history.unshift(entry); // newest first
      if (history.length > 10) history = history.slice(0,10);
      try { sessionStorage.setItem('hi_stats_diff_history', JSON.stringify(history)); } catch {}
      window.dispatchEvent(new CustomEvent('hi:stats-diff-history', { detail: { history } }));
      renderHistory();
    }

    function update(detail){
      try {
        const fmt = (n)=> Number.isFinite(n)? Number(n).toLocaleString(): '...';
        root.querySelector('#_sd_waves').textContent = 'Waves: ' + fmt(detail.waves);
        root.querySelector('#_sd_his').textContent = 'Total His: ' + fmt(detail.totalHis);
        root.querySelector('#_sd_users').textContent = 'Users: ' + fmt(detail.totalUsers);
        const src = detail._source || {}; const overall = detail.overall || 'unknown';
        root.querySelector('#_sd_src').textContent = `source: waves=${src.waves}, his=${src.totalHis}, users=${src.totalUsers}, overall=${overall}`;
        root.querySelector('#_sd_time').textContent = new Date().toLocaleTimeString();
        const diffText = diffStats(prev, detail);
        root.querySelector('#_sd_diff').textContent = 'Δ ' + diffText;
        if (diffText !== 'no change') {
          console.info('[UnifiedStats][diff]', diffText, { from: prev, to: detail });
        }
        // latency display
        if (detail._timing){
          const latencyEl = root.querySelector('#_sd_latency');
          const t = detail._timing;
          latencyEl.textContent = `latency: ${t.totalMs?.toFixed?.(2) || t.totalMs} ms (fastest: ${t.fastest?.source || 'n/a'} ${t.fastest? t.fastest.durationMs+'ms':'-'})`;
        }
        prev = { waves: detail.waves, totalHis: detail.totalHis, totalUsers: detail.totalUsers };
        pushHistory(diffText, detail._timing);
      } catch (e) {}
    }

    // Listen to both legacy and new global stats events
    window.addEventListener('hi:stats-updated', (e)=> update(e.detail||{}));
    window.addEventListener('hi:global-stats', (e)=> update(e.detail||{}));

    // Show initial cache if present
    try {
      const initial = {
        waves: Number(localStorage.getItem('globalHiWaves')) || null,
        totalHis: Number(localStorage.getItem('globalTotalHis')) || null,
        totalUsers: Number(localStorage.getItem('globalTotalUsers')) || null,
        _source: { waves: 'cache', totalHis: 'cache', totalUsers: 'cache' },
        overall: 'cache'
      };
      update(initial);
      renderHistory();
    } catch {}
  } catch {}
})();
