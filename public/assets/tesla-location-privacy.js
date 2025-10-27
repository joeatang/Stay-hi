/**
 * Tesla-Grade Location Privacy Manager
 * Advanced privacy controls for location sharing
 */
(function() {
  'use strict';

  class TeslaLocationPrivacy {
    constructor() {
      this.settings = {
        show_city: true,
        show_state: true,
        show_country: true,
        allow_location_sharing: true,
        share_with_nearby: false,
        nearby_radius_km: 50
      };
    }

    // Initialize privacy system
    async init() {
      console.log('🔒 Initializing Tesla Location Privacy System...');
      
      // Load saved privacy settings
      await this.loadPrivacySettings();
      
      console.log('✅ Tesla Location Privacy System ready');
    }

    // Load privacy settings from database
    async loadPrivacySettings() {
      if (!window.supabaseClient) return;
      
      try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;
        
        const { data: privacySettings, error } = await window.supabaseClient
          .from('location_privacy_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { // Not found is ok
          console.error('Failed to load privacy settings:', error);
          return;
        }
        
        if (privacySettings) {
          this.settings = { ...this.settings, ...privacySettings };
          console.log('📍 Privacy settings loaded:', this.settings);
        } else {
          // Create default settings
          await this.savePrivacySettings();
        }
        
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      }
    }

    // Save privacy settings to database
    async savePrivacySettings() {
      if (!window.supabaseClient) return;
      
      try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;
        
        const { error } = await window.supabaseClient
          .from('location_privacy_settings')
          .upsert({
            user_id: session.user.id,
            ...this.settings,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) {
          console.error('Failed to save privacy settings:', error);
        } else {
          console.log('✅ Privacy settings saved');
        }
        
      } catch (error) {
        console.error('Failed to save privacy settings:', error);
      }
    }

    // Show privacy settings modal
    showPrivacySettings() {
      const modal = this.createPrivacyModal();
      document.body.appendChild(modal);
    }

    // Create privacy settings modal
    createPrivacyModal() {
      const modal = document.createElement('div');
      modal.className = 'tesla-privacy-modal';
      modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>🔒 Location Privacy Settings</h2>
            <button class="close-btn" onclick="this.closest('.tesla-privacy-modal').remove()">×</button>
          </div>
          
          <div class="modal-body">
            <div class="privacy-section">
              <h3>📍 What to Share</h3>
              <p class="section-description">Choose what parts of your location to show to other users.</p>
              
              <div class="privacy-option">
                <label class="toggle-label">
                  <input type="checkbox" id="showCity" ${this.settings.show_city ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Show City</span>
                    <span class="toggle-description">Display your city (e.g., "San Francisco")</span>
                  </div>
                </label>
              </div>
              
              <div class="privacy-option">
                <label class="toggle-label">
                  <input type="checkbox" id="showState" ${this.settings.show_state ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Show State/Province</span>
                    <span class="toggle-description">Display your state or province (e.g., "California")</span>
                  </div>
                </label>
              </div>
              
              <div class="privacy-option">
                <label class="toggle-label">
                  <input type="checkbox" id="showCountry" ${this.settings.show_country ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Show Country</span>
                    <span class="toggle-description">Display your country (e.g., "United States")</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div class="privacy-section">
              <h3>🌐 Sharing Preferences</h3>
              <p class="section-description">Control how your location is used for discovery and connections.</p>
              
              <div class="privacy-option">
                <label class="toggle-label">
                  <input type="checkbox" id="allowLocationSharing" ${this.settings.allow_location_sharing ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Enable Location Sharing</span>
                    <span class="toggle-description">Allow others to see your location information</span>
                  </div>
                </label>
              </div>
              
              <div class="privacy-option">
                <label class="toggle-label">
                  <input type="checkbox" id="shareWithNearby" ${this.settings.share_with_nearby ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Connect with Nearby Users</span>
                    <span class="toggle-description">Appear in nearby user suggestions</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div class="privacy-section">
              <h3>📊 Location Preview</h3>
              <div class="location-preview" id="locationPreview">
                <div class="preview-label">Others will see:</div>
                <div class="preview-location" id="previewLocation">Loading...</div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" onclick="this.closest('.tesla-privacy-modal').remove()">
              Cancel
            </button>
            <button class="btn-primary" onclick="window.teslaLocationPrivacy.saveSettings()">
              💾 Save Settings
            </button>
          </div>
        </div>
      `;
      
      // Add event listeners for live preview
      this.setupPrivacyEventListeners(modal);
      
      // Update initial preview
      this.updateLocationPreview(modal);
      
      // Add styles
      this.addPrivacyModalStyles();
      
      return modal;
    }

    // Setup event listeners for privacy modal
    setupPrivacyEventListeners(modal) {
      const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          this.updateLocationPreview(modal);
        });
      });
    }

    // Update location preview based on current settings
    updateLocationPreview(modal) {
      const showCity = modal.querySelector('#showCity').checked;
      const showState = modal.querySelector('#showState').checked;
      const showCountry = modal.querySelector('#showCountry').checked;
      const allowSharing = modal.querySelector('#allowLocationSharing').checked;
      
      const previewElement = modal.querySelector('#previewLocation');
      
      if (!allowSharing) {
        previewElement.textContent = 'Location Hidden';
        previewElement.className = 'preview-location hidden';
        return;
      }
      
      // Get current location data
      const locationData = window.teslaLocation ? window.teslaLocation.getLocationData() : {};
      const parts = [];
      
      if (showCity && locationData.city) parts.push(locationData.city);
      if (showState && locationData.state) parts.push(locationData.state);
      if (showCountry && locationData.country) parts.push(locationData.country);
      
      if (parts.length > 0) {
        previewElement.textContent = parts.join(', ');
        previewElement.className = 'preview-location visible';
      } else {
        previewElement.textContent = 'Location Not Set';
        previewElement.className = 'preview-location not-set';
      }
    }

    // Save privacy settings from modal
    async saveSettings() {
      const modal = document.querySelector('.tesla-privacy-modal');
      if (!modal) return;
      
      // Get values from modal
      this.settings = {
        show_city: modal.querySelector('#showCity').checked,
        show_state: modal.querySelector('#showState').checked,
        show_country: modal.querySelector('#showCountry').checked,
        allow_location_sharing: modal.querySelector('#allowLocationSharing').checked,
        share_with_nearby: modal.querySelector('#shareWithNearby').checked,
        nearby_radius_km: this.settings.nearby_radius_km // Keep existing value
      };
      
      // Save to database
      await this.savePrivacySettings();
      
      // Update location display
      if (window.teslaLocation) {
        window.teslaLocation.displayLocationStatus();
      }
      
      // Close modal
      modal.remove();
      
      // Show success
      if (window.showTeslaToast) {
        window.showTeslaToast('Privacy settings saved successfully! 🔒', 'success');
      }
    }

    // Add privacy modal styles
    addPrivacyModalStyles() {
      if (document.getElementById('tesla-privacy-styles')) return;
      
      const styles = document.createElement('style');
      styles.id = 'tesla-privacy-styles';
      styles.textContent = `
        .tesla-privacy-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui;
        }
        
        .tesla-privacy-modal .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
        }
        
        .tesla-privacy-modal .modal-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 16px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .tesla-privacy-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #eee;
        }
        
        .tesla-privacy-modal .modal-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
        }
        
        .tesla-privacy-modal .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        
        .tesla-privacy-modal .close-btn:hover {
          background: #f5f5f5;
        }
        
        .tesla-privacy-modal .modal-body {
          padding: 24px;
        }
        
        .tesla-privacy-modal .privacy-section {
          margin-bottom: 32px;
        }
        
        .tesla-privacy-modal .privacy-section:last-child {
          margin-bottom: 0;
        }
        
        .tesla-privacy-modal .privacy-section h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }
        
        .tesla-privacy-modal .section-description {
          margin: 0 0 20px 0;
          color: #666;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .tesla-privacy-modal .privacy-option {
          margin-bottom: 16px;
        }
        
        .tesla-privacy-modal .toggle-label {
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          padding: 16px;
          border: 2px solid #f0f0f0;
          border-radius: 12px;
          transition: all 0.2s;
        }
        
        .tesla-privacy-modal .toggle-label:hover {
          border-color: #4ECDC4;
          background: #f8fffe;
        }
        
        .tesla-privacy-modal .toggle-label input[type="checkbox"] {
          display: none;
        }
        
        .tesla-privacy-modal .toggle-slider {
          position: relative;
          width: 48px;
          height: 24px;
          background: #ddd;
          border-radius: 12px;
          transition: background 0.3s;
          flex-shrink: 0;
        }
        
        .tesla-privacy-modal .toggle-slider::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .tesla-privacy-modal input[type="checkbox"]:checked + .toggle-slider {
          background: #4ECDC4;
        }
        
        .tesla-privacy-modal input[type="checkbox"]:checked + .toggle-slider::after {
          transform: translateX(24px);
        }
        
        .tesla-privacy-modal .toggle-content {
          flex: 1;
        }
        
        .tesla-privacy-modal .toggle-title {
          display: block;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 4px;
        }
        
        .tesla-privacy-modal .toggle-description {
          display: block;
          font-size: 14px;
          color: #666;
          line-height: 1.3;
        }
        
        .tesla-privacy-modal .location-preview {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        
        .tesla-privacy-modal .preview-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .tesla-privacy-modal .preview-location {
          font-size: 18px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          display: inline-block;
        }
        
        .tesla-privacy-modal .preview-location.visible {
          background: #e8f5e8;
          color: #2d5a2d;
        }
        
        .tesla-privacy-modal .preview-location.hidden {
          background: #ffebee;
          color: #c62828;
        }
        
        .tesla-privacy-modal .preview-location.not-set {
          background: #fff3cd;
          color: #856404;
        }
        
        .tesla-privacy-modal .modal-footer {
          display: flex;
          gap: 12px;
          padding: 24px;
          border-top: 1px solid #eee;
        }
        
        .tesla-privacy-modal .modal-footer button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        
        .tesla-privacy-modal .btn-primary {
          background: #4ECDC4;
          color: white;
        }
        
        .tesla-privacy-modal .btn-primary:hover {
          background: #3db8b2;
          transform: translateY(-1px);
        }
        
        .tesla-privacy-modal .btn-secondary {
          background: #f5f5f5;
          color: #666;
        }
        
        .tesla-privacy-modal .btn-secondary:hover {
          background: #eee;
        }
        
        @media (max-width: 600px) {
          .tesla-privacy-modal .modal-footer {
            flex-direction: column;
          }
          
          .tesla-privacy-modal .toggle-label {
            padding: 12px;
          }
          
          .tesla-privacy-modal .modal-content {
            margin: 20px;
            width: calc(100% - 40px);
          }
        }
      `;
      
      document.head.appendChild(styles);
    }

    // Get current privacy settings
    getSettings() {
      return { ...this.settings };
    }

    // Check if location sharing is enabled
    isLocationSharingEnabled() {
      return this.settings.allow_location_sharing;
    }
  }

  // Initialize and expose globally
  window.TeslaLocationPrivacy = TeslaLocationPrivacy;
  window.teslaLocationPrivacy = new TeslaLocationPrivacy();
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.teslaLocationPrivacy.init();
    });
  } else {
    window.teslaLocationPrivacy.init();
  }
  
  console.debug('[TeslaLocationPrivacy] Location privacy manager ready');
})();