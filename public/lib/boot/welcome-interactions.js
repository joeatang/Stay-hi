// 🎯 Hi-Grade Welcome Experience Interactions
// Legacy fetchStats removed; unified stats handled elsewhere

document.addEventListener('DOMContentLoaded', () => {
  const tryAnonymousBtn = document.getElementById('cta-experience-anon');
  const joinBtn = document.getElementById('joinCommunityBtn');
  const haveCodeBtn = document.getElementById('haveCodeBtn');
  
  console.log('[HI DEV] Welcome interactions initialized');
  console.log('[HI DEV] Buttons found:', { tryAnonymousBtn: !!tryAnonymousBtn, joinBtn: !!joinBtn, haveCodeBtn: !!haveCodeBtn });

  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      console.log('[HI DEV] Join Community button clicked');
      if (window.hiAnalytics) {
        window.hiAnalytics.trackEvent('join_community_clicked', {
          medallion_interactions: typeof clickCount !== 'undefined' ? clickCount : undefined,
          source: 'welcome_page'
        });
      }
      window.location.href = 'https://stan.store/stayhi?utm_source=hi_app&utm_medium=welcome&utm_campaign=community_join';
    });
  }
  
  // Simplified: "Sign Up" button goes directly to signup page
  if (haveCodeBtn) {
    haveCodeBtn.addEventListener('click', () => {
      console.log('[HI DEV] Sign Up button clicked');
      window.location.href = './signup.html?source=welcome';
    });
  }
});
