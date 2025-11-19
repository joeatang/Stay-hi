// HiLoading.js
// Unified lightweight loading + slow/error state handler for Hi dashboard & mission control
// Provides:
//  - Pending shimmer while auth + flags resolve
//  - Slow state indicator (>3s) and error fallback (>8s)
//  - Graceful removal once both gates satisfied

const el = document.getElementById('hiLoading');
if (el) {
  let authReady = false;
  let flagsReady = false;

  const securityEl = document.getElementById('securityLoading');

  function updateState() {
    if (authReady && flagsReady) {
      if (el.isConnected) {
        el.remove();
      }
      if (securityEl) {
        securityEl.style.opacity = '0';
        setTimeout(() => { if (securityEl.isConnected) securityEl.remove(); }, 500);
      }
      document.documentElement.classList.add('hi-loaded');
    }
  }

  // Auth gate
  window.addEventListener('hi:auth-ready', () => {
    authReady = true;
    updateState();
  });

  // Flags gate (presence optional)
  if (globalThis.hiFlagsReady && typeof globalThis.hiFlagsReady.then === 'function') {
    globalThis.hiFlagsReady.then(() => {
      flagsReady = true; updateState();
    }).catch(() => { flagsReady = true; updateState(); });
  } else {
    flagsReady = true; // No flags readiness concept yet
  }

  // Slow state after 3s
  setTimeout(() => {
    if (el.isConnected && !(authReady && flagsReady)) {
      el.dataset.loadingState = 'slow';
      const msg = el.querySelector('[data-loading-msg]');
      if (msg) msg.textContent = 'Still warming things up…';
    }
  }, 3000);

  // Error fallback after 8s
  setTimeout(() => {
    if (el.isConnected && !(authReady && flagsReady)) {
      el.dataset.loadingState = 'error';
      el.classList.add('loading-error');
      el.innerHTML = '<div class="loading-error-msg">⚠️ Slow network or system hiccup. <button id="retryHiLoading">Retry</button></div>';
      const btn = document.getElementById('retryHiLoading');
      if (btn) btn.onclick = () => window.location.reload();
    }
  }, 8000);
}

export {}; // ESM hygiene
