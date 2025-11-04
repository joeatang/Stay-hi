// HI-OS S-ARCH/2 — REPO-ROOT LIB DEPRECATION MARKER
// If this file ever executes in the browser, you're serving from the repo root
// (or importing from /lib at repo root), which is NOT allowed. Use /public/lib instead.
(function () {
  const tag = '[HI-OS][DEPRECATED-LIB]';
  window.__HI_DEPRECATED_LIB_HIT = true;
  console.error(`${tag} RED — Repo-root /lib was loaded. Serve from /public and import from /public/lib only.`);
})();
export {};