// public/assets/island.js
// Hi Island (staging / mock mode): Leaflet map + two feeds (General & Hi Show)

(function () {
  const $ = (s) => document.querySelector(s);

  // --- header (no external JS needed) ---
  function renderHeader() {
    const H = $("#app-header");
    if (!H) return;
    H.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="index.html">Stay Hi</a>
        <nav class="nav">
          <a href="hi-island.html" class="active">Hi Island</a>
          <a href="hi-muscle.html">Hi Muscle</a>
          <a href="profile.html">Profile</a>
        </nav>
        <span style="margin-left:auto"></span>
        <a href="signin.html" style="color:#7ce0c5;text-decoration:none">Sign in</a>
      </div>`;
  }

  function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}

  function renderList(sel, items){
    const root = $(sel);
    if(!root) return;
    if(!items || !items.length){
      root.innerHTML = `<div class="toast">No shares yet.</div>`;
      return;
    }
    root.innerHTML = items.map(it=>{
      const when = it.created_at ? new Date(it.created_at).toLocaleString() : '';
      return `
        <div class="panel" style="padding:12px 14px;margin:0">
          <span style="background:#ffffff15;border:1px solid #242643;border-radius:999px;padding:4px 10px;margin-right:8px">
            ${esc(it.user || "Someone")}
          </span>
          <span>${esc(it.text || "")}</span>
          <time style="float:right;color:#aeb1cc">${when}</time>
        </div>`;
    }).join('');
  }

  // --- mock data (localStorage with demo fallback) ---
  const LS_GEN = 'stayhi.mock.general.v1';
  const LS_SHOW = 'stayhi.mock.show.v1';

  function getMock(key, fallback){
    try{ const v = JSON.parse(localStorage.getItem(key)||'null'); if(Array.isArray(v)) return v; }catch{}
    return fallback;
  }

  // --- map (Leaflet) ---
  let map, markers;
  function initMap(){
    if(map) return;
    map = L.map('globe', { worldCopyJump:true }).setView([20,0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'&copy; OpenStreetMap contributors', maxZoom:19
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
  }
  function setPins(items){
    if(!markers) return;
    markers.clearLayers();
    (items||[])
      .filter(it=>typeof it.lat==='number' && typeof it.lng==='number')
      .forEach(it=>{
        L.marker([it.lat,it.lng])
          .addTo(markers)
          .bindPopup(`<strong>${esc(it.user||'Someone')}</strong><br>${esc(it.text||'')}`);
      });
  }

  async function load(){
    renderHeader();
    initMap();

    // demo fallback so the map feels alive
    const demo = [
      {user:'NYC', text:'Hi from New York!', lat:40.7128, lng:-74.0060, created_at:Date.now()},
      {user:'London', text:'Hello 🇬🇧', lat:51.5074, lng:-0.1278, created_at:Date.now()},
      {user:'Sydney', text:'G’day 🇦🇺', lat:-33.8688, lng:151.2093, created_at:Date.now()}
    ];

    const general = getMock(LS_GEN, demo.slice(0,2));
    const show    = getMock(LS_SHOW, demo.slice(2));

    renderList('#general-list', general);
    renderList('#show-list', show);
    setPins([...general, ...show]);

    // refresh buttons
    const refresh = ()=>load();
    const r1 = document.getElementById('refresh-general');
    const r2 = document.getElementById('refresh-show');
    r1 && (r1.onclick = refresh); r2 && (r2.onclick = refresh);
  }

  window.HiIsland = { init: load };
})();
