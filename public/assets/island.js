// assets/island.js
// Hi Island: Leaflet world map + two feeds (General & Hi Show)

(function () {
  const $ = (s) => document.querySelector(s);

  // POST helper
  const post = (url, body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then((r) => r.json());

  // header
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
        const when = it.created_at ? new Date(it.created_at).toLocaleString() : "";
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

  // ---- Map bits (Leaflet) ----
  let map, markers;

  function initMap() {
    if (map) return;
    // the map is rendered into the #globe div (already 320px high in the HTML)
    map = L.map("globe", { worldCopyJump: true }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    markers = L.layerGroup().addTo(map);
  }

  function setPins(items) {
    if (!markers) return;
    markers.clearLayers();
    const pins = (items || []).filter(
      (it) => typeof it.lat === "number" && typeof it.lng === "number"
    );
    pins.forEach((it) => {
      L.marker([it.lat, it.lng])
        .addTo(markers)
        .bindPopup(
          `<strong>${escapeHtml(it.user || "Someone")}</strong><br>${escapeHtml(
            it.text || ""
          )}`
        );
    });
  }

  async function loadFeeds() {
    let genItems = [], showItems = [];
    try {
      const gen = await post("/api/shares", { action: "list" });
      genItems = gen.items || [];
      renderList("#general-list", genItems);
    } catch {
      renderList("#general-list", []);
    }
    try {
      const show = await post("/api/hi-show-shares", { action: "list" });
      showItems = show.items || [];
      renderList("#show-list", showItems);
    } catch {
      renderList("#show-list", []);
    }

    // combine any items with lat/lng for pins; fallback to sample pins if none yet
    let all = [...genItems, ...showItems];
    const hasPins = all.some((it) => typeof it.lat === "number" && typeof it.lng === "number");
    if (!hasPins) {
      all = [
        { user: "NYC",    text: "Hi from New York!", lat: 40.7128, lng: -74.0060 },
        { user: "London", text: "Hello 🇬🇧",          lat: 51.5074, lng:  -0.1278 },
        { user: "Sydney", text: "G'day 🇦🇺",          lat: -33.8688, lng: 151.2093 },
      ];
    }
    setPins(all);
  }

  async function init() {
    header("island");
    initMap();
    await loadFeeds();

    // refresh buttons
    const r1 = document.getElementById("refresh-general");
    const r2 = document.getElementById("refresh-show");
    r1 && (r1.onclick = loadFeeds);
    r2 && (r2.onclick = loadFeeds);
  }

  window.HiIsland = { init };
})();
