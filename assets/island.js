// assets/island.js
// Hi Island: world map placeholder + two feeds (General & Hi Show)

(function () {
  const $ = (s) => document.querySelector(s);

  // simple POST helper
  const post = (url, body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then((r) => r.json());

  // tiny header (same look as other pages)
  function header(active) {
    const H = $("#app-header");
    if (!H) return;
    H.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="/">Stay Hi</a>
        <nav class="nav">
          <a href="/hi-island.html" class="${active === "island" ? "active" : ""}">Hi Island</a>
          <a href="/hi-muscle.html" class="${active === "muscle" ? "active" : ""}">Hi Muscle</a>
          <a href="/profile.html">Profile</a>
        </nav>
        <span style="margin-left:auto"></span>
        <a href="/signin.html" style="color:#7ce0c5;text-decoration:none">Sign in</a>
      </div>`;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderList(rootSel, items) {
    const root = $(rootSel);
    if (!root) return;
    if (!items || !items.length) {
      root.innerHTML = `<div class="toast">No shares yet.</div>`;
      return;
    }
    root.innerHTML = items
      .map((it) => {
        const when = it.created_at
          ? new Date(it.created_at).toLocaleString()
          : "";
        const who = escapeHtml(it.user || "Someone");
        const text = escapeHtml(it.text || "");
        return `
          <div class="panel" style="padding:12px 14px;margin:0">
            <span style="background:#ffffff15;border:1px solid #242643;border-radius:999px;padding:4px 10px;margin-right:8px">
              ${who}
            </span>
            <span>${text}</span>
            <time style="float:right;color:#aeb1cc">${when}</time>
          </div>`;
      })
      .join("");
  }

  // very light “globe” placeholder (decorative)
  function renderGlobe() {
    const g = $("#globe");
    if (!g) return;
    g.innerHTML = `
      <div style="width:100%;height:100%;border-radius:18px;border:1px solid #242643;
                  background:
                    radial-gradient(60% 80% at 20% 10%, #3dd4ff12, transparent 60%),
                    radial-gradient(80% 70% at 80% 0%, #ffb84d18, transparent 60%),
                    linear-gradient(180deg,#0e1222,#0a0d18); 
                  display:grid;place-items:center;position:relative;overflow:hidden">
        <div style="position:absolute;inset:12px;border-radius:16px;border:1px dashed #2a2c4f;opacity:.6"></div>
        <div style="text-align:center;color:#aeb1cc">
          <div style="font-weight:800;color:#f7f8ff">Hi Island</div>
          <div style="font-size:.95rem">World map & pins coming soon</div>
        </div>
      </div>`;
  }

  async function loadFeeds() {
    try {
      const gen = await post("/api/shares", { action: "list" }); // using the working route
      renderList("#general-list", gen.items || []);
    } catch (e) {
      renderList("#general-list", []);
    }
    try {
      const show = await post("/api/hi-show-shares", { action: "list" });
      renderList("#show-list", show.items || []);
    } catch (e) {
      renderList("#show-list", []);
    }
  }

  async function init() {
    header("island");
    renderGlobe();
    await loadFeeds();
    // optional manual refresh
    const r1 = document.getElementById("refresh-general");
    const r2 = document.getElementById("refresh-show");
    r1 && (r1.onclick = loadFeeds);
    r2 && (r2.onclick = loadFeeds);
  }

  window.HiIsland = { init };
})();

