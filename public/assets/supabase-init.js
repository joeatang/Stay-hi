/* public/assets/supabase-init.js
   Creates a single global Supabase client at window.supabase (the CLIENT),
   matching what assets/db.js expects.
   Safe to include on any page that talks to Supabase.
*/
(() => {
  // --- Your project keys (public anon is OK to ship in frontend) ---
  const SUPABASE_URL = "https://gfcubvroxgfvjhacinic.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g";

  // Load the Supabase UMD if it's not present
  function ensureSupabaseLib() {
    return new Promise((resolve, reject) => {
      // If window.supabase already looks like a CLIENT (has .from), we’re done.
      if (window.supabase && typeof window.supabase.from === "function") {
        return resolve("client-ready");
      }
      // If window.supabase is the LIB (has .createClient), also fine.
      if (window.supabase && typeof window.supabase.createClient === "function") {
        return resolve("lib-ready");
      }
      // Otherwise, inject the UMD library
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
      s.async = true;
      s.onload = () => resolve("lib-loaded");
      s.onerror = () => reject(new Error("Failed to load Supabase UMD."));
      document.head.appendChild(s);
    });
  }

  async function initClient() {
    const state = await ensureSupabaseLib();

    // If window.supabase is already a CLIENT (has .from), keep it.
    if (window.supabase && typeof window.supabase.from === "function") {
      window.supabaseReady = Promise.resolve(window.supabase);
      return;
    }

    // At this point window.supabase should be the LIB (has .createClient)
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase library not available after load.");
      return;
    }

    // Create and expose the CLIENT as window.supabase (what db.js expects)
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

    window.supabase = client;              // 👈 normalize: CLIENT on window.supabase
    window.supabaseReady = Promise.resolve(client);
  }

  initClient().catch(err => console.error("Supabase init failed:", err));
})();
