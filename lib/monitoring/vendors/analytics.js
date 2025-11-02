/**
 * lib/monitoring/vendors/plausible.js
 * Plausible Analytics integration for Hi App
 * 
 * Provides privacy-focused web analytics without cookies
 * Lightweight script injection and event tracking
 */

/**
 * Initialize Plausible Analytics
 * @param {string} domain - The domain to track (e.g., 'stay-eoyezel0s-joeatangs-projects.vercel.app')
 */
export function initPlausible(domain) {
  if (!domain) return;
  
  // Check if already initialized
  if (document.querySelector('script[data-domain]')) {
    console.log('📊 Plausible already initialized');
    return;
  }
  
  try {
    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-domain', domain);
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
    
    console.log('📊 Plausible Analytics initialized for:', domain);
  } catch (error) {
    console.warn('📊 Plausible initialization failed:', error);
  }
}

/**
 * Track custom event in Plausible
 * @param {string} eventName - Name of the event (e.g., 'share_submit', 'gym_submit')
 * @param {Object} props - Event properties/metadata
 */
export function trackPlausible(eventName, props) {
  if (!eventName) return;
  
  try {
    if (window.plausible) {
      window.plausible(eventName, { props: props || {} });
      console.log('📊 Plausible event:', eventName, props);
    } else {
      console.warn('📊 Plausible not loaded, event queued:', eventName);
    }
  } catch (error) {
    console.warn('📊 Plausible tracking error:', error);
  }
}