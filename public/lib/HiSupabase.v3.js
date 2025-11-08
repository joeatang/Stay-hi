// HI-OS: Supabase v3 Adapter (ESM isolation build)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = (() => {
  if (window.__HI_SUPABASE_CLIENT) {
    console.log("♻️ Reusing existing HiSupabase v3 client");
    return window.__HI_SUPABASE_CLIENT;
  }

  const url = "https://gfcubvroxgfvjhacinic.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g";
  const client = createClient(url, key);
  window.__HI_SUPABASE_CLIENT = client;
  console.log("✅ HiSupabase v3 client initialized (pure ESM)");
  return client;
})();