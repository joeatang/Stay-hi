// Hi Island UI floating systems and nav system touches (extracted)

// Tesla Navigation System removed - Home nav now in header companion behaviors

document.addEventListener('DOMContentLoaded', () => {
  if (window.hiNavSystem) {
    window.hiNavSystem.updateAppState('ready');
  }
});

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
// addFloatingRefresh(); // DISABLED - floating buttons removed from UI

// Floating Hiffirmations System - Hi Island Context
class FloatingHiffirmations {
  constructor() {
    this.currentPage = 'island';
    this.lastShown = 0;
    this.cooldownPeriod = 30000; // 30 seconds
    this.messageHistory = [];
    this.maxHistorySize = 5;
    this.init();
  }
  init() {
    this.createFloatingButton();
    this.setupEventListeners();
    setTimeout(() => this.startActivityTriggers(), 5000);
  }
  createFloatingButton() {
    const button = document.createElement('button');
    button.className = 'floating-hiffirmations';
    button.innerHTML = '✨';
    button.setAttribute('aria-label', 'Island Inspiration');
    button.setAttribute('title', 'Explore with intention');
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
    document.addEventListener('click', (e) => {
      if (!this.button.contains(e.target) && !this.popup.contains(e.target)) {
        this.hidePopup();
      }
    });
  }
  getContextualMessages() {
    const userTier = this.getUserTier();
    const explorationDepth = this.getExplorationDepth();
    const timeOfDay = this.getTimeOfDay();
    const baseMessages = [
      "🏝️ Explore with an open heart",
      "🌊 Discovery starts with curiosity",
      "⭐ New perspectives await you",
      "🔍 Every exploration teaches something",
      "🌅 Fresh insights are emerging"
    ];
    const standardMessages = [
      "🗺️ You're charting your own unique path",
      "🧭 Trust your inner navigation system",
      "🌟 Adventure begins with a single step",
      "🎯 Your explorations have purpose",
      "🌱 Curiosity cultivates wisdom",
      "🦋 Each discovery transforms you"
    ];
    const premiumMessages = [
      "💎 You're discovering hidden treasures within",
      "🚀 Your curiosity unlocks infinite possibilities",
      "🌈 Each exploration expands your world",
      "⚡ You're an explorer of life's mysteries",
      "🎭 You master the art of conscious discovery",
      "🦄 Your exploration style is uniquely yours"
    ];
    const depthMessages = this.getExplorationDepthMessages(explorationDepth, userTier);
    const timeMessages = this.getTimeAwareExplorationMessages(timeOfDay, userTier);
    let messagePool = [...baseMessages];
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      messagePool.push(...standardMessages);
    }
    if (userTier === 'PREMIUM') {
      messagePool.push(...premiumMessages);
    }
    messagePool.push(...depthMessages);
    messagePool.push(...timeMessages);
    return messagePool;
  }
  getExplorationDepth() {
    if (this.activityScore > 15) return 'deep';
    if (this.activityScore > 6) return 'engaged';
    return 'surface';
  }
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
  getExplorationDepthMessages(depth, userTier) {
    const depthMessages = {
      surface: {
        base: ["🌊 Surface exploration opens doors", "👀 Gentle curiosity guides discovery"],
        standard: ["🎯 Light exploration builds momentum", "🌱 Every glance plants seeds of wonder"],
        premium: ["✨ You honor your natural exploration rhythm", "🧘‍♀️ Mindful browsing cultivates awareness"]
      },
      engaged: {
        base: ["🔥 Your engagement deepens understanding", "💫 Active exploration creates magic"],
        standard: ["🚀 Engaged curiosity accelerates insight", "🌟 Your focus unlocks hidden connections"],
        premium: ["🎭 You dance between focus and flow", "💎 Engaged exploration becomes wisdom"]
      },
      deep: {
        base: ["🌊 Deep exploration transforms perspective", "🔍 You're mining pure gold right now"],
        standard: ["🏔️ Deep diving reveals hidden treasures", "⚡ Your intensity illuminates truth"],
        premium: ["🦋 You alchemize exploration into transformation", "🌈 Deep engagement is your superpower"]
      }
    };
    const messages = [...depthMessages[depth].base];
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      messages.push(...depthMessages[depth].standard);
    }
    if (userTier === 'PREMIUM') {
      messages.push(...depthMessages[depth].premium);
    }
    return messages;
  }
  getTimeAwareExplorationMessages(timeOfDay, userTier) {
    const timeMessages = {
      morning: {
        base: ["🌅 Morning exploration sets the tone", "☀️ Fresh perspectives await discovery"],
        standard: ["🌱 Morning curiosity plants daily seeds", "⭐ Early exploration builds momentum"],
        premium: ["🎯 You architect discovery with morning intention", "🔥 Morning exploration shapes your reality"]
      },
      afternoon: {
        base: ["🌞 Midday discovery energizes the soul", "⚡ Afternoon exploration brings clarity"],
        standard: ["💪 Sustained exploration builds mastery", "🌟 Afternoon focus deepens understanding"],
        premium: ["🚀 You sustain exploration with masterful flow", "💎 Afternoon discovery becomes transformation"]
      },
      evening: {
        base: ["🌙 Evening exploration deepens wisdom", "✨ Twilight curiosity reveals hidden gems"],
        standard: ["🌟 Evening discovery completes the circle", "💫 Reflective exploration integrates learning"],
        premium: ["🎭 Evening exploration honors the day's journey", "🦋 You transform daily discovery into wisdom"]
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
    this.popup.textContent = message;
    this.popup.setAttribute('data-message-type', type);
    if (type === 'exploration') {
      this.popup.style.background = 'rgba(103, 126, 234, 0.1)';
      this.popup.style.borderColor = 'rgba(103, 126, 234, 0.3)';
    } else {
      this.popup.style.background = 'rgba(26, 32, 56, 0.95)';
      this.popup.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    }
    this.popup.classList.add('show');
    const baseTime = type === 'exploration' ? 5500 : 4000;
    const lengthBonus = Math.min(2000, message.length * 50);
    const hideDelay = baseTime + lengthBonus;
    setTimeout(() => {
      this.hidePopup();
    }, hideDelay);
    this.trackExplorationMessage(message, type);
  }
  trackExplorationMessage(message, type) {
    if (!window.hiAnalytics) return;
    window.hiAnalytics.track('exploration_hiffirmation_shown', {
      message_type: type,
      exploration_context: 'hi_island',
      user_tier: this.getUserTier(),
      exploration_depth: this.getExplorationDepth(),
      activity_score: this.activityScore,
      tab_switches: this.explorationPattern?.tabSwitches || 0
    });
  }
  getUserTier() {
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
      this.messageHistory = [];
      this.showContextualMessage();
      return;
    }
    const message = availableMessages[Math.floor(Math.random() * availableMessages.length)];
    this.displayMessage(message);
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
    this.lastShown = now;
  }
  displayMessage(message) {
    this.popup.textContent = message;
    this.popup.classList.add('show');
    setTimeout(() => {
      this.hidePopup();
    }, 4000);
  }
  hidePopup() {
    this.popup.classList.remove('show');
  }
  startActivityTriggers() {
    this.activityScore = 0;
    this.explorationMilestones = ['general-tab', 'mindfulness-tab', 'learning-tab', 'creativity-tab'];
    this.setupExplorationTriggers();
    this.setupSmartTimingForExploration();
    this.trackExplorationPattern();
  }
  setupExplorationTriggers() {
    this.explorationMilestones.forEach(tabId => {
      const tab = document.querySelector(`[data-tab="${tabId}"]`, `#${tabId}`) || document.querySelector(`#${tabId}`);
      if (tab) {
        tab.addEventListener('click', () => {
          setTimeout(() => {
            this.showExplorationMessage(tabId);
          }, 3000);
        });
      }
    });
    const shareButtons = document.querySelectorAll('.share-action-btn, [data-action="share"]');
    shareButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setTimeout(() => {
          this.showExplorationMessage('share-exploration');
        }, 2000);
      });
    });
  }
  showExplorationMessage(explorationType) {
    const now = Date.now();
    if (now - this.lastShown < 20000) return;
    const explorationMessages = this.getExplorationMessages(explorationType);
    const message = explorationMessages[Math.floor(Math.random() * explorationMessages.length)];
    this.displayMessage(message, 'exploration');
    this.lastShown = now;
  }
  getExplorationMessages(explorationType) {
    const userTier = this.getUserTier();
    const explorationMap = {
      'general-tab': {
        base: ["🗺️ Every exploration starts somewhere", "🌊 General discovery opens new paths"],
        standard: ["🧭 Your curiosity is your compass", "⭐ Broad exploration builds wisdom"],
        premium: ["🚀 You navigate discovery with intention", "💎 General awareness unlocks specific insights"]
      },
      'mindfulness-tab': {
        base: ["🧘‍♀️ Mindful moments create clarity", "🌸 Presence is your superpower"],
        standard: ["💫 Mindfulness deepens your exploration", "🌱 Awareness cultivates inner wisdom"],
        premium: ["🎭 You master the art of conscious exploration", "✨ Mindful discovery transforms perspective"]
      },
      'learning-tab': {
        base: ["📚 Learning never stops serving you", "🌟 Knowledge builds on curiosity"],
        standard: ["🎯 Active learning accelerates growth", "🔥 Your learning mindset is magnetic"],
        premium: ["🦋 You transform information into wisdom", "🌈 Learning becomes your creative playground"]
      },
      'creativity-tab': {
        base: ["🎨 Creativity flows from exploration", "✨ Your imagination has no limits"],
        standard: ["💫 Creative exploration unlocks potential", "🌺 Your creative spirit inspires others"],
        premium: ["🦄 You channel exploration into creative mastery", "🎭 Your creativity transforms the world around you"]
      },
      'share-exploration': {
        base: ["🤝 Sharing discovery multiplies wisdom", "🌈 Your exploration inspires others"],
        standard: ["💡 Shared insights create community", "🔥 Your discoveries light paths for others"],
        premium: ["🌟 You're a beacon of conscious exploration", "⚡ Your shared wisdom transforms communities"]
      }
    };
    const messageSet = explorationMap[explorationType] || explorationMap['general-tab'];
    let messages = [...messageSet.base];
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      messages.push(...messageSet.standard);
    }
    if (userTier === 'PREMIUM') {
      messages.push(...messageSet.premium);
    }
    return messages;
  }
  setupSmartTimingForExploration() {
    let explorationTimer;
    let explorationDepth = 'surface';
    const calculateExplorationDepth = () => {
      if (this.activityScore > 15) explorationDepth = 'deep';
      else if (this.activityScore > 6) explorationDepth = 'engaged';
      else explorationDepth = 'surface';
    };
    const getExplorationInterval = () => {
      const intervals = {
        surface: 240000,
        engaged: 300000,
        deep: 360000
      };
      return intervals[explorationDepth] + Math.random() * 60000;
    };
    const resetExplorationTimer = () => {
      clearTimeout(explorationTimer);
      calculateExplorationDepth();
      explorationTimer = setTimeout(() => {
        if (this.shouldShowExplorationMessage()) {
          this.showContextualMessage();
        }
        resetExplorationTimer();
      }, getExplorationInterval());
    };
    ['click', 'scroll', 'focus', 'tab-switch'].forEach(event => {
      document.addEventListener(event, (e) => {
        this.activityScore += this.getExplorationWeight(e);
        setTimeout(() => { this.activityScore = Math.max(0, this.activityScore - 1); }, 45000);
      }, { passive: true });
    });
    resetExplorationTimer();
  }
  getExplorationWeight(event) {
    const weights = {
      click: 2,
      scroll: 1,
      focus: 1,
      'tab-switch': 4
    };
    if (event.target && event.target.closest('[data-tab], .feed-item, .share-action-btn')) {
      return (weights[event.type] || 1) * 2;
    }
    return weights[event.type] || 1;
  }
  shouldShowExplorationMessage() {
    const now = Date.now();
    if (now - this.lastShown < 60000) return false;
    if (this.activityScore > 20) return false;
    return true;
  }
  trackExplorationPattern() {
    this.explorationPattern = {
      sessionStart: Date.now(),
      tabSwitches: 0,
      shareActions: 0,
      deepInteractions: 0
    };
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-tab]')) {
        this.explorationPattern.tabSwitches++;
      }
      if (e.target.closest('.share-action-btn')) {
        this.explorationPattern.shareActions++;
      }
    });
  }
}

// Initialize floating Hiffirmations system
// DISABLED - floating buttons removed, access Hiffirmations via header pill only
// const floatingHiffirmations = new FloatingHiffirmations();

// 🎨 TESLA-GRADE Quote Card Generation System (Premium Branding)
class HiQuoteCardGenerator {
  constructor() {
    this.brandColors = {
      primary: '#FFD166',
      secondary: '#F4A261',
      accent: '#E76F51',
      background: '#0F1022',
      backgroundSecondary: '#1A1D3A',
      backgroundTertiary: '#252B52',
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.9)',
      textTertiary: 'rgba(255, 255, 255, 0.6)'
    };
    this.socialFormats = {
      instagram_post: { width: 1080, height: 1080 },
      instagram_story: { width: 1080, height: 1920 },
      twitter_card: { width: 1200, height: 675 },
      square: { width: 1080, height: 1080 }
    };
    this.logoCache = null;
  }
  async generateQuoteCard(message, options = {}) {
    const { userTier = 'ANONYMOUS', format = 'square', context = 'island' } = options;
    const dimensions = this.socialFormats[format];
    const canvas = this.createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    await this.drawBackground(ctx, canvas, userTier);
    await this.drawQuoteText(ctx, message, canvas, userTier);
    await this.drawBranding(ctx, canvas, userTier, context);
    return canvas.toDataURL('image/png', 1.0);
  }
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  async drawBackground(ctx, canvas, userTier) {
    const { width, height } = canvas;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    switch(userTier) {
      case 'PREMIUM':
        gradient.addColorStop(0, '#1A1D3A');
        gradient.addColorStop(0.3, '#252B52');
        gradient.addColorStop(0.6, '#2D3561');
        gradient.addColorStop(1, '#1E2447');
        break;
      case 'STANDARD':
        gradient.addColorStop(0, '#0F1022');
        gradient.addColorStop(0.5, '#1A1D3A');
        gradient.addColorStop(1, '#252B52');
        break;
      default:
        gradient.addColorStop(0, '#0F1022');
        gradient.addColorStop(1, '#1A1D3A');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    this.addGeometricPattern(ctx, canvas, userTier);
    if (userTier === 'PREMIUM') {
      this.addLightRays(ctx, canvas);
    }
  }
  addGeometricPattern(ctx, canvas, userTier) {
    const { width, height } = canvas;
    ctx.globalAlpha = userTier === 'PREMIUM' ? 0.08 : 0.04;
    ctx.strokeStyle = this.brandColors.primary;
    ctx.lineWidth = 1;
    const spacing = 60;
    for (let i = -height; i < width + height; i += spacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  addLightRays(ctx, canvas) {
    const { width, height } = canvas;
    ctx.globalAlpha = 0.05;
    const centerX = width / 2;
    const centerY = height * 0.3;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, height * 0.8
      );
      gradient.addColorStop(0, this.brandColors.primary);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.fillRect(-width * 0.1, 0, width * 0.2, height);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  async drawQuoteText(ctx, message, canvas, userTier) {
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const fontSize = this.getFontSize(message.length, canvas);
    const fontWeight = userTier === 'PREMIUM' ? '600' : '500';
    const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = this.brandColors.text;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = this.wrapText(ctx, message, width * 0.75);
    const lineHeight = fontSize * 1.5;
    const totalTextHeight = lines.length * lineHeight;
    const startY = centerY - (totalTextHeight / 2) + 20;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    lines.forEach((line, index) => {
      const y = startY + (index * lineHeight);
      ctx.fillText(line, centerX, y);
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  getFontSize(textLength, canvas) {
    const baseSize = canvas.width / 18;
    if (textLength < 30) return Math.min(baseSize * 1.3, 70);
    if (textLength < 60) return Math.min(baseSize * 1.1, 60);
    if (textLength < 100) return Math.min(baseSize * 0.95, 52);
    return Math.min(baseSize * 0.8, 44);
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
  async drawBranding(ctx, canvas, userTier, context = 'island') {
    const { width, height } = canvas;
    if (!this.logoCache) {
      await this.loadLogo();
    }
    const brandingY = height - 140;
    const logoSize = 80;
    const logoX = width / 2 - (logoSize / 2);
    if (this.logoCache) {
      ctx.drawImage(this.logoCache, logoX, brandingY - 20, logoSize, logoSize);
    }
    ctx.fillStyle = this.brandColors.text;
    ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Stay Hi', width / 2, brandingY + 85);
    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = this.brandColors.primary;
    ctx.fillText('stay-hi.app', width / 2, brandingY + 120);
    if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
      this.drawTierBadge(ctx, canvas, userTier);
    }
  }
  drawTierBadge(ctx, canvas, userTier) {
    const { width } = canvas;
    const badgeY = 50;
    const badgeWidth = 200;
    const badgeHeight = 40;
    const badgeX = (width / 2) - (badgeWidth / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 20);
    ctx.fill();
    ctx.stroke();
    const badgeText = userTier === 'PREMIUM' ? '✨ Premium Member' : '⭐ Standard Member';
    ctx.fillStyle = this.brandColors.text;
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, width / 2, badgeY + 25);
  }
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  async loadLogo() {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.logoCache = img;
        resolve();
      };
      img.onerror = () => {
        console.warn('⚠️ Could not load logo for quote card');
        resolve();
      };
      img.src = './assets/brand/hi-logo-light.png';
    });
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

// Initialize quote card generator for Hi Island
defineQuoteCardGenerator();
function defineQuoteCardGenerator(){
  try {
    window.HiQuoteCardGenerator = new HiQuoteCardGenerator();
  } catch(e) {
    console.warn('Quote card generator init failed:', e);
  }
}

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
  console.log('🎫 [Hi Island] Tier updated:', tierKey);
}

// Initialize tier display on page load and listen for changes
setTimeout(() => updateBrandTierDisplay(), 1000);
window.addEventListener('membershipStatusChanged', () => updateBrandTierDisplay());
window.addEventListener('hi:auth-ready', () => updateBrandTierDisplay()); // ✅ FIX: Update on auth ready
setTimeout(() => { if (window.unifiedMembership?.membershipStatus?.tier) updateBrandTierDisplay(); }, 2500);
setTimeout(() => { if (window.unifiedMembership?.membershipStatus?.tier) updateBrandTierDisplay(); }, 5000);
