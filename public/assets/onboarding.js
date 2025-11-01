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
            <h2 class="onboarding-title">Welcome to the Stay Hi App 👋</h2>
            <p class="onboarding-text">Stay Hi helps you stay highly inspired by checking in with yourself daily. Each tap, share, or moment is your way of saying 'I'm here.' Let's begin.</p>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Get Started</button>
            <button class="onboarding-btn onboarding-btn-skip" data-action="skip">Skip Tour</button>
          </div>

          <div class="onboarding-step" data-step="2" style="display: none;">
            <div class="onboarding-icon">🎯</div>
            <h2 class="onboarding-title">The Medallion</h2>
            <p class="onboarding-text">This is your center. Tap it anytime to stay present and say Hi to the world. It's a symbol of presence — your reminder that you showed up today.</p>
            <div class="onboarding-progress">Step 1 of 6</div>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Next</button>
            <button class="onboarding-btn onboarding-btn-secondary" data-action="back">Back</button>
          </div>

          <div class="onboarding-step" data-step="3" style="display: none;">
            <div class="onboarding-icon">🙌</div>
            <h2 class="onboarding-title">Self Hi-5</h2>
            <p class="onboarding-text">Finished a workout? Stayed calm? Made a good choice? That's a Hi Moment. Tap Self Hi-5 to celebrate yourself and share it with the world.</p>
            <div class="onboarding-progress">Step 2 of 6</div>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Next</button>
            <button class="onboarding-btn onboarding-btn-secondary" data-action="back">Back</button>
          </div>

          <div class="onboarding-step" data-step="4" style="display: none;">
            <div class="onboarding-icon">💪</div>
            <h2 class="onboarding-title">Hi Gym</h2>
            <p class="onboarding-text">Need a little guidance? The Hi Gym walks you through your emotions — step by step — until you find your Hi again. Think of it as an emotional workout.</p>
            <div class="onboarding-progress">Step 3 of 6</div>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Next</button>
            <button class="onboarding-btn onboarding-btn-secondary" data-action="back">Back</button>
          </div>

          <div class="onboarding-step" data-step="5" style="display: none;">
            <div class="onboarding-icon">🏝️</div>
            <h2 class="onboarding-title">Hi Island</h2>
            <p class="onboarding-text">This is your global feed — where Hi Moments from all over the world appear. See how others are staying inspired and send them a Hi-Five for support.</p>
            <div class="onboarding-progress">Step 4 of 6</div>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Next</button>
            <button class="onboarding-btn onboarding-btn-secondary" data-action="back">Back</button>
          </div>

          <div class="onboarding-step" data-step="6" style="display: none;">
            <div class="onboarding-icon">📅</div>
            <h2 class="onboarding-title">Profile & Calendar</h2>
            <p class="onboarding-text">Your Profile shows your streaks and stats. Your Calendar lets you see your progress — every Hi-5, every inspired day.</p>
            <div class="onboarding-progress">Step 5 of 6</div>
            <button class="onboarding-btn onboarding-btn-primary" data-action="next">Next</button>
            <button class="onboarding-btn onboarding-btn-secondary" data-action="back">Back</button>
          </div>

          <div class="onboarding-step" data-step="7" style="display: none;">
            <div class="onboarding-icon">✨</div>
            <h2 class="onboarding-title">Ready? ✨</h2>
            <p class="onboarding-text">Tap the Medallion and start your first Hi-5. You just joined a world of people choosing to stay highly inspired — one Hi at a time.</p>
            <div class="onboarding-progress">Step 6 of 6</div>
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
    const maxSteps = 7;

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
          // Tesla-grade navigation to hi-dashboard after onboarding
          setTimeout(() => {
            window.location.href = 'hi-dashboard.html';
          }, 400);
          break;

        case 'skip':
          markOnboardingComplete();
          closeOnboarding(overlay);
          // Tesla-grade navigation to hi-dashboard after skip
          setTimeout(() => {
            window.location.href = 'hi-dashboard.html';
          }, 400);
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
    // Show on main dashboard pages (index.html or hi-dashboard.html)
    const isMainPage = window.location.pathname.endsWith('/') || 
                       window.location.pathname.endsWith('index.html') ||
                       window.location.pathname.endsWith('hi-dashboard.html') ||
                       window.location.pathname === '/';

    if (!isMainPage) return;

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
