// public/assets/header.js
(function () {
  const mount = document.getElementById("app-header");
  if (!mount) return;

  mount.innerHTML = `
    <div class="appbar">
      <button id="btnCal" class="icon-btn" aria-label="Open calendar">📅</button>
      <a class="brand" href="index.html" aria-label="Stay Hi home">
        <img class="logo" src="assets/brand/hi-logo-light.png" alt="" />
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

  document.getElementById("btnCal")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("open-calendar"));
  });

  const sheet = document.getElementById("menuSheet");
  const btnMore = document.getElementById("btnMore");
  btnMore?.addEventListener("click", () => sheet.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!sheet.contains(e.target) && e.target !== btnMore) sheet.classList.remove("open");
  });

  // STAGING badge — tiny on phones
  const isProd =
    location.hostname.endsWith("vercel.app") ||
    location.hostname === "stay-hi.app" ||
    location.hostname === "www.stay-hi.app";
  if (!isProd) {
    const b = document.createElement("div");
    b.className = "staging-banner";
    b.textContent = "STAGING";
    document.body.appendChild(b);
  }
})();

 // --- Calendar link hardening (works no matter what the markup looks like)
(function(){
  const CAL_URL = 'calendar.html';
  function hook(){
    const hdr = document.getElementById('app-header'); if(!hdr) return;
    const candidates = [
      hdr.querySelector('[data-link="calendar"]'),
      hdr.querySelector('.js-calendar'),
      hdr.querySelector('a[href*="calendar"]'),
      hdr.querySelector('button[aria-label*="Calendar" i]'),
      hdr.querySelector('a[aria-label*="Calendar" i]')
    ].filter(Boolean);
    candidates.forEach(node=>{
      node.addEventListener('click', (e)=>{
        e.preventDefault();
        // Use clean path; vercel.json rewrites to /calendar.html
        window.location.href = '/calendar';
      }, { passive:false });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hook);
  } else { hook(); }
})();

