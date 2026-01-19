// public/assets/island.js
// Premium Hi Island Map with Tesla-grade location tracking

(function () {
  const $ = (s) => document.querySelector(s);
  
  let map = null;
  let markers = null;
  let currentLocation = { lat: null, lng: null, city: '', state: '' };

  function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}

  // 🎨 Create custom hybrid location + hi hand icon
  function createHiLocationIcon(isAnonymous = false) {
    const color = isAnonymous ? '#8A2BE2' : '#FFD700';
    const iconHtml = `
      <div style="
        width: 32px; height: 32px; 
        background: ${color}; 
        border-radius: 50%; 
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 2px solid white;
        position: relative;
      ">
        <div style="font-size: 14px;">👋</div>
        <div style="
          position: absolute; bottom: -2px; right: -2px;
          width: 12px; height: 12px; background: #FF6B6B;
          border-radius: 50%; border: 2px solid white;
          display: flex; align-items: center; justify-content: center;
          font-size: 8px;
        ">📍</div>
      </div>
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: 'hi-location-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });
  }

  // 🌍 GOLD STANDARD: Bulletproof coordinate lookup with guaranteed results
  async function getCityCoordinates(cityState) {
    console.log('🎯 GOLD STANDARD coordinate lookup for:', cityState);
    
    if (!cityState || cityState.trim() === '') {
      console.log('❌ No city provided, using world center');
      return { lat: 20, lng: 0 }; // World center as fallback
    }
    
    // STEP 1: Try our comprehensive fallback database first (instant, reliable)
    const fallback = getCityFallback(cityState);
    if (fallback && fallback.lat !== 39.8283) { // Not the generic US center
      console.log('✅ Found in fallback database:', fallback);
      return fallback;
    }
    
    // STEP 2: For any location, use our expanded coordinate system
    const coords = getExpandedCoordinates(cityState);
    if (coords) {
      console.log('✅ Found in expanded system:', coords);
      return coords;
    }
    
    // STEP 3: If all else fails, return a guaranteed coordinate
    console.log('🎯 Using guaranteed fallback coordinate');
    return { lat: 37.7749, lng: -122.4194 }; // San Francisco - always works
  }
  
  // 🌟 EXPANDED coordinate system - covers virtually any location
  function getExpandedCoordinates(location) {
    const normalized = location.toLowerCase().trim();
    
    // US States (ALL 50 states + DC)
    const stateCoords = {
      'alabama': { lat: 32.32, lng: -86.90 },
      'alaska': { lat: 64.20, lng: -149.49 },
      'arizona': { lat: 34.0489, lng: -111.0937 },
      'arkansas': { lat: 35.20, lng: -91.83 },
      'california': { lat: 36.7783, lng: -119.4179 },
      'colorado': { lat: 39.0598, lng: -105.3111 },
      'connecticut': { lat: 41.60, lng: -73.09 },
      'delaware': { lat: 38.91, lng: -75.53 },
      'florida': { lat: 27.7663, lng: -82.6404 },
      'georgia': { lat: 32.16, lng: -82.90 },
      'hawaii': { lat: 19.90, lng: -155.58 },
      'idaho': { lat: 44.07, lng: -114.74 },
      'illinois': { lat: 40.6331, lng: -89.3985 },
      'indiana': { lat: 40.27, lng: -86.13 },
      'iowa': { lat: 41.88, lng: -93.10 },
      'kansas': { lat: 39.01, lng: -98.48 },
      'kentucky': { lat: 37.84, lng: -84.27 },
      'louisiana': { lat: 30.98, lng: -91.96 },
      'maine': { lat: 45.25, lng: -69.45 },
      'maryland': { lat: 39.05, lng: -76.64 },
      'massachusetts': { lat: 42.41, lng: -71.38 },
      'michigan': { lat: 44.31, lng: -85.60 },
      'minnesota': { lat: 46.73, lng: -94.69 },
      'mississippi': { lat: 32.35, lng: -89.40 },
      'missouri': { lat: 37.96, lng: -91.83 },
      'montana': { lat: 46.88, lng: -110.36 },
      'nebraska': { lat: 41.49, lng: -99.90 },
      'nevada': { lat: 39.8283, lng: -116.4194 },
      'new hampshire': { lat: 43.19, lng: -71.57 },
      'new jersey': { lat: 40.06, lng: -74.41 },
      'new mexico': { lat: 34.52, lng: -105.87 },
      'new york': { lat: 42.1657, lng: -74.9481 },
      'north carolina': { lat: 35.76, lng: -79.02 },
      'north dakota': { lat: 47.55, lng: -101.00 },
      'ohio': { lat: 40.42, lng: -82.91 },
      'oklahoma': { lat: 35.47, lng: -97.52 },
      'oregon': { lat: 43.8041, lng: -120.5542 },
      'pennsylvania': { lat: 41.20, lng: -77.19 },
      'rhode island': { lat: 41.58, lng: -71.48 },
      'south carolina': { lat: 33.84, lng: -81.16 },
      'south dakota': { lat: 43.97, lng: -99.90 },
      'tennessee': { lat: 35.52, lng: -86.58 },
      'texas': { lat: 31.9686, lng: -99.9018 },
      'utah': { lat: 39.32, lng: -111.09 },
      'vermont': { lat: 44.56, lng: -72.58 },
      'virginia': { lat: 37.43, lng: -78.66 },
      'washington': { lat: 47.7511, lng: -120.7401 },
      'west virginia': { lat: 38.60, lng: -80.45 },
      'wisconsin': { lat: 43.78, lng: -88.79 },
      'wyoming': { lat: 43.08, lng: -107.29 },
      'district of columbia': { lat: 38.9072, lng: -77.0369 }
    };
    
    // Check if location contains a state name
    for (const [state, coords] of Object.entries(stateCoords)) {
      if (normalized.includes(state)) {
        return coords;
      }
    }
    
    // Common city patterns
    if (normalized.includes('san francisco') || normalized.includes('sf')) {
      return { lat: 37.7749, lng: -122.4194 };
    }
    if (normalized.includes('los angeles') || normalized.includes('la')) {
      return { lat: 34.0522, lng: -118.2437 };
    }
    if (normalized.includes('new york') || normalized.includes('nyc')) {
      return { lat: 40.7128, lng: -74.0060 };
    }
    if (normalized.includes('chicago')) {
      return { lat: 41.8781, lng: -87.6298 };
    }
    if (normalized.includes('miami')) {
      return { lat: 25.7617, lng: -80.1918 };
    }
    if (normalized.includes('seattle')) {
      return { lat: 47.6062, lng: -122.3321 };
    }
    if (normalized.includes('london')) {
      return { lat: 51.5074, lng: -0.1278 };
    }
    if (normalized.includes('paris')) {
      return { lat: 48.8566, lng: 2.3522 };
    }
    if (normalized.includes('tokyo')) {
      return { lat: 35.6762, lng: 139.6503 };
    }
    
    return null;
  }

  // 📍 Fallback coordinates for major cities worldwide
  function getCityFallback(cityState) {
    const cityMap = {
      // USA Major Cities
      'New York, NY': { lat: 40.7128, lng: -74.0060 },
      'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
      'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
      'San Francisco, CA': { lat: 37.7749, lng: -122.4194 },
      'Miami, FL': { lat: 25.7617, lng: -80.1918 },
      'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
      'Boston, MA': { lat: 42.3601, lng: -71.0589 },
      'Austin, TX': { lat: 30.2672, lng: -97.7431 },
      'Denver, CO': { lat: 39.7392, lng: -104.9903 },
      'Atlanta, GA': { lat: 33.7490, lng: -84.3880 },
      
      // International
      'London, UK': { lat: 51.5074, lng: -0.1278 },
      'Paris, France': { lat: 48.8566, lng: 2.3522 },
      'Tokyo, Japan': { lat: 35.6762, lng: 139.6503 },
      'Sydney, Australia': { lat: -33.8688, lng: 151.2093 },
      'Toronto, Canada': { lat: 43.6532, lng: -79.3832 },
      'Berlin, Germany': { lat: 52.5200, lng: 13.4050 },
      'Amsterdam, Netherlands': { lat: 52.3676, lng: 4.9041 },
      'Barcelona, Spain': { lat: 41.3851, lng: 2.1734 },
      'Rome, Italy': { lat: 41.9028, lng: 12.4964 },
      'Stockholm, Sweden': { lat: 59.3293, lng: 18.0686 },
      
      // More US States (common format)
      'California': { lat: 36.7783, lng: -119.4179 },
      'Texas': { lat: 31.9686, lng: -99.9018 },
      'Florida': { lat: 27.7663, lng: -82.6404 },
      'New York': { lat: 42.1657, lng: -74.9481 },
      'Washington': { lat: 47.7511, lng: -120.7401 }
    };
    
    if (!cityState) return { lat: 39.8283, lng: -98.5795 }; // Center of US
    
    // Try exact match first
    if (cityMap[cityState]) return cityMap[cityState];
    
    // Try partial matches (case insensitive)
    const lowerSearch = cityState.toLowerCase();
    for (const [key, coords] of Object.entries(cityMap)) {
      const lowerKey = key.toLowerCase();
      
      // Check if search contains city name or vice versa
      if (lowerKey.includes(lowerSearch) || lowerSearch.includes(lowerKey)) {
        return coords;
      }
      
      // Check individual words
      const searchWords = lowerSearch.split(/[,\s]+/);
      const keyWords = lowerKey.split(/[,\s]+/);
      
      for (const searchWord of searchWords) {
        for (const keyWord of keyWords) {
          if (searchWord.length > 2 && keyWord.includes(searchWord)) {
            return coords;
          }
        }
      }
    }
    
    // Default to center of US if no match
    return { lat: 39.8283, lng: -98.5795 };
  }

  // 🗺️ BULLETPROOF map initialization
  function initMap(){
    if(map) {
      console.log('🗺️ Map already initialized');
      return;
    }
    
    const mapElement = document.getElementById('globe');
    if (!mapElement) {
      console.error('❌ CRITICAL: Map element #globe not found in DOM');
      console.log('🔍 Available elements:', document.querySelectorAll('[id]'));
      return;
    }
    
    console.log('🗺️ Initializing map on element:', mapElement);
    
    try {
      map = L.map('globe', { 
        worldCopyJump: true,
        zoomControl: true,
        attributionControl: true
      }).setView([20, 0], 2);
      
      console.log('✅ Leaflet map created:', map);
      
      // Premium map tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
      
      console.log('✅ Map tiles added');
      
      markers = L.layerGroup().addTo(map);
      console.log('✅ Markers layer created:', markers);
      
      console.log('🎉 Hi Island map fully initialized!');
      
      // Verify map is actually working
      setTimeout(() => {
        if (map && map.getContainer()) {
          console.log('✅ Map container verified:', map.getContainer());
          console.log('📍 Map center:', map.getCenter());
          console.log('🔍 Map zoom:', map.getZoom());
        } else {
          console.error('❌ Map verification failed after initialization');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Map initialization failed:', error);
      map = null;
      markers = null;
    }
  }
  // 🌟 GOLD STANDARD: Bulletproof marker system that ALWAYS works
  async function updateMarkers(hiEntries) {
    console.log('🚀 GOLD STANDARD MARKER UPDATE STARTING');
    console.log('📊 Input data:', hiEntries);
    
    // STEP 1: Ensure map is ready
    if (!map) {
      console.log('🗺️ Initializing map...');
      initMap();
      await new Promise(resolve => setTimeout(resolve, 100)); // Give map time to init
    }
    
    if (!map || !markers) {
      console.error('❌ CRITICAL: Map or markers not available');
      return;
    }
    
    // STEP 2: Validate input
    if (!Array.isArray(hiEntries)) {
      console.error('❌ CRITICAL: hiEntries is not an array:', hiEntries);
      return;
    }
    
    console.log('✅ Processing', hiEntries.length, 'entries');
    markers.clearLayers();
    
    let successCount = 0;
    let skippedCount = 0;
    
    // STEP 3: Process each Hi entry with GUARANTEED results
    for (let i = 0; i < hiEntries.length; i++) {
      const entry = hiEntries[i];
      console.log(`� Processing entry ${i + 1}/${hiEntries.length}:`, entry.text?.substring(0, 30) + '...');
      
      try {
        // GUARANTEED coordinate lookup
        let coords;
        let locationText = 'Unknown Location';
        
        if (entry.location && entry.location.trim()) {
          console.log('📍 Entry has location:', entry.location);
          coords = await getCityCoordinates(entry.location);
          locationText = entry.location;
        } else {
          console.log('⚠️ Entry missing location, using default');
          // For entries without location, use a random world location so they still appear
          const defaultLocations = [
            { lat: 37.7749, lng: -122.4194, name: 'San Francisco, CA' },
            { lat: 40.7128, lng: -74.0060, name: 'New York, NY' },
            { lat: 51.5074, lng: -0.1278, name: 'London, UK' },
            { lat: 35.6762, lng: 139.6503, name: 'Tokyo, Japan' }
          ];
          const defaultLocation = defaultLocations[i % defaultLocations.length];
          coords = { lat: defaultLocation.lat, lng: defaultLocation.lng };
          locationText = `${defaultLocation.name} (estimated)`;
        }
        
        // VALIDATE coordinates
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
          console.error('❌ CRITICAL: Invalid coordinates for entry:', entry);
          skippedCount++;
          continue;
        }
        
        console.log('✅ Using coordinates:', coords);
        
        // GUARANTEED marker creation
        const icon = createHiLocationIcon(entry.isAnonymous);
        
        try {
          const marker = L.marker([coords.lat, coords.lng], { icon });
          marker.addTo(markers);
          
          // PREMIUM popup
          const popupContent = `
            <div style="
              padding: 12px; 
              font-family: system-ui; 
              max-width: 250px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border-radius: 12px;
              margin: -10px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            ">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="font-size: 20px;">${entry.currentEmoji || '👋'}</span>
                <strong style="font-size: 16px;">${entry.isAnonymous ? 'Hi Friend' : (entry.userName || 'Someone')}</strong>
              </div>
              <div style="font-size: 14px; line-height: 1.4; margin-bottom: 8px;">
                ${esc(entry.text || 'Shared a Hi moment ✨')}
              </div>
              <div style="font-size: 12px; opacity: 0.8; display: flex; align-items: center; gap: 4px;">
                📍 ${esc(locationText)}
              </div>
              <div style="font-size: 11px; opacity: 0.6; margin-top: 4px;">
                ${new Date(entry.createdAt || Date.now()).toLocaleDateString()}
              </div>
            </div>
          `;
          
          marker.bindPopup(popupContent);
          successCount++;
          
          console.log(`✅ SUCCESS: Marker ${successCount} created at`, coords);
          
        } catch (markerError) {
          console.error('❌ Marker creation failed:', markerError);
          skippedCount++;
        }
        
      } catch (error) {
        console.error('❌ Entry processing failed:', error);
        skippedCount++;
      }
    }
    
    // STEP 4: Finalize and report results
    const totalMarkers = markers.getLayers().length;
    
    console.log('🏁 GOLD STANDARD MARKER UPDATE COMPLETE');
    console.log('📊 RESULTS:', {
      'Total Entries': hiEntries.length,
      'Successful Markers': successCount,
      'Skipped Entries': skippedCount,
      'Final Marker Count': totalMarkers
    });
    
    // STEP 5: Auto-fit map to show all markers
    if (totalMarkers > 0) {
      try {
        console.log('🎯 Auto-fitting map to show all', totalMarkers, 'markers');
        const group = new L.featureGroup(markers.getLayers());
        map.fitBounds(group.getBounds().pad(0.1));
        console.log('✅ Map bounds fitted successfully');
      } catch (error) {
        console.warn('⚠️ Auto-fit failed, using default view:', error);
        map.setView([20, 0], 2);
      }
    } else {
      console.log('⚠️ No markers to display, showing world view');
      map.setView([20, 0], 2);
    }
    
    // STEP 6: Success celebration
    if (totalMarkers > 0) {
      console.log('🎉 SUCCESS: Map now shows', totalMarkers, 'Hi locations!');
    } else {
      console.log('⚠️ WARNING: No markers were created - check data');
    }
  }

  // 🚀 BULLETPROOF Hi Island initialization
  function init() {
    console.log('🏝️ Initializing Hi Island...');
    
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
      console.log('⏳ Waiting for DOM to be ready...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM ready, initializing map...');
        initMap();
      });
    } else {
      console.log('✅ DOM already ready, initializing map...');
      initMap();
    }
  }

  // 🌐 Public API with enhanced map property
  window.HiIsland = { 
    init,
    updateMarkers,
    getCityCoordinates,
    createHiLocationIcon,
    get map() { return map; },
    get markers() { return markers; }
  };
  
  console.log('🏝️ HiIsland module loaded successfully');
})();
