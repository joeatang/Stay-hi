<!-- public/assets/db.js -->
<script>
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

  const supa = window.supabase;

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
      const { data } = await supa.auth.getUser();
      return data?.user?.id || null;
    } catch {
      return null;
    }
  }

  async function insertPublicShare(entry) {
    // entry = { currentEmoji, currentName?, desiredEmoji, desiredName?, text, isAnonymous, location, isPublic(true/false) }
    const user_id = await getUserId();
    const row = {
      user_id,
      current_emoji: entry.currentEmoji,
      current_name: entry.currentName || null,
      desired_emoji: entry.desiredEmoji,
      desired_name: entry.desiredName || null,
      text: entry.text,
      is_anonymous: !!entry.isAnonymous,
      location: entry.location || null,
      is_public: entry.isPublic !== false, // default true
    };

    // Try DB first
    try {
      const { data, error } = await supa.from("public_shares").insert(row).select().single();
      if (error) throw error;

      // Normalize shape for UI
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
    // entry = { currentEmoji, desiredEmoji, journal, location }
    const user_id = await getUserId();
    const row = {
      user_id,
      current_emoji: entry.currentEmoji,
      desired_emoji: entry.desiredEmoji,
      journal: entry.journal,
      location: entry.location || null,
    };

    try {
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
    let dbList = [];
    try {
      const { data, error } = await supa
        .from("hi_archives")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      dbList = (data || []).map(normalizeArchiveRow);
    } catch {
      // ignore, rely on local
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

  function pushPending(item) {
    const q = readLS(LS_PENDING);
    q.unshift({ ...item, queuedAt: new Date().toISOString() });
    writeLS(LS_PENDING, q);
  }

  async function syncPending() {
    const q = readLS(LS_PENDING);
    if (!q.length || !isOnline()) return { ok: true, synced: 0 };

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
    };
  }

  function normalizeArchiveRow(r) {
    return {
      id: r.id,
      currentEmoji: r.current_emoji,
      desiredEmoji: r.desired_emoji,
      journalEntry: r.journal,
      location: r.location || "",
      createdAt: r.created_at,
    };
  }
  function normalizeArchiveRowFromClient(row) {
    return {
      id: "local_" + Date.now(),
      currentEmoji: row.current_emoji,
      desiredEmoji: row.desired_emoji,
      journalEntry: row.journal,
      location: row.location || "",
      createdAt: new Date().toISOString(),
    };
  }

  // Public API
  window.hiDB = {
    isOnline,
    insertPublicShare,
    insertArchive,
    fetchPublicShares,
    fetchMyArchive,
    syncPending,
  };

  // Optional: auto-sync after auth (tiny delay to allow session)
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { syncPending(); }, 1000);
    window.addEventListener("online", () => { syncPending(); });
  });
})();
</script>
