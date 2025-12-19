// ===================================================================
// 🗺️ HI ISLAND MAP COMPONENT
// Isolated Leaflet map with hand emoji pins for Hi shares
// ===================================================================

class HiIslandMap {
  constructor(rootElement) {
    this.root = rootElement;
    this.map = null;
    this.markers = [];
    this.markerCluster = null; // 🆕 Cluster group for Tesla-grade scaling
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
    
    // 🔧 Expose globally for debugging
    window.HiIslandMapInstance = this;
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
    console.log('🔍 [Hi-Island Map] Drop button search result:', {
      found: !!dropBtn,
      buttonElement: dropBtn,
      rootHTML: this.root.innerHTML.substring(0, 200) + '...'
    });
    
    if (dropBtn) {
      console.log('✅ [Hi-Island Map] Drop button found, attaching click listener');
      dropBtn.addEventListener('click', () => {
        console.log('🏝️ [Hi-Island] Drop a Hi button clicked!');
        // Open share sheet with hi-island origin
        if (window.openHiShareSheet) {
          console.log('✅ Opening Hi-Island share sheet...');
          window.openHiShareSheet('hi-island');
        } else {
          console.error('❌ Share sheet not initialized - window.openHiShareSheet not found');
          console.log('🔍 Available globals:', Object.keys(window).filter(k => k.includes('Hi')));
        }
      });
    } else {
      console.error('❌ [Hi-Island Map] Drop button #hi-map-drop-btn NOT FOUND in DOM');
      console.log('🔍 Available elements in root:', {
        allButtons: this.root.querySelectorAll('button'),
        allElements: this.root.children,
        rootOuterHTML: this.root.outerHTML.substring(0, 300) + '...'
      });
    }
  }

  // Wait for Leaflet to be available
  waitForLeaflet() {
    return new Promise((resolve) => {
      const checkDependencies = () => {
        if (typeof L !== 'undefined' && typeof L.markerClusterGroup === 'function') {
          console.log('✅ Leaflet and MarkerCluster dependencies ready');
          resolve();
        } else {
          console.log('⏳ Waiting for Leaflet dependencies...', {
            leaflet: typeof L !== 'undefined',
            markerCluster: typeof L !== 'undefined' ? typeof L.markerClusterGroup === 'function' : false
          });
          setTimeout(checkDependencies, 100);
        }
      };
      checkDependencies();
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

      // 🆕 Initialize marker cluster group for Tesla-grade scaling
      if (!L.markerClusterGroup) {
        throw new Error('Leaflet MarkerCluster plugin not loaded! Please include leaflet.markercluster.js');
      }
      
      this.markerCluster = L.markerClusterGroup({
        maxClusterRadius: 80, // Cluster markers within 80px
        spiderfyOnMaxZoom: true, // Spread out markers at max zoom
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          // Custom cluster icon with count
          return L.divIcon({
            html: `<div class="hi-cluster-icon">
              <span class="hi-cluster-count">${count}</span>
              <span class="hi-cluster-emoji">👋</span>
            </div>`,
            className: 'hi-cluster-marker',
            iconSize: L.point(50, 50)
          });
        }
      });
      
      this.map.addLayer(this.markerCluster);

      this.mapInitialized = true;
      console.log('✅ Hi Island Map initialized with clustering');

      // Setup share listener for live updates
      this.setupShareListener();

      // Load markers after map is ready
      setTimeout(() => this.loadMarkers(), 500);

    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  }

  // Load markers from live shares (unified with feed)
  async loadMarkers() {
    console.log('🔍 Loading markers from live shares...');
    
    if (!this.map) {
      console.error('❌ Map not initialized yet');
      return;
    }

    try {
      // 🎯 WOZ GRADE: Use same query as General tab feed
      const sb = await this.getSupabaseClient();
      if (!sb) {
        console.error('❌ Supabase client not available');
        return;
      }
      
      console.log('📡 Querying public_shares for map markers...');
      
      // Query public + anonymous shares with location data (with profile JOIN like feed does)
      const { data: shares, error } = await sb
        .from('public_shares')
        .select(`
          id,
          content,
          current_emoji,
          desired_emoji,
          location,
          created_at,
          is_public,
          is_anonymous,
          origin,
          username,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .or('is_public.eq.true,is_anonymous.eq.true')
        .not('location', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) {
        console.error('❌ Failed to load shares for map:', error);
        return;
      }
      
      // Clear existing markers
      this.clearMarkers();

      console.log(`🗺️ Received ${shares?.length || 0} shares with location data`);
      
      // Add markers from shares
      let markersAdded = 0;
      const bounds = [];
      
      if (shares && shares.length > 0) {
        for (const share of shares) {
          try {
            // 🎯 FIX: Use location STRING field and geocode it
            const locationString = share.location;
            
            if (locationString) {
              // Geocode the location string to get coordinates
              const coords = await this.geocodeLocation(locationString);
              
              if (coords) {
                const { lat, lng } = coords;
                
                // Transform share to map marker format
                const markerData = {
                  id: share.id,
                  text: share.content,
                  currentEmoji: share.current_emoji || '👋',
                  desiredEmoji: share.desired_emoji || '✨',
                  userName: share.is_anonymous ? 'Anonymous' : (share.profiles?.display_name || share.username || 'Hi Member'),
                  isAnonymous: share.is_anonymous,
                  location: locationString,
                  origin: share.origin || 'hi5',
                  createdAt: share.created_at
                };
                
                this.addMarkerAt(lat, lng, markerData);
                bounds.push([lat, lng]);
                markersAdded++;
              } else {
                console.warn('⚠️ Could not geocode location:', locationString);
              }
            }
          } catch (err) {
            console.warn('⚠️ Failed to process share for map:', err);
          }
        }
        
        console.log(`✅ Added ${markersAdded} markers from database`);
        
        // Auto-fit map to show all markers
        if (bounds.length > 0) {
          const leafletBounds = L.latLngBounds(bounds);
          this.map.fitBounds(leafletBounds, {
            padding: [50, 50],
            maxZoom: 8 // Don't zoom in too close
          });
          console.log(`🗺️ Map fitted to ${bounds.length} marker positions`);
        }
      }
      
      // 🌱 Initialize seed data if no real markers were added
      const shouldInitializeSeed = markersAdded === 0;
      
      if (shouldInitializeSeed) {
        console.log('💡 Initializing seed data because no real database markers were added', {
          databaseSharesTotal: shares?.length || 0,
          successfullyGeocodedMarkers: markersAdded
        });
        
        try {
          await this.initializeSeedData();
          console.log('✅ Seed data initialization completed');
          
        } catch (error) {
          console.error('❌ Seed data initialization failed:', error);
        }
      } else {
        console.log('🎯 Skipping seed data - using real database markers', {
          databaseShares: shares?.length || 0,
          geocodedMarkers: markersAdded
        });
      }
      
      // Final marker count
      const finalMarkerCount = this.markerCluster.getLayers().length;
      console.log(`🏁 Final map state: ${finalMarkerCount} total markers displayed`);
      
      // Show helpful popup if still no markers
      if (finalMarkerCount === 0) {
        const messagePopup = L.popup()
          .setLatLng([20, 0])
          .setContent(`
            <div style="text-align: center; padding: 10px;">
              <h3>🌍 Hi Island</h3>
              <p>Share a Hi moment to see it appear on the map!</p>
              <small>Create location-enabled shares to populate the map</small>
            </div>
          `)
          .openOn(this.map);
      }
      
    } catch (error) {
      console.error('❌ Error loading map markers:', error);
      console.error('Error details:', error.stack);
      this.showEmptyMapMessage();
    }
  }
  
  // Get Supabase client
  async getSupabaseClient() {
    return (
      window.HiSupabase?.getClient?.() ||
      window.hiSupabase ||
      window.supabaseClient ||
      window.sb ||
      window.__HI_SUPABASE_CLIENT ||
      null
    );
  }
  
  // Show empty map message
  showEmptyMapMessage() {
    if (!this.map) return;
    
    const messagePopup = L.popup()
      .setLatLng([20, 0])
      .setContent(`
        <div style="text-align: center; padding: 10px;">
          <h3>🌍 Hi Island</h3>
          <p>Share a Hi moment with location to see it on the map!</p>
          <small>Shares with location data will appear as markers</small>
        </div>
      `)
      .openOn(this.map);
  }

  // Listen for new shares and refresh map
  setupShareListener() {
    window.addEventListener('share:created', async (event) => {
      const detail = event.detail || {};
      
      // Only refresh if share has location
      if (detail.location || detail.locationData) {
        console.log('🗺️ New share with location detected, refreshing map...');
        
        // Small delay to allow database to update
        setTimeout(() => {
          this.loadMarkers();
        }, 1000);
      }
    });
    
    console.log('✅ Map share listener active');
  }
  
  // 🌟 TESLA-GRADE: Initialize seed data for map display
  async initializeSeedData() {
    console.log('🌱 Initializing Tesla-grade seed data for Hi Island map...');
    
    // Check if seed markers already exist to prevent duplicates
    const existingMarkers = this.markerCluster.getLayers();
    const hasSeedMarkers = existingMarkers.some(marker => {
      const popup = marker.getPopup();
      const content = popup ? popup.getContent() : '';
      return content.includes('NYC Explorer') || 
             content.includes('Bay Area Dreamer') || 
             content.includes('London Walker') || 
             content.includes('Tokyo Wanderer') || 
             content.includes('Sydney Surfer');
    });
    
    if (hasSeedMarkers) {
      console.log('🌱 Seed markers already exist - skipping seed data initialization');
      return;
    }
    
    const seedShares = [
      {
        id: 'seed_nyc_' + Date.now(),
        currentEmoji: '🗽',
        desiredEmoji: '✨',
        text: 'Grateful for this beautiful city and all the connections it brings! 🏙️',
        userName: 'NYC Explorer',
        isAnonymous: false,
        location: 'New York, NY',
        origin: 'hi5',
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: 'seed_sf_' + Date.now(),
        currentEmoji: '🌉',
        desiredEmoji: '🌟',
        text: 'Just witnessed the most incredible sunset over the Golden Gate Bridge!',
        userName: 'Bay Area Dreamer',
        isAnonymous: false,
        location: 'San Francisco, CA',
        origin: 'hi5',
        createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },
      {
        id: 'seed_london_' + Date.now(),
        currentEmoji: '🇬🇧',
        desiredEmoji: '💫',
        text: 'Tea time in Hyde Park - finding peace in the simple moments.',
        userName: 'London Walker',
        isAnonymous: false,
        location: 'London, UK',
        origin: 'hi5',
        createdAt: new Date(Date.now() - 259200000).toISOString() // 3 days ago
      },
      {
        id: 'seed_tokyo_' + Date.now(),
        currentEmoji: '🏮',
        desiredEmoji: '🌸',
        text: 'Cherry blossoms remind me that beauty is temporary and precious.',
        userName: 'Tokyo Wanderer',
        isAnonymous: false,
        location: 'Tokyo, Japan',
        origin: 'hi5',
        createdAt: new Date(Date.now() - 345600000).toISOString() // 4 days ago
      },
      {
        id: 'seed_sydney_' + Date.now(),
        currentEmoji: '🏄‍♂️',
        desiredEmoji: '🌊',
        text: 'Morning surf session at Bondi Beach - nature\'s therapy session!',
        userName: 'Sydney Surfer',
        isAnonymous: false,
        location: 'Sydney, Australia',
        origin: 'hi5',
        createdAt: new Date(Date.now() - 432000000).toISOString() // 5 days ago
      }
    ];

    try {
      // Add seed data to database if hiDB is available
      if (window.hiDB && window.hiDB.insertPublicShare) {
        for (const share of seedShares) {
          try {
            await window.hiDB.insertPublicShare({
              currentEmoji: share.currentEmoji,
              desiredEmoji: share.desiredEmoji,
              text: share.text,
              isAnonymous: share.isAnonymous,
              location: share.location,
              isPublic: true,
              origin: share.origin,
              type: 'self_hi5'
            });
            console.log(`✅ Added seed share: ${share.location}`);
          } catch (error) {
            // Silently continue if share already exists
            console.log(`📝 Seed share exists: ${share.location}`);
          }
        }
      }

      // Immediately display markers from seed data
      console.log('🗺️ Creating markers from seed data...');
      let markersAdded = 0;
      const bounds = [];

      for (const share of seedShares) {
        try {
          const coords = await this.geocodeLocation(share.location);
          if (coords && coords.lat && coords.lng) {
            console.log(`📍 Adding marker at ${coords.lat}, ${coords.lng} for ${share.location}`);
            this.addMarkerAt(coords.lat, coords.lng, share);
            bounds.push([coords.lat, coords.lng]);
            markersAdded++;
          } else {
            console.warn(`⚠️ Failed to get coordinates for ${share.location}`);
          }
        } catch (error) {
          console.error(`❌ Error processing ${share.location}:`, error);
        }
      }

      console.log(`🌍 Successfully added ${markersAdded}/${seedShares.length} seed markers to map`);

      // Fit map to show all seed markers
      if (bounds.length > 0) {
        const leafletBounds = L.latLngBounds(bounds);
        this.map.fitBounds(leafletBounds, {
          padding: [50, 50],
          maxZoom: 3 // Global view to show all continents
        });
        console.log('🗺️ Map fitted to show all seed markers');
      } else {
        console.warn('⚠️ No valid coordinates found - map will show default view');
      }

    } catch (error) {
      console.error('❌ Error initializing seed data:', error);
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
  
  // Fallback geocoding (comprehensive city/country lookup)
  fallbackGeocode(location) {
    const locationMap = {
      // Major cities (exact matches)
      'New York, NY': { lat: 40.7128, lng: -74.0060 },
      'San Francisco, CA': { lat: 37.7749, lng: -122.4194 },
      'London, UK': { lat: 51.5074, lng: -0.1278 },
      'Tokyo, Japan': { lat: 35.6762, lng: 139.6503 },
      'Sydney, Australia': { lat: -33.8688, lng: 151.2093 },
      
      // State/Country patterns
      'CA': { lat: 36.78, lng: -119.42 },
      'NY': { lat: 42.17, lng: -74.95 },
      'TX': { lat: 31.97, lng: -99.90 },
      'FL': { lat: 27.77, lng: -82.64 },
      'WA': { lat: 47.75, lng: -120.74 },
      'Australia': { lat: -25.27, lng: 133.78 },
      'UK': { lat: 52.37, lng: -1.46 },
      'Canada': { lat: 56.13, lng: -106.35 },
      'Japan': { lat: 36.2048, lng: 138.2529 }
    };
    
    // Try exact match first
    if (locationMap[location]) {
      console.log(`🎯 Exact match for "${location}"`);
      return locationMap[location];
    }
    
    // Try partial matches
    for (const [key, coords] of Object.entries(locationMap)) {
      if (location.toLowerCase().includes(key.toLowerCase())) {
        console.log(`🎯 Partial match: "${location}" → "${key}"`);
        return coords;
      }
    }
    
    // Try to extract state/country from "City, ST" format
    const parts = location.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const state = parts[parts.length - 1];
      if (locationMap[state]) {
        console.log(`🎯 State/Country match: "${location}" → "${state}"`);
        return locationMap[state];
      }
    }
    
    console.warn(`⚠️ No geocoding match for "${location}" - using world center`);
    return { lat: 20, lng: 0 };
  }

  // Add marker at specific coordinates (with deduplication)
  addMarkerAt(lat, lng, share) {
    if (!this.map) return;
    
    // Check for duplicate location (within 0.01 degree tolerance)
    const existingMarkers = this.markerCluster.getLayers();
    const isDuplicate = existingMarkers.some(existing => {
      const existingPos = existing.getLatLng();
      const latDiff = Math.abs(existingPos.lat - lat);
      const lngDiff = Math.abs(existingPos.lng - lng);
      return latDiff < 0.01 && lngDiff < 0.01;
    });
    
    if (isDuplicate) {
      console.warn(`⚠️ Skipping duplicate marker at [${lat}, ${lng}] for share: ${share.id || 'unknown'}`);
      return;
    }

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
    
    // 🆕 Add to cluster instead of directly to map
    this.markerCluster.addLayer(marker);

    this.markers.push(marker);
    
    console.log(`📍 Marker #${this.markers.length} added at [${lat.toFixed(4)}, ${lng.toFixed(4)}] - ${share.location}`);
  }

  // Clear all markers
  clearMarkers() {
    if (this.markerCluster) {
      console.log(`🧹 Clearing ${this.markerCluster.getLayers().length} existing markers`);
      this.markerCluster.clearLayers();
    }
    if (this.markers) {
      this.markers.forEach(marker => marker.remove());
      this.markers = [];
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
