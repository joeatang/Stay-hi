// 🎁 HiBase Referral Code Handler (module)
import HiBase from './lib/hibase/index.js';
import HiFlags, { hiFlags } from './lib/flags/HiFlags.js';

async function handleReferralCode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const referralCode = params.get('ref');
    const giftCode = params.get('gift');
    const code = referralCode || giftCode;
    
    if (!code) return;
    
    const useHiBaseReferrals = await HiFlags.isEnabled('hibase_referrals_enabled');
    
    if (useHiBaseReferrals) {
      try {
        const referralData = await HiBase.referrals.getReferral(code);
        
        if (referralData) {
          sessionStorage.setItem('hi_referral_code', code);
          sessionStorage.setItem('hi_referral_type', referralData.type);
          
          if (giftCode && referralData.type === 'gift') {
            showGiftWelcomeMessage(referralData);
          } else if (referralCode && referralData.type === 'signup') {
            showReferralWelcomeMessage(referralData);
          }
          
          console.log('[Welcome] Referral code detected:', {
            code: code,
            type: referralData.type,
            source: giftCode ? 'gift' : 'referral',
            via: 'hibase'
          });
        }
      } catch (error) {
        console.log('HiBase referral lookup failed:', error.message);
        handleLegacyReferral(code);
      }
    } else {
      handleLegacyReferral(code);
    }
  } catch (error) {
    console.error('Referral handler error:', error);
  }
}

function showGiftWelcomeMessage(referralData) {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #FFD166 0%, #F4A261 100%);
    color: #264653;
    padding: 12px 20px;
    text-align: center;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  const issuerName = referralData.issuer?.display_name || 'A friend';
  banner.innerHTML = `
    🎁 ${issuerName} sent you a gift! Join Hi to claim your welcome bonus.
  `;
  document.body.prepend(banner);
  document.body.style.paddingTop = '60px';
}

function showReferralWelcomeMessage(referralData) {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #2A9D8F 0%, #264653 100%);
    color: white;
    padding: 12px 20px;
    text-align: center;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  const issuerName = referralData.issuer?.display_name || 'Someone';
  banner.innerHTML = `
    👋 ${issuerName} invited you to Hi! Join to get bonus rewards.
  `;
  document.body.prepend(banner);
  document.body.style.paddingTop = '60px';
}

function handleLegacyReferral(code) {
  sessionStorage.setItem('hi_referral_code', code);
  console.log('[Welcome] Legacy referral code detected:', {
    code: code,
    source: 'legacy',
    via: 'legacy'
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleReferralCode);
} else {
  handleReferralCode();
}
