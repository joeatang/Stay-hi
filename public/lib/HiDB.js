/**
 * lib/HiDB.js - PHASE 1 TESLA-GRADE CLEAN VERSION
 * Schema-aligned Hi Island database layer
 * ✅ Matches actual production database schema
 * ✅ Unified Supabase client management 
 * ✅ Non-blocking operations for smooth UX
 */

(function() {
  'use strict';

  // === CONSTANTS ===
  const LS_GENERAL = "hi_general_shares";
  const LS_ARCHIVE = "hi_my_archive";
  const LS_PENDING = "hi_pending_queue";

  // Helper to get Supabase client using canonical API (when available)
  function getSupabase() {
    // Use canonical getClient if HiSupabase module is loaded
    if (typeof window.HiSupabase?.getClient === 'function') {
      try {
        return window.HiSupabase.getClient();
      } catch (error) {
        console.warn('HiDB: Canonical client unavailable, using fallback');
      }
    }
    // Fallback to legacy global references
    return window.supabaseClient || window.sb || null;
  }
  
  // Expose globally for backward compatibility with legacy scripts
  window.getSupabase = getSupabase;

  function readLS(key, def = []) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }
    catch { return def; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
  function pushLS(key, item) {
    const arr = readLS(key);
    arr.unshift(item);
    writeLS(key, arr);
  }
  function isOnline() {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  async function getUserId() {
    try {
      const supaClient = getSupabase();
      if (!supaClient) {
        console.warn('⚠️ getUserId: No Supabase client available');
        return null;
      }
      
      const { data, error } = await supaClient.auth.getUser();
      if (error) {
        console.error('❌ getUserId failed:', error);
        return null;
      }
      
      return data?.user?.id || null;
    } catch (err) {
      console.error('❌ getUserId exception:', err);
      return null;
    }
  }

  // 🎯 HELPER: Convert Hi entry format to readable content
  function createShareContent(entry) {
    const parts = [];
    
    if (entry.currentEmoji && entry.currentName) {
      parts.push(`${entry.currentEmoji} ${entry.currentName}`);
    }
    
    if (entry.desiredEmoji && entry.desiredName) {
      const arrow = parts.length > 0 ? ' → ' : '';
      parts.push(`${arrow}${entry.desiredEmoji} ${entry.desiredName}`);
    }
    
    if (entry.text) {
      const separator = parts.length > 0 ? '\n\n' : '';
      parts.push(`${separator}${entry.text}`);
    }
    
    return parts.join('') || 'Hi!';
  }

  // 🎯 PHASE 1: Schema-aligned public share insertion
  // 🚀 TESLA ENHANCED: insertPublicShare with enhanced visibility controls
  async function insertPublicShare(entry) {
    let user_id = null;
    
    // Tesla Enhancement: Support provided user_id or get from auth
    if (entry.user_id) {
      user_id = entry.user_id;
    } else if (!entry.isAnonymous) {
      user_id = await getUserId();
    }
    
    const shareContent = createShareContent(entry);
    
    console.log('🎯 Tesla insertPublicShare:', { 
      user_id, 
      content: shareContent.substring(0, 50), 
      visibility: entry.isAnonymous ? 'anonymous' : 'public',
      entry 
    });
    
    const row = {
      user_id, // null for anonymous, actual user_id for authenticated shares
      text: shareContent, // TESLA FIX: Correct field name is 'text' not 'content'
      current_emoji: entry.currentEmoji || '🙌',
      current_name: entry.currentName || null,
      desired_emoji: entry.desiredEmoji || '✨', // TESLA SCHEMA FIX: Never null (required field)
      desired_name: entry.desiredName || null,
      is_anonymous: entry.isAnonymous || false, // TESLA FIX: Correct field name
      location: entry.location || null, // TESLA FIX: Simple location field
      // TESLA SCHEMA FIX: Remove 'origin' field - doesn't exist in production schema
      type: entry.type || 'self_hi5'
    };

    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      const { data, error } = await supa.from("public_shares").insert(row).select().single();
      if (error) {
        console.error('Tesla insert to public_shares failed:', error);
        throw error;
      }

      const ui = normalizePublicRow(data);
      pushLS(LS_GENERAL, ui);
      console.log('✅ Tesla public share inserted successfully:', ui.id);
      return { ok: true, data: ui, source: "db", teslaEnhanced: true };
    } catch (e) {
      console.warn('⚠️ Tesla public share fallback to offline:', e.message);
      const uiLocal = normalizePublicRowFromClient(row);
      pushPending({ type: "public", payload: row });
      pushLS(LS_GENERAL, uiLocal);
      return { ok: false, offline: true, data: uiLocal, error: e?.message, teslaEnhanced: true };
    }
  }

  // 🎯 PHASE 1: Schema-aligned archive insertion
  // 🚀 TESLA ENHANCED: insertArchive with anonymous user support
  async function insertArchive(entry) {
    // Tesla Fix: Support provided user_id (for anonymous users) or get authenticated user_id
    const user_id = entry.user_id || await getUserId();
    const shareContent = entry.journal || createShareContent(entry);
    
    console.log('🎯 Tesla insertArchive:', { user_id, content: shareContent.substring(0, 50), entry });
    
    const row = {
      user_id,
      current_emoji: entry.currentEmoji || '🙌',
      desired_emoji: entry.desiredEmoji || '✨',
      journal: shareContent, // TESLA FIX: Correct field name is 'journal'
      text: shareContent, // TESLA FIX: Mirror to text field for consistency
      location: entry.location || null, // TESLA FIX: Simple location field
      // TESLA SCHEMA FIX: Remove 'origin' field - doesn't exist in production schema
      type: entry.type || 'self_hi5' // 'self_hi5', 'higym', etc.
    };

    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      const { data, error } = await supa.from("hi_archives").insert(row).select().single();
      if (error) {
        console.error('Tesla insert to hi_archives failed:', error);
        throw error;
      }

      const ui = normalizeArchiveRow(data);
      pushLS(LS_ARCHIVE, ui);
      console.log('✅ Tesla archive inserted successfully:', ui.id);
      return { ok: true, data: ui, source: "db", teslaEnhanced: true };
    } catch (e) {
      console.warn('⚠️ Tesla archive fallback to offline:', e.message);
      const uiLocal = normalizeArchiveRowFromClient(row);
      pushPending({ type: "archive", payload: row });
      pushLS(LS_ARCHIVE, uiLocal);
      return { ok: false, offline: true, data: uiLocal, error: e?.message, teslaEnhanced: true };
    }
  }

  // 🎯 PHASE 1: Schema-aligned public shares fetch
  async function fetchPublicShares({ limit = 50 } = {}) {
    let dbList = [];
    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      const { data, error } = await supa
        .from("public_shares")
        .select(`
          *,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      dbList = (data || []).map(row => {
        const normalized = normalizePublicRow(row);
        normalized.userId = row.user_id;
        
        if (row.profiles) {
          normalized.userName = row.profiles.display_name || row.profiles.username || normalized.userName;
          normalized.userAvatar = row.profiles.avatar_url || null;
        }
        
        if (row.visibility === 'anonymous') {
          normalized.userName = "Hi Friend";
          normalized.isAnonymous = true;
        }
        
        return normalized;
      });
    } catch (err) {
      console.warn('Public shares fetch failed, using local cache:', err);
    }

    const lsList = readLS(LS_GENERAL);
    const all = dedupeById([...dbList, ...lsList])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
    return all;
  }

  // 🎯 PHASE 1: Schema-aligned archives fetch
  async function fetchMyArchive({ limit = 200 } = {}) {
    const user_id = await getUserId();
    
    let dbList = [];
    try {
      const supaClient = getSupabase();
      
      if (user_id && supaClient) {
        const { data, error } = await supaClient
          .from("hi_archives")
          .select(`
            *,
            profiles (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        
        dbList = (data || []).map(row => {
          const normalized = normalizeArchiveRow(row);
          if (row.profiles) {
            normalized.userName = row.profiles.display_name || row.profiles.username || normalized.userName;
            normalized.userAvatar = row.profiles.avatar_url || null;
            normalized.userId = user_id;
          }
          return normalized;
        });
      }
    } catch (error) {
      console.error('❌ Archive fetch failed:', error);
    }
    
    const lsList = readLS(LS_ARCHIVE);
    const all = dedupeById([...dbList, ...lsList]).slice(0, limit);
    return all;
  }

  function dedupeById(list) {
    const seen = new Set();
    const out = [];
    for (const it of list) {
      const id = it.id || `${it.createdAt}|${it.text?.slice(0,30)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(it);
    }
    return out;
  }

  function detectOrigin() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path === '') {
      return 'quick';
    } else if (path.includes('hi-muscle.html')) {
      return 'guided';
    }
    return 'quick';
  }

  function pushPending(item) {
    const q = readLS(LS_PENDING);
    q.unshift({ ...item, queuedAt: new Date().toISOString() });
    writeLS(LS_PENDING, q);
  }

  async function syncPending() {
    const q = readLS(LS_PENDING);
    if (!q.length || !isOnline()) return { ok: true, synced: 0 };
 
    const supa = getSupabase();
    if (!supa) return { ok: false, error: 'No Supabase client', synced: 0 };
 
    let success = 0;
    let remain = [];

    for (const job of q) {
      try {
        if (job.type === "public") {
          const { error } = await supa.from("public_shares").insert(job.payload);
          if (error) throw error;
        } else if (job.type === "archive") {
          const { error } = await supa.from("hi_archives").insert(job.payload);
          if (error) throw error;
        }
        success++;
      } catch {
        remain.push(job);
      }
    }

    writeLS(LS_PENDING, remain);
    return { ok: true, synced: success, pending: remain.length };
  }

  // 🎯 NORMALIZERS: Database -> UI conversion with actual schema fields
  function normalizePublicRow(r) {
    const metadata = r.metadata || {};
    
    return {
      id: r.id,
      currentEmoji: metadata.currentEmoji || "👋",
      currentName: metadata.currentName || "",
      desiredEmoji: metadata.desiredEmoji || "✨",
      desiredName: metadata.desiredName || "",
      text: r.content, // Actual field: content (not text)
      isAnonymous: r.visibility === 'anonymous',
      userName: r.visibility === 'anonymous' ? "Hi Friend" : "You",
      location: r.location_data?.location || "", // Actual field: location_data
      createdAt: r.created_at,
      origin: metadata.origin || 'quick',
      type: metadata.type || 'self_hi5'
    };
  }
  
  function normalizePublicRowFromClient(row) {
    const metadata = row.metadata || {};
    
    return {
      id: "local_" + Date.now(),
      currentEmoji: metadata.currentEmoji || "👋",
      currentName: metadata.currentName || "",
      desiredEmoji: metadata.desiredEmoji || "✨", 
      desiredName: metadata.desiredName || "",
      text: row.content,
      isAnonymous: row.visibility === 'anonymous',
      userName: row.visibility === 'anonymous' ? "Hi Friend" : "You",
      location: row.location_data?.location || "",
      createdAt: new Date().toISOString(),
      origin: metadata.origin || 'quick',
      type: metadata.type || 'self_hi5'
    };
  }

  function normalizeArchiveRow(r) {
    const metadata = r.metadata || {};
    
    return {
      id: r.id,
      currentEmoji: metadata.currentEmoji || "👋",
      currentName: metadata.currentName || "",
      desiredEmoji: metadata.desiredEmoji || "✨",
      desiredName: metadata.desiredName || "",
      journalEntry: r.content, // Actual field: content (not journal)
      text: r.content, // Feed uses 'text', map from content
      isAnonymous: r.visibility === 'anonymous',
      userName: r.visibility === 'anonymous' ? "Hi Friend" : "You",
      location: r.location_data?.location || "", // Actual field: location_data
      origin: metadata.origin || 'hi5',
      type: metadata.type || 'self_hi5',
      createdAt: r.created_at,
    };
  }
  
  function normalizeArchiveRowFromClient(row) {
    const metadata = row.metadata || {};
    
    return {
      id: "local_" + Date.now(),
      currentEmoji: metadata.currentEmoji || "👋",
      currentName: metadata.currentName || "",
      desiredEmoji: metadata.desiredEmoji || "✨",
      desiredName: metadata.desiredName || "",
      journalEntry: row.content,
      text: row.content, // Feed uses 'text', map from content
      isAnonymous: row.visibility === 'anonymous',
      userName: row.visibility === 'anonymous' ? "Hi Friend" : "You",
      location: row.location_data?.location || "",
      origin: metadata.origin || 'hi5',
      type: metadata.type || 'self_hi5',
      createdAt: new Date().toISOString(),
    };
  }

  // Stub for map updates (handled by island.js)
  async function updateMap(payload) {
    return { ok: true };
  }

  // Profile functions
  async function fetchUserProfile(targetUserId = null) {
    const user_id = targetUserId || await getUserId();
    
    if (!user_id) {
      console.warn('⚠️ No user ID, using localStorage fallback');
      return readLS('stayhi_profile', null);
    }

    try {
      const supa = getSupabase();
      if (!supa) {
        console.warn('⚠️ No Supabase client, using localStorage');
        return readLS('stayhi_profile', null);
      }

      const { data, error } = await supa
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Profile doesn't exist yet
        }
        throw error;
      }

      if (data && !targetUserId) {
        writeLS('stayhi_profile', data);
      }

      return data;

    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      if (!targetUserId) {
        return readLS('stayhi_profile', null);
      }
      return null;
    }
  }

  async function updateProfile(updates) {
    const user_id = await getUserId();
    if (!user_id) {
      console.warn('⚠️ No user ID, saving to localStorage only');
      const current = readLS('stayhi_profile', {});
      writeLS('stayhi_profile', { ...current, ...updates });
      return { ok: true, offline: true };
    }

    try {
      const supa = getSupabase();
      if (!supa) {
        console.warn('⚠️ No Supabase client, using localStorage');
        const current = readLS('stayhi_profile', {});
        writeLS('stayhi_profile', { ...current, ...updates });
        return { ok: true, offline: true };
      }

      const profileData = {
        id: user_id,
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supa
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        writeLS('stayhi_profile', data);
      }

      return { ok: true, data };

    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      
      const current = readLS('stayhi_profile', {});
      writeLS('stayhi_profile', { ...current, ...updates });
      
      return { ok: false, error: error.message, offline: true };
    }
  }

  // Global counters
  async function incrementHiWave() {
    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      const { data, error } = await supa.rpc('increment_hi_wave');
      if (error) throw error;
      
      return { ok: true, data };
    } catch (e) {
      console.warn('⚠️ Failed to increment Hi Wave:', e);
      return { ok: false, error: e.message };
    }
  }

  async function incrementTotalHi() {
    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      const { error } = await supa.rpc('increment_total_hi');
      if (error) throw error;
      
      return { ok: true };
    } catch (e) {
      console.error('❌ Failed to increment Total Hi:', e);
      return { ok: false, error: e.message };
    }
  }

  // Month activity stub (simplified for Phase 1)
  async function fetchMonthActivity(year, month) {
    return { days: {}, monthCount: 0, currentStreak: 0, bestStreak: 0 };
  }

  // 🚀 TESLA ENHANCEMENT: Comprehensive stats tracking for all share types
  async function trackShareStats(shareType, visibility, origin, metadata = {}) {
    try {
      console.log('📊 Tesla tracking stats:', { shareType, visibility, origin, metadata });
      
      const supa = getSupabase();
      if (!supa) {
        console.warn('Tesla stats: No Supabase client, storing locally');
        return { ok: false, error: 'No client' };
      }

      // Tesla Enhancement: Track stats for ALL share types (not just public)
      const statsPayload = {
        share_type: shareType || 'hi5',
        visibility: visibility || 'public',
        origin: origin || 'unknown',
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          teslaEnhanced: true
        }
      };

      // Call database function for comprehensive stats tracking
      const { data, error } = await supa.rpc('track_share_stats', statsPayload);
      
      if (error) {
        console.warn('Tesla stats tracking failed:', error);
        return { ok: false, error: error.message };
      }

      console.log('✅ Tesla stats tracked successfully:', data);
      return { ok: true, data, teslaEnhanced: true };
      
    } catch (e) {
      console.warn('Tesla stats tracking error:', e);
      return { ok: false, error: e.message };
    }
  }

  // 🚀 TESLA ENHANCED PUBLIC API - Complete Export
  window.hiDB = {
    isOnline,
    insertPublicShare,
    insertArchive,
    fetchPublicShares,
    fetchMyArchive,
    syncPending,
    updateMap,
    fetchMonthActivity,
    fetchUserProfile,
    updateProfile,
    incrementHiWave,
    incrementTotalHi,
    trackShareStats, // Tesla enhancement
    teslaEnhanced: true // Tesla marker
  };

  // Auto-sync after auth
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { syncPending(); }, 1000);
    window.addEventListener("online", () => { syncPending(); });
  });

})();