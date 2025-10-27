/**
 * Tesla-Grade Global Location System
 * Handles worldwide location detection and manual setup
 * Privacy-first with smart fallbacks and international support
 */
(function() {
  'use strict';

  class TeslaLocationManager {
    constructor() {
      this.locationData = {
        city: null,
        state: null,
        country: null,
        countryCode: null,
        timezone: null,
        coordinates: null,
        source: null, // 'auto', 'manual', 'browser'
        accuracy: null,
        lastUpdated: null
      };
      
      this.isDetecting = false;
      this.fallbackServices = [
        'ipapi.co',
        'ipgeolocation.io',
        'ip-api.com'
      ];
    }

    // Initialize location system
    async init() {
      console.log('🌍 Initializing Tesla Location System...');
      
      // Load saved location first
      this.loadSavedLocation();
      
      // Show current status
      this.displayLocationStatus();
      
      // Set up UI handlers
      this.setupLocationUI();
      
      console.log('✅ Tesla Location System ready');
    }

    // Auto-detect location with multiple fallbacks
    async detectLocation(useHighAccuracy = false) {
      if (this.isDetecting) return;
      
      this.isDetecting = true;
      this.showLocationDetecting();
      
      try {
        console.log('🎯 Starting location detection...');
        
        // Method 1: Browser Geolocation API (most accurate)
        let result = await this.tryBrowserGeolocation(useHighAccuracy);
        
        if (!result) {
          // Method 2: IP-based location services
          result = await this.tryIPLocationServices();
        }
        
        if (!result) {
          // Method 3: Timezone-based guess
          result = await this.tryTimezoneLocation();
        }
        
        if (result) {
          console.log('✅ Location detected:', result);
          this.updateLocation(result);
          this.showLocationSuccess('Location detected successfully!');
        } else {
          console.log('⚠️ Auto-detection failed, showing manual setup');
          this.showManualLocationSetup();
        }
        
      } catch (error) {
        console.error('❌ Location detection failed:', error);
        this.showManualLocationSetup();
      } finally {
        this.isDetecting = false;
      }
    }

    // Browser geolocation with smart options
    async tryBrowserGeolocation(highAccuracy = false) {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          console.log('⚠️ Browser geolocation not available');
          resolve(null);
          return;
        }

        const options = {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 30000 : 10000,
          maximumAge: highAccuracy ? 0 : 300000 // 5 minutes
        };

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude, accuracy } = position.coords;
              console.log(`📍 GPS coordinates: ${latitude}, ${longitude} (±${accuracy}m)`);
              
              // Reverse geocode coordinates to get address
              const location = await this.reverseGeocode(latitude, longitude);
              
              if (location) {
                resolve({
                  ...location,
                  coordinates: { latitude, longitude },
                  accuracy,
                  source: 'browser'
                });
              } else {
                resolve(null);
              }
              
            } catch (error) {
              console.error('❌ Reverse geocoding failed:', error);
              resolve(null);
            }
          },
          (error) => {
            console.log(`⚠️ Browser geolocation failed: ${error.message}`);
            resolve(null);
          },
          options
        );
      });
    }

    // Reverse geocode coordinates to human-readable address
    async reverseGeocode(lat, lon) {
      try {
        // Use multiple services for reliability
        const services = [
          {
            name: 'OpenStreetMap Nominatim',
            url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
            parser: this.parseNominatimResponse
          },
          {
            name: 'BigDataCloud',
            url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
            parser: this.parseBigDataCloudResponse
          }
        ];

        for (const service of services) {
          try {
            console.log(`🔍 Trying ${service.name}...`);
            const response = await fetch(service.url);
            const data = await response.json();
            
            const parsed = service.parser(data);
            if (parsed && parsed.city && parsed.country) {
              console.log(`✅ ${service.name} successful:`, parsed);
              return parsed;
            }
            
          } catch (error) {
            console.log(`⚠️ ${service.name} failed:`, error.message);
          }
        }

        return null;
        
      } catch (error) {
        console.error('❌ Reverse geocoding failed:', error);
        return null;
      }
    }

    // Parse Nominatim (OpenStreetMap) response
    parseNominatimResponse(data) {
      if (!data || !data.address) return null;
      
      const addr = data.address;
      
      return {
        city: addr.city || addr.town || addr.village || addr.hamlet || addr.suburb,
        state: addr.state || addr.region || addr.province,
        country: addr.country,
        countryCode: addr.country_code?.toUpperCase(),
        timezone: null // Will be detected separately
      };
    }

    // Parse BigDataCloud response
    parseBigDataCloudResponse(data) {
      if (!data) return null;
      
      return {
        city: data.city || data.locality,
        state: data.principalSubdivision || data.principalSubdivisionCode,
        country: data.countryName,
        countryCode: data.countryCode?.toUpperCase(),
        timezone: null
      };
    }

    // IP-based location detection with multiple services
    async tryIPLocationServices() {
      const services = [
        {
          name: 'IPApi.co',
          url: 'https://ipapi.co/json/',
          parser: (data) => ({
            city: data.city,
            state: data.region,
            country: data.country_name,
            countryCode: data.country_code?.toUpperCase(),
            timezone: data.timezone
          })
        },
        {
          name: 'IP-API.com',
          url: 'http://ip-api.com/json/',
          parser: (data) => ({
            city: data.city,
            state: data.regionName,
            country: data.country,
            countryCode: data.countryCode?.toUpperCase(),
            timezone: data.timezone
          })
        }
      ];

      for (const service of services) {
        try {
          console.log(`🌐 Trying ${service.name}...`);
          
          const response = await fetch(service.url);
          const data = await response.json();
          
          const location = service.parser(data);
          
          if (location && location.city && location.country) {
            console.log(`✅ ${service.name} successful:`, location);
            return {
              ...location,
              source: 'ip',
              accuracy: 'city'
            };
          }
          
        } catch (error) {
          console.log(`⚠️ ${service.name} failed:`, error.message);
        }
      }

      return null;
    }

    // Timezone-based location guess (last resort)
    async tryTimezoneLocation() {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(`🕐 Detected timezone: ${timezone}`);
        
        // Simple timezone to region mapping
        const timezoneMap = {
          'America/New_York': { city: 'New York', state: 'New York', country: 'United States', countryCode: 'US' },
          'America/Los_Angeles': { city: 'Los Angeles', state: 'California', country: 'United States', countryCode: 'US' },
          'America/Chicago': { city: 'Chicago', state: 'Illinois', country: 'United States', countryCode: 'US' },
          'Europe/London': { city: 'London', state: 'England', country: 'United Kingdom', countryCode: 'GB' },
          'Europe/Paris': { city: 'Paris', state: 'Île-de-France', country: 'France', countryCode: 'FR' },
          'Europe/Berlin': { city: 'Berlin', state: 'Berlin', country: 'Germany', countryCode: 'DE' },
          'Asia/Tokyo': { city: 'Tokyo', state: 'Tokyo', country: 'Japan', countryCode: 'JP' },
          'Asia/Shanghai': { city: 'Shanghai', state: 'Shanghai', country: 'China', countryCode: 'CN' },
          'Australia/Sydney': { city: 'Sydney', state: 'New South Wales', country: 'Australia', countryCode: 'AU' }
        };

        const location = timezoneMap[timezone];
        
        if (location) {
          console.log('✅ Timezone-based location guess:', location);
          return {
            ...location,
            timezone,
            source: 'timezone',
            accuracy: 'region'
          };
        }

        return null;
        
      } catch (error) {
        console.error('❌ Timezone detection failed:', error);
        return null;
      }
    }

    // Manual location setup with intelligent search
    showManualLocationSetup() {
      this.hideLocationDetecting();
      
      // Create manual setup modal
      const modal = this.createLocationModal();
      document.body.appendChild(modal);
      
      // Focus on city input
      setTimeout(() => {
        const cityInput = modal.querySelector('#manualCity');
        if (cityInput) cityInput.focus();
      }, 100);
    }

    // Create location setup modal
    createLocationModal() {
      const modal = document.createElement('div');
      modal.className = 'tesla-location-modal';
      modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>🌍 Set Your Location</h2>
            <button class="close-btn" onclick="this.closest('.tesla-location-modal').remove()">×</button>
          </div>
          
          <div class="modal-body">
            <p class="location-explanation">
              Help others discover Hi! moments in your area by setting your general location.
              <strong>We only store city-level information</strong> - no precise coordinates.
            </p>
            
            <div class="location-form">
              <div class="form-group">
                <label for="manualCity">City / Town *</label>
                <input type="text" id="manualCity" placeholder="e.g., San Francisco, London, Tokyo" required>
                <div class="input-help">Enter your city or town name</div>
              </div>
              
              <div class="form-group">
                <label for="manualState">State / Province / Region</label>
                <input type="text" id="manualState" placeholder="e.g., California, England, Tokyo Prefecture">
                <div class="input-help">Optional: State, province, or region</div>
              </div>
              
              <div class="form-group">
                <label for="manualCountry">Country *</label>
                <input type="text" id="manualCountry" placeholder="e.g., United States, United Kingdom, Japan" required>
                <div class="input-help">Your country name</div>
              </div>
              
              <div class="privacy-note">
                <div class="privacy-icon">🔒</div>
                <div class="privacy-text">
                  <strong>Privacy Protection:</strong> We only store general location (city/country level).
                  Your exact coordinates are never saved or shared.
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" onclick="this.closest('.tesla-location-modal').remove()">
              Skip for Now
            </button>
            <button class="btn-primary" onclick="window.teslaLocation.saveManualLocation()">
              💾 Save Location
            </button>
            <button class="btn-detect" onclick="window.teslaLocation.retryAutoDetection()">
              📍 Try Auto-Detect Again
            </button>
          </div>
        </div>
      `;
      
      // Add styles
      this.addLocationModalStyles();
      
      return modal;
    }

    // Save manually entered location
    async saveManualLocation() {
      const modal = document.querySelector('.tesla-location-modal');
      if (!modal) return;
      
      const city = modal.querySelector('#manualCity').value.trim();
      const state = modal.querySelector('#manualState').value.trim();
      const country = modal.querySelector('#manualCountry').value.trim();
      
      if (!city || !country) {
        this.showLocationError('Please enter at least a city and country');
        return;
      }
      
      // Validate and format the location
      const location = {
        city: this.formatLocationName(city),
        state: state ? this.formatLocationName(state) : null,
        country: this.formatLocationName(country),
        countryCode: await this.getCountryCode(country),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        source: 'manual',
        accuracy: 'manual',
        lastUpdated: new Date().toISOString()
      };
      
      // Save location
      this.updateLocation(location);
      
      // Close modal
      modal.remove();
      
      this.showLocationSuccess('Location saved successfully! 📍');
    }

    // Retry auto-detection
    async retryAutoDetection() {
      const modal = document.querySelector('.tesla-location-modal');
      if (modal) modal.remove();
      
      await this.detectLocation(true); // Use high accuracy
    }

    // Format location names consistently
    formatLocationName(name) {
      return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Get country code from country name
    async getCountryCode(countryName) {
      const countryMap = {
        'united states': 'US',
        'usa': 'US',
        'america': 'US',
        'united kingdom': 'GB',
        'uk': 'GB',
        'england': 'GB',
        'britain': 'GB',
        'japan': 'JP',
        'china': 'CN',
        'france': 'FR',
        'germany': 'DE',
        'australia': 'AU',
        'canada': 'CA',
        'brazil': 'BR',
        'india': 'IN',
        'mexico': 'MX',
        'italy': 'IT',
        'spain': 'ES',
        'russia': 'RU',
        'south korea': 'KR',
        'netherlands': 'NL',
        'sweden': 'SE',
        'norway': 'NO',
        'denmark': 'DK',
        'finland': 'FI',
        'switzerland': 'CH',
        'austria': 'AT',
        'belgium': 'BE',
        'portugal': 'PT',
        'ireland': 'IE',
        'poland': 'PL',
        'czech republic': 'CZ',
        'hungary': 'HU',
        'greece': 'GR',
        'turkey': 'TR',
        'south africa': 'ZA',
        'argentina': 'AR',
        'chile': 'CL',
        'colombia': 'CO',
        'peru': 'PE',
        'thailand': 'TH',
        'vietnam': 'VN',
        'singapore': 'SG',
        'malaysia': 'MY',
        'indonesia': 'ID',
        'philippines': 'PH',
        'new zealand': 'NZ',
        'israel': 'IL',
        'egypt': 'EG',
        'saudi arabia': 'SA',
        'uae': 'AE',
        'united arab emirates': 'AE'
      };
      
      const normalized = countryName.toLowerCase();
      return countryMap[normalized] || null;
    }

    // Update location data
    updateLocation(locationData) {
      this.locationData = {
        ...this.locationData,
        ...locationData,
        lastUpdated: new Date().toISOString()
      };
      
      // Save to storage
      this.saveLocationData();
      
      // Update UI
      this.displayLocationStatus();
      
      // Update profile if user is authenticated
      this.updateProfileLocation();
      
      console.log('✅ Location updated:', this.locationData);
    }

    // Save location to localStorage
    saveLocationData() {
      try {
        localStorage.setItem('teslaLocation', JSON.stringify(this.locationData));
      } catch (error) {
        console.error('Failed to save location data:', error);
      }
    }

    // Load saved location
    loadSavedLocation() {
      try {
        const saved = localStorage.getItem('teslaLocation');
        if (saved) {
          this.locationData = JSON.parse(saved);
          console.log('📍 Loaded saved location:', this.locationData);
        }
      } catch (error) {
        console.error('Failed to load saved location:', error);
      }
    }

    // Update profile location in database
    async updateProfileLocation() {
      if (!window.supabaseClient) return;
      
      try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;
        
        const locationString = this.formatLocationString();
        
        const { error } = await window.supabaseClient
          .from('profiles')
          .update({
            location: locationString,
            location_city: this.locationData.city,
            location_state: this.locationData.state,
            location_country: this.locationData.country,
            location_country_code: this.locationData.countryCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);
        
        if (error) {
          console.error('Failed to update profile location:', error);
        } else {
          console.log('✅ Profile location updated');
        }
        
      } catch (error) {
        console.error('Failed to update profile location:', error);
      }
    }

    // Format location for display
    formatLocationString() {
      const parts = [];
      
      if (this.locationData.city) parts.push(this.locationData.city);
      if (this.locationData.state) parts.push(this.locationData.state);
      if (this.locationData.country) parts.push(this.locationData.country);
      
      return parts.join(', ');
    }

    // Display current location status
    displayLocationStatus() {
      const statusElement = document.getElementById('locationStatus');
      if (!statusElement) return;
      
      if (this.hasValidLocation()) {
        const locationString = this.formatLocationString();
        statusElement.innerHTML = `
          <div class="location-display">
            <span class="location-icon">📍</span>
            <span class="location-text">${locationString}</span>
            <button class="location-edit-btn" onclick="window.teslaLocation.showManualLocationSetup()">
              ✏️ Edit
            </button>
            <button class="location-privacy-btn" onclick="window.teslaLocationPrivacy?.showPrivacySettings()" title="Privacy Settings">
              🔒
            </button>
          </div>
        `;
        statusElement.className = 'location-status active';
      } else {
        statusElement.innerHTML = `
          <div class="location-prompt">
            <span class="location-icon">📍</span>
            <span class="location-text">Set your location to share Hi! moments</span>
            <button class="location-setup-btn" onclick="window.teslaLocation.detectLocation()">
              🎯 Detect Location
            </button>
          </div>
        `;
        statusElement.className = 'location-status inactive';
      }
    }

    // Check if we have a valid location
    hasValidLocation() {
      return this.locationData.city && this.locationData.country;
    }

    // Setup location UI handlers
    setupLocationUI() {
      // Create location status element if it doesn't exist
      if (!document.getElementById('locationStatus')) {
        this.createLocationStatusElement();
      }
    }

    // Create location status element
    createLocationStatusElement() {
      const container = document.querySelector('.profile-info, .user-info, .location-container');
      if (!container) return;
      
      const statusElement = document.createElement('div');
      statusElement.id = 'locationStatus';
      statusElement.className = 'location-status';
      
      container.appendChild(statusElement);
    }

    // UI feedback methods
    showLocationDetecting() {
      const statusElement = document.getElementById('locationStatus');
      if (statusElement) {
        statusElement.innerHTML = `
          <div class="location-detecting">
            <span class="location-spinner">🔄</span>
            <span class="location-text">Detecting your location...</span>
          </div>
        `;
        statusElement.className = 'location-status detecting';
      }
    }

    hideLocationDetecting() {
      this.displayLocationStatus();
    }

    showLocationSuccess(message) {
      if (window.showTeslaToast) {
        window.showTeslaToast(message, 'success');
      } else {
        console.log('✅', message);
      }
    }

    showLocationError(message) {
      if (window.showTeslaToast) {
        window.showTeslaToast(message, 'error');
      } else {
        console.error('❌', message);
      }
    }

    // Add modal styles
    addLocationModalStyles() {
      if (document.getElementById('tesla-location-styles')) return;
      
      const styles = document.createElement('style');
      styles.id = 'tesla-location-styles';
      styles.textContent = `
        .tesla-location-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui;
        }
        
        .tesla-location-modal .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
        }
        
        .tesla-location-modal .modal-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .tesla-location-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #eee;
        }
        
        .tesla-location-modal .modal-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
        }
        
        .tesla-location-modal .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        
        .tesla-location-modal .close-btn:hover {
          background: #f5f5f5;
        }
        
        .tesla-location-modal .modal-body {
          padding: 24px;
        }
        
        .tesla-location-modal .location-explanation {
          margin: 0 0 24px 0;
          color: #666;
          line-height: 1.5;
        }
        
        .tesla-location-modal .form-group {
          margin-bottom: 20px;
        }
        
        .tesla-location-modal .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #1a1a1a;
        }
        
        .tesla-location-modal .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        
        .tesla-location-modal .form-group input:focus {
          outline: none;
          border-color: #4ECDC4;
        }
        
        .tesla-location-modal .input-help {
          margin-top: 6px;
          font-size: 14px;
          color: #888;
        }
        
        .tesla-location-modal .privacy-note {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-top: 24px;
        }
        
        .tesla-location-modal .privacy-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .tesla-location-modal .privacy-text {
          font-size: 14px;
          color: #555;
          line-height: 1.4;
        }
        
        .tesla-location-modal .modal-footer {
          display: flex;
          gap: 12px;
          padding: 24px;
          border-top: 1px solid #eee;
          flex-wrap: wrap;
        }
        
        .tesla-location-modal .modal-footer button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          min-width: 120px;
        }
        
        .tesla-location-modal .btn-primary {
          background: #4ECDC4;
          color: white;
        }
        
        .tesla-location-modal .btn-primary:hover {
          background: #3db8b2;
          transform: translateY(-1px);
        }
        
        .tesla-location-modal .btn-secondary {
          background: #f5f5f5;
          color: #666;
        }
        
        .tesla-location-modal .btn-secondary:hover {
          background: #eee;
        }
        
        .tesla-location-modal .btn-detect {
          background: #FFD93D;
          color: #1a1a1a;
        }
        
        .tesla-location-modal .btn-detect:hover {
          background: #ffd320;
          transform: translateY(-1px);
        }
        
        .location-status {
          margin: 16px 0;
          padding: 16px;
          border-radius: 12px;
          background: #f8f9fa;
          border: 2px solid transparent;
          transition: all 0.3s;
        }
        
        .location-status.active {
          background: #e8f5e8;
          border-color: #4ECDC4;
        }
        
        .location-status.detecting {
          background: #fff3cd;
          border-color: #FFD93D;
        }
        
        .location-display, .location-prompt, .location-detecting {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .location-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .location-text {
          flex: 1;
          font-weight: 500;
          color: #1a1a1a;
        }
        
        .location-edit-btn, .location-setup-btn {
          background: #4ECDC4;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .location-edit-btn:hover, .location-setup-btn:hover {
          background: #3db8b2;
          transform: translateY(-1px);
        }
        
        .location-privacy-btn {
          background: #666;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 8px;
        }
        
        .location-privacy-btn:hover {
          background: #555;
          transform: translateY(-1px);
        }
        
        .location-spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 600px) {
          .tesla-location-modal .modal-footer {
            flex-direction: column;
          }
          
          .tesla-location-modal .modal-footer button {
            width: 100%;
          }
        }
      `;
      
      document.head.appendChild(styles);
    }

    // Get current location data
    getLocationData() {
      return { ...this.locationData };
    }

    // Clear saved location
    clearLocation() {
      this.locationData = {
        city: null,
        state: null,
        country: null,
        countryCode: null,
        timezone: null,
        coordinates: null,
        source: null,
        accuracy: null,
        lastUpdated: null
      };
      
      localStorage.removeItem('teslaLocation');
      this.displayLocationStatus();
      
      console.log('🗑️ Location data cleared');
    }
  }

  // Initialize and expose globally
  window.TeslaLocationManager = TeslaLocationManager;
  window.teslaLocation = new TeslaLocationManager();
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.teslaLocation.init();
    });
  } else {
    window.teslaLocation.init();
  }
  
  console.debug('[TeslaLocationSystem] Global location manager ready');
})();