// Floating systems (extracted from hi-muscle)
// Add floating refresh button
function addFloatingRefresh() {
  if (!document.querySelector('.floating-refresh')) {
    const refreshButton = document.createElement('button');
    refreshButton.className = 'floating-refresh';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
    refreshButton.addEventListener('click', () => {
      location.reload();
    });
    document.body.appendChild(refreshButton);
  }
}

// Initialize refresh button after page load
addFloatingRefresh();

// Floating Hiffirmations System - Hi Muscle Context
class FloatingHiffirmations {
  constructor() {
    this.currentPage = 'muscle';
    this.lastShown = 0;
    this.cooldownPeriod = 30000; // 30 seconds
    this.messageHistory = [];
    this.maxHistorySize = 5;
    this.init();
  }

  init() {
    this.createFloatingButton();
    this.setupEventListeners();
    // Start gentle activity-based triggers after page settles
    setTimeout(() => this.startActivityTriggers(), 5000);
  }

  createFloatingButton() {
    const button = document.createElement('button');
    button.className = 'floating-hiffirmations';
    button.innerHTML = '✨';
    button.setAttribute('aria-label', 'Emotional Strength Inspiration');
    button.setAttribute('title', 'Grow with intention');
    
    const popup = document.createElement('div');
    popup.className = 'hiffirmation-popup';
    popup.setAttribute('role', 'tooltip');
    
    document.body.appendChild(button);
    document.body.appendChild(popup);
    
    this.button = button;
    this.popup = popup;
  }

  setupEventListeners() {
    this.button.addEventListener('click', () => {
      this.showContextualMessage();
    });

    // Close popup on click outside
    document.addEventListener('click', (e) => {
      if (!this.button.contains(e.target) && !this.popup.contains(e.target)) {
        this.hidePopup();
      }
    });
  }

  getContextualMessages() {
    const userTier = this.getUserTier();
    const emotionalIntensity = this.getEmotionalIntensity();
    const timeOfDay = this.getTimeOfDay();
    const growthStage = this.getGrowthStage();
    
    // Base growth messages
    const baseMessages = [
      "💪 Emotional growth takes courage",
      "🔥 You're becoming who you're meant to be",
      "🌱 Progress over perfection always",
      "🎯 Every step forward counts",
      "⚡ Your strength is building daily"
    ];

    // Standard tier - deeper growth wisdom
    const standardMessages = [
      "🏔️ You're stronger than any challenge",
      "🌟 Resilience is your hidden superpower",
      "💎 Pressure creates diamonds like you",
      "🚀 Your growth mindset is unstoppable",
      "🦋 Transformation happens in small moments",
      "⭐ Your emotional fitness is improving"
    ];

    // Premium tier - mastery of inner work
    const premiumMessages = [
      "🔥 You transform obstacles into opportunities",
      "⭐ Your emotional intelligence is expanding",
      "🌈 You're mastering the art of inner strength",
      "💫 Every challenge reveals more of your power",
      "🎭 You architect your own transformation",
      "🦄 Your inner work changes everything"
    ];

    // Emotional intensity-aware messages
    const intensityMessages = this.getIntensityMessages(emotionalIntensity, userTier);
    
    // Growth stage-specific messages
    const stageMessages = this.getGrowthStageMessages(growthStage, userTier);
    
    // Time-aware growth messages
    const timeMessages = this.getTimeAwareGrowthMessages(timeOfDay, userTier);

    // Build intelligent message pool
    let messagePool = [...baseMessages];
    
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      messagePool.push(...standardMessages);
    }
    if (userTier === 'PREMIUM') {
      messagePool.push(...premiumMessages);
    }
    
    messagePool.push(...intensityMessages);
    messagePool.push(...stageMessages);
    messagePool.push(...timeMessages);

    return messagePool;
  }

  getEmotionalIntensity() {
    if (this.activityScore > 18) return 'intense';
    if (this.activityScore > 8) return 'focused';
    return 'gentle';
  }

  getGrowthStage() {
    const patterns = this.growthPattern || {};
    if (patterns.emotionSelections > 3 && patterns.formInteractions > 2) return 'deep_work';
    if (patterns.emotionSelections > 1) return 'engaged';
    return 'beginning';
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  getIntensityMessages(intensity, userTier) {
    const intensityMessages = {
      gentle: {
        base: ["🌸 Gentle steps create lasting change", "💝 Honor your own pace"],
        standard: ["🌱 Soft strength builds deep roots", "🌊 Gentle waves move mountains"],
        premium: ["🧘‍♀️ You master the art of gentle power", "✨ Gentle consistency transforms everything"]
      },
      focused: {
        base: ["🎯 Focused effort builds real strength", "🔥 Your attention creates transformation"],
        standard: ["💪 Focused growth compounds beautifully", "⚡ Your concentration is your superpower"],
        premium: ["🚀 You channel focus into masterful growth", "💎 Focused intention becomes reality"]
      },
      intense: {
        base: ["🏔️ Intense work forges unshakeable strength", "🔥 You're in the forge of transformation"],
        standard: ["⚡ Intense growth creates breakthroughs", "💫 Your commitment is extraordinary"],
        premium: ["🌟 You alchemize intensity into mastery", "🦋 Intense transformation is your specialty"]
      }
    };

    const messages = [...intensityMessages[intensity].base];
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      messages.push(...intensityMessages[intensity].standard);
    }
    if (userTier === 'PREMIUM') {
      messages.push(...intensityMessages[intensity].premium);
    }

    return messages;
  }

  getGrowthStageMessages(stage, userTier) {
    const stageMessages = {
      beginning: {
        base: ["🌱 Every expert was once a beginner", "👋 Welcome to your growth journey"],
        standard: ["🎯 Starting is the hardest part - you're doing it", "⭐ Your courage to begin changes everything"],
        premium: ["🚀 You honor the power of fresh starts", "💎 Beginning again is advanced practice"]
      },
      engaged: {
        base: ["🔥 Your engagement accelerates growth", "💪 Active participation builds strength"],
        standard: ["🌟 Engaged growth creates lasting change", "⚡ Your involvement deepens the transformation"],
        premium: ["🎭 You master the art of engaged growth", "🦋 Engaged practice becomes transformation"]
      },
      deep_work: {
        base: ["🏔️ Deep work creates profound shifts", "💎 You're mining pure emotional gold"],
        standard: ["🌊 Deep engagement unlocks hidden strength", "🔥 Your depth of practice is remarkable"],
        premium: ["🌟 You architect transformation through depth", "⚡ Deep work is your path to mastery"]
      }
    };

    const messages = [...stageMessages[stage].base];
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      messages.push(...stageMessages[stage].standard);
    }
    if (userTier === 'PREMIUM') {
      messages.push(...stageMessages[stage].premium);
    }

    return messages;
  }

  getTimeAwareGrowthMessages(timeOfDay, userTier) {
    const timeMessages = {
      morning: {
        base: ["🌅 Morning growth sets a powerful tone", "☀️ Early emotional work energizes the day"],
        standard: ["💪 Morning strength training for the soul", "🌱 Dawn practice cultivates daily resilience"],
        premium: ["🎯 You architect transformation with morning intention", "🔥 Morning growth becomes daily mastery"]
      },
      afternoon: {
        base: ["🌞 Midday growth maintains momentum", "⚡ Afternoon strength building pays dividends"],
        standard: ["🚀 Sustained growth work compounds beautifully", "💎 Afternoon practice deepens resilience"],
        premium: ["🌟 You sustain transformation with masterful consistency", "🦋 Afternoon growth becomes lifestyle mastery"]
      },
      evening: {
        base: ["🌙 Evening growth completes the circle", "✨ Twilight reflection integrates learning"],
        standard: ["🌟 Evening practice honors the day's journey", "💫 Reflective growth builds wisdom"],
        premium: ["🎭 Evening growth transforms daily experience", "🦄 You complete each day stronger than you began"]
      }
    };

    const messages = [...timeMessages[timeOfDay].base];
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      messages.push(...timeMessages[timeOfDay].standard);
    }
    if (userTier === 'PREMIUM') {
      messages.push(...timeMessages[timeOfDay].premium);
    }

    return messages;
  }

  displayMessage(message, type = 'contextual') {
    // Growth-specific message display
    this.popup.textContent = message;
    this.popup.setAttribute('data-message-type', type);
    
    if (type === 'growth') {
      this.popup.style.background = 'rgba(233, 30, 99, 0.1)';
      this.popup.style.borderColor = 'rgba(233, 30, 99, 0.3)';
    } else {
      this.popup.style.background = 'rgba(26, 32, 56, 0.95)';
      this.popup.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    }
    
    this.popup.classList.add('show');
    
    const baseTime = type === 'growth' ? 6000 : 4000; // Growth messages stay longer
    const lengthBonus = Math.min(2000, message.length * 50);
    const hideDelay = baseTime + lengthBonus;
    
    setTimeout(() => {
      this.hidePopup();
    }, hideDelay);

    this.trackGrowthMessage(message, type);
  }

  trackGrowthMessage(message, type) {
    if (!window.hiAnalytics) return;
    
    window.hiAnalytics.track('growth_hiffirmation_shown', {
      message_type: type,
      growth_context: 'hi_muscle',
      user_tier: this.getUserTier(),
      emotional_intensity: this.getEmotionalIntensity(),
      growth_stage: this.getGrowthStage(),
      activity_score: this.activityScore,
      emotion_selections: this.growthPattern?.emotionSelections || 0
    });
  }

  getUserTier() {
    // Integration with existing tier system
    const tierElement = document.getElementById('hi-tier-indicator');
    if (tierElement) {
      const tierText = tierElement.querySelector('.tier-text')?.textContent;
      if (tierText === 'Premium') return 'PREMIUM';
      if (tierText === 'Standard') return 'STANDARD';
    }
    return 'ANONYMOUS';
  }

  showContextualMessage() {
    const now = Date.now();
    if (now - this.lastShown < this.cooldownPeriod) return;

    const messages = this.getContextualMessages();
    const availableMessages = messages.filter(msg => !this.messageHistory.includes(msg));
    
    if (availableMessages.length === 0) {
      this.messageHistory = []; // Reset history if all used
      this.showContextualMessage(); // Retry
      return;
    }

    const message = availableMessages[Math.floor(Math.random() * availableMessages.length)];
    this.displayMessage(message);
    
    // Update history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
    
    this.lastShown = now;
  }

  displayMessage(message) {
    this.popup.textContent = message;
    this.popup.classList.add('show');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      this.hidePopup();
    }, 4000);
  }

  hidePopup() {
    this.popup.classList.remove('show');
  }

  startActivityTriggers() {
    // Smart growth-focused triggers for emotional fitness context
    this.activityScore = 0;
    this.growthMilestones = ['emotion-selection', 'journey-completion', 'share-growth'];
    this.setupGrowthTriggers();
    this.setupSmartGrowthTiming();
    this.trackGrowthPattern();
  }

  setupGrowthTriggers() {
    // Trigger inspirational messages after growth milestones
    
    // Emotion selection milestone
    const emotionButtons = document.querySelectorAll('.mood-btn, [data-emotion]');
    emotionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setTimeout(() => {
          this.showGrowthMessage('emotion-selection');
        }, 2500);
      });
    });

    // Journey completion milestone (form submission)
    const submitButton = document.querySelector('#btnSubmit, [type="submit"]');
    if (submitButton) {
      submitButton.addEventListener('click', () => {
        setTimeout(() => {
          this.showGrowthMessage('journey-completion');
        }, 3000);
      });
    }

    // Share/vulnerability milestone
    const shareElements = document.querySelectorAll('[data-action="share"], .share-btn');
    shareElements.forEach(element => {
      element.addEventListener('click', () => {
        setTimeout(() => {
          this.showGrowthMessage('share-growth');
        }, 2000);
      });
    });
  }

  showGrowthMessage(growthType) {
    const now = Date.now();
    if (now - this.lastShown < 25000) return; // Growth-specific cooldown

    const growthMessages = this.getGrowthMessages(growthType);
    const message = growthMessages[Math.floor(Math.random() * growthMessages.length)];
    this.displayMessage(message, 'growth');
    this.lastShown = now;
  }

  getGrowthMessages(growthType) {
    const userTier = this.getUserTier();
    
    const growthMap = {
      'emotion-selection': {
        base: ["💪 Naming emotions builds strength", "🎯 Awareness is the first step"],
        standard: ["🌱 Emotional honesty cultivates growth", "⚡ You're developing emotional intelligence"],
        premium: ["🦋 You master the art of emotional awareness", "💎 Conscious feeling transforms into wisdom"]
      },
      'journey-completion': {
        base: ["🏔️ Every journey strengthens you", "✨ Completion builds resilience"],
        standard: ["🚀 Your commitment to growth is powerful", "🌟 Each journey expands your capacity"],
        premium: ["🎭 You architect transformation through practice", "⭐ Your growth journey inspires others"]
      },
      'share-growth': {
        base: ["🤝 Sharing growth multiplies strength", "🌈 Vulnerability creates connection"],
        standard: ["💫 Your openness builds community", "🔥 Authentic sharing lights paths for others"],
        premium: ["🌟 You model courageous emotional leadership", "🦄 Your vulnerability transforms environments"]
      }
    };

    const messageSet = growthMap[growthType] || growthMap['emotion-selection'];
    let messages = [...messageSet.base];
    
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      messages.push(...messageSet.standard);
    }
    if (userTier === 'PREMIUM') {
      messages.push(...messageSet.premium);
    }

    return messages;
  }

  setupSmartGrowthTiming() {
    // Growth-focused smart timing that respects emotional work
    let growthTimer;
    let emotionalIntensity = 'gentle'; // gentle, focused, intense
    
    const calculateEmotionalIntensity = () => {
      if (this.activityScore > 18) emotionalIntensity = 'intense';
      else if (this.activityScore > 8) emotionalIntensity = 'focused';
      else emotionalIntensity = 'gentle';
    };

    const getGrowthInterval = () => {
      const intervals = {
        gentle: 210000,   // 3.5 minutes - gentle encouragement
        focused: 270000,  // 4.5 minutes - respect the work
        intense: 330000   // 5.5 minutes - don't interrupt deep work
      };
      return intervals[emotionalIntensity] + Math.random() * 60000;
    };

    const resetGrowthTimer = () => {
      clearTimeout(growthTimer);
      calculateEmotionalIntensity();
      
      growthTimer = setTimeout(() => {
        if (this.shouldShowGrowthMessage()) {
          this.showContextualMessage();
        }
        resetGrowthTimer();
      }, getGrowthInterval());
    };

    // Track growth-specific interactions
    ['click', 'focus', 'input', 'selection'].forEach(event => {
      document.addEventListener(event, (e) => {
        this.activityScore += this.getGrowthWeight(e);
        setTimeout(() => { this.activityScore = Math.max(0, this.activityScore - 1); }, 40000);
      }, { passive: true });
    });

    resetGrowthTimer();
  }

  getGrowthWeight(event) {
    const weights = {
      click: 3,
      focus: 1,
      input: 4,      // Form input is high-value growth work
      selection: 5   // Emotion selection is deep work
    };

    // Bonus for growth-related elements
    if (event.target && event.target.closest('.mood-btn, [data-emotion], form, textarea')) {
      return (weights[event.type] || 1) * 2;
    }

    return weights[event.type] || 1;
  }

  shouldShowGrowthMessage() {
    const now = Date.now();
    if (now - this.lastShown < 90000) return false; // 1.5 minutes minimum for emotional work

    // Don't interrupt intense emotional processing
    if (this.activityScore > 25) return false;

    return true;
  }

  trackGrowthPattern() {
    this.growthPattern = {
      sessionStart: Date.now(),
      emotionSelections: 0,
      formInteractions: 0,
      shareActions: 0,
      deepWork: 0
    };

    // Track growth-specific behaviors
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mood-btn, [data-emotion]')) {
        this.growthPattern.emotionSelections++;
      }
      if (e.target.closest('form, textarea, input')) {
        this.growthPattern.formInteractions++;
      }
      if (e.target.closest('[data-action="share"]')) {
        this.growthPattern.shareActions++;
      }
    });

    document.addEventListener('focus', (e) => {
      if (e.target.closest('textarea, input[type="text"]')) {
        this.growthPattern.deepWork++;
      }
    });
  }
}

// Initialize floating Hiffirmations system
const floatingHiffirmations = new FloatingHiffirmations();

// Quote Card Generation System (Tesla-Grade)
class HiQuoteCardGenerator {
  constructor() {
    this.brandColors = {
      primary: '#FFD166',
      secondary: '#F4A261',
      accent: '#E76F51',
      background: '#1E2A4A',
      backgroundSecondary: '#2D4A87',
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.8)'
    };
    
    this.socialFormats = {
      instagram_post: { width: 1080, height: 1080 },
      instagram_story: { width: 1080, height: 1920 },
      twitter_card: { width: 1200, height: 675 },
      square: { width: 800, height: 800 }
    };
  }

  async generateQuoteCard(message, options = {}) {
    const {
      userTier = 'ANONYMOUS',
      format = 'square',
      context = 'muscle'
    } = options;

    const dimensions = this.socialFormats[format];
    const canvas = this.createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');

    await this.drawBackground(ctx, canvas, userTier);
    await this.drawQuoteText(ctx, message, canvas, userTier);
    await this.drawBranding(ctx, canvas, userTier, context);
    
    return canvas.toDataURL('image/png', 0.9);
  }

  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  async drawBackground(ctx, canvas, userTier) {
    const { width, height } = canvas;
    let gradient;
    
    switch(userTier) {
      case 'PREMIUM':
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, this.brandColors.primary);
        gradient.addColorStop(0.3, this.brandColors.secondary);
        gradient.addColorStop(0.7, this.brandColors.accent);
        gradient.addColorStop(1, this.brandColors.background);
        break;
      case 'STANDARD':
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, this.brandColors.background);
        gradient.addColorStop(0.5, this.brandColors.backgroundSecondary);
        gradient.addColorStop(1, this.brandColors.secondary);
        break;
      default:
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.brandColors.background);
        gradient.addColorStop(1, this.brandColors.backgroundSecondary);
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    if (userTier === 'PREMIUM') {
      this.addPremiumTexture(ctx, canvas);
    }
  }

  addPremiumTexture(ctx, canvas) {
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 3 + 1;
      
      ctx.fillStyle = this.brandColors.primary;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  async drawQuoteText(ctx, message, canvas, userTier) {
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const fontSize = this.getFontSize(message.length, canvas);
    const fontFamily = userTier === 'PREMIUM' ? 
      'Georgia, "Times New Roman", serif' : 
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    ctx.fillStyle = this.brandColors.text;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const lines = this.wrapText(ctx, message, width * 0.8);
    const lineHeight = fontSize * 1.4;
    const totalTextHeight = lines.length * lineHeight;
    const startY = centerY - (totalTextHeight / 2);
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    
    lines.forEach((line, index) => {
      const y = startY + (index * lineHeight);
      ctx.fillText(line, centerX, y);
    });
    
    ctx.shadowColor = 'transparent';
  }

  getFontSize(textLength, canvas) {
    const baseSize = Math.min(canvas.width, canvas.height) / 20;
    if (textLength < 30) return Math.min(baseSize * 1.2, 48);
    if (textLength < 60) return Math.min(baseSize, 40);
    return Math.min(baseSize * 0.8, 32);
  }

  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  async drawBranding(ctx, canvas, userTier, context = 'muscle') {
    const { width, height } = canvas;
    const brandingY = height - 80;
    
    ctx.fillStyle = this.brandColors.textSecondary;
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('— Stay Hi Community —', width / 2, brandingY);
    
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = this.brandColors.primary;
    ctx.fillText('stay-hi.app', width / 2, brandingY + 35);
    
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = this.brandColors.textSecondary;
      const tierText = userTier === 'PREMIUM' ? '✨ Premium Member' : '⭐ Standard Member';
      ctx.fillText(tierText, width / 2, brandingY - 25);
    }
  }

  async dataURLToBlob(dataURL) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(resolve, 'image/png', 0.9);
      };
      
      img.src = dataURL;
    });
  }
}

// Initialize quote card generator for Hi Muscle
window.HiQuoteCardGenerator = new HiQuoteCardGenerator();

// ✨ Tier Display Update System (synced with dashboard logic)
function updateBrandTierDisplay() {
  const tierIndicator = document.getElementById('hi-tier-indicator');
  if (!tierIndicator) return;
  if (!window.HiBrandTiers) return;
  
  let tierKey = 'anonymous';
  if (window.unifiedMembership?.membershipStatus?.tier) {
    tierKey = window.unifiedMembership.membershipStatus.tier;
  } else if (window.HiMembership?.currentUser?.tierInfo?.name) {
    tierKey = window.HiMembership.currentUser.tierInfo.name.toLowerCase();
  }
  
  window.HiBrandTiers.updateTierPill(tierIndicator, tierKey, {
    showEmoji: false,
    useGradient: false
  });
  console.log('🎫 [Hi Gym] Tier updated:', tierKey);
}

// Initialize tier display on page load and listen for changes
setTimeout(() => updateBrandTierDisplay(), 1000);
window.addEventListener('membershipStatusChanged', () => updateBrandTierDisplay());
window.addEventListener('hi:auth-ready', () => updateBrandTierDisplay()); // ✅ FIX: Update on auth ready
setTimeout(() => { if (window.unifiedMembership?.membershipStatus?.tier) updateBrandTierDisplay(); }, 2500);
setTimeout(() => { if (window.unifiedMembership?.membershipStatus?.tier) updateBrandTierDisplay(); }, 5000);
