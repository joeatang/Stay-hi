// PWA Session Sync - Broadcast auth state between browser and PWA
// Fixes: PWA showing logged out after browser login

(function() {
  // Create broadcast channel for cross-tab auth sync
  let authChannel = null;
  
  try {
    if ('BroadcastChannel' in window) {
      authChannel = new BroadcastChannel('hi-auth-sync');
      console.log('📡 PWA Session Sync enabled');
      
      // Listen for auth changes from other tabs/windows
      authChannel.onmessage = async (event) => {
        const { type, session } = event.data;
        
        if (type === 'AUTH_CHANGED') {
          console.log('📥 Received auth change from broadcast:', session ? 'logged in' : 'logged out');
          
          // Force reload auth state
          if (window.HiSupabase?.getClient) {
            const client = window.HiSupabase.getClient();
            if (client?.auth?.getSession) {
              try {
                const { data } = await client.auth.getSession();
                if (data?.session && !session) {
                  // We have session but broadcast says logged out - ignore
                  console.log('⚠️ Broadcast says logged out but we have session, keeping ours');
                } else if (!data?.session && session) {
                  // We don't have session but broadcast says logged in - reload page
                  console.log('🔄 Broadcast says logged in but we have no session, reloading...');
                  setTimeout(() => window.location.reload(), 500);
                }
              } catch (err) {
                console.warn('Failed to check session:', err);
              }
            }
          }
          
          // Dispatch event for other listeners
          window.dispatchEvent(new CustomEvent('hi:pwa-auth-synced', { 
            detail: { session } 
          }));
        }
      };
      
      // Broadcast when auth state changes locally
      function broadcastAuthChange(session) {
        if (authChannel) {
          try {
            authChannel.postMessage({
              type: 'AUTH_CHANGED',
              session: session ? {
                user: {
                  id: session.user?.id,
                  email: session.user?.email
                },
                expires_at: session.expires_at
              } : null,
              timestamp: Date.now()
            });
            console.log('📤 Broadcast auth change:', session ? 'logged in' : 'logged out');
          } catch (err) {
            console.warn('Failed to broadcast auth change:', err);
          }
        }
      }
      
      // Hook into Supabase auth state changes
      if (window.HiSupabase?.getClient) {
        const client = window.HiSupabase.getClient();
        if (client?.auth?.onAuthStateChange) {
          client.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event, session?.user?.email);
            broadcastAuthChange(session);
          });
        }
      }
      
      // Also broadcast on page load if we have a session
      window.addEventListener('load', async () => {
        if (window.HiSupabase?.getClient) {
          const client = window.HiSupabase.getClient();
          if (client?.auth?.getSession) {
            try {
              const { data } = await client.auth.getSession();
              if (data?.session) {
                console.log('📡 Page loaded with session, broadcasting...');
                setTimeout(() => broadcastAuthChange(data.session), 1000);
              }
            } catch (err) {
              console.warn('Failed to get session on load:', err);
            }
          }
        }
      });
      
      // Expose broadcast function globally
      window.HiPWASessionSync = {
        broadcast: broadcastAuthChange,
        channel: authChannel
      };
      
    } else {
      console.warn('📡 BroadcastChannel not supported, PWA sync disabled');
    }
  } catch (err) {
    console.error('Failed to initialize PWA session sync:', err);
  }
})();
