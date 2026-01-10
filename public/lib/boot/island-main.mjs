// HI ISLAND ORCHESTRATOR (extracted from hi-island-NEW.html)
// Load order preserved; this file is included near the end of body

// 🎯 WOZ FIX: Prevent duplicate initialization (event listener stacking)
let islandInitialized = false;

async function initHiIsland() {
  console.log('🏝️ Hi Island initializing...');
  
  // 🚀 IDEMPOTENCY: Skip full init if already done, just refresh state
  if (islandInitialized) {
    console.log('♻️ Hi Island already initialized - refreshing state only...');
    await refreshIslandState();
    return;
  }
  
  // 🚀 FIX: Wait for critical dependencies before rendering
  // This prevents race conditions on first navigation
  if (window.DependencyManager) {
    console.log('⏳ Waiting for Hi Island dependencies...');
    const result = await window.DependencyManager.waitForDependencies([
      'auth',
      'hiDB',
      'HiSupabase',
      'HiBrandTiers'
    ]);
    
    if (!result.success) {
      console.error('❌ Some dependencies failed to load:', result.missing);
      // Show user-friendly error
      const feedContainer = document.querySelector('.feed-container');
      if (feedContainer) {
        feedContainer.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #cfd2ea;">
            <div style="font-size: 2rem; margin-bottom: 16px;">🔄</div>
            <div style="font-weight: 600; margin-bottom: 8px;">Loading issue detected</div>
            <div style="font-size: 0.9rem; margin-bottom: 20px;">Some components didn't load properly</div>
            <button onclick="location.reload()" style="padding: 12px 24px; background: #4ECDC4; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">
              Reload Page
            </button>
          </div>
        `;
      }
      return; // Stop initialization
    }
    console.log('✅ All dependencies ready');
    
    // 🎯 GOLD STANDARD: Hide splash immediately when dependencies ready
    // Mark all flags as ready so splash can hide without waiting for timeout
    if (window.hiIslandReady) {
      window.hiIslandReady.auth = true;
      window.hiIslandReady.map = true;
      window.hiIslandReady.feed = true;
      console.log('✅ Splash ready flags set - triggering hide');
    }
  }
  
  // 🏆 WOZ FIX: Initialize ProfileManager first
  if (window.ProfileManager && !window.ProfileManager.isReady()) {
    console.log('🏆 Initializing ProfileManager...');
    try {
      await window.ProfileManager.init();
      console.log('✅ ProfileManager ready');
    } catch (error) {
      console.warn('⚠️ ProfileManager init failed (non-critical):', error);
    }
  }
  
  // 🎯 Setup membership tier listener for pill display
  setupMembershipTierListener();
  
  // Unified stats only: remove legacy multi-path cache bootstrap
  loadRealStats().catch(err => console.warn('Stats loading failed:', err));
  
  // ✅ FIX: Initialize UnifiedHiIslandController to render feed (singleton pattern)
  console.log('🎯 Initializing feed system...');
  if (window.UnifiedHiIslandController && !window.unifiedHiIslandController) {
    window.unifiedHiIslandController = new window.UnifiedHiIslandController();
    await window.unifiedHiIslandController.init();
    console.log('✅ Feed system initialized');
  } else if (window.unifiedHiIslandController) {
    console.log('✅ Feed controller already exists (reusing instance)');
  } else {
    console.error('❌ UnifiedHiIslandController not loaded!');
  }
  
  initializeTabSystem();
  initializeOriginFilters();
  initializeTryItLink();
  initializeHiMap();
  
  // Mark as initialized to prevent duplicate event listeners on BFCache restore
  islandInitialized = true;
  console.log('✅ Hi Island ready with Gold Standard UI');
}

// 🎯 STATE REFRESH: Reload dynamic content without re-initializing event listeners
async function refreshIslandState() {
  // Refresh stats (already has throttle guard)
  loadRealStats().catch(err => console.warn('Stats refresh failed:', err));
  
  // Refresh feed data (re-init controller - should be idempotent)
  if (window.unifiedHiIslandController) {
    try {
      await window.unifiedHiIslandController.init();
      console.log('✅ Feed refreshed on BFCache restore');
    } catch (err) {
      console.warn('⚠️ Feed refresh failed:', err);
    }
  }
  
  // Refresh map display (if map exists)
  if (window.hiMap && window.hiMap.invalidateSize) {
    try {
      window.hiMap.invalidateSize(); // Ensure map displays correctly after restore
      console.log('✅ Map refreshed on BFCache restore');
    } catch (err) {
      console.warn('⚠️ Map refresh failed:', err);
    }
  }
  
  console.log('♻️ Island state refreshed');
}

// 🎯 Membership Tier Listener (Hi Island Parity with Dashboard)
function setupMembershipTierListener() {
  // 🔥 FIX: Hi Island uses #hi-tier-indicator, not [data-tier-pill]
  const tierPill = document.getElementById('hi-tier-indicator') || document.querySelector('[data-tier-pill]');
  
  if (!tierPill) {
    console.warn('⚠️ Tier pill not found on Hi Island (tried #hi-tier-indicator and [data-tier-pill])');
    return;
  }
  
  // Initial load from HiMembership
  if (window.HiMembership) {
    const membership = window.HiMembership.get();
    if (membership && membership.tier) {
      updateTierPill(membership.tier);
    }
  }
  
  // Listen for membership changes
  window.addEventListener('hi:membership-changed', (e) => {
    const membership = e.detail || {};
    if (membership.tier) {
      updateTierPill(membership.tier);
    }
  });
  
  // Fallback: listen to auth-ready
  window.addEventListener('hi:auth-ready', (e) => {
    const { membership } = e.detail || {};
    if (membership && membership.tier) {
      updateTierPill(membership.tier);
    }
  });
  
  // Add spinner timeout (prevent infinite hourglass)
  if (tierPill.classList.contains('loading') || tierPill.textContent === '⏳') {
    setTimeout(() => {
      if (tierPill.classList.contains('loading') || tierPill.textContent === '⏳') {
        console.warn('⚠️ Tier pill timeout - using fallback');
        const cachedTier = localStorage.getItem('hi_membership_tier') || 'member';
        updateTierPill(cachedTier);
      }
    }, 5000); // 5s timeout
  }
  
  console.log('✅ Tier pill listener active on Hi Island');
}

function updateTierPill(tierFromEvent) {
  // 🔥 FIX: Use same selector as setupMembershipTierListener (consistency)
  const tierPill = document.getElementById('hi-tier-indicator') || document.querySelector('[data-tier-pill]');
  if (!tierPill) return;
  
  // Remove loading state
  tierPill.classList.remove('loading');
  
  // ✅ GOLD STANDARD: Use HiBrandTiers for consistent display across all pages
  if (window.HiBrandTiers) {
    window.HiBrandTiers.updateTierPill(tierPill, tierFromEvent, {
      showEmoji: false,
      useGradient: false
    });
    console.log('🎯 Tier pill updated via HiBrandTiers:', tierFromEvent);
  } else {
    // Fallback if HiBrandTiers not loaded yet - use branded name or capitalize tier
    const fallbackName = window.HiBrandTiers?.getName?.(tierFromEvent) || tierFromEvent.charAt(0).toUpperCase() + tierFromEvent.slice(1);
    const tierText = tierPill.querySelector('.tier-text');
    if (tierText) {
      tierText.textContent = fallbackName;
    } else {
      tierPill.textContent = fallbackName;
    }
    console.warn('🎯 Tier pill updated (fallback - HiBrandTiers not loaded):', fallbackName);
  }
  
  // Cache for next load
  try {
    localStorage.setItem('hi_membership_tier', tierFromEvent);
  } catch (e) {
    // Silent fail
  }
}

function initializeTabSystem() {
  const tabs = document.querySelectorAll('.tab');
  const feedRoot = document.getElementById('hi-island-feed-root');
  let currentTabIndex = 0;
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', async (e) => {
      const targetTab = e.target.dataset.target;
      await switchToTab(targetTab, index);
    });
    tab.addEventListener('keydown', async (e) => {
      const targetTab = e.target.dataset.target;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = (currentTabIndex + 1) % tabs.length;
          await focusTab(nextIndex);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = (currentTabIndex - 1 + tabs.length) % tabs.length;
          await focusTab(prevIndex);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          await switchToTab(targetTab, currentTabIndex);
          break;
        case 'Home':
          e.preventDefault();
          await focusTab(0);
          break;
        case 'End':
          e.preventDefault();
          await focusTab(tabs.length - 1);
          break;
      }
    });
    tab.tabIndex = index === 0 ? 0 : -1;
  });
  async function switchToTab(targetTab, index) {
    const tab = tabs[index];
    if (!checkTabAccess(targetTab)) {
      console.log(`🔒 Tab access denied: ${targetTab}`);
      return;
    }
    tab.classList.add('loading');
    try {
      tabs.forEach((t, i) => {
        t.setAttribute('aria-selected', 'false');
        t.tabIndex = -1;
      });
      tab.setAttribute('aria-selected', 'true');
      tab.tabIndex = 0;
      currentTabIndex = index;
      await handleTabSwitch(targetTab);
          // Root consistency fix: rely exclusively on UnifiedStatsLoader for canonical values.
          const { loadGlobalStats } = await import('../stats/UnifiedStatsLoader.js');
          const stats = await loadGlobalStats();
          if (stats) {
            const waves = Number.isFinite(stats.waves) ? Number(stats.waves) : null;
            const his = Number.isFinite(stats.totalHis) ? Number(stats.totalHis) : null;
            const users = Number.isFinite(stats.totalUsers) ? Number(stats.totalUsers) : null;
            if (waves!=null) document.getElementById('globalHiWaves').textContent = waves.toLocaleString();
            if (his!=null) document.getElementById('globalTotalHis').textContent = his.toLocaleString();
            if (users!=null) document.getElementById('globalTotalUsers').textContent = users.toLocaleString();
            console.log('✅ Hi-Island unified stats refresh:', { waves, his, users, source: stats.overall });
            // Persist to localStorage for fast cache warm on next navigation
            if (waves!=null) localStorage.setItem('globalHiWaves', String(waves));
            if (his!=null) localStorage.setItem('globalTotalHis', String(his));
            if (users!=null) localStorage.setItem('globalTotalUsers', String(users));
            return;
          }
          console.warn('⚠️ Unified stats unavailable; using fallback cache only');
      console.log('🏝️ Switched to tab:', targetTab);
    } catch (error) {
      console.error('❌ Tab switch error:', error);
    } finally {
      setTimeout(() => {
        tab.classList.remove('loading');
      }, 300);
    }
  }
  async function focusTab(index) {
    tabs.forEach(t => t.tabIndex = -1);
    tabs[index].tabIndex = 0;
    tabs[index].focus();
    currentTabIndex = index;
  }
  setTimeout(() => {
    handleTabSwitch('general');
  }, 100);
}

// Wire origin filter buttons to unified feed
// WOZ FIX: Wait for hiRealFeed to be ready before attaching listeners
function initializeOriginFilters() {
  try {
    const btns = Array.from(document.querySelectorAll('.origin-filter-btn'));
    if (!btns.length) {
      console.warn('⚠️ No filter buttons found');
      return;
    }

    const setActive = (filter) => {
      console.log(`🎨 setActive called with filter: ${filter}`);
      btns.forEach(b => {
        const isActive = b.dataset.filter === filter;
        const buttonLabel = b.textContent.trim();
        
        console.log(`  Button "${buttonLabel}": ${isActive ? '✅ ACTIVE' : '⚪ inactive'}`);
        
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        
        // WOZ FIX: Override inline styles for visual feedback
        if (isActive) {
          b.style.background = 'rgba(255, 255, 255, 0.9)';
          b.style.color = '#111';
          b.style.fontWeight = '700';
          b.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.15)';
          b.style.transform = 'scale(1.02)';
        } else {
          b.style.background = 'rgba(255, 255, 255, 0.1)';
          b.style.color = 'rgba(255, 255, 255, 0.8)';
          b.style.fontWeight = '600';
          b.style.boxShadow = 'none';
          b.style.transform = 'scale(1)';
        }
      });
      console.log(`✅ Visual state updated for filter: ${filter}`);
    };

    // Wait for hiRealFeed to exist before attaching click handlers
    const attachHandlers = () => {
      if (!window.hiRealFeed) {
        console.log('⏳ Waiting for hiRealFeed...');
        // 🚀 WOZ OPTIMIZATION: Faster polling for snappier filter initialization
        setTimeout(attachHandlers, 50);
        return;
      }

      console.log('✅ hiRealFeed found, attaching filter handlers');
      
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          const filter = btn.dataset.filter || 'all';
          console.log(`🎯 Filter clicked: ${filter}`);
          
          try {
            if (window.hiRealFeed && typeof window.hiRealFeed.setOriginFilter === 'function') {
              window.hiRealFeed.setOriginFilter(filter);
              console.log(`✅ Filter applied: ${filter}`);
            } else {
              console.error('❌ hiRealFeed.setOriginFilter not available');
            }
          } catch (e) {
            console.error('❌ Origin filter set failed:', e);
          }
          setActive(filter);
        });
      });

      // Initialize state
      setActive('all');
      console.log('✅ Origin filters initialized and ready');
    };

    // Start waiting for hiRealFeed
    attachHandlers();

  } catch (e) {
    console.error('❌ Origin filter init failed:', e);
  }
}

// Jobs-style: simple "Try it" link near the primary CTA
function initializeTryItLink() {
  try {
    const link = document.getElementById('tryHiLink');
    if (!link) return;
    link.addEventListener('click', async () => {
      try {
        if (window.openHiShareSheet) {
          await window.openHiShareSheet('hi-island', { practiceMode: true });
          return;
        }
        if (window.HiShareSheet) {
          const shareSheet = new window.HiShareSheet({ origin: 'hi-island' });
          if (shareSheet.init) await shareSheet.init();
          shareSheet.practiceMode = true;
          await shareSheet.open({ practiceMode: true });
          return;
        }
        alert('Hi Share is loading... Please try again in a moment.');
      } catch (err) {
        console.error('Try it flow failed:', err);
      }
    });
    console.log('✅ Try it link initialized');
  } catch (e) {
    console.warn('⚠️ Try it link init failed:', e);
  }
}

function checkTabAccess(tabName) {
  return true;
}

async function handleTabSwitch(tabName) {
  console.log('🎯 Tesla-Grade Tab Switch:', tabName);
  const feedRoot = document.getElementById('hi-island-feed-root');
  if (tabName === 'general' || tabName === 'archive' || tabName === 'archives') {
    const normalized = (tabName === 'archive') ? 'archives' : tabName;
    try {
      if (window.unifiedHiIslandController) {
        await window.unifiedHiIslandController.switchTab(normalized);
      } else {
        console.error('❌ Unified controller not available');
        feedRoot.innerHTML = `
          <div class="error-state" style="padding: 40px; text-align: center; color: #ff6b6b;">
            <p>Feed system loading... Please wait or refresh the page.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('❌ Unified tab switch error:', error);
    }
    return;
  }
  switch(tabName) {
    case 'trends':
      feedRoot.innerHTML = `
        <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #495057; border-radius: 16px; margin: 20px; border: 1px solid #dee2e6;">
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <h3 style="margin: 0 0 12px 0; color: #333; font-size: 20px;">Emotional Trends Analytics</h3>
          <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.4;">Track emotional patterns, mood correlations, and personal growth insights over time.</p>
          <div style="font-size: 12px; color: #6c757d; background: rgba(111, 66, 193, 0.1); padding: 8px 16px; border-radius: 20px; display: inline-block; border: 1px solid rgba(111, 66, 193, 0.2);">
            ✨ Enhanced Tier Feature
          </div>
        </div>
      `;
      break;
    case 'milestones':
      feedRoot.innerHTML = `
        <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #495057; border-radius: 16px; margin: 20px; border: 1px solid #dee2e6;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
          <h3 style="margin: 0 0 12px 0; color: #333; font-size: 20px;">Hi Points & Milestones</h3>
          <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.4;">Celebrate achievements, track streaks, and unlock badges as you build your Hi journey.</p>
          <div style="font-size: 12px; color: #6c757d; background: rgba(253, 126, 20, 0.1); padding: 8px 16px; border-radius: 20px; display: inline-block; border: 1px solid rgba(253, 126, 20, 0.2);">
            🏆 Enhanced Tier Feature
          </div>
        </div>
      `;
      break;
    case 'show':
      feedRoot.innerHTML = `
        <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #495057; border-radius: 16px; margin: 20px; border: 1px solid #dee2e6;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎭</div>
          <h3 style="margin: 0 0 12px 0; color: #333; font-size: 20px;">Hi Show Premium</h3>
          <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.4;">Exclusive curated content, featured stories, and premium community highlights.</p>
          <div style="font-size: 12px; color: #6c757d; background: rgba(111, 66, 193, 0.15); padding: 8px 16px; border-radius: 20px; display: inline-block; border: 1px solid rgba(111, 66, 193, 0.3);">
            ⭐ Lifetime Tier Feature
          </div>
        </div>
      `;
      break;
    default:
      console.warn('Unknown tab:', tabName);
  }
}

function initializeHiMap() {
  try {
    if (typeof L === 'undefined') {
      console.warn('⚠️ Leaflet not loaded, map will be hidden');
      return;
    }
    const mapElement = document.getElementById('globe');
    if (!mapElement) {
      console.warn('⚠️ Map element not found');
      return;
    }
    const map = L.map('globe', {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
    // Resolve Supabase client (align with HiRealFeed/HiDB resolution order)
    const resolveSupabase = () => {
      if (window.getSupabase) {
        const c = window.getSupabase();
        if (c) return c;
      }
      if (window.__HI_SUPABASE_CLIENT) return window.__HI_SUPABASE_CLIENT;
      if (window.supabaseClient) return window.supabaseClient;
      if (window.sb) return window.sb;
      if (window.supabase?.createClient) {
        const url = 'https://gfcubvroxgfvjhacinic.supabase.co';
        const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';
        return window.supabase.createClient(url, key, {
          auth: {
            persistSession: true,  // 🎯 FIX: Keep users logged in across browser restarts
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      }
      return null;
    };

    const supabase = resolveSupabase();
    const membershipTier = (window.HiMembership?.get?.()?.tier || 'free').toLowerCase();

    const sampleLocations = [
      { lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
      { lat: 40.7128, lng: -74.0060, name: 'New York' },
      { lat: 51.5074, lng: -0.1278, name: 'London' },
      { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
      { lat: -33.8688, lng: 151.2093, name: 'Sydney' }
    ];
    const makeWaveMarker = (location) => {
      const waveIcon = L.divIcon({
        html: '<div class="wave-marker">👋</div>',
        className: 'custom-wave-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -16]
      });
      return L.marker([location.lat, location.lng], { icon: waveIcon }).bindPopup(`Hi from ${location.name}! 👋`);
    };

    const addMarkers = (locations) => {
      if (typeof L.markerClusterGroup === 'function') {
        const cluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 60,
          iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            const html = `
              <div class="hi-cluster">
                <span class="hi-cluster__emoji">👋</span>
                <span class="hi-cluster__count">${count}</span>
              </div>`;
            return L.divIcon({ html, className: 'hi-cluster-wrapper', iconSize: [44, 44] });
          }
        });
        locations.map(makeWaveMarker).forEach(m => cluster.addLayer(m));
        map.addLayer(cluster);
      } else {
        locations.map(makeWaveMarker).forEach(m => m.addTo(map));
      }
    };

    const geocodeIfNeeded = async (records) => {
      const locations = [];
      console.log(`🗺️ Geocoding ${records.length} records...`);
      for (const r of records) {
        let name = r.location || null;
        // Fallback: attempt to parse a plausible location from content like "City, ST" or "City, Country"
        if (!name && typeof r.content === 'string') {
          const m = r.content.match(/([A-Za-z\-\.\s]+,\s*[A-Za-z\-\.\s]+)/);
          if (m && m[1]) name = m[1].trim();
        }
        if (!name) continue;
        // If GeocodingService exists, attempt geocoding; else skip
        if (window.GeocodingService?.geocode) {
          try {
            const res = await window.GeocodingService.geocode(name);
            if (res && res.lat && res.lng) {
              locations.push({ lat: res.lat, lng: res.lng, name });
              console.log(`✅ Geocoded: ${name} → ${res.lat}, ${res.lng}`);
            } else {
              console.log(`❌ Failed to geocode: ${name}`);
            }
          } catch (e) {
            console.log(`❌ Geocoding error for ${name}:`, e.message);
          }
        }
      }
      console.log(`🗺️ Geocoded ${locations.length} of ${records.length} records`);
      return locations;
    };

    (async () => {
      try {
        if (!supabase) {
          console.warn('⚠️ Supabase client unavailable for map; showing sample locations');
          addMarkers(sampleLocations);
          return;
        }
        // Prefer tier-aware RPC, fallback to normalized view, then table
        let records = [];
        try {
          const { data, error } = await supabase.rpc('get_public_shares_map_tier', { p_tier: membershipTier });
          if (!error && Array.isArray(data)) {
            records = data;
          }
        } catch {}
        if (!records.length) {
          try {
            const { data, error } = await supabase.from('public_shares_map').select('*').order('created_at', { ascending: false }).limit(200);
            if (!error && Array.isArray(data)) {
              records = data;
            }
          } catch {}
        }
        if (!records.length) {
          // Minimal fallback: public shares with location
          const { data } = await supabase.from('public_shares').select('id, location, content, created_at, is_public, is_anonymous').eq('is_public', true).not('location', 'is', null).order('created_at', { ascending: false }).limit(200);
          records = Array.isArray(data) ? data : [];
        }
        const locations = await geocodeIfNeeded(records);
        if (locations.length) {
          addMarkers(locations);
        } else {
          console.warn('⚠️ No geocoded locations; showing sample markers');
          addMarkers(sampleLocations);
        }
      } catch (e) {
        console.warn('⚠️ Map data load failed:', e);
        addMarkers(sampleLocations);
      }
    })();
    // Ensure proper sizing on mobile after layout/keyboard changes
    try {
      setTimeout(() => { try { map.invalidateSize(false); } catch{} }, 300);
      window.addEventListener('resize', () => { try { map.invalidateSize(false); } catch{} });
    } catch {}
    console.log('✅ Hi Island map initialized');
  } catch (error) {
    console.warn('⚠️ Map initialization failed:', error);
  }
}

// Unified alias for external modules expecting legacy refresh name
window.loadCurrentStatsFromDatabase = async () => {
  try { await loadRealStats(); } catch(e){ console.warn('Unified stats refresh failed:', e); }
};

// Refresh on page visibility/pageshow to keep stats fresh across revisits
(function(){
      // 🔒 Disable HiBase share writes on Hi Island to ensure single writer path
      try {
        if (window.HiFlags && typeof window.HiFlags.set === 'function') {
          window.HiFlags.set('hibase_shares_enabled', false);
          console.log('🔒 Disabled HiBase share writes (single-writer: HiDB)');
        }
      } catch (e) {
        console.warn('⚠️ Could not set HiFlags.hibase_shares_enabled:', e);
      }
  let lastFetchAt = 0;
  const MIN_FETCH_INTERVAL = 3000; // 3s guard
  function safeRefresh(){
    const now = Date.now();
    if (now - lastFetchAt < MIN_FETCH_INTERVAL) return;
    lastFetchAt = now;
    try { loadCurrentStatsFromDatabase(); } catch(e){ console.warn('Island stats refresh failed:', e); }
  }
  window.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') safeRefresh(); });
  
  // 🎯 BFCache: Re-initialize on navigation back
  window.addEventListener('pageshow', (e)=>{ 
    if (e.persisted) {
      console.log('🔄 BFCache restore - refreshing Hi Island...');
      initHiIsland();
    } else if (document.visibilityState==='visible') {
      safeRefresh();
    }
  });
})();

async function loadRealStats() {
  try {
    // 🚀 WOZ FIX: Add timeout to prevent infinite loading dots
    console.log('📊 Loading Hi Island global stats with timeout...');
    
    // Use unified loader for consistency
    const { loadGlobalStats } = await import('../stats/UnifiedStatsLoader.js');
    
    // Wrap with timeout if available, otherwise use directly
    let stats;
    if (window.withQueryTimeout) {
      const statsPromise = loadGlobalStats();
      const { data: statsData, timedOut } = await window.withQueryTimeout(statsPromise, 5000, 3);
      
      if (timedOut) {
        console.warn('⏱️ Stats query timed out - showing fallback');
        setFallbackStats();
        return;
      }
      stats = statsData || {};
    } else {
      // Fallback if timeout wrapper not loaded yet
      stats = await loadGlobalStats();
    }
    
    const waves = stats.waves;
    const his = stats.totalHis;
    const users = stats.totalUsers;

    const wavesEl = document.getElementById('globalHiWaves');
    const hisEl = document.getElementById('globalTotalHis');
    const usersEl = document.getElementById('globalTotalUsers');
    
    // Show 0 instead of ... if no data
    if (wavesEl) wavesEl.textContent = Number.isFinite(waves) ? Number(waves).toLocaleString() : '0';
    if (hisEl) hisEl.textContent = Number.isFinite(his) ? Number(his).toLocaleString() : '0';
    if (usersEl) usersEl.textContent = Number.isFinite(users) ? Number(users).toLocaleString() : '0';
    
    console.log('✅ Hi Island stats loaded:', { waves, his, users, source: stats._source });
  } catch (err) {
    console.error('❌ Stats loading error:', err);
    setFallbackStats();
  }
}

function setFallbackStats() {
  const elements = {
    globalHiWaves: document.getElementById('globalHiWaves'),
    globalTotalHis: document.getElementById('globalTotalHis'),
    globalTotalUsers: document.getElementById('globalTotalUsers')
  };
  const cachedWaves = localStorage.getItem('globalHiWaves');
  const cachedHis = localStorage.getItem('globalTotalHis');  
  const cachedUsers = localStorage.getItem('globalTotalUsers');
  
  // 🚀 WOZ FIX: Show 0 instead of stuck loading dots
  if (elements.globalHiWaves) {
    elements.globalHiWaves.textContent = cachedWaves ? Number(cachedWaves).toLocaleString() : '0';
  }
  if (elements.globalTotalHis) {
    elements.globalTotalHis.textContent = cachedHis ? Number(cachedHis).toLocaleString() : '0';
  }
  if (elements.globalTotalUsers) {
    elements.globalTotalUsers.textContent = cachedUsers ? Number(cachedUsers).toLocaleString() : '0';
  }
  
  console.log('📊 Showing fallback stats:', { waves: cachedWaves || '0', his: cachedHis || '0', users: cachedUsers || '0' });
}

// If stats debug requested, load overlay
try {
  const qp = new URLSearchParams(location.search);
  if (qp.get('debugstats') === '1' || window.__HI_STATS_DEBUG__ === true) {
    import('../stats/StatsDebugOverlay.js').catch(()=>{});
  }
} catch {}

window.handleShareSuccess = function(shareData) {
  console.log('✅ Hi-Island share successful! Data goes to REAL database:', shareData);
  setTimeout(() => {
    if (window.hiIslandIntegration) {
      window.refreshHiIslandFeed?.();
      console.log('🔄 REAL Hi-Island feed refreshed after share');
    } else if (window.hiRealFeed) {
      // 🎯 FIX: Call the actual method that exists
      if (typeof window.hiRealFeed.loadGeneralSharesFromPublicShares === 'function') {
        window.hiRealFeed.pagination.general.page = 0; // Reset to show latest
        window.hiRealFeed.loadGeneralSharesFromPublicShares();
        console.log('🔄 REAL feed system refreshed after share');
      } else {
        console.warn('⚠️ loadGeneralSharesFromPublicShares not available');
      }
    } else {
      console.warn('⚠️ REAL feed system not available for refresh');
    }
  }, 1000);
  setTimeout(() => { window.loadCurrentStatsFromDatabase(); }, 1500);
};

window.handleDropHiClick = async function() {
  console.time('🔍 DROP_HI_CLICK_TOTAL');
  const button = document.getElementById('dropHiButton');
  if (!button) return;
  if (button.classList.contains('loading') || button.disabled) {
    return;
  }
  console.log('🔍 DROP_HI: Button clicked, starting...');
  button.classList.add('loading');
  button.disabled = true;
  try {
    console.log('🔍 DROP_HI: Getting user type...');
    const userType = await getUserTypeWithFallbacks();
    console.log('🔍 [DROP HI] User type detected:', userType);
    if (userType === 'anonymous') {
      console.log('🔒 [DROP HI] Anonymous user - showing auth modal');
      button.classList.remove('loading');
      button.disabled = false;
      return await handleAnonymousDropHi();
    }
    const isAuthenticated = userType !== 'anonymous';
    if (!isAuthenticated) {
      console.log('🔒 User not authenticated - showing sign-in prompt');
      button.classList.remove('loading');
      button.disabled = false;
      if (window.showAuthModal && typeof window.showAuthModal === 'function') {
        await window.showAuthModal('To drop a Hi on the island, please sign in first.');
        return;
      }
      window.location.href = '/auth.html?redirect=hi-island.html&action=drop-hi';
      return;
    }
    // 🎯 AUTHENTICATED: All tiers can access share sheet
    // Tier enforcement happens INSIDE HiShareSheet.js (lines 328-377)
    console.log('🔍 DROP_HI: Getting membership...');
    const membership = window.HiMembership?.get?.();
    console.log('✅ [DROP HI] Authenticated user - opening share sheet for tier:', membership?.tier || 'unknown');
    
    console.log('🔍 DROP_HI: Checking hiIslandShareSheet...');
    if (window.hiIslandShareSheet && typeof window.hiIslandShareSheet.open === 'function') {
      console.time('🔍 SHARESHEET_OPEN_CALL');
      await window.hiIslandShareSheet.open();
      console.timeEnd('🔍 SHARESHEET_OPEN_CALL');
      console.log('✅ Opened Hi-Island share sheet (initialized)');
      console.timeEnd('🔍 DROP_HI_CLICK_TOTAL');
      return;
    }
    
    console.log('🔍 DROP_HI: Checking openHiShareSheet...');
    if (window.openHiShareSheet && typeof window.openHiShareSheet === 'function') {
      console.time('🔍 SHARESHEET_OPEN_CALL');
      await window.openHiShareSheet('hi-island');
      console.timeEnd('🔍 SHARESHEET_OPEN_CALL');
      console.log('✅ Opened via global HiShareSheet trigger');
      console.timeEnd('🔍 DROP_HI_CLICK_TOTAL');
      return;
    }
    
    console.log('🔍 DROP_HI: Creating new HiShareSheet...');
    if (window.HiShareSheet) {
      const shareSheet = new window.HiShareSheet({ 
        origin: 'hi-island',
        onSuccess: (shareData) => {
          console.log('🎉 Hi-Island share success:', shareData);
          if (window.handleShareSuccess) {
            window.handleShareSuccess(shareData);
          }
        },
        onError: (error) => {
          console.error('❌ Hi-Island share error:', error);
        }
      });
      if (shareSheet.init) {
        await shareSheet.init();
        await shareSheet.open();
        console.log('✅ Created and opened new Hi Share Sheet instance');
      } else {
        await shareSheet.open();
        console.log('✅ Opened new Hi Share Sheet instance (no init required)');
      }
      return;
    }
    if (window.HiComposer && typeof window.HiComposer.open === 'function') {
      await window.HiComposer.open();
      console.log('✅ Opened legacy Hi Composer');
      return;
    }
    console.error('🚨 All Hi Composer systems failed');
    if (window.HiModal && window.HiModal.alert) {
      window.HiModal.alert(
        'Hi Share is loading... Please try again in a moment!',
        'Loading Hi Composer'
      );
    } else if (confirm('Hi Share is loading... Would you like to try again?')) {
      setTimeout(() => window.handleDropHiClick(), 1000);
    }
  } catch (error) {
    console.error('🚨 Drop Hi button error:', error);
    if (window.HiModal && window.HiModal.alert) {
      window.HiModal.alert(
        'Something went wrong. Please refresh the page and try again.',
        'Error Opening Hi Composer'
      );
    } else {
      alert('Something went wrong. Please refresh the page and try again.');
    }
  } finally {
    setTimeout(() => {
      if (button) {
        button.classList.remove('loading');
        button.disabled = false;
      }
    }, 500);
  }
};

async function getUserTypeWithFallbacks() {
  try {
    // 🎯 FIX #1: Check HiMembership FIRST (most reliable)
    if (window.HiMembership?.get) {
      const membership = window.HiMembership.get();
      if (membership && !membership.isAnonymous) {
        console.log('✅ [DROP HI] User authenticated via HiMembership:', membership.tier);
        return membership.tier === 'premium' ? 'premium' : 'authenticated';
      }
    }
    
    // 🎯 FIX #2: Check Supabase session directly
    if (window.supabaseClient?.auth) {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session?.user) {
        console.log('✅ [DROP HI] User authenticated via Supabase session');
        return 'authenticated';
      }
    }
    
    // Fallback: legacy auth check
    if (window.checkAuthentication && typeof window.checkAuthentication === 'function') {
      const isAuth = await window.checkAuthentication();
      if (isAuth) {
        const userTier = await window.getUserTier?.() || 'basic';
        return userTier === 'premium' ? 'premium' : 'authenticated';
      }
    }
    
    if (window.hiDB?.supabase?.auth) {
      const { data: { user } } = await window.hiDB.supabase.auth.getUser();
      if (user) {
        return 'authenticated';
      }
    }
    
    const session = localStorage.getItem('hiUserSession');
    if (session && session !== 'null') {
      return 'authenticated';
    }
    
    console.log('ℹ️ [DROP HI] No authentication found, user is anonymous');
    return 'anonymous';
  } catch (error) {
    console.warn('⚠️ [DROP HI] User type detection failed:', error);
    return 'anonymous';
  }
}

async function handleAnonymousDropHi() {
  console.log('🎯 [DROP HI] Showing anonymous auth modal');
  if (window.showAuthModal && typeof window.showAuthModal === 'function') {
    await window.showAuthModal('🏝️ Join Hi Island to drop your moments and connect with the community!');
    return;
  }
  // Unified gating first
  if(window.AccessGate?.request){
    const decision = window.AccessGate.request('drop_hi');
    if(!decision.allow){ return; }
  } else if (window.showAnonymousAccessModal && typeof window.showAnonymousAccessModal === 'function') {
    await window.showAnonymousAccessModal('drop_hi');
    return;
  }
  const modalHTML = `
    <div id="dropHiAuthModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(10px);">
      <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%); border-radius: 24px; padding: 48px; max-width: 480px; margin: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 209, 102, 0.3);">
        <div style="text-align: center;">
          <div style="font-size: 64px; margin-bottom: 24px;">🏝️</div>
          <h2 style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">Drop Your Hi on the Island</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">Join our community to share your moments, connect with others, and be part of the Hi Island experience.</p>
          <div style="display: flex; gap: 16px; justify-content: center;">
            <button onclick="handleAuthAction('signin')" style="background: linear-gradient(135deg, #FF7A18 0%, #FFD166 100%); color: #1a1a1a; border: none; padding: 16px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer;">Sign In</button>
            <button onclick="handleAuthAction('signup')" style="background: rgba(255, 122, 24, 0.1); color: #FF7A18; border: 2px solid rgba(255, 122, 24, 0.3); padding: 14px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer;">Create Account</button>
          </div>
          <button onclick="closeAuthModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">×</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  window.handleAuthAction = (action) => {
    closeAuthModal();
    if (action === 'signin') {
      window.location.href = '/auth.html?mode=signin&redirect=hi-island.html&action=drop-hi';
    } else {
      window.location.href = '/auth.html?mode=signup&redirect=hi-island.html&action=drop-hi';
    }
  };
  window.closeAuthModal = () => {
    const modal = document.getElementById('dropHiAuthModal');
    if (modal) modal.remove();
  };
}

async function getDropHiAccessLevel(userType) {
  try {
    if (window.checkHiFeatureAccess && typeof window.checkHiFeatureAccess === 'function') {
      const hasAccess = await window.checkHiFeatureAccess('drop_hi', 'drop-hi');
      if (hasAccess) {
        return { allowed: true, level: userType };
      } else {
        return { allowed: false, reason: 'tier_limitation', userType };
      }
    }
    return { allowed: true, level: userType };
  } catch (error) {
    console.warn('⚠️ [DROP HI] Access check failed:', error);
    return { allowed: true, level: userType };
  }
}

async function handleAccessDenied(accessLevel) {
  console.log('🔒 [DROP HI] Handling access denied:', accessLevel);
  if (window.showUpgradeModal && typeof window.showUpgradeModal === 'function') {
    await window.showUpgradeModal('drop_hi');
  } else {
    alert('⭐ Upgrade to Premium to drop unlimited Hi moments on the island!');
  }
}

async function openHiComposerWithUserContext(userType, accessLevel) {
  console.log('✅ [DROP HI] Opening composer for', userType, accessLevel);
  try {
    if (window.hiIslandShareSheet && typeof window.hiIslandShareSheet.open === 'function') {
      await window.hiIslandShareSheet.open();
      return;
    }
    if (window.openHiShareSheet && typeof window.openHiShareSheet === 'function') {
      await window.openHiShareSheet('hi-island');
      return;
    }
    if (window.HiShareSheet) {
      const shareSheet = new window.HiShareSheet({ 
        origin: 'hi-island',
        userType: userType,
        onSuccess: (shareData) => {
          console.log('🎉 Hi-Island share success:', shareData);
        }
      });
      await shareSheet.open();
      return;
    }
    console.warn('⚠️ [DROP HI] No share system available');
    alert('Hi Share system is loading... Please try again in a moment.');
  } catch (error) {
    console.error('❌ [DROP HI] Composer error:', error);
    alert('Something went wrong. Please try again.');
  } finally {
    const button = document.getElementById('dropHiButton');
    if (button) {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }
}

window.openHiComposer = window.handleDropHiClick;
window.openHiComposer.showFallbackAlert = function() {
  console.warn('⚠️ No Hi Share functionality available - showing fallback');
  if (confirm('Hi Share is loading... Would you like to try again?')) {
    setTimeout(() => {
      window.openHiComposer();
    }, 1000);
  } else {
    console.log('ℹ️ User cancelled Hi Share attempt');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHiIsland);
} else {
  initHiIsland();
}
