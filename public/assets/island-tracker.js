// public/assets/island.js
// Hi Island with Tesla-grade activity tracking integration

(function () {
  'use strict';
  
  const $ = (s) => document.querySelector(s);
  
  class HiIsland {
    constructor() {
      this.map = null;
      this.currentLocation = null;
      this.isTracking = false;
      this.visitStartTime = null;
      this.activities = [];
    }

    async init() {
      await this.setupMap();
      this.setupLocationTracking();
      this.setupActivityLogging();
      this.loadUserActivities();
      
      // Start island session
      if (window.ActivityTracker) {
        await window.ActivityTracker.startSession('island');
      }
    }

    // Setup interactive map with activity logging
    async setupMap() {
      try {
        if (typeof L === 'undefined') {
          $('#mapContainer').innerHTML = '<div class="loading-placeholder">Map loading...</div>';
          return;
        }

        // Initialize map with user's location or default
        const position = await this.getCurrentPosition();
        const lat = position?.coords?.latitude || 37.7749;
        const lng = position?.coords?.longitude || -122.4194;

        this.map = L.map('mapContainer', {
          center: [lat, lng],
          zoom: 13,
          zoomControl: true,
          attributionControl: false
        });

        // Premium map tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© Stay Hi'
        }).addTo(this.map);

        // Add user location marker
        const userMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'user-location-marker',
            html: '📍',
            iconSize: [30, 30]
          })
        }).addTo(this.map);

        userMarker.bindPopup(`
          <div class="location-popup">
            <h4>You are here! 🌟</h4>
            <button class="check-in-btn" onclick="hiIsland.checkIn('${lat}', '${lng}')">
              Check In Here
            </button>
          </div>
        `);

        // Add interesting nearby locations
        this.addPremiumLocations();

        // Map interaction logging
        this.map.on('click', (e) => this.handleMapClick(e));
        this.map.on('moveend', () => this.handleMapMove());

      } catch (error) {
        console.error('Map setup failed:', error);
        $('#mapContainer').innerHTML = '<div class="error-placeholder">Map temporarily unavailable</div>';
      }
    }

    // Add premium location markers
    addPremiumLocations() {
      const locations = [
        { lat: 37.7849, lng: -122.4094, name: 'Golden Gate Park', type: 'nature' },
        { lat: 37.7949, lng: -122.3994, name: 'Mission District', type: 'urban' },
        { lat: 37.8080, lng: -122.4177, name: 'Fisherman\'s Wharf', type: 'waterfront' },
        { lat: 37.7849, lng: -122.4077, name: 'Presidio', type: 'historic' }
      ];

      locations.forEach(loc => {
        const marker = L.marker([loc.lat, loc.lng], {
          icon: L.divIcon({
            className: `location-marker ${loc.type}`,
            html: this.getLocationIcon(loc.type),
            iconSize: [40, 40]
          })
        }).addTo(this.map);

        marker.bindPopup(`
          <div class="location-popup">
            <h4>${loc.name}</h4>
            <p class="location-type">${loc.type}</p>
            <div class="location-actions">
              <button class="visit-btn" onclick="hiIsland.visitLocation('${loc.name}', ${loc.lat}, ${loc.lng})">
                Visit Location
              </button>
              <button class="explore-btn" onclick="hiIsland.exploreArea('${loc.name}', ${loc.lat}, ${loc.lng})">
                Explore Area
              </button>
            </div>
          </div>
        `);
      });
    }

    getLocationIcon(type) {
      const icons = {
        nature: '🌲',
        urban: '🏙️',
        waterfront: '🌊',
        historic: '🏛️',
        visit: '👁️',
        explore: '🚶',
        checkin: '📍',
        photo: '📷'
      };
      return icons[type] || '📍';
    }

    // Get user's current position
    getCurrentPosition() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });
    }

    // Setup location tracking
    setupLocationTracking() {
      if (navigator.geolocation) {
        this.watchId = navigator.geolocation.watchPosition(
          (position) => {
            this.currentLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
          },
          (error) => console.warn('Location tracking error:', error),
          { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
        );
      }
    }

    // Setup activity logging interface
    setupActivityLogging() {
      // Activity buttons
      document.addEventListener('click', (e) => {
        if (e.target.matches('.quick-activity-btn')) {
          this.handleQuickActivity(e.target.dataset.activity);
        }
      });

      // Listen for activity completion events
      window.addEventListener('activityLogged', (e) => {
        if (e.detail.type === 'island') {
          this.updateActivityFeed();
        }
      });
    }

    // Handle map clicks for activity logging
    async handleMapClick(e) {
      if (!window.currentUser) return;

      const { lat, lng } = e.latlng;
      
      // Create temporary marker for activity creation
      const tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'temp-activity-marker',
          html: '✨',
          iconSize: [30, 30]
        })
      }).addTo(this.map);

      tempMarker.bindPopup(`
        <div class="activity-popup">
          <h4>Create Activity Here</h4>
          <div class="activity-form">
            <select id="activityType" class="form-select">
              <option value="visit">Visit</option>
              <option value="explore">Explore</option>
              <option value="checkin">Check In</option>
              <option value="photo">Photo Spot</option>
            </select>
            <input type="text" id="locationName" placeholder="Location name..." class="form-input" />
            <textarea id="activityNotes" placeholder="How are you feeling here?" class="form-textarea"></textarea>
            <div class="mood-rating">
              <label>Mood: </label>
              <div class="star-rating" id="moodRating">
                ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}">⭐</span>`).join('')}
              </div>
            </div>
            <div class="popup-actions">
              <button class="create-activity-btn" onclick="hiIsland.createActivity(${lat}, ${lng}, this)">
                Log Activity
              </button>
              <button class="cancel-btn" onclick="hiIsland.cancelActivity(this)">
                Cancel
              </button>
            </div>
          </div>
        </div>
      `).openPopup();

      // Setup star rating
      setTimeout(() => {
        const stars = document.querySelectorAll('#moodRating .star');
        stars.forEach(star => {
          star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            stars.forEach((s, i) => {
              s.classList.toggle('selected', i < rating);
            });
          });
        });
      }, 100);
    }

    // Create activity from map interaction
    async createActivity(lat, lng, buttonElement) {
      try {
        const popup = buttonElement.closest('.activity-popup');
        const activityType = popup.querySelector('#activityType').value;
        const locationName = popup.querySelector('#locationName').value || 'Unknown Location';
        const notes = popup.querySelector('#activityNotes').value;
        const moodRating = popup.querySelectorAll('#moodRating .star.selected').length || 3;

        const activityData = {
          type: activityType,
          location: locationName,
          latitude: lat,
          longitude: lng,
          mood: moodRating,
          notes: notes,
          duration: this.calculateDuration()
        };

        // Log activity
        if (window.ActivityTracker) {
          await window.ActivityTracker.logIslandActivity(activityData);
        }

        // Close popup and clean up
        this.map.closePopup();
        this.map.eachLayer(layer => {
          if (layer.options && layer.options.icon && 
              layer.options.icon.options.className === 'temp-activity-marker') {
            this.map.removeLayer(layer);
          }
        });

        // Add permanent marker for logged activity
        this.addActivityMarker(lat, lng, activityData);

      } catch (error) {
        console.error('Failed to create activity:', error);
        if (window.PremiumUX) {
          window.PremiumUX.showToast('Failed to log activity', 'error');
        }
      }
    }

    // Cancel activity creation
    cancelActivity(buttonElement) {
      this.map.closePopup();
      this.map.eachLayer(layer => {
        if (layer.options && layer.options.icon && 
            layer.options.icon.options.className === 'temp-activity-marker') {
          this.map.removeLayer(layer);
        }
      });
    }

    // Quick activity logging
    async handleQuickActivity(activityType) {
      if (!this.currentLocation) {
        if (window.PremiumUX) {
          window.PremiumUX.showToast('Location not available', 'warning');
        }
        return;
      }

      const activityData = {
        type: activityType,
        location: 'Current Location',
        latitude: this.currentLocation.lat,
        longitude: this.currentLocation.lng,
        mood: 4, // Default good mood
        notes: `Quick ${activityType} activity`,
        duration: 5 // Default 5 minutes
      };

      if (window.ActivityTracker) {
        await window.ActivityTracker.logIslandActivity(activityData);
      }
    }

    // Specific location activities
    async visitLocation(name, lat, lng) {
      const activityData = {
        type: 'visit',
        location: name,
        latitude: lat,
        longitude: lng,
        mood: 4,
        notes: `Visited ${name}`,
        duration: 15
      };

      if (window.ActivityTracker) {
        await window.ActivityTracker.logIslandActivity(activityData);
      }

      this.map.closePopup();
    }

    async exploreArea(name, lat, lng) {
      const activityData = {
        type: 'explore',
        location: name,
        latitude: lat,
        longitude: lng,
        mood: 5,
        notes: `Explored ${name} area`,
        duration: 30
      };

      if (window.ActivityTracker) {
        await window.ActivityTracker.logIslandActivity(activityData);
      }

      this.map.closePopup();
    }

    async checkIn(lat, lng) {
      const activityData = {
        type: 'checkin',
        location: 'Current Location',
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        mood: 4,
        notes: 'Checked in at current location',
        duration: 1
      };

      if (window.ActivityTracker) {
        await window.ActivityTracker.logIslandActivity(activityData);
      }

      this.map.closePopup();
    }

    // Add activity marker to map
    addActivityMarker(lat, lng, activity) {
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'activity-marker logged',
          html: '✅',
          iconSize: [25, 25]
        })
      }).addTo(this.map);

      marker.bindPopup(`
        <div class="logged-activity-popup">
          <h4>${activity.location}</h4>
          <p><strong>${activity.type}</strong></p>
          <p>Mood: ${'⭐'.repeat(activity.mood)}</p>
          ${activity.notes ? `<p>${activity.notes}</p>` : ''}
          <small>Logged just now</small>
        </div>
      `);
    }

    // Load and display user's previous activities
    async loadUserActivities() {
      if (!window.ActivityTracker || !window.currentUser) return;

      try {
        const activities = await window.ActivityTracker.getRecentActivities(20);
        const islandActivities = activities.filter(a => a.type === 'island');

        // Add markers for previous activities  
        islandActivities.forEach(activity => {
          if (activity.latitude && activity.longitude) {
            const marker = L.marker([activity.latitude, activity.longitude], {
              icon: L.divIcon({
                className: 'activity-marker historic',
                html: '📍',
                iconSize: [20, 20]
              })
            }).addTo(this.map);

            marker.bindPopup(`
              <div class="historic-activity-popup">
                <h4>${activity.location_name || 'Previous Activity'}</h4>
                <p><strong>${activity.activity_type}</strong></p>
                <p>Mood: ${'⭐'.repeat(activity.mood_rating || 3)}</p>
                ${activity.notes ? `<p>${activity.notes}</p>` : ''}
                <small>${new Date(activity.created_at).toLocaleDateString()}</small>
              </div>
            `);
          }
        });

        this.updateActivityFeed(islandActivities);
      } catch (error) {
        console.error('Failed to load activities:', error);
      }
    }

    // Update activity feed
    updateActivityFeed(activities = []) {
      const feedContainer = $('#activityFeed');
      if (!feedContainer) return;

      if (activities.length === 0) {
        feedContainer.innerHTML = '<div class="empty-feed">Start exploring to see your activities here! 🌟</div>';
        return;
      }

      feedContainer.innerHTML = activities.map(activity => `
        <div class="activity-item">
          <div class="activity-icon">${this.getLocationIcon(activity.activity_type)}</div>
          <div class="activity-content">
            <h4>${activity.location_name || 'Unknown Location'}</h4>
            <p class="activity-type">${activity.activity_type}</p>
            <p class="activity-mood">Mood: ${'⭐'.repeat(activity.mood_rating || 3)}</p>
            ${activity.notes ? `<p class="activity-notes">${activity.notes}</p>` : ''}
            <small class="activity-time">${new Date(activity.created_at).toLocaleString()}</small>
          </div>
        </div>
      `).join('');
    }

    // Calculate activity duration
    calculateDuration() {
      if (!this.visitStartTime) return 5; // Default 5 minutes
      
      const now = Date.now();
      const durationMs = now - this.visitStartTime;
      return Math.max(1, Math.round(durationMs / (1000 * 60))); // Minutes, minimum 1
    }

    // Handle map movement for exploration tracking
    handleMapMove() {
      if (!this.visitStartTime) {
        this.visitStartTime = Date.now();
      }
    }

    // Cleanup
    destroy() {
      if (this.watchId) {
        navigator.geolocation.clearWatch(this.watchId);
      }
      
      if (window.ActivityTracker && window.ActivityTracker.currentSession) {
        window.ActivityTracker.endSession();
      }
    }
  }

  // Initialize Hi Island
  window.hiIsland = new HiIsland();

  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.hiIsland.init(), 500);
    });
  } else {
    setTimeout(() => window.hiIsland.init(), 500);
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (window.hiIsland) {
      window.hiIsland.destroy();
    }
  });

})();