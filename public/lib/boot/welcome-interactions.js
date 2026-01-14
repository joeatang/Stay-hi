// 🎯 Hi-Grade Welcome Experience Interactions
// Updated: 2026-01-14 - Removed anonymous mode, simplified to signup-first flow

document.addEventListener('DOMContentLoaded', () => {
  const signUpFreeBtn = document.getElementById('signUpFreeBtn');
  const joinBtn = document.getElementById('joinCommunityBtn');
  
  console.log('[HI DEV] Welcome interactions initialized');
  console.log('[HI DEV] Buttons found:', { signUpFreeBtn: !!signUpFreeBtn, joinBtn: !!joinBtn });

  // Primary CTA: Sign Up Free → signup page (no invite code required)
  if (signUpFreeBtn) {
    signUpFreeBtn.addEventListener('click', () => {
      console.log('[HI DEV] Sign Up Free clicked');
      if (window.hiAnalytics) {
        window.hiAnalytics.trackEvent('signup_free_clicked', {
          source: 'welcome_page'
        });
      }
      window.location.href = './signup.html?source=welcome&mode=free';
    });
  }

  // Secondary CTA: Get Premium Access → Stan Store
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      console.log('[HI DEV] Get Premium Access clicked');
      if (window.hiAnalytics) {
        window.hiAnalytics.trackEvent('premium_access_clicked', {
          source: 'welcome_page'
        });
      }
      window.location.href = 'https://stan.store/stayhi?utm_source=hi_app&utm_medium=welcome&utm_campaign=premium_access';
    });
  }
});
