// Tesla-Grade Signup with Supabase Integration
let supabaseClient = null;

// Initialize Supabase
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

    // 3. Mark invite code as used (with retry for race condition)
    console.log('📝 Marking code as used for user:', userId);
    let usageSuccess = false;
    let lastError = null;
    
    // Retry up to 10 times (5 seconds) to handle auth trigger delay
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/10: Calling use_invite_code RPC...`);
        const { data: usageData, error } = await supabaseClient.rpc('use_invite_code', { 
          p_code: invite, 
          p_user_id: userId 
        });
        
        console.log(`📊 RPC Response (attempt ${attempt + 1}):`, { usageData, error });
        
        if (error) {
          console.log(`🔍 Error details:`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            full: error
          });
          
          // If foreign key error (user not created yet), retry
          if (error.code === '23503') {
            console.log(`⏳ Attempt ${attempt + 1}/10: User record not ready (FK error), retrying in 500ms...`);
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          // Other errors - fail immediately
          console.error(`❌ Usage tracking error (attempt ${attempt + 1}):`, error);
          showError('Error tracking invite code usage.');
          return;
        }
        
        console.log('✅ Code marked as used successfully:', usageData);
        usageSuccess = true;
        break;
      } catch (err) {
        console.error(`❌ Exception during usage tracking (attempt ${attempt + 1}):`, err);
        lastError = err;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!usageSuccess) {
      console.error('❌ Failed to mark code as used after 10 attempts:', lastError);
      showError('Account created but invite tracking failed. Please contact support.');
      return;
    }

    // 4. Process referral code if present (HiBase integration)
    await processReferralRedemption(userId);

    // 5. Success: redirect to profile setup for new users
    showSuccess('🎉 Account created! Complete your profile to get started.');
    
    setTimeout(() => {
      window.location.href = 'profile.html?onboarding=true';
    }, 2000);

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
