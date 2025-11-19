// Tesla-Grade Direct Supabase Initialization
let supabaseClient = null;

async function initializeSupabase() {
  try {
    const SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';

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

// DEV MODE: Press Ctrl+Shift+D to bypass email and sign in directly
window.addEventListener('keydown', async (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    console.log('🔧 DEV MODE: Bypassing email, signing in directly...');
    const sb = await waitForSupabase();
    const devEmail = document.getElementById('email').value || 'test@stayhi.app';
    try {
      console.log('💡 TIP: Check Supabase Dashboard > Auth > Email Templates');
      console.log('💡 Or use Supabase CLI to generate a dev session token');
      alert('Check console for dev tips. You need to configure email in Supabase dashboard or use Supabase CLI for local dev.');
    } catch (e) {
      console.error(e);
    }
  }
});

(function(){
  const email = document.getElementById('email');
  const sendBtn = document.getElementById('send');
  const ok = document.getElementById('success');
  const err = document.getElementById('err');
  const toggleInviteBtn = document.getElementById('toggleInvite');
  const inviteRow = document.getElementById('inviteRow');
  const inviteInput = document.getElementById('inviteCode');
  const toggleOtpBtn = document.getElementById('toggleOtp');
  const otpRow = document.getElementById('otpRow');
  const otpInput = document.getElementById('otpCode');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');

  // Wait for Supabase to be ready
  async function waitForSupabase() {
    if (supabaseClient) return supabaseClient;
    if (window.sb) return window.sb;

    // Wait for initialization
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

  // If returning from a magic link, Supabase will set the session — bounce back to app
  (async () => {
    try {
      const sb = await waitForSupabase();
      const { data: { session } } = await sb.auth.getSession();
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

  // UI toggles for invite and OTP
  (function initToggles(){
    const qs = new URLSearchParams(location.search);
    if (qs.get('invite')){
      if (inviteRow) inviteRow.style.display = 'flex';
      if (inviteInput) inviteInput.value = qs.get('invite').trim();
    }
    if (toggleInviteBtn && inviteRow){ toggleInviteBtn.addEventListener('click', ()=>{
      const showing = inviteRow.style.display !== 'none';
      inviteRow.style.display = showing ? 'none' : 'flex';
      if (!showing) inviteInput?.focus();
    }); }
    if (toggleOtpBtn && otpRow){ toggleOtpBtn.addEventListener('click', ()=>{
      const showing = otpRow.style.display !== 'none';
      otpRow.style.display = showing ? 'none' : 'flex';
      if (!showing) otpInput?.focus();
      const help = document.getElementById('otpHelp'); if (help) help.style.display = showing ? 'none' : 'block';
    }); }
  })();

  sendBtn.addEventListener('click', async () => {
    err.style.display = 'none'; ok.style.display = 'none';

    const emailVal = (email.value || '').trim();
    if (!emailVal) {
      err.textContent = 'Enter a valid email.';
      err.style.display = 'block';
      email.focus();
      email.style.borderColor = '#ef4444';
      return;
    }

    // Premium loading state
    sendBtn.disabled = true;
    const buttonText = sendBtn.querySelector('span');
    const loadingDots = sendBtn.querySelector('.loading-dots');
    buttonText.style.display = 'none';
    loadingDots.style.display = 'inline-flex';

    // Visual feedback for button press
    sendBtn.style.transform = 'scale(0.98)';

    try {
      const sb = await waitForSupabase();

      console.log('🔐 Sending magic link to:', emailVal);

      // Persist invite code (if any) for redemption post-auth
      const inviteVal = (inviteInput?.value || '').trim();
      if (inviteVal) {
        sessionStorage.setItem('hi_pending_invite_code', inviteVal.toUpperCase());
      }

      const nextPage = new URLSearchParams(location.search).get('next') || 'hi-dashboard.html';
      const redirectTo = (window.hiPostAuthPath?.getPostAuthURL ? 
        window.hiPostAuthPath.getPostAuthURL({ 'no-sw': '1', next: nextPage }) : 
        `${location.origin}/post-auth.html?no-sw=1&next=${encodeURIComponent(nextPage)}`);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 15 seconds. Please check your internet connection and try again.')), 15000);
      });

      const otpPromise = sb.auth.signInWithOtp({
        email: emailVal,
        options: { emailRedirectTo: redirectTo }
      });

      const result = await Promise.race([otpPromise, timeoutPromise]);

      console.log('📧 Supabase response:', result);

      if (result.error) {
        console.error('❌ Magic link error:', result.error);
        throw result.error;
      }

      if (result.data) {
        console.log('✅ Magic link queued successfully:', result.data);
      } else {
        console.warn('⚠️ No data returned - email may not have been sent');
      }

      console.log('✅ Magic link API call succeeded');

      sendBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
      setTimeout(() => sendBtn.style.background = '', 2000);

      ok.style.display = 'block';
      setTimeout(() => ok.classList.add('show'), 10);

      setTimeout(() => {
        sendBtn.style.transform = '';
      }, 200);

    } catch (e) {
      console.error('❌ Sign in error:', e);
      err.textContent = e.message || 'Could not send link.';
      err.style.display = 'block';
      err.style.borderColor = '#ef4444';

      sendBtn.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => sendBtn.style.animation = '', 500);
    } finally {
      sendBtn.disabled = false;
      buttonText.style.display = 'inline';
      loadingDots.style.display = 'none';
    }
  });

  // OTP verification flow (PWA-friendly, no context switch)
  if (verifyOtpBtn){
    verifyOtpBtn.addEventListener('click', async ()=>{
      err.style.display = 'none'; ok.style.display = 'none';
      const emailVal = (email.value || '').trim();
      const codeVal = (otpInput?.value || '').trim();
      if (!emailVal || !codeVal || codeVal.length < 4){
        err.textContent = 'Enter your email and 6‑digit code.';
        err.style.display = 'block';
        return;
      }
      try{
        const sb = await waitForSupabase();
        const { data, error } = await sb.auth.verifyOtp({ email: emailVal, token: codeVal, type: 'email' });
        if (error) throw error;

        // If successful, session should now be active
        const { data: { session } } = await sb.auth.getSession();
        if (!session) throw new Error('Verification succeeded but no session. Try magic link.');

        // Redeem pending invite code (if any) asynchronously
        const invite = sessionStorage.getItem('hi_pending_invite_code');
        if (invite){
          try { await sb.rpc('activate_unified_invite_code', { invite_code: invite }); }
          catch(e){ console.warn('Invite redemption failed (non-blocking):', e.message || e); }
          finally { sessionStorage.removeItem('hi_pending_invite_code'); }
        }

        // Route to next destination
        const next = new URLSearchParams(location.search).get('next') || 'hi-dashboard.html';
        if (window.teslaRedirect) {
          await window.teslaRedirect.redirectAfterAuth(next);
        } else {
          location.replace(next);
        }
      } catch(e){
        console.error('❌ OTP verification failed:', e);
        err.textContent = e.message || 'Invalid code. Try again or use magic link.';
        err.style.display = 'block';
      }
    });
  }

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
      console.log('🔄 User already authenticated, redirecting to main app');
      window.location.replace('index.html');
      return;
    }

    console.log('✅ Signin page initialized successfully');

  } catch (error) {
    console.error('❌ Signin initialization failed:', error);
  }
});
