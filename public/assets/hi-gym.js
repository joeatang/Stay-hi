/**
 * Hi Gym - Advanced Emotional Intelligence Features
 * Tesla-grade performance and smart filtering logic
 */

window.HiGym = (function() {
  'use strict';

  // Advanced emotion analytics
  function analyzeEmotionalJourney(current, desired) {
    const categories = {
      'hi': ['joy', 'appreciation', 'empowerment', 'love', 'optimism', 'enthusiasm'],
      'neutral': ['boredom', 'frustration', 'doubt', 'contentment', 'acceptance', 'calm'],
      'opportunity': ['anger', 'fear', 'grief', 'anxiety', 'sadness', 'overwhelm']
    };

    const currentCat = findCategoryForEmotion(current, categories);
    const desiredCat = findCategoryForEmotion(desired, categories);

    return {
      currentCategory: currentCat,
      desiredCategory: desiredCat,
      isPositiveShift: currentCat === 'opportunity' && desiredCat === 'hi',
      isNeutralizing: currentCat === 'opportunity' && desiredCat === 'neutral',
      isEnergizing: currentCat === 'neutral' && desiredCat === 'hi',
      journeyType: getJourneyType(currentCat, desiredCat)
    };
  }

  function findCategoryForEmotion(emotion, categories) {
    const emotionName = emotion.name.toLowerCase();
    for (const [cat, emotions] of Object.entries(categories)) {
      if (emotions.some(e => emotionName.includes(e))) {
        return cat;
      }
    }
    return 'neutral'; // default fallback
  }

  function getJourneyType(from, to) {
    if (from === 'opportunity' && to === 'hi') return 'transformation';
    if (from === 'opportunity' && to === 'neutral') return 'stabilization';
    if (from === 'neutral' && to === 'hi') return 'elevation';
    if (from === 'hi' && to === 'neutral') return 'grounding';
    return 'exploration';
  }

  // Smart suggestion engine
  function suggestOptimalEmotions(currentEmotion) {
    const current = currentEmotion.name.toLowerCase();
    
    // Context-aware suggestions based on current emotion
    const suggestions = {
      'anger': ['calm', 'understanding', 'empowerment'],
      'fear': ['courage', 'confidence', 'peace'],
      'grief': ['acceptance', 'love', 'hope'],
      'anxiety': ['calm', 'grounding', 'clarity'],
      'sadness': ['comfort', 'hope', 'joy'],
      'overwhelm': ['clarity', 'focus', 'calm'],
      'boredom': ['curiosity', 'enthusiasm', 'joy'],
      'frustration': ['patience', 'understanding', 'flow'],
      'doubt': ['confidence', 'clarity', 'trust']
    };

    for (const [emotion, recommended] of Object.entries(suggestions)) {
      if (current.includes(emotion)) {
        return recommended;
      }
    }

    return ['joy', 'peace', 'love']; // universal positive defaults
  }

  // Enhanced tracking for analytics
  function trackEmotionalPattern(sessionData) {
    try {
      const patterns = JSON.parse(localStorage.getItem('hi-gym-patterns') || '[]');
      
      const pattern = {
        timestamp: Date.now(),
        current: sessionData.current,
        desired: sessionData.desired,
        journeyType: analyzeEmotionalJourney(sessionData.current, sessionData.desired).journeyType,
        sessionDuration: sessionData.duration || 0,
        journalLength: sessionData.journal?.length || 0
      };

      patterns.push(pattern);
      
      // Keep last 50 sessions for pattern analysis
      if (patterns.length > 50) {
        patterns.splice(0, patterns.length - 50);
      }

      localStorage.setItem('hi-gym-patterns', JSON.stringify(patterns));
      return pattern;
    } catch (e) {
      console.warn('Pattern tracking failed:', e);
      return null;
    }
  }

  // Get user's emotional insights
  function getEmotionalInsights() {
    try {
      const patterns = JSON.parse(localStorage.getItem('hi-gym-patterns') || '[]');
      if (patterns.length < 3) return null;

      const recentPatterns = patterns.slice(-10);
      const mostCommonCurrent = getMostCommon(recentPatterns.map(p => p.current.name));
      const mostCommonDesired = getMostCommon(recentPatterns.map(p => p.desired.name));
      const averageJournalLength = Math.round(
        recentPatterns.reduce((sum, p) => sum + p.journalLength, 0) / recentPatterns.length
      );

      return {
        totalSessions: patterns.length,
        mostCommonCurrent,
        mostCommonDesired,
        averageJournalLength,
        trendingJourneyType: getMostCommon(recentPatterns.map(p => p.journeyType))
      };
    } catch {
      return null;
    }
  }

  function getMostCommon(arr) {
    const counts = {};
    arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
    return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0];
  }

  // Enhanced validation with smart filtering
  function validateEmotionalSelection(current, desired) {
    if (!current || !desired) return { valid: false, reason: 'Missing emotions' };
    
    const analysis = analyzeEmotionalJourney(current, desired);
    
    // Prevent double-negative selections
    if (analysis.currentCategory === 'opportunity' && analysis.desiredCategory === 'opportunity') {
      return { 
        valid: false, 
        reason: 'Consider choosing a more uplifting destination emotion',
        suggestion: suggestOptimalEmotions(current)
      };
    }

    return { valid: true, analysis };
  }

  // Premium celebration for completed journeys
  function createJourneyCelebration(journeyData) {
    const analysis = analyzeEmotionalJourney(journeyData.current, journeyData.desired);
    
    const celebrations = {
      'transformation': '🌟 Incredible transformation! You\'ve shifted from challenge to opportunity.',
      'stabilization': '🎯 Wise choice! Finding your center is powerful.',
      'elevation': '🚀 Amazing lift! You\'re raising your vibration beautifully.',
      'grounding': '🌱 Beautiful grounding. Sometimes we need this stability.',
      'exploration': '🧭 Thoughtful exploration of your emotional landscape.'
    };

    return {
      message: celebrations[analysis.journeyType] || '✨ Beautiful emotional awareness!',
      type: analysis.journeyType,
      isPositive: analysis.isPositiveShift || analysis.isEnergizing
    };
  }

  // Public API
  return {
    analyzeEmotionalJourney,
    suggestOptimalEmotions,
    validateEmotionalSelection,
    trackEmotionalPattern,
    getEmotionalInsights,
    createJourneyCelebration
  };
})();

// Tesla-grade performance optimization
if (typeof window !== 'undefined') {
  // Preload critical functions
  window.addEventListener('DOMContentLoaded', () => {
    // Cache DOM queries for performance
    window.HiGym._cache = {
      grid: document.getElementById('grid'),
      stepper: document.querySelector('.stepper'),
      tabs: document.querySelectorAll('.tab')
    };
  });
}