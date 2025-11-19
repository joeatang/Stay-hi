// Compute absolute post-auth URL that works in dev (repo root) and prod
(function(){
  function computePostAuthPath(){
    const isLocal = /localhost|127\.0\.0\.1/.test(location.hostname);
    // If we're serving the repo root in dev, pages live under /public
    // Prefer /public/post-auth.html in dev; otherwise root /post-auth.html
    return isLocal ? '/public/post-auth.html' : '/post-auth.html';
  }

  function getPostAuthURL(params = {}){
    const base = `${location.origin}${computePostAuthPath()}`;
    const search = new URLSearchParams(params);
    const qs = search.toString();
    return qs ? `${base}?${qs}` : base;
  }

  window.hiPostAuthPath = {
    getPostAuthURL,
    getPath: computePostAuthPath
  };
})();
