// 🎯 Hi-Grade Welcome Experience Interactions
// Legacy fetchStats removed; unified stats handled elsewhere

document.addEventListener('DOMContentLoaded', () => {
  const tryAnonymousBtn = document.getElementById('cta-experience-anon');
  const joinBtn = document.getElementById('joinCommunityBtn');
  const haveCodeBtn = document.getElementById('haveCodeBtn');
  const inviteSection = document.getElementById('inviteCodeSection');
  const continueWithCodeBtn = document.getElementById('continueWithCodeBtn');
  const inviteInput = document.getElementById('welcomeInviteCode');
  
  console.log('[HI DEV] Legacy tryAnonymousBtn handler disabled in favor of welcome-cta.js');

  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      if (window.hiAnalytics) {
        window.hiAnalytics.trackEvent('join_community_clicked', {
          medallion_interactions: typeof clickCount !== 'undefined' ? clickCount : undefined,
          source: 'welcome_page'
        });
      }
      window.location.href = 'https://stan.store/stayhi?utm_source=hi_app&utm_medium=welcome&utm_campaign=community_join';
    });
  }
  
  if (haveCodeBtn && inviteSection) {
    haveCodeBtn.addEventListener('click', () => {
      inviteSection.style.display = inviteSection.style.display === 'none' ? 'block' : 'none';
      haveCodeBtn.textContent = inviteSection.style.display === 'block' ? 'Cancel' : 'I have an invite code';
      if (inviteSection.style.display === 'block') {
        setTimeout(() => inviteInput && inviteInput.focus(), 100);
      }
    });
  }
  
  if (continueWithCodeBtn && inviteInput) {
    continueWithCodeBtn.addEventListener('click', () => {
      const code = inviteInput.value.trim();
      if (code) {
        if (window.hiAccessManager) {
          const result = window.hiAccessManager.activateInviteCode(code);
          if (result.success) {
            const tierName = result.tier.name;
            const features = result.tier.hooks || [];
            let successMsg = `🎉 ${tierName} activated!\n`;
            features.forEach(feature => successMsg += `• ${feature}\n`);
            alert(successMsg);
            if (result.tier.level >= 2) {
              sessionStorage.setItem('from-welcome', 'true');
              window.location.href = './hi-dashboard.html?tier=activated&source=welcome';
            } else {
              window.location.href = `./signup.html?code=${encodeURIComponent(code)}&source=welcome&tier=${result.tier.level}`;
            }
          } else {
            inviteInput.style.borderColor = '#ff6b6b';
            inviteInput.style.background = 'rgba(255, 107, 107, 0.1)';
            inviteInput.value = '';
            inviteInput.placeholder = '❌ Invalid code - try again';
            setTimeout(() => {
              inviteInput.style.borderColor = 'rgba(255, 215, 102, 0.3)';
              inviteInput.style.background = 'rgba(255, 255, 255, 0.1)';
              inviteInput.placeholder = 'e.g. HIFRIEND24';
            }, 2000);
          }
        } else {
          window.location.href = `./signup.html?code=${encodeURIComponent(code)}&source=welcome`;
        }
      } else {
        inviteInput.style.borderColor = '#ff6b6b';
        inviteInput.placeholder = 'Please enter your invite code';
      }
    });

    inviteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        continueWithCodeBtn.click();
      }
    });
  }
});
