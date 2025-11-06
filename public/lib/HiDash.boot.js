// /public/lib/HiDash.boot.js
// P1/Step2: Boot guard for hi-dashboard — inject missing S-DASH anchors behind flags
// Reversible: delete this file + remove one <script> tag in hi-dashboard.html

import { hiFlagEnabled } from './flags/HiFlags.js';

const FLAGS = {
  dash: 'hi_dash_v3',
  statsRow: 'hi_dash_stats_row_v1',
  medallion: 'hi_dash_medallion_cta_v1',
  share: 'hi_dash_share_cta_v1',
  globalPill: 'hi_dash_global_pill_v1',
};

function q(sel){ return document.querySelector(sel); }
function ensureContainer() {
  // Preferred drop zones in order
  return (
    q('#hiDashRoot') ||
    q('main') ||
    q('#app') ||
    document.body
  );
}

function ensureAnchor({ id, html, after }) {
  if (q('#' + id)) return false;
  const container = after ? q(after) : ensureContainer();
  if (!container) return false;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();
  const node = wrapper.firstElementChild;
  if (!node) return false;
  container.appendChild(node);
  return true;
}

function injectStatsRow() {
  const ok = ensureAnchor({
    id: 'statsRow',
    html: `
      <section id="statsRow" class="hi-stats-row" aria-label="Your Hi stats">
        <div id="statTotal" class="hi-stat" aria-label="Your total Hi-5s">—</div>
        <div id="stat7d" class="hi-stat" aria-label="Your last 7 days">—</div>
        <div id="statStreak" class="hi-stat" aria-label="Your streak">—</div>
        <div id="globalPill" class="hi-global-pill" aria-live="polite" aria-label="Global stats">—</div>
      </section>
    `,
  });
  if (ok) console.log('[P1/Step2][BOOT] Injected #statsRow anchors.');
  return ok;
}

function injectShareBtn() {
  const ok = ensureAnchor({
    id: 'giveHiBtn',
    html: `<button id="giveHiBtn" class="hi-share-btn" type="button" aria-label="Give yourself a Hi-5">Give yourself a Hi-5</button>`,
  });
  if (ok) console.log('[P1/Step2][BOOT] Injected #giveHiBtn.');
  return ok;
}

function injectMedallionFallback() {
  // Only inject if completely missing (prod has it already).
  const ok = ensureAnchor({
    id: 'hiMedallion',
    html: `<button id="hiMedallion" class="hi-medallion-btn" type="button" aria-label="Give yourself a Hi-5" title="Give yourself a Hi-5"></button>`,
  });
  if (ok) console.log('[P1/Step2][BOOT] Injected #hiMedallion (fallback).');
  return ok;
}

function boot() {
  if (!hiFlagEnabled?.(FLAGS.dash)) {
    console.warn('[P1/Step2][BOOT] hi_dash_v3 disabled — no action.');
    return;
  }

  // Stats row
  if (hiFlagEnabled(FLAGS.statsRow) || hiFlagEnabled(FLAGS.globalPill)) {
    injectStatsRow();
  }

  // Share CTA
  if (hiFlagEnabled(FLAGS.share)) {
    injectShareBtn();
  }

  // Medallion fallback (only if the flag is on and element missing)
  if (hiFlagEnabled(FLAGS.medallion)) {
    if (!q('#hiMedallion')) injectMedallionFallback();
  }

  // Mark boot complete
  window.__HI_DASH_BOOT__ = { ts: Date.now(), injected: true };
  console.log('[P1/Step2][BOOT] Dashboard boot guard complete.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}