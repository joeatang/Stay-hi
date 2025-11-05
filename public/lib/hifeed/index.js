// HI-OS S-ISL/2: minimal feed hub (v1)
// Re-export HiFeed and provide a safe mount helper.

export { HiFeed } from '../../ui/HiFeed/HiFeed.js';

export function mountHiFeed(container = document.getElementById('hiFeedContainer')) {
  if (!container) {
    console.warn('[S-ISL/2] HiFeed mount skipped: #hiFeedContainer not found');
    return { ok: false, reason: 'missing container' };
  }

  // Mark mounted for quick diagnostics
  container.dataset.hiFeed = 'mounted';

  // Instantiate + init if available (defensive)
  const feed = new HiFeed({ container });
  try { feed.init?.(); } catch (e) { console.warn('[S-ISL/2] feed.init optional failed:', e); }

  console.log('[S-ISL/2] HiFeed mounted', { container });
  return { ok: true, feed };
}