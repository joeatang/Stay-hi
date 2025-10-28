/**
 * Tesla-Grade Onboarding Flow
 * Simple, elegant first-time user guide
 * Shows once, never again after completion
 */

(function() {
  'use strict';

  const ONBOARDING_KEY = 'stayhi_onboarding_completed';
  const ONBOARDING_VERSION = '1.0';

  // Check if onboarding has been completed
  function hasCompletedOnboarding() {
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      return completed === ONBOARDING_VERSION;
    } catch {
      return false;
    }
  }

  // Mark onboarding as completed
  function markOnboardingComplete() {
    try {
      localStorage.setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
    } catch (e) {
      console.error('Failed to save onboarding state:', e);
    }
  }

  // Create onboarding overlay
  function createOnboardingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-backdrop"></div>
      <div class="onboarding-modal">
        <div class="onboarding-content">
          <div class="onboarding-step" data-step="1">
            <div class="onboarding-icon">👋</div>
            <h2 class="onboarding-title">Welcome to Stay Hi</h2>
            <p class="onboarding-text">A simple way to check in with yourself and track your emotional journey.</p>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Get Started</button>
            <button class="onboarding-btn onboarding-btn-skip" data-action="skip">Skip Tour</button>
          </div>

          <div class="onboarding-step" data-step="2" style="display: none;">
            <div class="onboarding-icon">🎯</div>
            <h2 class="onboarding-title">Tap the Hi Medallion</h2>
            <p class="onboarding-text">Start your journey by tapping the center medallion to give yourself a hi-5.</p>
            <div class="onboarding-progress">Step 1 of 3</div>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Next</button>
            <button class="onboarding-btn onboarding-btn-secondary" data-action="back">Back</button>
          </div>

          <div class="onboarding-step" data-step="3" style="display: none;">
            <div class="onboarding-icon">😊</div>
            <h2 class="onboarding-title">Choose Your Emotions</h2>
            <p class="onboarding-text">Select how you're feeling now and where you'd like to be. It's that simple.</p>
            <div class="onboarding-progress">Step 2 of 3</div>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Next</button>
            <button class="onboarding-btn onboarding-btn-secondary" data-action="back">Back</button>
          </div>

          <div class="onboarding-step" data-step="4" style="display: none;">
            <div class="onboarding-icon">✨</div>
            <h2 class="onboarding-title">You're All Set!</h2>
            <p class="onboarding-text">Share your journey publicly, privately, or keep it anonymous. The choice is yours.</p>
            <div class="onboarding-progress">Step 3 of 3</div>
            <button class="onboarding-btn onboarding-btn-primary" data-action="complete">Start Your Journey</button>
            <button class="onboarding-btn onboarding-btn-secondary" data-action="back">Back</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  // Show specific step
  function showStep(stepNumber) {
    const steps = document.querySelectorAll('.onboarding-step');
    steps.forEach(step => {
      step.style.display = step.dataset.step === String(stepNumber) ? 'block' : 'none';
    });
  }

  // Handle navigation
  function setupNavigation(overlay) {
    let currentStep = 1;
    const maxSteps = 4;

    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;

      switch(action) {
        case 'next':
          if (currentStep < maxSteps) {
            currentStep++;
            showStep(currentStep);
          }
          break;

        case 'back':
          if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
          }
          break;

        case 'complete':
          markOnboardingComplete();
          closeOnboarding(overlay);
          break;

        case 'skip':
          markOnboardingComplete();
          closeOnboarding(overlay);
          break;
      }
    });

    // Close on backdrop click
    const backdrop = overlay.querySelector('.onboarding-backdrop');
    backdrop?.addEventListener('click', () => {
      markOnboardingComplete();
      closeOnboarding(overlay);
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.parentNode) {
        markOnboardingComplete();
        closeOnboarding(overlay);
      }
    });
  }

  // Close and remove onboarding
  function closeOnboarding(overlay) {
    overlay.classList.add('onboarding-closing');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }

  // Initialize onboarding
  function initOnboarding() {
    // Only show on index.html (main app page)
    const isIndexPage = window.location.pathname.endsWith('/') || 
                        window.location.pathname.endsWith('index.html') ||
                        window.location.pathname === '/';

    if (!isIndexPage) return;

    // Check if already completed
    if (hasCompletedOnboarding()) return;

    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showOnboarding);
    } else {
      // Delay slightly to ensure page is rendered
      setTimeout(showOnboarding, 500);
    }
  }

  function showOnboarding() {
    const overlay = createOnboardingOverlay();
    setupNavigation(overlay);
    
    // Fade in
    requestAnimationFrame(() => {
      overlay.classList.add('onboarding-visible');
    });
  }

  // Expose for manual triggering (debug/testing)
  window.StayHiOnboarding = {
    show: showOnboarding,
    reset: () => {
      localStorage.removeItem(ONBOARDING_KEY);
      showOnboarding();
    }
  };

  // Auto-initialize
  initOnboarding();
})();
