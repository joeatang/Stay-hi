// ===================================================================
// 🗺️ HI ISLAND MAP COMPONENT
// Isolated Leaflet map with hand emoji pins for Hi shares
// ===================================================================

class HiIslandMap {
  constructor(rootElement) {
    this.root = rootElement;
    this.map = null;
    this.markers = [];
    this.mapInitialized = false;
    
    this.init();
  }

  // Initialize component
  async init() {
    this.render();
    this.attachEventListeners();
    
    // Wait for Leaflet to be loaded
    await this.waitForLeaflet();
    this.initMap();
  }

  // Render HTML structure
  render() {
    this.root.innerHTML = `
      <div class="hi-map">
        <!-- Hero Header -->
        <div class="hi-map-hero">
          <div class="hi-map-hero-text">
            <h1 class="hi-map-title">Hi Island</h1>
            <p class="hi-map-subtitle">A gentle stream of Hi Shares from around the world</p>
          </div>
          <button class="hi-map-drop-btn" id="hi-map-drop-btn">Drop a Hi</button>
        </div>
        
        <!-- Map Canvas -->
        <div class="hi-map-canvas" id="hi-map-canvas"></div>
      </div>
    `;
  }

  // Attach event listeners
  attachEventListeners() {
    const dropBtn = this.root.querySelector('#hi-map-drop-btn');
    if (dropBtn) {
      dropBtn.addEventListener('click', () => {
        this.openComposer();
      });
    }
  }

  // Wait for Leaflet to be available
  waitForLeaflet() {
    return new Promise((resolve) => {
      if (typeof L !== 'undefined') {
        resolve();
      } else {
        const check = setInterval(() => {
          if (typeof L !== 'undefined') {
            clearInterval(check);
            resolve();
          }
        }, 100);
      }
    });
  }

  // Initialize Leaflet map
  initMap() {
    const mapCanvas = this.root.querySelector('#hi-map-canvas');
    if (!mapCanvas || this.mapInitialized) return;

    try {
      // Create map centered on world view
      this.map = L.map(mapCanvas, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        scrollWheelZoom: true,
        zoomControl: true
      });

      // Add tile layer (CartoDB Dark Matter for premium feel)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(this.map);

      this.mapInitialized = true;
      console.log('✅ Hi Island Map initialized');

      // Load markers after map is ready
      setTimeout(() => this.loadMarkers(), 500);

    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  }

  // Load markers from hiDB
  async loadMarkers() {
    if (!window.hiDB || !this.map) return;

    try {
      const shares = await window.hiDB.fetchPublicShares({ limit: 100 });
      
      // Clear existing markers
      this.clearMarkers();

      // For now, just show count - geocoding locations requires more setup
      // TODO: Implement geocoding service for location strings
      const locationsCount = shares.filter(s => s.location && s.location.trim()).length;
      console.log(`✅ Loaded ${locationsCount} shares with locations (geocoding coming soon)`);
      
      // Placeholder: Add a few demo markers at known coordinates
      // Once geocoding is set up, this will map actual share locations
      this.addDemoMarkers(shares.slice(0, 5));

    } catch (error) {
      console.error('❌ Error loading map markers:', error);
    }
  }

  // Add demo markers (temporary until geocoding is implemented)
  addDemoMarkers(shares) {
    const demoLocations = [
      { lat: 40.7128, lng: -74.0060 }, // New York
      { lat: 51.5074, lng: -0.1278 },  // London
      { lat: 35.6762, lng: 139.6503 }, // Tokyo
      { lat: -33.8688, lng: 151.2093 },// Sydney
      { lat: 48.8566, lng: 2.3522 }    // Paris
    ];

    shares.forEach((share, i) => {
      if (i < demoLocations.length) {
        const loc = demoLocations[i];
        this.addMarkerAt(loc.lat, loc.lng, share);
      }
    });
  }

  // Add marker at specific coordinates
  addMarkerAt(lat, lng, share) {
    if (!this.map) return;

    // Create custom hand emoji icon
    const handIcon = L.divIcon({
      className: 'hi-location-marker',
      html: '👋',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Create marker
    const marker = L.marker([lat, lng], {
      icon: handIcon,
      title: share.userName || 'Hi Friend'
    });

    // Create popup content
    const timeAgo = this.formatTimeAgo(share.createdAt);
    const popupContent = `
      <div style="max-width: 200px;">
        <div style="font-weight: 600; margin-bottom: 4px;">
          ${share.userName || 'Hi Friend'}
        </div>
        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
          ${share.currentEmoji} → ${share.desiredEmoji}
          ${share.text ? '<br>' + this.truncate(share.text, 60) : ''}
        </div>
        <div style="font-size: 11px; color: #999;">
          ${share.location ? `� ${share.location} • ` : ''}${timeAgo}
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.addTo(this.map);

    this.markers.push(marker);
  }

  // Clear all markers
  clearMarkers() {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  }

  // Open Hi composer modal
  openComposer() {
    if (typeof window.openHiComposer === 'function') {
      window.openHiComposer();
    } else {
      console.warn('⚠️ Hi Composer not available yet');
      alert('Hi Composer coming soon! 🚀');
    }
  }

  // Format timestamp to relative time
  formatTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  }

  // Truncate text
  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Public method to refresh markers
  refresh() {
    this.loadMarkers();
  }
}

// ===================================================================
// 🚀 AUTO-INITIALIZE
// ===================================================================
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const root = document.getElementById('hi-island-map-root');
    if (root) {
      window.hiIslandMap = new HiIslandMap(root);
      console.log('✅ Hi Island Map component initialized');
    }
  }
})();
