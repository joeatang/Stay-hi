// S-DASH/8: Micro-Feedback System
// Purpose: Add subtle, toggle-able micro-feedback for each Hi-5 
// Features: haptic pulse + micro-confetti + live ARIA cheer
// Scope: Emotional loop polish without altering data flow

import { HiFlags } from './flags/HiFlags.js';

// Flag-gated initialization
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Wait for flags to be ready
    await HiFlags.ready();
    
    const dashV3 = HiFlags.getFlag('hi_dash_v3', false);
    const feedbackV1 = HiFlags.getFlag('hi_dash_feedback_v1', false);
    
    if (!dashV3 || !feedbackV1) {
      console.log('[S-DASH/8] Micro-feedback disabled via flags:', { dashV3, feedbackV1 });
      return;
    }
    
    // Initialize feedback system
    initMicroFeedback();
    console.log('[S-DASH/8] Micro-feedback system initialized');
    
  } catch (error) {
    console.error('[S-DASH/8] Initialization error:', error);
  }
});

function initMicroFeedback() {
  // Target medallion button (prefer accessible button, fallback to container)
  const btn = document.querySelector('.hi-medallion-btn') || document.querySelector('#hiMedallion');
  
  if (!btn) {
    console.warn('[S-DASH/8] No medallion button found for feedback system');
    return;
  }
  
  // Add click feedback handler
  btn.addEventListener('click', handleFeedback);
  
  // Add keyboard accessibility handler
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFeedback(e);
    }
  });
  
  console.log('[S-DASH/8] Event listeners attached to medallion');
}

function handleFeedback(e) {
  try {
    // 1. Haptic pulse (mobile only)
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(35);
    }
    
    // 2. Micro-confetti visual burst
    createConfettiBurst(e.target);
    
    // 3. ARIA live region cheer
    updateAriaLiveRegion();
    
    // 4. Telemetry
    console.log('[S-DASH/8] Micro-feedback fired:', {
      timestamp: Date.now(),
      hasVibration: !!(window.navigator && window.navigator.vibrate),
      target: e.target.className || e.target.id || 'unknown'
    });
    
  } catch (error) {
    console.error('[S-DASH/8] Feedback error:', error);
  }
}

function createConfettiBurst(target) {
  const burst = document.createElement('div');
  burst.className = 'hi-confetti';
  
  // Position relative to medallion
  const rect = target.getBoundingClientRect();
  burst.style.left = `${rect.width / 2}px`;
  burst.style.top = `${rect.height / 2}px`;
  
  // Add to target (should be positioned relative)
  target.appendChild(burst);
  
  // Auto-cleanup after animation
  setTimeout(() => {
    if (burst.parentNode) {
      burst.remove();
    }
  }, 900);
}

function updateAriaLiveRegion() {
  const ariaRegion = document.getElementById('hiLive');
  if (!ariaRegion) {
    console.warn('[S-DASH/8] ARIA live region #hiLive not found');
    return;
  }
  
  // Rotate between encouraging messages
  const messages = [
    'Hi-five received! Keep it up!',
    'Great energy sent to the community!',
    'Positive vibes shared!',
    'Another Hi-5 for the world!'
  ];
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  ariaRegion.textContent = randomMessage;
  
  // Clear message after 3 seconds to prevent spam
  setTimeout(() => {
    if (ariaRegion.textContent === randomMessage) {
      ariaRegion.textContent = '';
    }
  }, 3000);
}