// 🎯 SMART NAVIGATION: Detect where user came from and adjust back button
(function() {
  const referrer = document.referrer;
  const backBtn = document.getElementById('backBtn');
  
  if (backBtn) {
    if (referrer.includes('welcome.html')) {
      // User came from welcome page - keep "Back to Welcome"
      backBtn.href = 'welcome.html';
      backBtn.textContent = 'Back to Welcome';
    } else if (referrer && !referrer.includes('signin.html')) {
      // User came from some other page - go back
      backBtn.href = 'index.html';
      backBtn.textContent = 'Back';
    } else {
      // Direct navigation or refresh - default to welcome
      backBtn.href = 'welcome.html';
      backBtn.textContent = 'Back to Welcome';
    }
  }
})();

// Tesla-Grade Direct Supabase Initialization
let supabaseClient = null;

async function initializeSupabase() {
  try {
    console.log('🔵 [INIT] Starting Supabase initialization...');
    
    // Check if there's already a global Supabase client
    if (window.supabaseClient) {
      console.log('✅ [INIT] Using existing window.supabaseClient');
      supabaseClient = window.supabaseClient;
      window.sb = supabaseClient;
      return supabaseClient;
    }
    
    if (window.sb) {
      console.log('✅ [INIT] Using existing window.sb');
      supabaseClient = window.sb;
      window.supabaseClient = supabaseClient;
      return supabaseClient;
    }
    
    // Wait for Supabase SDK to load
    if (!window.supabase) {
      console.log('⏳ [INIT] Waiting for Supabase SDK...');
      await new Promise((resolve, reject) => {
        let attempts = 0;
        const checkSDK = setInterval(() => {
          attempts++;
          if (window.supabase) {
            clearInterval(checkSDK);
            console.log(`✅ [INIT] SDK loaded after ${attempts * 100}ms`);
            resolve();
          } else if (attempts > 100) { // 10 seconds max for slow mobile networks
            clearInterval(checkSDK);
            reject(new Error('Supabase SDK failed to load after 10 seconds'));
          }
        }, 100);
      });
    }
    
    console.log('✅ [INIT] Supabase SDK loaded');
    
    // Use credentials from config.js or config-local.js
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    
    console.log('🔵 [INIT] Config check:', {
      hasURL: !!SUPABASE_URL,
      hasKey: !!SUPABASE_ANON_KEY,
      urlPreview: SUPABASE_URL?.substring(0, 40) + '...'
    });
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ [INIT] Missing Supabase configuration');
      console.error('window.SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
      console.error('window.SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
      throw new Error('Missing Supabase configuration. Ensure config-local.js or config.js is loaded.');
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { 
        persistSession: true, 
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });

    // Compatibility aliases
    window.supabaseClient = supabaseClient;
    window.sb = supabaseClient;

    console.log('✅ [INIT] Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error('❌ [INIT] Supabase initialization failed:', error);
    
    // Show user-friendly error
    const errEl = document.getElementById('err');
    if (errEl) {
      errEl.textContent = '❌ Configuration error. Please refresh the page or contact support.';
      errEl.style.display = 'block';
    }
    
    throw error;
  }
}

// ✅ CRITICAL: Initialize Supabase immediately
initializeSupabase().catch(e => console.error('Supabase init error:', e));

// 🔧 CRITICAL FIX: Wrap in DOMContentLoaded to ensure DOM elements exist
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 DOM ready - initializing sign-in form...');
  
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const sendBtn = document.getElementById('send');
  const ok = document.getElementById('success');
  const err = document.getElementById('err');
  const togglePasswordBtn = document.getElementById('togglePassword');
  
  // 🛡️ Defensive null checks
  if (!email || !password || !sendBtn || !ok || !err) {
    console.error('❌ CRITICAL: Sign-in form elements not found!', {
      email: !!email,
      password: !!password,
      sendBtn: !!sendBtn,
      ok: !!ok,
      err: !!err
    });
    return;
  }
  
  console.log('✅ All sign-in form elements found');

  // Wait for Supabase to be ready (initialized at top of file)
  async function waitForSupabase() {
    console.log('🔵 [WAIT] Checking for Supabase client...');
    if (supabaseClient) {
      console.log('✅ [WAIT] Using existing supabaseClient');
      return supabaseClient;
    }
    if (window.sb) {
      console.log('✅ [WAIT] Using existing window.sb');
      return window.sb;
    }

    console.log('⏳ [WAIT] Client not ready, polling...');
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

  // 🔧 MOBILE FIX: Handle Enter key submission (critical for mobile keyboards)
  const handleSubmit = async (e) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔵 [MOBILE DEBUG] handleSubmit called');
    console.log('🔵 [MOBILE DEBUG] Email value:', email?.value);
    console.log('🔵 [MOBILE DEBUG] Password filled:', !!password?.value);
    
    // Immediate visual feedback
    sendBtn.style.transform = 'scale(0.98)';
    
    err.style.display = 'none'; 
    ok.style.display = 'none';

    const emailVal = (email.value || '').trim();
    if (!emailVal) {
      err.textContent = '📧 Please enter your email address';
      err.style.display = 'block';
      email.focus();
      email.style.borderColor = '#ef4444';
      return;
    }

    const passwordVal = (password.value || '').trim();
    if (!passwordVal) {
      err.textContent = '🔒 Please enter your password';
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
      console.log('🔵 [AUTH] Getting Supabase client...');
      const sb = await Promise.race([
        waitForSupabase(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase client timeout - SDK or config not loading')), 12000)
        )
      ]);uttonText.textContent = 'Sign in';
        buttonText.style.display = 'inline-block';
        loadingDots.style.display = 'none';
        sendBtn.style.transform = 'scale(1)';
      }
    }, 15000); // 15 second timeout

    try {
      console.log('🔵 [AUTH] Getting Supabase client...');
      const sb = await Promise.race([
        waitForSupabase(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase client timeout')), 5000)
        )
      ]);

      console.log('🔐 [MOBILE DEBUG] Signing in with password:', emailVal);
      console.log('🔵 [AUTH] Supabase client ready, calling signInWithPassword...');
      
      // Race the auth call with a 10-second timeout (FIXED: removed duplicate call)
      const { data, error } = await Promise.race([
        sb.auth.signInWithPassword({
          email: emailVal,
          password: passwordVal
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign-in request timeout - check network')), 10000)
        )
      ]);
      
      console.log('🔵 [AUTH] Sign-in response received:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('❌ Password signin error:', error);
        throw error;
      }

      console.log('✅ [MOBILE DEBUG] Password signin successful:', data);
      
      clearTimeout(timeoutId); // Clear timeout on success

      // ✅ SUCCESS CONFIRMATION with Tesla-grade animation
      ok.style.display = 'block';
      ok.classList.add('show');
      buttonText.textContent = '✅ Success!';
      buttonText.style.display = 'inline-block';
      loadingDots.style.display = 'none';
      sendBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
      sendBtn.style.transform = 'scale(1)';
      
      const next = new URLSearchParams(location.search).get('next') || 'hi-dashboard.html';
      
      console.log('🔵 [MOBILE DEBUG] Redirecting to:', next);
      setTimeout(() => {
        console.log('🔵 [MOBILE DEBUG] Executing redirect...');
        if (window.teslaRedirect) {
          window.teslaRedirect.redirectAfterAuth(next);
        } else {
          location.replace(next);
        }
      }, 1500);

    } catch (e) {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error('❌ [MOBILE DEBUG] Sign in error:', e);
      
      // User-friendly error messages
      let errorMsg = '❌ Sign in failed. ';
      if (e.message?.includes('Invalid login credentials')) {
        errorMsg = '🔒 Invalid email or password. Please try again.';
      } else if (e.message?.includes('Email not confirmed')) {
        errorMsg = '📧 Please verify your email first. Check your inbox.';
      } else if (e.message?.includes('Too many requests')) {
        errorMsg = '⏱️ Too many attempts. Please wait a minute and try again.';
      } else {
        errorMsg += e.message || 'Please check your credentials and try again.';
      }
      
      err.textContent = errorMsg;
      err.style.display = 'block';

      sendBtn.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => sendBtn.style.animation = '', 500);
      
      // Reset button state on error
      sendBtn.disabled = false;
      buttonText.textContent = 'Sign in';
      buttonText.style.display = 'inline-block';
      loadingDots.style.display = 'none';
      sendBtn.style.transform = 'scale(1)';
    }
  };

  // Attach to button click
  sendBtn.addEventListener('click', (e) => {
    console.log('🔵 [CLICK] Button clicked!');
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
  });
  
  // 🔧 Verify button is interactive
  console.log('✅ [MOBILE DEBUG] Click listener attached to button');
  console.log('🔍 [MOBILE DEBUG] Button state:', {
    disabled: sendBtn.disabled,
    display: window.getComputedStyle(sendBtn).display,
    pointerEvents: window.getComputedStyle(sendBtn).pointerEvents,
    visibility: window.getComputedStyle(sendBtn).visibility,
    opacity: window.getComputedStyle(sendBtn).opacity
  });
  
  // 🔧 IMMEDIATE VISUAL FEEDBACK on touch/mouse down
  sendBtn.addEventListener('mousedown', () => {
    console.log('👆 [TOUCH] Mouse down on button');
    sendBtn.style.transform = 'scale(0.96)';
    sendBtn.style.opacity = '0.9';
  });
  
  sendBtn.addEventListener('mouseup', () => {
    console.log('👆 [TOUCH] Mouse up on button');
    sendBtn.style.transform = 'scale(1)';
    sendBtn.style.opacity = '1';
  });
  
  sendBtn.addEventListener('touchstart', (e) => {
    console.log('👆 [MOBILE DEBUG] Touch started on button');
    sendBtn.style.transform = 'scale(0.96)';
    sendBtn.style.opacity = '0.9';
  }, { passive: true });
  
  sendBtn.addEventListener('touchend', (e) => {
    console.log('👆 [MOBILE DEBUG] Touch ended on button');
    sendBtn.style.transform = 'scale(1)';
    sendBtn.style.opacity = '1';
  }, { passive: true });
  
  // 🔧 MOBILE FIX: Form submit handler (critical for mobile keyboards)
  const signinForm = document.getElementById('signinForm');
  if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('📱 [MOBILE DEBUG] Form submitted (mobile keyboard "Go" button)');
      handleSubmit();
    });
    console.log('✅ [MOBILE DEBUG] Form submit listener attached');
  } else {
    console.error('❌ [MOBILE DEBUG] signinForm not found!');
  }
  
  // 🔧 MOBILE FIX: Enter key support (fallback for non-form inputs)
  email.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('⌨️ [MOBILE DEBUG] Enter pressed on email field');
      handleSubmit();
    }
  });
  
  password.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('⌨️ [MOBILE DEBUG] Enter pressed on password field');
      handleSubmit();
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
  
  console.log('🎯 Sign-in event listeners attached successfully');
});

// ❌ REMOVED DUPLICATE DOMContentLoaded HANDLER - Already handled above
// The auth check is now done inside the main DOMContentLoaded handler
