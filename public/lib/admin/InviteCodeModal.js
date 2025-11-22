// Invite Code Generation Modal
// Gold standard UX for creating invitation codes with options

(function() {
  const modalHTML = `
    <div id="inviteCodeModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); z-index:9999; animation:fadeIn 0.2s;">
      <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%); border-radius:24px; padding:32px; max-width:500px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1);">
        <h2 style="color:#fff; font-size:24px; font-weight:700; margin:0 0 24px 0; text-align:center; background:linear-gradient(135deg, #FFD700, #4ECDC4); background-clip:text; -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
          Generate Invitation Code
        </h2>
        
        <div style="margin-bottom:20px;">
          <label style="color:rgba(255,255,255,0.9); font-size:14px; font-weight:600; display:block; margin-bottom:8px;">
            Duration
          </label>
          <select id="inviteCodeDuration" style="width:100%; padding:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:12px; color:#fff; font-size:14px; cursor:pointer;">
            <option value="1">1 Hour (Quick Test)</option>
            <option value="24">24 Hours (Daily Access)</option>
            <option value="168" selected>7 Days (Standard)</option>
            <option value="720">30 Days (Extended)</option>
            <option value="8760">1 Year (Premium)</option>
            <option value="0">Unlimited (No Expiration)</option>
          </select>
        </div>
        
        <div style="margin-bottom:20px;">
          <label style="color:rgba(255,255,255,0.9); font-size:14px; font-weight:600; display:block; margin-bottom:8px;">
            Membership Tier
          </label>
          <select id="inviteCodeTier" style="width:100%; padding:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:12px; color:#fff; font-size:14px; cursor:pointer;">
            <option value="free">🌱 Free Explorer - No paid features</option>
            <option value="bronze">🥉 Bronze Pathfinder - $5.55 (7-day trial)</option>
            <option value="silver">🥈 Silver Trailblazer - $15.55 (14-day trial)</option>
            <option value="gold">🥇 Gold Champion - $25.55 (21-day trial)</option>
            <option value="premium" selected>⭐ Premium Pioneer - $55.55 (30-day trial)</option>
            <option value="collective">🌟 Collective Member - $155.55 (90-day trial)</option>
          </select>
        </div>
        
        <div style="margin-bottom:20px;">
          <label style="color:rgba(255,255,255,0.9); font-size:14px; font-weight:600; display:block; margin-bottom:8px;">
            Trial Days (Optional Override)
          </label>
          <input type="number" id="inviteCodeTrialDays" placeholder="Auto (uses tier default)" min="0" max="365" style="width:100%; padding:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:12px; color:#fff; font-size:14px;">
          <div style="color:rgba(255,255,255,0.5); font-size:11px; margin-top:4px;">Leave blank to use tier default trial period</div>
        </div>
        
        <div style="margin-bottom:24px;">
          <label style="color:rgba(255,255,255,0.9); font-size:14px; font-weight:600; display:block; margin-bottom:8px;">
            Maximum Uses
          </label>
          <select id="inviteCodeMaxUses" style="width:100%; padding:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:12px; color:#fff; font-size:14px; cursor:pointer;">
            <option value="1" selected>1 Use (Single Person)</option>
            <option value="5">5 Uses (Small Group)</option>
            <option value="10">10 Uses (Team)</option>
            <option value="25">25 Uses (Community)</option>
            <option value="100">100 Uses (Launch)</option>
            <option value="0">Unlimited Uses</option>
          </select>
        </div>
        
        <div style="display:flex; gap:12px;">
          <button id="generateInviteCodeBtn" style="flex:1; padding:14px; background:linear-gradient(135deg, #FFD700, #FFA500); border:none; border-radius:12px; color:#0f172a; font-weight:700; font-size:14px; cursor:pointer; transition:transform 0.2s;">
            ✨ Generate Code
          </button>
          <button id="cancelInviteCodeBtn" style="flex:1; padding:14px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:12px; color:#fff; font-weight:600; font-size:14px; cursor:pointer; transition:transform 0.2s;">
            Cancel
          </button>
        </div>
        
        <div id="inviteCodeResult" style="display:none; margin-top:20px; padding:16px; background:rgba(78,205,196,0.1); border:1px solid rgba(78,205,196,0.3); border-radius:12px;">
          <div style="color:#4ECDC4; font-size:12px; font-weight:600; margin-bottom:8px;">CODE GENERATED</div>
          <div id="inviteCodeValue" style="color:#fff; font-size:24px; font-weight:700; font-family:monospace; letter-spacing:2px; text-align:center; margin-bottom:8px;"></div>
          <button id="copyInviteCodeBtn" style="width:100%; padding:10px; background:rgba(78,205,196,0.2); border:1px solid rgba(78,205,196,0.5); border-radius:8px; color:#4ECDC4; font-weight:600; font-size:12px; cursor:pointer;">
            📋 Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
    
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      #generateInviteCodeBtn:hover, #cancelInviteCodeBtn:hover, #copyInviteCodeBtn:hover {
        transform: translateY(-2px);
      }
      #inviteCodeModal select:focus, #inviteCodeModal button:focus {
        outline: 2px solid #FFD700;
        outline-offset: 2px;
      }
    </style>
  `;
  
  // Inject modal into page
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      setupModalEvents();
    });
  } else {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalEvents();
  }
  
  function setupModalEvents() {
    const modal = document.getElementById('inviteCodeModal');
    const generateBtn = document.getElementById('generateInviteCodeBtn');
    const cancelBtn = document.getElementById('cancelInviteCodeBtn');
    const copyBtn = document.getElementById('copyInviteCodeBtn');
    
    generateBtn?.addEventListener('click', handleGenerate);
    cancelBtn?.addEventListener('click', closeModal);
    copyBtn?.addEventListener('click', copyCode);
    
    // Close on outside click
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal?.style.display === 'flex') {
        closeModal();
      }
    });
  }
  
  async function handleGenerate() {
    const duration = parseInt(document.getElementById('inviteCodeDuration')?.value || '168');
    const tier = document.getElementById('inviteCodeTier')?.value || 'premium';
    const maxUses = parseInt(document.getElementById('inviteCodeMaxUses')?.value || '1');
    const customTrialDays = document.getElementById('inviteCodeTrialDays')?.value;
    const trialDays = customTrialDays ? parseInt(customTrialDays) : null; // null = use tier default
    
    const generateBtn = document.getElementById('generateInviteCodeBtn');
    const originalText = generateBtn.textContent;
    generateBtn.textContent = '⏳ Generating...';
    generateBtn.disabled = true;
    
    try {
      const sb = window.hiSupabase || 
                 (window.HiSupabase?.getClient && window.HiSupabase.getClient()) || 
                 window.supabaseClient;
      
      if (!sb) throw new Error('Supabase client unavailable');
      
      // Build RPC params with new tier system
      const rpcParams = {
        p_tier: tier,
        p_max_uses: maxUses === 0 ? 999999 : maxUses,
        p_expires_in_hours: duration === 0 ? 87600 : duration // 10 years for unlimited
      };
      
      // Only include trial_days if user provided custom value
      if (trialDays !== null) {
        rpcParams.p_trial_days = trialDays;
      }
      
      console.log('[InviteModal] Generating code with params:', rpcParams);
      
      const { data, error } = await sb.rpc('admin_generate_invite_code', rpcParams);
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Generation failed');
      
      console.log('[InviteModal] ✅ Code generated:', data);
      
      // Show result
      document.getElementById('inviteCodeValue').textContent = data.code;
      document.getElementById('inviteCodeResult').style.display = 'block';
      generateBtn.style.display = 'none';
      
      // Trigger success event
      window.dispatchEvent(new CustomEvent('hi:invite-code-generated', {
        detail: { 
          code: data.code, 
          tier: data.tier || tier,
          trial_days: data.trial_days || trialDays,
          duration, 
          maxUses 
        }
      }));
      
    } catch (err) {
      console.error('[InviteModal] ❌ Generation failed:', err);
      alert('Failed to generate code: ' + (err.message || err));
      generateBtn.textContent = originalText;
      generateBtn.disabled = false;
    }
  }
  
  function copyCode() {
    const code = document.getElementById('inviteCodeValue')?.textContent;
    if (!code) return;
    
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('copyInviteCodeBtn');
      const originalText = btn.textContent;
      btn.textContent = '✅ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
        closeModal();
      }, 1500);
    }).catch(() => {
      alert('Failed to copy. Code: ' + code);
    });
  }
  
  function closeModal() {
    const modal = document.getElementById('inviteCodeModal');
    if (modal) {
      modal.style.display = 'none';
      // Reset modal
      document.getElementById('inviteCodeResult').style.display = 'none';
      document.getElementById('generateInviteCodeBtn').style.display = 'block';
      document.getElementById('generateInviteCodeBtn').disabled = false;
      document.getElementById('generateInviteCodeBtn').textContent = '✨ Generate Code';
    }
  }
  
  // Export open function globally
  window.openInviteCodeModal = function() {
    const modal = document.getElementById('inviteCodeModal');
    if (modal) {
      modal.style.display = 'flex';
      document.getElementById('inviteCodeDuration')?.focus();
    }
  };
  
  console.log('✨ Invite Code Modal loaded');
})();
