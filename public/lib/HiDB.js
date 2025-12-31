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

  /**
   * WOZ FIX: Use ProfileManager for guaranteed user_id
   * Legacy wrapper - prefer ProfileManager.ensureUserId() directly
   */
  async function getUserId() {
    try {
      // If ProfileManager is ready, use it (never returns null)
      if (window.ProfileManager?.isReady()) {
        return await window.ProfileManager.ensureUserId();
      }
      
      // Fallback to direct auth check (legacy)
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
  // SIMPLE LOGIC: Hi Gym = emojis + #higym | Hi Island/Dashboard = text + #hi5 only
  function createShareContent(entry) {
    const parts = [];
    const origin = entry.origin || entry.type || 'hi5';
    const isHiGym = origin === 'higym' || origin === 'hi-gym';
    
    // Only add emoji journey for Hi Gym shares
    if (isHiGym) {
      if (entry.currentEmoji && entry.currentName) {
        parts.push(`${entry.currentEmoji} ${entry.currentName}`);
      }
      
      if (entry.desiredEmoji && entry.desiredName) {
        const arrow = parts.length > 0 ? ' → ' : '';
        parts.push(`${arrow}${entry.desiredEmoji} ${entry.desiredName}`);
      }
    }
    
    // Add user text if provided
    if (entry.text) {
      const separator = parts.length > 0 ? '\n\n' : '';
      parts.push(`${separator}${entry.text}`);
    }
    
    // Add tag based on origin
    const tag = isHiGym ? ' #higym' : ' #hi5';
    const content = parts.join('') || 'Hi!';
    
    // Add location if available
    const locationTag = entry.location ? ` 📍 ${entry.location}` : '';
    
    return content + tag + locationTag;
  }

  // 🎯 PHASE 1: Schema-aligned public share insertion
  // 🚀 TESLA ENHANCED: insertPublicShare with enhanced visibility controls
  async function insertPublicShare(entry) {
    let user_id = null;
    let avatar_url = null;
    let display_name = null;
    
    // Tesla Enhancement: Support provided user_id or get from auth
    if (entry.user_id) {
      user_id = entry.user_id;
    } else if (!entry.isAnonymous) {
      user_id = await getUserId();
    }
    
    // 🎯 TESLA FIX: Snapshot user profile data at share time for immutable history
    if (user_id && !entry.isAnonymous) {
      try {
        const supa = getSupabase();
        if (supa) {
          const { data: profile } = await supa
            .from('profiles')
            .select('avatar_url, display_name, username')
            .eq('id', user_id)
            .single();
          
          if (profile) {
            avatar_url = profile.avatar_url;
            display_name = profile.display_name || profile.username || 'Hi Friend';
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch profile for avatar snapshot:', error);
        // Continue without avatar - not critical
      }
    }
    
    // Use user's text exactly as they typed it
    const shareText = entry.text || '';
    
    console.log('🎯 Tesla insertPublicShare:', { 
      user_id, 
      text: shareText.substring(0, 50), 
      visibility: entry.isAnonymous ? 'anonymous' : 'public',
      entry 
    });
    
    // ⚠️ MINIMAL SCHEMA: Only sending columns PostgREST cache definitely knows about
    // Omitting: origin, pill, username, display_name, avatar_url (cache not refreshed yet)
    // TODO: After Supabase schema cache refresh, add back: origin, pill
    const row = {
      user_id: user_id || null,
      content: shareText
      // location, visibility also omitted until cache refreshed
    };
    
    // Note: created_at is auto-generated by database
    // Note: id is auto-generated by database

    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      // 🎯 WOZ FIX: Use RPC with full emoji support
      const rpcParams = {
        p_content: shareText,
        p_visibility: entry.isAnonymous ? 'anonymous' : (entry.isPublic !== false ? 'public' : 'private'),
        p_origin: entry.metadata?.origin || entry.origin || 'unknown',
        p_pill: entry.pill || null,
        p_location: entry.location || null,
        p_user_id: user_id || null,
        p_current_emoji: entry.currentEmoji || '👋',
        p_desired_emoji: entry.desiredEmoji || '✨',
        p_hi_intensity: entry.hi_intensity || null // 🎯 Hi Scale: Optional intensity rating (1-5)
      };
      console.log('📤 RPC Parameters:', rpcParams);
      
      const { data: rpcResult, error: rpcError } = await supa.rpc('create_public_share', rpcParams);
      
      if (rpcError) {
        console.error('❌ RPC create_public_share failed:', rpcError);
        throw rpcError;
      }
      
      console.log('✅ Public share inserted via RPC:', rpcResult);
      // Fetch latest to reflect new row in UI
      try {
        const fresh = await supa
          .from('public_shares')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        const ui = normalizePublicRow((fresh?.data || [])[0] || row);
        pushLS(LS_GENERAL, ui);
        return { ok: true, data: ui, source: "db", teslaEnhanced: true };
      } catch(_) {
        return { ok: true, data: row, source: "db", teslaEnhanced: true };
      }
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
    // Use user's journal text exactly as they typed it (runtime schema uses 'journal')
    const journalText = entry.journal || entry.text || '';
    
    console.log('🎯 Tesla insertArchive:', { 
      user_id, 
      journal: journalText.substring(0, 50),
      origin: entry.origin,
      type: entry.type,
      computed_type: entry.type || 'general',
      metadata_origin: entry.metadata?.origin // 🔬 DEBUG: Show both entry.origin and metadata.origin
    });
    
    // ✅ ACTUAL hi_archives SCHEMA (verified from runtime logs):
    // id, user_id, current_emoji, desired_emoji, journal, location, created_at, origin, type, text, content, current_name, desired_name, hi_intensity
    const row = {
      user_id,
      journal: journalText,
      current_emoji: entry.currentEmoji || '👋',
      current_name: entry.currentName || 'Hi',
      desired_emoji: entry.desiredEmoji || '✨',
      desired_name: entry.desiredName || 'Goal',
      location: entry.location || null,
      origin: entry.metadata?.origin || entry.origin || 'unknown', // Add origin for filtering
      type: entry.type || 'general', // Add type for categorization
      text: entry.text || journalText, // Add text field
      content: entry.text || journalText, // Add content field (duplicate for compatibility)
      hi_intensity: entry.hi_intensity || null // 🎯 Hi Scale: Optional intensity rating (1-5)
    };
    const minimalRow = { user_id, journal: journalText };
    
    // NOTE: Avoid writing non-existent columns (location_data, metadata)

    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      // 🎯 TESLA FIX: Skip broken RPC (only accepts p_journal, ignores type/origin)
      // Use direct insert with full row to preserve type/origin for correct pill colors
      console.log('🧪 Archive insert: using direct insert (full row with type/origin)');
      const { error: insErrFull } = await supa.from("hi_archives").insert(row);
      if (insErrFull) {
        console.warn('⚠️ Direct insert (full row) failed, trying minimal:', insErrFull);
        const { error: insErrMin } = await supa.from("hi_archives").insert(minimalRow);
        if (insErrMin) {
          console.error('❌ Direct insert (minimal) failed:', insErrMin);
          throw insErrMin;
        }
        console.log('✅ Archive inserted with minimal row');
      } else {
        console.log('✅ Archive inserted with full row (type/origin preserved)');
      }
      console.log('✅ Tesla archive inserted successfully');
      // Fetch latest user archive to update UI (skip for anonymous - user_id=null causes 400)
      try {
        const userId = user_id;
        if (!userId) {
          // Anonymous user: skip verification query, use inserted row
          console.log('🎭 Anonymous archive: skipping verification query');
          const uiLocal = normalizeArchiveRowFromClient(row);
          pushLS(LS_ARCHIVE, uiLocal);
          return { ok: true, data: uiLocal, source: "local", teslaEnhanced: true };
        }
        const fresh = await supa
          .from('hi_archives')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        const ui = normalizeArchiveRow((fresh?.data || [])[0] || row);
        pushLS(LS_ARCHIVE, ui);
        return { ok: true, data: ui, source: "db", teslaEnhanced: true };
      } catch(_) {
        const uiLocal = normalizeArchiveRowFromClient(row);
        pushLS(LS_ARCHIVE, uiLocal);
        return { ok: true, data: uiLocal, source: "db", teslaEnhanced: true };
      }
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
    return {
      id: r.id,
      currentEmoji: r.current_emoji || '👋',
      currentName: '',
      desiredEmoji: r.desired_emoji || '✨',
      desiredName: '',
      text: r.text || '', // ACTUAL SCHEMA: 'text' column
      isAnonymous: false,
      userName: 'You',
      location: r.location || '',
      createdAt: r.created_at,
      origin: r.origin || 'quick',
      type: r.type || 'self_hi5'
    };
  }
  
  function normalizePublicRowFromClient(row) {
    return {
      id: 'local_' + Date.now(),
      currentEmoji: row.current_emoji || '👋',
      currentName: '',
      desiredEmoji: row.desired_emoji || '✨', 
      desiredName: '',
      text: row.text || '',
      isAnonymous: false,
      userName: 'You',
      location: row.location || '',
      createdAt: new Date().toISOString(),
      origin: row.origin || 'quick',
      type: row.type || 'self_hi5'
    };
  }

  function normalizeArchiveRow(r) {
    return {
      id: r.id,
      currentEmoji: r.current_emoji || '👋',
      currentName: '',
      desiredEmoji: r.desired_emoji || '✨',
      desiredName: '',
      journalEntry: r.journal || r.text || '', // ACTUAL SCHEMA: 'journal' column
      text: r.journal || r.text || '', // Feed uses 'text', map from journal
      isAnonymous: false,
      userName: 'You',
      location: r.location || '',
      origin: r.origin || 'hi5',
      type: r.type || 'self_hi5',
      createdAt: r.created_at,
    };
  }
  
  function normalizeArchiveRowFromClient(row) {
    return {
      id: 'local_' + Date.now(),
      currentEmoji: row.current_emoji || '👋',
      currentName: '',
      desiredEmoji: row.desired_emoji || '✨',
      desiredName: '',
      journalEntry: row.content || row.journal || '',
      text: row.content || row.journal || '', // Feed uses 'text'
      isAnonymous: row.visibility === 'anonymous',
      userName: row.visibility === 'anonymous' ? "Hi Friend" : "You",
      location: row.location || '',
      origin: 'hi-island',
      type: row.share_type || 'self_hi5',
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

  // Wave Back RPC helper: idempotent per user/share, returns current count
  async function waveBack(shareId, userId = null) {
    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      const { data, error } = await supa.rpc('wave_back', { p_share_id: shareId, p_user_id: userId });
      if (error) throw error;
      return { ok: true, ...data };
    } catch (e) {
      console.error('❌ waveBack failed:', e);
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
    waveBack,
    trackShareStats, // Tesla enhancement
    teslaEnhanced: true // Tesla marker
  };

  // Auto-sync after auth
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { syncPending(); }, 1000);
    window.addEventListener("online", () => { syncPending(); });
  });

})();