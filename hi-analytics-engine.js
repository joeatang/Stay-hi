/**
 * 🚀 TESLA-GRADE HI ANALYTICS ENGINE
 * Comprehensive user journey tracking, conversion funnels, and community insights
 * Privacy-first analytics with actionable business intelligence
 */

class HiAnalyticsEngine {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.memberId = null;
        this.sessionStart = Date.now();
        this.events = [];
        this.funnelStages = new Map();
        this.conversionTrackers = new Map();
        
        // Performance tracking
        this.performanceMetrics = {
            pageLoadTime: 0,
            interactionLatency: [],
            apiResponseTimes: [],
            errorRate: 0,
            totalErrors: 0
        };
        
        // User behavior patterns
        this.behaviorPatterns = {
            scrollDepth: 0,
            timeOnPage: 0,
            clickHeatmap: new Map(),
            navigationPath: [],
            engagementScore: 0
        };
        
        // Initialize tracking
        this.initializeTracking();
        
        console.log('📊 Hi Analytics Engine initialized - Tesla-grade insights');
    }
    
    /**
     * Initialize comprehensive tracking systems
     */
    initializeTracking() {
        // Track page performance
        this.trackPagePerformance();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize conversion funnels
        this.initializeFunnels();
        
        // Start session tracking
        this.startSessionTracking();
        
        // Track user agent and device info
        this.trackDeviceInfo();
    }
    
    /**
     * Track page performance metrics
     */
    trackPagePerformance() {
        if (typeof window !== 'undefined' && window.performance) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.performanceMetrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
                
                // Track key performance metrics
                this.trackEvent('page_performance', {
                    loadTime: this.performanceMetrics.pageLoadTime,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                    firstPaint: this.getFirstPaintTime(),
                    largestContentfulPaint: this.getLCPTime(),
                    cumulativeLayoutShift: this.getCLSScore()
                });
            }
        }
    }
    
    /**
     * Set up comprehensive event listeners
     */
    setupEventListeners() {
        if (typeof window === 'undefined') return;
        
        // Page visibility tracking
        document.addEventListener('visibilitychange', () => {
            this.trackEvent('page_visibility', {
                hidden: document.hidden,
                timestamp: Date.now()
            });
        });
        
        // Scroll depth tracking
        let maxScrollDepth = 0;
        window.addEventListener('scroll', this.throttle(() => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
                this.behaviorPatterns.scrollDepth = maxScrollDepth;
                
                // Track milestone scrolls
                if ([25, 50, 75, 100].includes(scrollPercent)) {
                    this.trackEvent('scroll_milestone', {
                        depth: scrollPercent,
                        timeToDepth: Date.now() - this.sessionStart
                    });
                }
            }
        }, 500));
        
        // Click heatmap tracking
        document.addEventListener('click', (event) => {
            const element = event.target;
            const selector = this.getElementSelector(element);
            const position = { x: event.clientX, y: event.clientY };
            
            // Update heatmap
            const key = `${selector}:${Math.floor(position.x/50)}:${Math.floor(position.y/50)}`;
            this.behaviorPatterns.clickHeatmap.set(key, 
                (this.behaviorPatterns.clickHeatmap.get(key) || 0) + 1
            );
            
            // Track click event
            this.trackEvent('element_click', {
                element: selector,
                position: position,
                timestamp: Date.now()
            });
        });
        
        // Form interaction tracking
        document.addEventListener('input', (event) => {
            if (event.target.type === 'text' || event.target.type === 'textarea') {
                this.trackEvent('form_interaction', {
                    field: event.target.name || event.target.id,
                    fieldType: event.target.type,
                    valueLength: event.target.value.length
                });
            }
        });
        
        // Error tracking
        window.addEventListener('error', (event) => {
            this.performanceMetrics.totalErrors++;
            this.performanceMetrics.errorRate = 
                this.performanceMetrics.totalErrors / this.events.length;
            
            this.trackEvent('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackEvent('promise_rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack
            });
        });
    }
    
    /**
     * Initialize conversion funnels for Hi journey
     */
    initializeFunnels() {
        // Hi Discovery Funnel
        this.funnelStages.set('hi_discovery', [
            'page_view',
            'location_granted',
            'map_interaction',
            'first_hi_view',
            'hi_engagement'
        ]);
        
        // Hi Creation Funnel
        this.funnelStages.set('hi_creation', [
            'create_button_click',
            'share_modal_open',
            'location_input',
            'message_input',
            'share_submit',
            'share_success'
        ]);
        
        // Member Conversion Funnel
        this.funnelStages.set('member_conversion', [
            'anonymous_visit',
            'invite_code_interest',
            'signup_start',
            'profile_creation',
            'first_share',
            'community_engagement'
        ]);
        
        // Initialize funnel tracking
        this.funnelStages.forEach((stages, funnelName) => {
            this.conversionTrackers.set(funnelName, {
                stages: stages,
                currentStage: 0,
                conversions: new Array(stages.length).fill(0),
                dropoffs: new Array(stages.length - 1).fill(0),
                timeToConversion: []
            });
        });
    }
    
    /**
     * Track custom event with comprehensive context
     */
    trackEvent(eventName, properties = {}) {
        const event = {
            id: this.generateEventId(),
            sessionId: this.sessionId,
            userId: this.userId,
            memberId: this.memberId,
            eventName: eventName,
            properties: {
                ...properties,
                timestamp: Date.now(),
                url: window.location.href,
                referrer: document.referrer,
                userAgent: navigator.userAgent,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language
            }
        };
        
        // Add to events array
        this.events.push(event);
        
        // Update funnel progress
        this.updateFunnelProgress(eventName, properties);
        
        // Update engagement score
        this.updateEngagementScore(eventName, properties);
        
        // Send to analytics backend (if available)
        this.sendToBackend(event);
        
        console.log('📊 Event tracked:', eventName, properties);
        
        return event;
    }
    
    /**
     * Track Hi-specific events
     */
    trackHiEvent(action, context = {}) {
        const hiEvents = {
            'hi_share_created': { value: 10, engagement: 5 },
            'hi_received': { value: 5, engagement: 3 },
            'hi_sent': { value: 3, engagement: 2 },
            'location_shared': { value: 8, engagement: 4 },
            'profile_updated': { value: 6, engagement: 2 },
            'invite_code_used': { value: 15, engagement: 8 },
            'community_interaction': { value: 4, engagement: 3 }
        };
        
        const eventData = hiEvents[action] || { value: 1, engagement: 1 };
        
        return this.trackEvent(`hi_${action}`, {
            ...context,
            eventValue: eventData.value,
            engagementWeight: eventData.engagement,
            category: 'hi_interaction'
        });
    }
    
    /**
     * Track conversion funnel progress
     */
    updateFunnelProgress(eventName, properties) {
        this.funnelStages.forEach((stages, funnelName) => {
            const tracker = this.conversionTrackers.get(funnelName);
            const currentStageIndex = tracker.currentStage;
            
            if (stages[currentStageIndex] === eventName) {
                // User progressed to next stage
                tracker.conversions[currentStageIndex]++;
                tracker.currentStage = Math.min(currentStageIndex + 1, stages.length - 1);
                
                // Track conversion time
                if (currentStageIndex === 0) {
                    tracker.conversionStartTime = Date.now();
                } else if (currentStageIndex === stages.length - 1) {
                    const conversionTime = Date.now() - tracker.conversionStartTime;
                    tracker.timeToConversion.push(conversionTime);
                }
                
                this.trackEvent('funnel_progress', {
                    funnelName: funnelName,
                    stage: stages[currentStageIndex],
                    stageIndex: currentStageIndex,
                    conversionTime: Date.now() - this.sessionStart
                });
            }
        });
    }
    
    /**
     * Update user engagement score
     */
    updateEngagementScore(eventName, properties) {
        const engagementWeights = {
            'page_view': 1,
            'element_click': 2,
            'form_interaction': 3,
            'hi_share_created': 10,
            'hi_sent': 5,
            'location_shared': 8,
            'scroll_milestone': 1,
            'time_on_page': 0.1
        };
        
        const weight = properties.engagementWeight || engagementWeights[eventName] || 1;
        this.behaviorPatterns.engagementScore += weight;
        
        // Track engagement milestones
        const score = this.behaviorPatterns.engagementScore;
        if ([10, 25, 50, 100, 200].includes(Math.floor(score))) {
            this.trackEvent('engagement_milestone', {
                score: Math.floor(score),
                sessionDuration: Date.now() - this.sessionStart
            });
        }
    }
    
    /**
     * Track user journey and paths
     */
    trackPageView(page, properties = {}) {
        this.behaviorPatterns.navigationPath.push({
            page: page,
            timestamp: Date.now(),
            referrer: document.referrer
        });
        
        return this.trackEvent('page_view', {
            page: page,
            ...properties,
            navigationDepth: this.behaviorPatterns.navigationPath.length,
            timeFromPrevious: this.getTimeSinceLastPageView()
        });
    }
    
    /**
     * Track API performance
     */
    trackApiCall(endpoint, method, startTime, success, responseTime) {
        this.performanceMetrics.apiResponseTimes.push(responseTime);
        
        return this.trackEvent('api_call', {
            endpoint: endpoint,
            method: method,
            responseTime: responseTime,
            success: success,
            averageResponseTime: this.getAverageApiResponseTime()
        });
    }
    
    /**
     * Get comprehensive analytics report
     */
    getAnalyticsReport() {
        const sessionDuration = Date.now() - this.sessionStart;
        
        return {
            session: {
                id: this.sessionId,
                duration: sessionDuration,
                userId: this.userId,
                memberId: this.memberId,
                startTime: this.sessionStart
            },
            
            performance: {
                ...this.performanceMetrics,
                averageApiResponseTime: this.getAverageApiResponseTime(),
                averageInteractionLatency: this.getAverageInteractionLatency()
            },
            
            behavior: {
                ...this.behaviorPatterns,
                eventsPerMinute: (this.events.length / (sessionDuration / 60000)).toFixed(2),
                pagesVisited: this.behaviorPatterns.navigationPath.length,
                mostClickedElements: this.getMostClickedElements()
            },
            
            funnels: this.getFunnelAnalytics(),
            
            events: {
                total: this.events.length,
                byCategory: this.getEventsByCategory(),
                timeline: this.events.slice(-20) // Recent events
            },
            
            insights: this.generateInsights()
        };
    }
    
    /**
     * Get funnel analytics with conversion rates
     */
    getFunnelAnalytics() {
        const funnelData = {};
        
        this.conversionTrackers.forEach((tracker, funnelName) => {
            const stages = this.funnelStages.get(funnelName);
            const conversions = tracker.conversions;
            const conversionRates = [];
            
            for (let i = 0; i < stages.length - 1; i++) {
                const rate = conversions[i] > 0 ? (conversions[i + 1] / conversions[i]) * 100 : 0;
                conversionRates.push(rate.toFixed(2));
            }
            
            funnelData[funnelName] = {
                stages: stages,
                conversions: conversions,
                conversionRates: conversionRates,
                averageTimeToConversion: this.calculateAverageTime(tracker.timeToConversion),
                totalConversions: conversions[conversions.length - 1]
            };
        });
        
        return funnelData;
    }
    
    /**
     * Generate actionable insights
     */
    generateInsights() {
        const insights = [];
        const sessionDuration = Date.now() - this.sessionStart;
        
        // Engagement insights
        if (this.behaviorPatterns.engagementScore > 50) {
            insights.push({
                type: 'high_engagement',
                message: 'User shows high engagement - great candidate for membership upgrade',
                priority: 'high',
                actionable: true
            });
        }
        
        // Performance insights
        if (this.performanceMetrics.pageLoadTime > 3000) {
            insights.push({
                type: 'performance_issue',
                message: 'Slow page load time may impact user experience',
                priority: 'medium',
                actionable: true,
                metric: this.performanceMetrics.pageLoadTime
            });
        }
        
        // Funnel insights
        const hiCreationFunnel = this.conversionTrackers.get('hi_creation');
        if (hiCreationFunnel && hiCreationFunnel.currentStage > 0 && hiCreationFunnel.currentStage < 3) {
            insights.push({
                type: 'funnel_dropout',
                message: 'User started Hi creation but didn\'t complete - consider assistance',
                priority: 'high',
                actionable: true,
                stage: hiCreationFunnel.currentStage
            });
        }
        
        // Session length insights
        if (sessionDuration > 300000 && this.events.length > 20) { // 5+ minutes, 20+ events
            insights.push({
                type: 'power_user',
                message: 'Extended session with high activity - potential community champion',
                priority: 'high',
                actionable: true
            });
        }
        
        return insights;
    }
    
    /**
     * Export analytics data for external systems
     */
    exportData(format = 'json') {
        const data = this.getAnalyticsReport();
        
        switch (format) {
            case 'csv':
                return this.convertToCSV(data.events.timeline);
            case 'json':
            default:
                return JSON.stringify(data, null, 2);
        }
    }
    
    /**
     * Utility Methods
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getElementSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
    }
    
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
    
    getFirstPaintTime() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : 0;
    }
    
    getLCPTime() {
        // Would need PerformanceObserver for real LCP
        return 0; // Placeholder
    }
    
    getCLSScore() {
        // Would need PerformanceObserver for real CLS
        return 0; // Placeholder
    }
    
    getAverageApiResponseTime() {
        const times = this.performanceMetrics.apiResponseTimes;
        return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    }
    
    getAverageInteractionLatency() {
        const latencies = this.performanceMetrics.interactionLatency;
        return latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    }
    
    getMostClickedElements() {
        return Array.from(this.behaviorPatterns.clickHeatmap.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([element, count]) => ({ element, count }));
    }
    
    getEventsByCategory() {
        const categories = {};
        this.events.forEach(event => {
            const category = event.properties.category || 'general';
            categories[category] = (categories[category] || 0) + 1;
        });
        return categories;
    }
    
    getTimeSinceLastPageView() {
        const navPath = this.behaviorPatterns.navigationPath;
        if (navPath.length < 2) return 0;
        return Date.now() - navPath[navPath.length - 2].timestamp;
    }
    
    calculateAverageTime(times) {
        return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    }
    
    trackDeviceInfo() {
        this.trackEvent('device_info', {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenWidth: screen.width,
            screenHeight: screen.height,
            colorDepth: screen.colorDepth
        });
    }
    
    startSessionTracking() {
        // Track time on page every minute
        setInterval(() => {
            this.behaviorPatterns.timeOnPage = Date.now() - this.sessionStart;
            this.trackEvent('time_on_page', {
                duration: this.behaviorPatterns.timeOnPage,
                engagementScore: this.behaviorPatterns.engagementScore
            });
        }, 60000);
    }
    
    sendToBackend(event) {
        // Send analytics to backend if available
        if (typeof window !== 'undefined' && window.hiAnalyticsEndpoint) {
            fetch(window.hiAnalyticsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            }).catch(error => {
                console.warn('Analytics backend unavailable:', error);
            });
        }
    }
    
    convertToCSV(events) {
        if (events.length === 0) return '';
        
        const headers = Object.keys(events[0]);
        const csvRows = [headers.join(',')];
        
        for (const event of events) {
            const values = headers.map(header => {
                const value = event[header];
                return typeof value === 'string' ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }
    
    /**
     * Set user identification
     */
    setUser(userId, memberId = null) {
        this.userId = userId;
        this.memberId = memberId;
        
        this.trackEvent('user_identified', {
            userId: userId,
            memberId: memberId
        });
    }
    
    /**
     * Clear user data (GDPR compliance)
     */
    clearUserData() {
        this.userId = null;
        this.memberId = null;
        this.events = this.events.map(event => ({
            ...event,
            userId: null,
            memberId: null
        }));
        
        this.trackEvent('user_data_cleared', {
            reason: 'privacy_request'
        });
    }
}

// Global instance
const hiAnalytics = new HiAnalyticsEngine();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HiAnalyticsEngine;
}

console.log('📊 Tesla-grade Hi Analytics Engine loaded');