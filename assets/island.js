// /public/assets/island.js
// Hi Island — interactive map w/ Leaflet
// Exposes: window.HiIsland.init(), window.HiIsland.updateMarkers(list)

(function () {
  let map, markers, labelLayer;
  const PADDING = [20, 20];

  // --- utils ---------------------------------------------------------------

  const debounce = (fn, ms = 200) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  // Parse "lat,lng" or "lat lon" (numbers)
  function parseLatLng(str) {
    if (!str || typeof str !== 'string') return null;
    const m = str.trim().match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!m) return null;
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
    return null;
  }

  // Deterministic hash → pseudo lat/lng.
  // Keeps lat within inhabited band and spreads lng worldwide.
  function hashToLatLng(text) {
    const s = String(text || '');
    // simple 32-bit hash
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // lat: -60..72 (avoid poles), lng: -180..180
    const lat = -60 + (h % 132); // 132° span
    const lng = -180 + ((h >>> 8) % 360);
    // small variance so same city across different posts clusters but not identical
    const jitter = ((h >>> 16) & 0xff) / 255 - 0.5;
    return [lat + jitter * 1.2, lng + jitter * 1.2];
  }

  function makeIcon(emojiA = '👋', emojiB = '') {
    const html = `
      <div style="
        display:grid;place-items:center;
        width:34px;height:34px;border-radius:50%;
        border:1px solid #ffffffaa;background:#fff;
        box-shadow:0 8px 18px rgba(0,0,0,.18)">
        <div style="font-size:18px;line-height:1">${emojiB || emojiA}</div>
      </div>`;
    return L.divIcon({ className: 'hi-pin', html, iconSize: [34, 34], iconAnchor: [17, 17] });
  }

  function popupHtml(item) {
    const user = item.isAnonymous ? 'Hi Friend' : (item.userName || 'You');
    const loc  = item.location ? `<div style="opacity:.75">📍 ${escapeHtml(item.location)}</div>` : '';
    const text = item.text || item.journalEntry || '';
    const body = escapeHtml(text);
    return `
      <div style="min-width:200px">
        <div style="display:flex;align-items:center;gap:8px;font-weight:800;margin-bottom:4px">
          <span>${escapeHtml(item.currentEmoji || '🙂')}</span>
          <span>→</span>
          <span>${escapeHtml(item.desiredEmoji || '😊')}</span>
          <span style="margin-left:auto;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-weight:700;background:#fff">${escapeHtml(user)}</span>
        </div>
        ${loc}
        <div style="margin-top:6px;line-height:1.35">${body}</div>
      </div>`;
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // --- API ----------------------------------------------------------------

  function init() {
    if (typeof L === 'undefined') {
      console.warn('[HiIsland] Leaflet not loaded');
      return;
    }
    const el = document.getElementById('globe');
    if (!el) {
      console.warn('[HiIsland] #globe element not found');
      return;
    }

    // Create map
    map = L.map(el, {
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: false
    }).setView([20, 0], 2);

    // Base tiles (Carto light, no labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Labels overlay (stays crisp and subtle)
    labelLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      pane: 'overlayPane'
    }).addTo(map);

    // Marker layer
    markers = L.layerGroup().addTo(map);

    // Fit bounds again on resize
    window.addEventListener('resize', debounce(() => {
      try {
        const b = getCurrentBounds();
        if (b) map.fitBounds(b, { padding: PADDING });
      } catch {}
    }, 250));

    console.debug('[HiIsland] map ready');
  }

  function updateMarkers(list) {
    if (!markers || !map) return;
    markers.clearLayers();

    if (!Array.isArray(list) || !list.length) return;

    const bounds = [];
    list.forEach(item => {
      let latlng = null;
      if (item.location) {
        latlng = parseLatLng(item.location);
      }
      if (!latlng) {
        // Stable pseudo-geocode fallback based on whatever info we have
        const seed = item.location || `${item.currentEmoji || ''}-${item.desiredEmoji || ''}-${item.createdAt || ''}`;
        latlng = hashToLatLng(seed);
      }

      const marker = L.marker(latlng, {
        icon: makeIcon(item.currentEmoji || '🙂', item.desiredEmoji || '')
      }).addTo(markers);

      marker.bindPopup(popupHtml(item), { closeButton: false });
      bounds.push(latlng);
    });

    // Fit map to pins (if only one, zoom in a bit)
    try {
      if (bounds.length === 1) {
        map.setView(bounds[0], 4);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: PADDING });
      }
    } catch {}
  }

  function getCurrentBounds() {
    const layers = [];
    markers.eachLayer(l => { if (l.getLatLng) layers.push(l.getLatLng()); });
    if (!layers.length) return null;
    return L.latLngBounds(layers);
  }

  // expose
  window.HiIsland = { init, updateMarkers };
})();
