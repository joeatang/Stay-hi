// Tesla-Grade Signup with Supabase Integration
let supabaseClient = null;

// Initialize Supabase
async function initializeSupabase() {
  try {
    const SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    
    return supabaseClient;
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    throw error;
  }
}

// UI helpers
function showError(message) {
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  
  successEl.style.display = 'none';
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  
  errorEl.style.display = 'none';
  successEl.textContent = message;
  successEl.style.display = 'block';
}

// Process referral code redemption (HiBase integration)
async function processReferralRedemption(userId) {
  try {
    const referralCode = sessionStorage.getItem('hi_referral_code');
    const referralType = sessionStorage.getItem('hi_referral_type');
    
    if (!referralCode) {
      console.log('No referral code to redeem');
      return;
    }
    
    console.log('🎁 Processing referral redemption:', { code: referralCode, type: referralType });
    
    // Check if HiBase referrals are enabled
    let useHiBaseReferrals = false;
    try {
      // Simple flag check without full HiFlags import
      const flagsResponse = await fetch('./lib/flags/flags.json');
      const flags = await flagsResponse.json();
      useHiBaseReferrals = flags.hibase_referrals_enabled?.enabled || false;
    } catch (error) {
      console.log('Could not check HiBase referrals flag, using legacy');
    }
    
    if (useHiBaseReferrals) {
      try {
        // Use HiBase referrals system
        const response = await supabaseClient.rpc('redeem_referral_code', {
          referral_code: referralCode,
          redeemer_id: userId
        });
        
        if (response.data && response.data.success) {
          console.log('✅ HiBase referral redeemed successfully:', response.data);
          
          if (response.data.rewards) {
            showSuccess(`🎉 Account created! You received: ${JSON.stringify(response.data.rewards)}. Check email to verify.`);
          }
          
          sessionStorage.removeItem('hi_referral_code');
          sessionStorage.removeItem('hi_referral_type');
        }
      } catch (error) {
        console.log('HiBase referral redemption failed:', error);
        await processLegacyReferral(userId, referralCode);
      }
    } else {
      await processLegacyReferral(userId, referralCode);
    }
    
  } catch (error) {
    console.error('Referral processing error:', error);
  }
}

async function processLegacyReferral(userId, referralCode) {
  try {
    console.log('🔄 Processing legacy referral:', referralCode);
    
    const { data, error } = await supabaseClient
      .from('hi_referral_redemptions')
      .insert({
        user_id: userId,
        referral_code: referralCode.toUpperCase(),
        redeemed_at: new Date().toISOString()
      });
    
    if (!error) {
      console.log('✅ Legacy referral processed successfully');
      sessionStorage.removeItem('hi_referral_code');
      sessionStorage.removeItem('hi_referral_type');
    }
  } catch (error) {
    console.log('Legacy referral processing failed:', error);
  }
}

// Handle form submission
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const invite = document.getElementById('invite').value.trim();
  
  if (!email || !password || !invite) {
    showError('Please fill in all fields.');
    return;
  }
  
  if (password.length < 8) {
    showError('Password must be at least 8 characters long.');
    return;
  }

  const submitBtn = document.querySelector('.btn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';

  try {
    // 1. Validate invite code via Supabase RPC
    let validCode = false;
    let codeId = null;
    try {
      console.log('🔍 Validating invite code:', invite);
      const { data, error } = await supabaseClient.rpc('validate_invite_code', { p_code: invite });
      console.log('📊 Validation response:', { data, error });
      
      if (error) {
        console.error('❌ RPC error:', error);
        showError('Invalid or expired invite code.');
        return;
      }
      
      if (!data || !data.is_valid) {
        console.error('❌ Code validation failed:', data);
        showError(data?.reason || 'Invalid or expired invite code.');
        return;
      }
      
      validCode = true;
      codeId = data.code_id;
      console.log('✅ Code validated successfully:', { codeId, tier: data.grants_tier });
    } catch (err) {
      console.error('❌ Validation exception:', err);
      showError('Error validating invite code.');
      return;
    }

    // 2. Create user in Supabase auth
    let userId = null;
    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) {
        showError(error.message || 'Sign up failed.');
        return;
      }
      userId = data.user?.id;
    } catch (err) {
      showError('Error creating account.');
      return;
    }

    // 3. Mark invite code as used (track usage)
    try {
      console.log('📝 Marking code as used for user:', userId);
      const { data: usageData, error } = await supabaseClient.rpc('use_invite_code', { p_code: invite, p_user_id: userId });
      console.log('📊 Usage response:', { usageData, error });
      
      if (error) {
        console.error('❌ Usage tracking error:', error);
        showError('Error tracking invite code usage.');
        return;
      }
    } catch (err) {
      showError('Error tracking invite code usage.');
      return;
    }

    // 3.5. Process referral code if present (HiBase integration)
    await processReferralRedemption(userId);

    // 4. Success: show message and redirect with smooth transition
    showSuccess('🎉 Account created! Check your email to verify and sign in.');
    
    setTimeout(() => {
      window.location.href = 'signin.html';
    }, 2500);

  } catch (error) {
    console.error('Signup error:', error);
    showError('An unexpected error occurred. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Auto-fill invite code from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
      const inviteInput = document.getElementById('invite');
      if (inviteInput) {
        inviteInput.value = codeFromUrl;
        console.log('✅ Auto-filled invite code from URL:', codeFromUrl);
      }
    }
    
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
      window.location.replace('./hi-dashboard.html');
      return;
    }
    
    console.log('✅ Signup page initialized successfully');
    
  } catch (error) {
    console.error('❌ Signup initialization failed:', error);
  }
});
