/* public/assets/supabase-init.js */
(() => {
  const SUPABASE_URL = "https://gfcubvroxgfvjhacinic.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g";

  function ensureSupabaseLib() {
    return new Promise((resolve, reject) => {
      if (window.supabase && typeof window.supabase.from === "function") return resolve("client-ready");
      if (window.supabase && typeof window.supabase.createClient === "function") return resolve("lib-ready");
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
      s.async = true;
      s.onload = () => resolve("lib-loaded");
      s.onerror = () => reject(new Error("Failed to load Supabase UMD."));
      document.head.appendChild(s);
    });
  }

  async function initClient() {
    await ensureSupabaseLib();
    if (window.supabase && typeof window.supabase.from === "function") {
      window.supabaseReady = Promise.resolve(window.supabase);
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase library not available after load.");
      return;
    }
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    window.supabase = client;
    window.supabaseReady = Promise.resolve(client);
  }

  initClient().catch(err => console.error("Supabase init failed:", err));
})();
