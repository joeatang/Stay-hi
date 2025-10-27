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
        // Open share sheet with hi5 origin
        if (window.openHiShareSheet) {
          window.openHiShareSheet('hi5');
        } else {
          console.warn('Share sheet not initialized');
        }
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

      console.log(`🗺️ Loading ${shares.length} shares onto map...`);
      
      // Filter shares with valid locations
      const sharesWithLocation = shares.filter(s => s.location && s.location.trim());
      console.log(`📍 ${sharesWithLocation.length} shares have location data`);
      
      // Get unique locations to batch geocode
      const uniqueLocations = [...new Set(sharesWithLocation.map(s => s.location))];
      console.log(`🌍 ${uniqueLocations.length} unique locations to geocode`);
      
      // Geocode each unique location (with caching)
      const locationCache = {};
      for (const location of uniqueLocations) {
        const coords = await this.geocodeLocation(location);
        if (coords) {
          locationCache[location] = coords;
        }
      }
      
      // Add markers for all shares with valid coordinates
      let markersAdded = 0;
      for (const share of sharesWithLocation) {
        const coords = locationCache[share.location];
        if (coords) {
          this.addMarkerAt(coords.lat, coords.lng, share);
          markersAdded++;
        }
      }
      
      console.log(`✅ Added ${markersAdded} markers to map`);
      
      // If no markers added, show helpful message
      if (markersAdded === 0) {
        console.log('💡 No shares with geocoded locations yet. Create some shares to see them on the map!');
      }

    } catch (error) {
      console.error('❌ Error loading map markers:', error);
    }
  }
  
  // Geocode a location string to coordinates
  async geocodeLocation(location) {
    if (!location || !location.trim()) return null;
    
    try {
      // Use island.js getCityCoordinates if available
      if (window.HiIsland?.getCityCoordinates) {
        const coords = await window.HiIsland.getCityCoordinates(location);
        console.log(`📍 Geocoded "${location}" → ${coords.lat}, ${coords.lng}`);
        return coords;
      }
      
      // Fallback: basic location parsing (US format "City, ST")
      // This ensures map doesn't break if island.js not loaded
      console.warn('⚠️ island.js not loaded, using fallback');
      return this.fallbackGeocode(location);
      
    } catch (error) {
      console.error(`❌ Failed to geocode "${location}":`, error);
      return null;
    }
  }
  
  // Fallback geocoding (simple state-based)
  fallbackGeocode(location) {
    const stateCenters = {
      'CA': { lat: 36.78, lng: -119.42 },
      'NY': { lat: 42.17, lng: -74.95 },
      'TX': { lat: 31.97, lng: -99.90 },
      'FL': { lat: 27.77, lng: -82.64 },
      'WA': { lat: 47.75, lng: -120.74 },
      'Australia': { lat: -25.27, lng: 133.78 },
      'UK': { lat: 52.37, lng: -1.46 },
      'Canada': { lat: 56.13, lng: -106.35 }
    };
    
    // Try to extract state/country from "City, ST" format
    const parts = location.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const state = parts[parts.length - 1];
      if (stateCenters[state]) {
        return stateCenters[state];
      }
      // Check if country name in location
      for (const [key, coords] of Object.entries(stateCenters)) {
        if (location.includes(key)) {
          return coords;
        }
      }
    }
    
    // Default to world center
    return { lat: 20, lng: 0 };
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
