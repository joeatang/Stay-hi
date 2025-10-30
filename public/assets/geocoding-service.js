/**
 * Gold Standard Geocoding Service
 * Privacy-first location services with free tier APIs
 * 
 * Features:
 * - Browser GPS with permission handling
 * - Reverse geocoding (coords → city/state)
 * - Free tier services (Nominatim OSM, BigDataCloud)
 * - IP-based fallback
 * - localStorage caching (rate limit protection)
 * - City/state only (privacy compliant)
 * 
 * Usage:
 *   const location = await GeocodingService.getUserLocation();
 *   // Returns: "San Francisco, CA" or null
 */

class GeocodingService {
  static CACHE_KEY = 'hi_geocoding_cache';
  
  /**
   * Get user's location as "City, State" string
   * Tries: Browser GPS → IP-based → Manual fallback
   * @returns {Promise<string|null>} "City, State" or null
   */
  static async getUserLocation() {
    try {
      // Try browser geolocation first (most accurate)
      const coords = await this.getBrowserCoordinates();
      
      if (coords) {
        const location = await this.reverseGeocode(coords.latitude, coords.longitude);
        if (location) return location;
      }
      
      // Fallback to IP-based location
      const ipLocation = await this.getIPBasedLocation();
      if (ipLocation) return ipLocation;
      
      return null;
      
    } catch (error) {
      console.warn('⚠️ Location detection failed:', error);
      return null;
    }
  }
  
  /**
   * Get coordinates from browser Geolocation API
   * @returns {Promise<{latitude: number, longitude: number}|null>}
   */
  static getBrowserCoordinates() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('⚠️ Geolocation not supported by browser');
        resolve(null);
        return;
      }
      
      const options = {
        enableHighAccuracy: false, // Faster, good enough for city-level
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log(`📍 GPS: ${latitude}, ${longitude} (±${Math.round(accuracy)}m)`);
          resolve({ latitude, longitude });
        },
        (error) => {
          console.log(`⚠️ GPS failed: ${error.message}`);
          resolve(null);
        },
        options
      );
    });
  }
  
  /**
   * Reverse geocode coordinates to "City, State"
   * Uses free tier services with caching
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<string|null>} "City, State" or null
   */
  static async reverseGeocode(lat, lng) {
    try {
      // Check cache first
      const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const cached = this.getCached(cacheKey);
      if (cached) {
        console.log('✅ Using cached location:', cached);
        return cached;
      }
      
      // Try multiple services for reliability
      const services = [
        {
          name: 'Nominatim (OpenStreetMap)',
          fetch: () => this.nominatimReverse(lat, lng)
        },
        {
          name: 'BigDataCloud',
          fetch: () => this.bigDataCloudReverse(lat, lng)
        }
      ];
      
      for (const service of services) {
        try {
          console.log(`🔍 Trying ${service.name}...`);
          const location = await service.fetch();
          
          if (location) {
            console.log(`✅ ${service.name} success:`, location);
            this.setCached(cacheKey, location);
            return location;
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
  
  /**
   * Nominatim (OpenStreetMap) reverse geocoding
   * Free tier: 1 req/sec
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<string|null>}
   */
  static async nominatimReverse(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Stay-Hi-App/1.0' // Required by Nominatim policy
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || !data.address) return null;
    
    const addr = data.address;
    const city = addr.city || addr.town || addr.village || addr.suburb || addr.hamlet;
    const state = addr.state || addr.region || addr.province;
    
    if (!city) return null;
    
    // Format as "City, State" (US) or "City, Country" (International)
    if (state && addr.country_code === 'us') {
      // US: Use state abbreviation if available
      const stateAbbr = this.getStateAbbreviation(state);
      return `${city}, ${stateAbbr || state}`;
    } else if (addr.country) {
      // Tesla-Grade Fix: Prevent city duplication (e.g., "Tokyo, Tokyo" → "Tokyo, Japan")
      if (city.toLowerCase() === addr.country.toLowerCase()) {
        return city; // Just return city if it's the same as country
      }
      return `${city}, ${addr.country}`;
    }
    
    return city;
  }
  
  /**
   * BigDataCloud reverse geocoding
   * Free tier: No API key required
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<string|null>}
   */
  static async bigDataCloudReverse(lat, lng) {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data) return null;
    
    const city = data.city || data.locality;
    const state = data.principalSubdivision || data.principalSubdivisionCode;
    const country = data.countryCode;
    
    if (!city) return null;
    
    // Format as "City, State" (US) or "City, Country" (International)
    if (state && country === 'US') {
      return `${city}, ${state}`;
    } else if (data.countryName) {
      // Tesla-Grade Fix: Prevent city duplication (e.g., "Tokyo, Tokyo" → "Tokyo, Japan")
      const countryName = data.countryName;
      if (city.toLowerCase() === countryName.toLowerCase()) {
        return city; // Just return city if it's the same as country
      }
      return `${city}, ${countryName}`;
    }
    
    return city;
  }
  
  /**
   * Get location from IP address (fallback)
   * Free tier: 1,000 req/day
   * @returns {Promise<string|null>}
   */
  static async getIPBasedLocation() {
    try {
      console.log('🌐 Trying IP-based location...');
      
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data || !data.city) return null;
      
      const city = data.city;
      const state = data.region_code || data.region;
      const country = data.country_code;
      
      // Format as "City, State" (US) or "City, Country" (International)
      if (state && country === 'US') {
        return `${city}, ${state}`;
      } else if (data.country_name) {
        // Tesla-Grade Fix: Prevent city duplication 
        if (city.toLowerCase() === data.country_name.toLowerCase()) {
          return city; // Just return city if it's the same as country
        }
        return `${city}, ${data.country_name}`;
      }
      
      return city;
      
    } catch (error) {
      console.log('⚠️ IP-based location failed:', error.message);
      return null;
    }
  }
  
  /**
   * Get cached location
   * @param {string} key - Cache key (e.g., "37.7749,-122.4194")
   * @returns {string|null}
   */
  static getCached(key) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
      return cache[key] || null;
    } catch {
      return null;
    }
  }
  
  /**
   * Set cached location (never expires - geographic data is stable)
   * @param {string} key - Cache key
   * @param {string} location - "City, State" string
   */
  static setCached(key, location) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
      cache[key] = location;
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('⚠️ Cache write failed:', error);
    }
  }
  
  /**
   * Clear geocoding cache (for testing/debugging)
   */
  static clearCache() {
    localStorage.removeItem(this.CACHE_KEY);
    console.log('🗑️ Geocoding cache cleared');
  }
  
  /**
   * Get US state abbreviation from full name
   * @param {string} stateName - Full state name
   * @returns {string|null} Two-letter abbreviation or null
   */
  static getStateAbbreviation(stateName) {
    const states = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
      'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
      'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
      'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
      'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
      'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
      'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
      'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
      'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    
    return states[stateName] || null;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeocodingService;
}

// Make globally available
window.GeocodingService = GeocodingService;

console.log('🌍 GeocodingService loaded');
