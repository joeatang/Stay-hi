// Tesla-Grade Direct Supabase Initialization
let supabaseClient = null;

async function initializeSupabase() {
  try {
    // Use credentials from config.js (or config-local.js for dev)
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration. Check config.js or config-local.js');
    }

    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

    // Compatibility aliases
    window.supabaseClient = supabaseClient;
    window.sb = supabaseClient;

    return supabaseClient;
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    throw error;
  }
}

(function(){
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const sendBtn = document.getElementById('send');
  const ok = document.getElementById('success');
  const err = document.getElementById('err');
  const togglePasswordBtn = document.getElementById('togglePassword');

  // Wait for Supabase to be ready
  async function waitForSupabase() {
    if (supabaseClient) return supabaseClient;
    if (window.sb) return window.sb;

    return new Promise((resolve) => {
      const check = () => {
        if (supabaseClient || window.sb) {
          resolve(supabaseClient || window.sb);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // If returning from email verification or already authenticated, redirect
  (async () => {
    try {
      const sb = await waitForSupabase();
      const { data: { session } } = await sb.auth.getSession();
      
      // Check for password reset success message
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('password_reset') === 'success') {
        if (ok) {
          ok.textContent = '✅ Password reset successful! You can now sign in with your new password.';
          ok.style.display = 'block';
        }
        // Remove parameter from URL without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
      
      if (session) {
        const next = new URLSearchParams(location.search).get('next') || 'hi-dashboard.html';
        if (window.teslaRedirect) {
          await window.teslaRedirect.redirectAfterAuth(next);
        } else {
          location.replace(next);
        }
      }
    } catch {}
  })();

  // UI toggles
  (function initToggles(){
    // Show/hide password toggle
    if (togglePasswordBtn && password) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPassword = password.type === 'password';
        password.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? '🙈' : '👁️';
      });
    }
  })();

  sendBtn.addEventListener('click', async () => {
    err.style.display = 'none'; 
    ok.style.display = 'none';

    const emailVal = (email.value || '').trim();
    if (!emailVal) {
      err.textContent = 'Enter a valid email.';
      err.style.display = 'block';
      email.focus();
      email.style.borderColor = '#ef4444';
      return;
    }

    const passwordVal = (password.value || '').trim();
    if (!passwordVal) {
      err.textContent = 'Enter your password.';
      err.style.display = 'block';
      password.focus();
      password.style.borderColor = '#ef4444';
      return;
    }

    // Premium loading state
    sendBtn.disabled = true;
    const buttonText = sendBtn.querySelector('span');
    const loadingDots = sendBtn.querySelector('.loading-dots');
    buttonText.style.display = 'none';
    loadingDots.style.display = 'inline-flex';
    sendBtn.style.transform = 'scale(0.98)';

    try {
      const sb = await waitForSupabase();

      console.log('🔐 Signing in with password:', emailVal);
      
      const { data, error } = await sb.auth.signInWithPassword({
        email: emailVal,
        password: password.value
      });

      if (error) {
        console.error('❌ Password signin error:', error);
        throw error;
      }

      console.log('✅ Password signin successful:', data);

      // ✅ SUCCESS CONFIRMATION with Tesla-grade animation
      ok.style.display = 'block';
      sendBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
      sendBtn.style.transform = 'scale(1)';
      
      const next = new URLSearchParams(location.search).get('next') || 'hi-dashboard.html';
      
      setTimeout(() => {
        if (window.teslaRedirect) {
          window.teslaRedirect.redirectAfterAuth(next);
        } else {
          location.replace(next);
        }
      }, 1500);

    } catch (e) {
      console.error('❌ Sign in error:', e);
      err.textContent = e.message || 'Sign in failed. Check your password.';
      err.style.display = 'block';

      sendBtn.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => sendBtn.style.animation = '', 500);
    } finally {
      sendBtn.disabled = false;
      buttonText.style.display = 'inline';
      loadingDots.style.display = 'none';
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(style);
})();

// Initialize Supabase when page loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!window.supabase) {
      await new Promise(resolve => {
        const checkSupabase = () => {
          if (window.supabase) {
            resolve();
          } else {
            setTimeout(checkSupabase, 100);
          }
        };
        checkSupabase();
      });
    }

    await initializeSupabase();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      console.log('🔄 User already authenticated, redirecting to dashboard');
      const next = new URLSearchParams(location.search).get('next') || 'hi-dashboard.html';
      window.location.replace(next);
      return;
    }

    console.log('✅ Signin page initialized successfully');

  } catch (error) {
    console.error('❌ Signin initialization failed:', error);
  }
});
