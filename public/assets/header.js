// public/assets/header.js
(function () {
  const isActive = (p) =>
    location.pathname.endsWith("/" + p) || location.pathname.endsWith(p);

  const mount = document.getElementById("app-header");
  if (!mount) return;

  mount.innerHTML = `
    <div class="appbar">
      <button id="btnCal" class="icon-btn" aria-label="Open calendar">📅</button>
      <a class="brand" href="index.html" aria-label="Stay Hi home">
        <img class="logo" src="assets/brand/logo.svg" alt="" />
        <span class="brand-name">Stay Hi</span>
      </a>
      <div class="menu">
        <button id="btnMore" class="icon-btn" aria-label="Open menu" aria-haspopup="menu">⋯</button>
        <div id="menuSheet" class="menu-sheet" role="menu">
          <a href="hi-muscle.html" role="menuitem">Build Your Hi Muscle</a>
          <a href="hi-island.html" role="menuitem">Hi Island</a>
          <a href="profile.html" role="menuitem">Profile</a>
          <div class="sep"></div>
          <a href="signin.html" role="menuitem">Sign in</a>
          <a href="signup.html" role="menuitem">Join</a>
          <a href="index.html" role="menuitem">Home</a>
        </div>
      </div>
    </div>
  `;

  // open/close calendar (pages listen for this)
  document.getElementById("btnCal")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("open-calendar"));
  });

  // menu toggle + outside click to close
  const sheet = document.getElementById("menuSheet");
  const btnMore = document.getElementById("btnMore");
  btnMore?.addEventListener("click", () => sheet.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!sheet.contains(e.target) && e.target !== btnMore) sheet.classList.remove("open");
  });

  // --- STAGING BADGE (non-vercel domains only) ---
  const isProduction =
    location.hostname.endsWith("vercel.app") ||
    location.hostname === "stay-hi.app" ||
    location.hostname === "www.stay-hi.app";

  if (!isProduction) {
    const banner = document.createElement("div");
    banner.className = "staging-banner";
    banner.innerHTML = `<strong>STAGING PREVIEW</strong>
      <span style="opacity:.7;margin-left:8px">${new Date(document.lastModified).toLocaleString()}</span>`;
    document.body.appendChild(banner);
  }
})();
