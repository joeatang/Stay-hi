// HI-OS S-ARCH/1: Webroot Guard (console-only for production)
(function() {
  const PASS = location.pathname.includes('/public/');
  window.__HI_WEBROOT_OK = PASS;
  const tag = '[HI-OS][WEBROOT]';
  if (PASS) {
    console.log(`${tag} GREEN — served from /public (web root OK)`);
  } else {
    console.error(`${tag} RED — NOT served from /public (fix dev server root)`);
  }
})();