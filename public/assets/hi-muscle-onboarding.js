/**
 * Hi-Muscle Onboarding System - Tesla Grade
 * Contextual, progressive introduction to emotional fitness tracking
 * ✅ Mobile-first design with smooth animations
 * ✅ Progress-aware system that adapts to user engagement
 * ✅ Integrated with authentication and premium systems
 */

class HiMuscleOnboarding {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 4;
    this.hasSeenOnboarding = localStorage.getItem('hi-muscle-onboarding-seen') === 'true';
    this.userEngagement = {
      timeSpent: 0,
      interactionsCount: 0,
      emotionsSelected: 0
    };
    
    this.init();
  }
  
  init() {
    console.log('🎯 Hi-Muscle Onboarding System initialized');
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.checkOnboardingNeeded());
    } else {
      this.checkOnboardingNeeded();
    }
  }
  
  checkOnboardingNeeded() {
    // Check if user is new or needs onboarding
    const isFirstVisit = !localStorage.getItem('hi-muscle-visited');
    const hasMinimalEngagement = this.hasMinimalEngagement();
    
    console.log(`🔍 Onboarding check - First visit: ${isFirstVisit}, Has engagement: ${hasMinimalEngagement}, Seen: ${this.hasSeenOnboarding}`);
    
    if (isFirstVisit || (!this.hasSeenOnboarding && !hasMinimalEngagement)) {
      // Brief delay to let page settle
      setTimeout(() => {
        this.startOnboarding();
      }, 1500);
    }
    
    // Mark as visited
    localStorage.setItem('hi-muscle-visited', 'true');
    
    // Setup engagement tracking
    this.setupEngagementTracking();
  }
  
  hasMinimalEngagement() {
    const shareCount = parseInt(localStorage.getItem('hi-muscle-shares') || '0');
    const emotionSelections = parseInt(localStorage.getItem('hi-muscle-emotions-selected') || '0');
    
    return shareCount > 0 || emotionSelections >= 3;
  }
  
  startOnboarding() {
    console.log('🚀 Starting Hi-Muscle onboarding');
    
    this.createOnboardingModal();
    this.showStep(0);
    
    // Track onboarding start
    this.trackEvent('onboarding_started');
  }
  
  createOnboardingModal() {
    // Remove existing modal if any
    const existing = document.getElementById('hi-muscle-onboarding');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'hi-muscle-onboarding';
    modal.className = 'hi-onboarding-modal';
    modal.innerHTML = `
      <div class="hi-onboarding-overlay"></div>
      <div class="hi-onboarding-content">
        <div class="hi-onboarding-header">
          <div class="hi-onboarding-progress">
            <div class="progress-track">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span class="progress-text">1 of ${this.totalSteps}</span>
          </div>
          <button class="hi-onboarding-close" onclick="window.hiMuscleOnboarding.skipOnboarding()">×</button>
        </div>
        
        <div class="hi-onboarding-body">
          <div class="onboarding-step" data-step="0">
            <div class="step-icon">💪</div>
            <h2>Welcome to Hi-Muscle</h2>
            <p>Your personal emotional fitness trainer. Track feelings, build emotional resilience, and share your journey.</p>
            <div class="step-highlights">
              <div class="highlight">🎯 Track emotions with precision</div>
              <div class="highlight">📈 Build emotional patterns</div>
              <div class="highlight">🤝 Share meaningful moments</div>
            </div>
          </div>
          
          <div class="onboarding-step hidden" data-step="1">
            <div class="step-icon">🎨</div>
            <h2>Choose Your Emotion</h2>
            <p>Select from our curated emotion categories. Each choice helps build your emotional awareness.</p>
            <div class="step-demo">
              <div class="demo-tabs">
                <div class="demo-tab active">😊 Positive</div>
                <div class="demo-tab">😐 Neutral</div>
                <div class="demo-tab">😔 Challenging</div>
              </div>
            </div>
            <p class="tip">💡 Tip: Be honest with yourself - there are no wrong emotions</p>
          </div>
          
          <div class="onboarding-step hidden" data-step="2">
            <div class="step-icon">✍️</div>
            <h2>Tell Your Story</h2>
            <p>Add context to your emotions. What happened? How did it make you feel? Your story matters.</p>
            <div class="step-demo">
              <div class="demo-textarea">
                <div class="demo-text">Just finished a challenging workout at the gym. Feeling proud of pushing through the tough moments... 💪</div>
              </div>
            </div>
            <p class="tip">💡 Writing helps process emotions and track your growth</p>
          </div>
          
          <div class="onboarding-step hidden" data-step="3">
            <div class="step-icon">🚀</div>
            <h2>Share & Connect</h2>
            <p>Ready to share your emotional fitness journey? Your vulnerability inspires others.</p>
            <div class="step-highlights">
              <div class="highlight">🌟 Build authentic connections</div>
              <div class="highlight">💎 Earn Hi points for sharing</div>
              <div class="highlight">🏆 Unlock milestone achievements</div>
            </div>
            <p class="tip">🎯 Start your journey - your first share awaits!</p>
          </div>
        </div>
        
        <div class="hi-onboarding-footer">
          <button class="btn-secondary" onclick="window.hiMuscleOnboarding.previousStep()" id="prevBtn" style="visibility: hidden;">← Previous</button>
          <button class="btn-primary" onclick="window.hiMuscleOnboarding.nextStep()" id="nextBtn">Next →</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add CSS if not already present
    if (!document.getElementById('hi-onboarding-styles')) {
      this.addOnboardingStyles();
    }
    
    // Trigger entrance animation
    setTimeout(() => {
      modal.classList.add('active');
    }, 100);
  }
  
  addOnboardingStyles() {
    const styles = document.createElement('style');
    styles.id = 'hi-onboarding-styles';
    styles.textContent = `
      .hi-onboarding-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .hi-onboarding-modal.active {
        opacity: 1;
        pointer-events: all;
      }
      
      .hi-onboarding-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 16, 36, 0.95);
        backdrop-filter: blur(8px);
      }
      
      .hi-onboarding-content {
        position: relative;
        max-width: 520px;
        margin: 0 auto;
        background: linear-gradient(135deg, #1a1b3a 0%, #252659 100%);
        border-radius: 24px;
        border: 1px solid rgba(78, 205, 196, 0.3);
        padding: 32px;
        top: 50%;
        transform: translateY(-50%);
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
        color: #e8ebff;
        animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(-50%) translateY(40px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateY(-50%) translateY(0) scale(1);
        }
      }
      
      .hi-onboarding-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
      }
      
      .hi-onboarding-progress {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      
      .progress-track {
        flex: 1;
        height: 4px;
        background: rgba(42, 47, 86, 0.6);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #4ecdcc);
        border-radius: 2px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .progress-text {
        font-size: 0.875rem;
        color: #cfd2ea;
        font-weight: 500;
      }
      
      .hi-onboarding-close {
        background: none;
        border: none;
        color: #cfd2ea;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.2s ease;
        margin-left: 16px;
      }
      
      .hi-onboarding-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e8ebff;
      }
      
      .hi-onboarding-body {
        min-height: 320px;
        position: relative;
      }
      
      .onboarding-step {
        text-align: center;
        opacity: 1;
        transform: translateX(0);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .onboarding-step.hidden {
        opacity: 0;
        transform: translateX(20px);
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
      }
      
      .step-icon {
        font-size: 3rem;
        margin-bottom: 16px;
        animation: bounce 2s infinite;
      }
      
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      
      .onboarding-step h2 {
        font-size: 1.5rem;
        font-weight: 800;
        margin: 0 0 12px;
        color: #e8ebff;
      }
      
      .onboarding-step p {
        font-size: 1rem;
        line-height: 1.6;
        color: #cfd2ea;
        margin: 0 0 24px;
      }
      
      .step-highlights {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 24px 0;
      }
      
      .highlight {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 0.9rem;
        color: #e8ebff;
        font-weight: 500;
      }
      
      .step-demo {
        background: rgba(15, 16, 36, 0.6);
        border-radius: 16px;
        padding: 20px;
        margin: 20px 0;
        border: 1px solid rgba(78, 205, 196, 0.2);
      }
      
      .demo-tabs {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
      
      .demo-tab {
        background: rgba(42, 47, 86, 0.8);
        border: 1px solid rgba(78, 205, 196, 0.3);
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 0.875rem;
        color: #cfd2ea;
      }
      
      .demo-tab.active {
        background: rgba(16, 185, 129, 0.2);
        border-color: #10b981;
        color: #10b981;
      }
      
      .demo-textarea {
        background: rgba(42, 47, 86, 0.6);
        border: 1px solid rgba(78, 205, 196, 0.3);
        border-radius: 12px;
        padding: 16px;
        min-height: 80px;
      }
      
      .demo-text {
        color: #e8ebff;
        font-size: 0.9rem;
        line-height: 1.5;
      }
      
      .tip {
        font-size: 0.875rem !important;
        color: #10b981 !important;
        font-weight: 500 !important;
        margin-top: 16px !important;
      }
      
      .hi-onboarding-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 32px;
        gap: 16px;
      }
      
      .btn-secondary {
        background: rgba(42, 47, 86, 0.8);
        border: 1px solid rgba(78, 205, 196, 0.3);
        color: #cfd2ea;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
      }
      
      .btn-secondary:hover {
        background: rgba(78, 205, 196, 0.1);
        border-color: #4ecdcc;
        color: #e8ebff;
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #10b981, #4ecdcc);
        border: none;
        color: white;
        padding: 12px 32px;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }
      
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
      }
      
      .btn-primary:active {
        transform: translateY(0);
      }
      
      /* Mobile responsiveness */
      @media (max-width: 640px) {
        .hi-onboarding-content {
          margin: 16px;
          padding: 24px;
          border-radius: 20px;
          top: 50%;
        }
        
        .step-highlights {
          gap: 8px;
        }
        
        .highlight {
          padding: 10px 14px;
          font-size: 0.85rem;
        }
        
        .hi-onboarding-footer {
          flex-direction: column;
        }
        
        .btn-secondary, .btn-primary {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  showStep(stepIndex) {
    const steps = document.querySelectorAll('.onboarding-step');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    // Hide all steps
    steps.forEach(step => step.classList.add('hidden'));
    
    // Show current step
    const currentStep = steps[stepIndex];
    if (currentStep) {
      setTimeout(() => {
        currentStep.classList.remove('hidden');
      }, 200);
    }
    
    // Update progress
    const progress = ((stepIndex + 1) / this.totalSteps) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${stepIndex + 1} of ${this.totalSteps}`;
    
    // Update buttons
    prevBtn.style.visibility = stepIndex > 0 ? 'visible' : 'hidden';
    nextBtn.textContent = stepIndex === this.totalSteps - 1 ? 'Get Started! 🚀' : 'Next →';
    
    this.currentStep = stepIndex;
  }
  
  nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.showStep(this.currentStep + 1);
      this.trackEvent('onboarding_step_completed', { step: this.currentStep });
    } else {
      this.completeOnboarding();
    }
  }
  
  previousStep() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }
  
  completeOnboarding() {
    console.log('✅ Hi-Muscle onboarding completed');
    
    // Mark as completed
    localStorage.setItem('hi-muscle-onboarding-seen', 'true');
    
    // Track completion
    this.trackEvent('onboarding_completed');
    
    // Close modal with celebration
    this.celebrateCompletion();
  }
  
  celebrateCompletion() {
    const modal = document.getElementById('hi-muscle-onboarding');
    if (!modal) return;
    
    // Brief celebration animation
    modal.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
      modal.classList.remove('active');
      
      setTimeout(() => {
        modal.remove();
        
        // Focus on emotion selection to start user journey
        this.focusOnEmotionSelection();
        
      }, 400);
    }, 600);
  }
  
  focusOnEmotionSelection() {
    // Smooth scroll to emotion tabs and add subtle highlight
    const emotionTabs = document.querySelector('.tabs');
    if (emotionTabs) {
      emotionTabs.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add temporary highlight
      emotionTabs.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
      emotionTabs.style.transition = 'box-shadow 0.3s ease';
      
      setTimeout(() => {
        emotionTabs.style.boxShadow = 'none';
      }, 3000);
    }
  }
  
  skipOnboarding() {
    console.log('⏭️ Hi-Muscle onboarding skipped');
    
    // Mark as seen to prevent reshowing
    localStorage.setItem('hi-muscle-onboarding-seen', 'true');
    
    // Track skip
    this.trackEvent('onboarding_skipped', { step: this.currentStep });
    
    // Close modal
    const modal = document.getElementById('hi-muscle-onboarding');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 400);
    }
  }
  
  setupEngagementTracking() {
    // Track emotion selections
    document.addEventListener('click', (e) => {
      if (e.target.closest('.emotion-btn') || e.target.closest('.tab')) {
        this.userEngagement.emotionsSelected++;
        localStorage.setItem('hi-muscle-emotions-selected', this.userEngagement.emotionsSelected.toString());
      }
    });
    
    // Track time spent
    this.startTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
      const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
      this.userEngagement.timeSpent += timeSpent;
      localStorage.setItem('hi-muscle-time-spent', this.userEngagement.timeSpent.toString());
    });
  }
  
  trackEvent(eventName, data = {}) {
    // Integration point for analytics
    if (window.gtag) {
      window.gtag('event', eventName, {
        event_category: 'hi_muscle_onboarding',
        ...data
      });
    }
    
    console.log(`📊 Onboarding Event: ${eventName}`, data);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.hiMuscleOnboarding = new HiMuscleOnboarding();
});

// Fallback initialization
if (document.readyState !== 'loading') {
  window.hiMuscleOnboarding = new HiMuscleOnboarding();
}