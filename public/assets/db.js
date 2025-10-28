/**
 * hiDB — super small Supabase wrapper with localStorage fallback.
 * Requires:
 *   - assets/supabase-init.js  (window.supabase)
 *   - assets/auth.js           (optional, but nice to have)
 *
 * Tables (from Step 7A):
 *   - public.public_shares
 *   - public.hi_archives
 *
 * Local fallbacks:
 *   - hi_general_shares  (array)
 *   - hi_my_archive      (array)
 *   - hi_pending_queue   (array of {type:'public'|'archive', payload})
 */

(function () {
  const LS_GENERAL = "hi_general_shares";
  const LS_ARCHIVE = "hi_my_archive";
  const LS_PENDING = "hi_pending_queue";

  // Helper to get fresh Supabase client reference (timing-safe)
  function getSupabase() {
    return window.supabaseClient || window.sb || null;
  }
  // Expose globally for other scripts
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
    // Basic check; DB errors still need try/catch
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }
  async function getUserId() {
    try {
      // Always get fresh reference to avoid timing issues
      const supaClient = window.supabaseClient || window.sb;
      if (!supaClient) {
        console.warn('⚠️ getUserId: No Supabase client available');
        return null;
      }
      
      const { data, error } = await supaClient.auth.getUser();
      if (error) {
        console.error('❌ getUserId failed:', error);
        return null;
      }
      
      const userId = data?.user?.id || null;
      console.log('🔑 getUserId:', userId ? userId.slice(0, 8) + '...' : 'null');
      return userId;
    } catch (err) {
      console.error('❌ getUserId exception:', err);
      return null;
    }
  }

  async function insertPublicShare(entry) {
    // entry = { currentEmoji, currentName?, desiredEmoji, desiredName?, text, isAnonymous, location, isPublic(true/false) }
    const user_id = await getUserId();
    
    // 🆕 ENHANCED: Add origin detection for Quick vs Guided
    const enhancedEntry = {
      ...entry,
      origin: entry.origin || detectOrigin(), // Auto-detect if not provided
      type: entry.type || 'self_hi5' // Keep unified type for all self hi-5s
    };
    
    const row = {
      user_id,
      current_emoji: enhancedEntry.currentEmoji,
      current_name: enhancedEntry.currentName || null,
      desired_emoji: enhancedEntry.desiredEmoji,
      desired_name: enhancedEntry.desiredName || null,
      text: enhancedEntry.text,
      is_anonymous: !!enhancedEntry.isAnonymous,
      location: enhancedEntry.location || null,
      is_public: enhancedEntry.isPublic !== false, // default true
      // 🆕 Add origin and type to database
      origin: enhancedEntry.origin,
      type: enhancedEntry.type
    };

    // Try DB first
    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      const { data, error } = await supa.from("public_shares").insert(row).select().single();
      if (error) throw error;

      // Note: Global stats increment is now handled by database trigger on insert
      console.log('📊 Public share inserted - stats will be incremented by DB trigger');

      // Normalize shape for UI (enhanced with origin)
      const ui = normalizePublicRow(data);
      // Also mirror to LS general (so island renders if offline later)
      pushLS(LS_GENERAL, ui);

      return { ok: true, data: ui, source: "db" };
    } catch (e) {
      // Fallback: add to local queue + local general feed for immediate UX
      const uiLocal = normalizePublicRowFromClient(row);
      pushPending({ type: "public", payload: row });
      pushLS(LS_GENERAL, uiLocal);
      return { ok: false, offline: true, data: uiLocal, error: e?.message };
    }
  }

  async function insertArchive(entry) {
    // entry = { currentEmoji, desiredEmoji, journal, location, origin, type }
    const user_id = await getUserId();
    const row = {
      user_id,
      current_emoji: entry.currentEmoji,
      desired_emoji: entry.desiredEmoji,
      journal: entry.journal,
      location: entry.location || null,
      origin: entry.origin || 'hi5',           // 'hi5' or 'higym'
      type: entry.type || 'self_hi5',           // 'self_hi5', 'higym', etc.
      text: entry.journal,                       // Mirror journal to text for consistency
    };

    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      const { data, error } = await supa.from("hi_archives").insert(row).select().single();
      if (error) throw error;

      const ui = normalizeArchiveRow(data);
      pushLS(LS_ARCHIVE, ui);
      return { ok: true, data: ui, source: "db" };
    } catch (e) {
      const uiLocal = normalizeArchiveRowFromClient(row);
      pushPending({ type: "archive", payload: row });
      pushLS(LS_ARCHIVE, uiLocal);
      return { ok: false, offline: true, data: uiLocal, error: e?.message };
    }
  }

  async function fetchPublicShares({ limit = 50 } = {}) {
    // Try DB first, then merge + de-dupe with local
    let dbList = [];
    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      const { data, error } = await supa
        .from("public_shares")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      dbList = (data || []).map(normalizePublicRow);
    } catch {
      // ignore, rely on local
    }

    const lsList = readLS(LS_GENERAL);
    const all = dedupeById([...dbList, ...lsList]).slice(0, limit);
    return all;
  }

  async function fetchMyArchive({ limit = 200 } = {}) {
    const user_id = await getUserId();
    
    let dbList = [];
    try {
      // Always get fresh reference to avoid timing issues
      const supaClient = window.supabaseClient || window.sb;
      
      if (user_id && supaClient) {
        const { data, error } = await supaClient
          .from("hi_archives")
          .select("*")
          .eq("user_id", user_id)  // CRITICAL: Filter by current user
          .order("created_at", { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        dbList = (data || []).map(normalizeArchiveRow);
        console.log(`✅ Fetched ${dbList.length} archive entries from Supabase`);
      } else {
        console.log('⚠️ No user_id or Supabase, using localStorage only');
      }
    } catch (error) {
      console.error('❌ Archive fetch failed:', error);
      // ignore, rely on local
    }
    
    const lsList = readLS(LS_ARCHIVE);
    const all = dedupeById([...dbList, ...lsList]).slice(0, limit);
    console.log(`📦 Total archive entries: ${all.length} (DB: ${dbList.length}, localStorage: ${lsList.length})`);
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

  // 🆕 DETECT ORIGIN: Auto-detect Quick vs Guided based on current page
  function detectOrigin() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path === '') {
      return 'quick';
    } else if (path.includes('hi-muscle.html')) {
      return 'guided';
    }
    return 'quick'; // Default fallback for Quick Hi-5s
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
        } else {
          // Unknown job type; skip
        }
        success++;
      } catch {
        remain.push(job); // keep it queued
      }
    }

    writeLS(LS_PENDING, remain);
    return { ok: true, synced: success, pending: remain.length };
  }

  // ---- Normalizers: DB row -> UI shape ----
  function normalizePublicRow(r) {
    return {
      id: r.id,
      currentEmoji: r.current_emoji,
      currentName: r.current_name || "",
      desiredEmoji: r.desired_emoji,
      desiredName: r.desired_name || "",
      text: r.text,
      isAnonymous: !!r.is_anonymous,
      userName: r.is_anonymous ? "Hi Friend" : "You",
      location: r.location || "",
      createdAt: r.created_at,
      origin: r.origin || 'quick', // 🚀 Include origin for Quick/Guided chips
      type: r.type || 'self_hi5'   // 🚀 Include type for consistency
    };
  }
  function normalizePublicRowFromClient(row) {
    return {
      id: "local_" + Date.now(),
      currentEmoji: row.current_emoji,
      currentName: row.current_name || "",
      desiredEmoji: row.desired_emoji,
      desiredName: row.desired_name || "",
      text: row.text,
      isAnonymous: !!row.is_anonymous,
      userName: row.is_anonymous ? "Hi Friend" : "You",
      location: row.location || "",
      createdAt: new Date().toISOString(),
      origin: row.origin || 'quick', // 🚀 Include origin for local entries
      type: row.type || 'self_hi5'   // 🚀 Include type for local entries
    };
  }

  function normalizeArchiveRow(r) {
    return {
      id: r.id,
      currentEmoji: r.current_emoji,
      desiredEmoji: r.desired_emoji,
      journalEntry: r.journal,
      text: r.text || r.journal,              // Feed uses 'text'
      location: r.location || "",
      origin: r.origin || 'hi5',
      type: r.type || 'self_hi5',
      userName: r.user_name || null,          // Add userName for consistency
      createdAt: r.created_at,
    };
  }
  function normalizeArchiveRowFromClient(row) {
    return {
      id: "local_" + Date.now(),
      currentEmoji: row.current_emoji,
      desiredEmoji: row.desired_emoji,
      journalEntry: row.journal,
      text: row.text || row.journal,          // Feed uses 'text'
      location: row.location || "",
      origin: row.origin || 'hi5',
      type: row.type || 'self_hi5',
      userName: null,                          // Local entries don't have userName yet
      createdAt: new Date().toISOString(),
    };
  }

  // Stub for map updates (handled by island.js)
  async function updateMap(payload) {
    // This is handled by the map system, just return success
    return { ok: true };
  }

  // 🌍 Fetch user profile (for location and other profile data)
  async function fetchUserProfile() {
    const user_id = await getUserId();
    if (!user_id) {
      console.warn('⚠️ No user ID, using localStorage fallback');
      return readLS('stayhi_profile', null);
    }

    try {
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
        // Profile doesn't exist yet (new user)
        if (error.code === 'PGRST116') {
          console.log('📝 No profile found, will create on first update');
          return null;
        }
        throw error;
      }

      // Cache to localStorage
      if (data) {
        writeLS('stayhi_profile', data);
      }

      console.log('✅ Profile loaded:', data);
      return data;

    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      // Fallback to localStorage
      return readLS('stayhi_profile', null);
    }
  }

  // 🌍 Update user profile (for location and other profile data)
  async function updateProfile(updates) {
    const user_id = await getUserId();
    if (!user_id) {
      console.warn('⚠️ No user ID, saving to localStorage only');
      const current = readLS('stayhi_profile', {});
      writeLS('stayhi_profile', { ...current, ...updates });
      return { ok: true, offline: true };
    }

    try {
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

      // Cache to localStorage
      if (data) {
        writeLS('stayhi_profile', data);
      }

      console.log('✅ Profile updated:', data);
      return { ok: true, data };

    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      
      // Fallback to localStorage
      const current = readLS('stayhi_profile', {});
      writeLS('stayhi_profile', { ...current, ...updates });
      
      return { ok: false, error: error.message, offline: true };
    }
  }

    // 🌍 Increment global Hi Wave counter
  async function incrementHiWave() {
    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      console.log('🔄 Calling increment_hi_wave RPC');
      const { error } = await supa.rpc('increment_hi_wave');
      console.log('🔄 increment_hi_wave RPC result:', { error });
      if (error) throw error;
      
      console.log('✅ Hi Wave incremented in DB');
      return { ok: true };
    } catch (e) {
      console.error('❌ Failed to increment Hi Wave:', e);
      return { ok: false, error: e.message };
    }
  }

  // 🌍 Increment global Total Hi counter
  async function incrementTotalHi() {
    try {
      const supa = getSupabase();
      if (!supa) throw new Error('No Supabase client');
      
      console.log('🔄 Calling increment_total_hi RPC');
      const { error } = await supa.rpc('increment_total_hi');
      console.log('🔄 increment_total_hi RPC result:', { error });
      if (error) throw error;
      
      console.log('✅ Total Hi incremented in DB');
      return { ok: true };
    } catch (e) {
      console.error('❌ Failed to increment Total Hi:', e);
      return { ok: false, error: e.message };
    }
  }

  // Public API
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
  };

  // Fetch month activity for calendar (days with Hi counts, streaks, milestones)
  async function fetchMonthActivity(year, month) {
    const user_id = await getUserId();
    if (!user_id) return { days: {}, monthCount: 0, currentStreak: 0, bestStreak: 0 };

    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    try {
      // Fetch both public and private entries for the user in this month
      const [publicRes, archiveRes] = await Promise.all([
        supa
          .from("public_shares")
          .select("created_at")
          .eq("user_id", user_id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supa
          .from("hi_archives")
          .select("created_at")
          .eq("user_id", user_id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
      ]);

      // Combine all entries
      const allEntries = [
        ...(publicRes.data || []),
        ...(archiveRes.data || [])
      ];

      // Group by day
      const days = {};
      allEntries.forEach(entry => {
        const date = new Date(entry.created_at);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (!days[dateKey]) {
          days[dateKey] = { count: 0, hasStreak: false, hasMilestone: false };
        }
        days[dateKey].count++;
      });

      // Calculate streaks
      const { currentStreak, bestStreak } = calculateStreaks(allEntries, user_id);
      
      // Mark days with streaks
      Object.keys(days).forEach(dateKey => {
        if (days[dateKey].count >= 3) days[dateKey].hasStreak = true;
      });

      // Mark milestone days (7, 30, 100 day streaks)
      if (currentStreak >= 7 || bestStreak >= 7) {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        if (days[todayKey]) days[todayKey].hasMilestone = true;
      }

      return {
        days,
        monthCount: allEntries.length,
        currentStreak,
        bestStreak,
        source: 'db'
      };

    } catch (error) {
      console.error('Failed to fetch month activity:', error);
      
      // Fallback to localStorage
      const general = readLS(LS_GENERAL);
      const archive = readLS(LS_ARCHIVE);
      const allLocal = [...general, ...archive];
      
      const days = {};
      allLocal.forEach(entry => {
        if (!entry.created_at) return;
        const date = new Date(entry.created_at);
        if (date.getFullYear() === year && date.getMonth() === month - 1) {
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          if (!days[dateKey]) days[dateKey] = { count: 0 };
          days[dateKey].count++;
        }
      });

      return { days, monthCount: Object.keys(days).length, currentStreak: 0, bestStreak: 0, source: 'local' };
    }
  }

  // Calculate current and best streaks
  function calculateStreaks(entries, userId) {
    if (!entries.length) return { currentStreak: 0, bestStreak: 0 };

    // Get unique days with activity
    const activeDays = [...new Set(
      entries.map(e => {
        const d = new Date(e.created_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    )].sort();

    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 1;

    for (let i = 1; i < activeDays.length; i++) {
      const prev = new Date(activeDays[i - 1]);
      const curr = new Date(activeDays[i]);
      const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else {
        bestStreak = Math.max(bestStreak, streak);
        streak = 1;
      }
    }

    bestStreak = Math.max(bestStreak, streak);

    // Check if streak is current (last activity was today or yesterday)
    const lastDay = new Date(activeDays[activeDays.length - 1]);
    const today = new Date();
    const daysSinceLastActivity = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));

    if (daysSinceLastActivity <= 1) {
      currentStreak = streak;
    }

    return { currentStreak, bestStreak };
  }

  // Optional: auto-sync after auth (tiny delay to allow session)
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { syncPending(); }, 1000);
    window.addEventListener("online", () => { syncPending(); });
  });
})();
