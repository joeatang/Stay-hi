// Lightweight CSP violation logger
// Attach once; no external dependencies.
(function() {
  if (window.__HI_CSP_LISTENER__) return;
  window.__HI_CSP_LISTENER__ = true;
  window.addEventListener('securitypolicyviolation', function(e) {
    const data = {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      columnNumber: e.columnNumber,
      effectiveDirective: e.effectiveDirective
    };
    console.warn('[CSP Violation]', data);
    // TODO: optional: send beacon to /csp-report endpoint when backend available.
  });
})();
