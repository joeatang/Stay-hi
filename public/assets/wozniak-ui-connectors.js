/**
 * 🎮 WOZNIAK UI CONNECTORS
 * 
 * Connects the Wozniak Tracking Foundation to all UI elements:
 * - Rotator announcements
 * - Counter displays  
 * - Medallion clicks
 * - Share sheets
 * - Any future tracking UI
 * 
 * Clean, event-driven, bulletproof connections
 */

class WozniakUIConnectors {
    constructor() {
        this.tracking = null;
        this.elements = {};
        this.isConnected = false;
        
        console.log('🎮 Wozniak UI Connectors initialized');
    }

    /**
     * 🔌 CONNECT - Link tracking foundation to UI
     */
    async connect(trackingFoundation) {
        if (this.isConnected) return true;
        
        try {
            console.log('🔌 Connecting Wozniak UI to tracking foundation...');
            
            this.tracking = trackingFoundation;
            
            // Get DOM elements
            this.findUIElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initial UI update
            this.updateAllUI();
            
            this.isConnected = true;
            console.log('✅ Wozniak UI Connectors: Connected');
            
            return true;
        } catch (error) {
            console.error('❌ Wozniak UI connection failed:', error);
            return false;
        }
    }

    /**
     * 🔍 FIND UI ELEMENTS - Locate all tracking-related DOM elements
     */
    findUIElements() {
        console.log('🔍 Wozniak UI: Finding DOM elements...');
        
        this.elements = {
            // Counter displays
            todayCount: document.getElementById('todayCount'),
            totalCount: document.getElementById('totalCount'), 
            streakCount: document.getElementById('streakLen'),
            
            // Medallion for clicks
            hiMedal: document.getElementById('hiMedal'),
            
            // Rotator announcement area
            announceTxt: document.getElementById('announceTxt'),
            
            // Any other tracking UI elements
        };
        
        // Log what we found
        const found = Object.entries(this.elements)
            .filter(([key, el]) => el)
            .map(([key]) => key);
            
        const missing = Object.entries(this.elements)
            .filter(([key, el]) => !el)
            .map(([key]) => key);
            
        console.log('✅ Wozniak UI: Found elements:', found);
        if (missing.length > 0) {
            console.warn('⚠️ Wozniak UI: Missing elements:', missing);
        }
    }

    /**
     * 🎧 SETUP EVENT LISTENERS - Connect to tracking events and UI interactions
     */
    setupEventListeners() {
        console.log('🎧 Wozniak UI: Setting up event listeners...');
        
        if (!this.tracking) {
            console.error('❌ No tracking foundation available');
            return;
        }
        
        // Listen to tracking updates
        this.tracking.on('metrics:updated', (metrics) => {
            this.updateAllUI(metrics);
        });
        
        this.tracking.on('foundation:ready', (metrics) => {
            console.log('🚀 Wozniak UI: Foundation ready, updating UI');
            this.updateAllUI(metrics);
        });
        
        // Set up medallion click handler
        if (this.elements.hiMedal) {
            // Clean any existing handlers
            this.elements.hiMedal.replaceWith(this.elements.hiMedal.cloneNode(true));
            this.elements.hiMedal = document.getElementById('hiMedal');
            
            this.elements.hiMedal.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleMedallionClick();
            });
            
            console.log('✅ Wozniak UI: Medallion click handler installed');
        }
    }

    /**
     * 🎯 HANDLE MEDALLION CLICK - Clean, unified medallion interaction
     */
    async handleMedallionClick() {
        if (!this.tracking) {
            console.error('❌ Medallion click: No tracking foundation');
            return;
        }
        
        try {
            console.log('🎯 Wozniak UI: Medallion clicked');
            
            // Show immediate feedback
            this.showClickFeedback();
            
            // Increment Hi Waves via foundation
            const newCount = await this.tracking.incrementHiWaves();
            
            // Celebration effects for milestones
            if (newCount % 10 === 0) {
                this.celebrateMilestone(newCount);
            }
            
            // Gold Standard: Update streak (unified self-Hi tracking)
            try {
                const user = window.hiAuth?.getCurrentUser?.();
                if (user?.id && user.id !== 'anonymous' && window.HiBase?.updateStreak) {
                    await window.HiBase.updateStreak(user.id);
                    console.log('🔥 Streak updated from medallion tap');
                    
                    // Refresh calendar/streak displays
                    if (window.hiCalendarInstance) {
                        setTimeout(() => {
                            window.hiCalendarInstance.loadHiMoments();
                            window.hiCalendarInstance.loadRemoteStreaks();
                        }, 300);
                    }
                }
            } catch (streakErr) {
                console.warn('⚠️ Streak update skipped:', streakErr);
            }
            
            console.log('✅ Wozniak UI: Medallion click complete');
            
        } catch (error) {
            console.error('❌ Wozniak UI: Medallion click failed:', error);
            this.showErrorFeedback();
        }
    }

    /**
     * 🎨 UPDATE ALL UI - Refresh all displays with current metrics
     */
    updateAllUI(metrics = null) {
        if (!this.tracking) return;
        
        const data = metrics || this.tracking.getAllMetrics();
        
        try {
            // Update counter displays
            this.updateCounterDisplays(data);
            
            // Update rotator
            this.updateRotator(data);
            
            // Update any other UI elements
            
            console.log('✅ Wozniak UI: All UI updated', data);
            
        } catch (error) {
            console.error('❌ Wozniak UI: Update failed:', error);
        }
    }

    /**
     * 🔢 UPDATE COUNTER DISPLAYS - Show metrics in counter elements
     */
    updateCounterDisplays(data) {
        if (this.elements.todayCount) {
            this.elements.todayCount.textContent = this.tracking.formatMetric(data.hi_waves || 0);
        }
        
        if (this.elements.totalCount) {
            this.elements.totalCount.textContent = this.tracking.formatMetric(data.total_his || 0);
        }
        
        if (this.elements.streakCount) {
            this.elements.streakCount.textContent = this.tracking.formatMetric(data.total_users || 0);
        }
    }

    /**
     * 📢 UPDATE ROTATOR - Smart announcement rotation
     */
    updateRotator(data) {
        if (!this.elements.announceTxt) return;
        
        const hiWaves = data.hi_waves || 0;
        const totalHis = data.total_his || 0;
        const totalUsers = data.total_users || 0;
        
        // Create announcement options
        const announcements = [
            {
                type: 'waves',
                text: `🌊 Hi Waves: ${this.tracking.formatMetric(hiWaves)}`,
                condition: hiWaves > 0
            },
            {
                type: 'starts', 
                text: `🏁 Hi Starts: ${this.tracking.formatMetric(totalHis)}`,
                condition: totalHis > 0
            },
            {
                type: 'users',
                text: `👥 Hi Users: ${this.tracking.formatMetric(totalUsers)}`,
                condition: totalUsers > 0
            },
            {
                type: 'affirmation',
                text: `💡 ${this.getDailyHiNote()}`,
                condition: true // Always available
            }
        ];
        
        // Filter to available announcements
        const available = announcements.filter(a => a.condition);
        
        if (available.length > 0) {
            // Start or continue rotation
            this.rotateAnnouncements(available);
        }
    }

    /**
     * 🔄 ROTATE ANNOUNCEMENTS - Cycle through announcements
     */
    rotateAnnouncements(announcements) {
        if (!this.rotatorIndex) this.rotatorIndex = 0;
        
        const current = announcements[this.rotatorIndex % announcements.length];
        
        // Update display
        if (this.elements.announceTxt) {
            this.elements.announceTxt.innerHTML = `
                <span class="badge">${current.type}</span>
                <span class="announce-text">${current.text}</span>
            `;
        }
        
        // Schedule next rotation
        clearTimeout(this.rotatorTimer);
        this.rotatorTimer = setTimeout(() => {
            this.rotatorIndex++;
            this.rotateAnnouncements(announcements);
        }, 3500);
    }

    /**
     * ✨ SHOW CLICK FEEDBACK - Visual feedback for medallion clicks
     */
    showClickFeedback() {
        if (!this.elements.hiMedal) return;
        
        // Add pulse animation
        this.elements.hiMedal.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.elements.hiMedal.style.transform = 'scale(1)';
        }, 150);
        
        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    /**
     * 🎉 CELEBRATE MILESTONE - Special effects for milestone hits
     */
    celebrateMilestone(count) {
        console.log(`🎉 Milestone reached: ${count} Hi Waves!`);
        
        // Use existing premium effects if available
        if (window.PremiumUX) {
            window.PremiumUX.confetti({ count: 50 });
            window.PremiumUX.celebrate(this.elements.hiMedal, `🎉 ${count} Hi Waves!`);
        } else {
            // Fallback celebration
            console.log(`🎊 Celebration: ${count} Hi Waves achieved!`);
        }
    }

    /**
     * ❌ SHOW ERROR FEEDBACK - Visual feedback for errors
     */
    showErrorFeedback() {
        if (this.elements.hiMedal) {
            this.elements.hiMedal.style.filter = 'brightness(0.5)';
            setTimeout(() => {
                this.elements.hiMedal.style.filter = 'brightness(1)';
            }, 300);
        }
        
        console.log('❌ Error feedback shown');
    }

    /**
     * 💡 GET DAILY HI NOTE - Inspirational message
     */
    getDailyHiNote(date = new Date()) {
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        let h = 0;
        for(let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
        
        const pick = arr => arr[Math.abs(h++ % arr.length)];
        const verbs = ["Carry your Hi", "Choose Hi", "Breathe Hi", "Start with Hi", "Move Hi", "Speak Hi"];
        const closers = ["— small Hi's change big days.", "and let courage follow.", "and let kindness ripple."];
        
        return `${pick(verbs)} ${pick(closers)}`;
    }

    /**
     * � UPDATE ROTATOR DISPLAY - External method for legacy compatibility
     */
    updateRotatorDisplay(metrics) {
        console.log('🔄 Wozniak UI: updateRotatorDisplay called', metrics);
        this.updateRotator(metrics);
    }

    /**
     * �🏥 HEALTH CHECK - Verify UI connection status
     */
    getHealthStatus() {
        return {
            connected: this.isConnected,
            hasTracking: !!this.tracking,
            elementsFound: Object.keys(this.elements).filter(k => this.elements[k]).length,
            elementsMissing: Object.keys(this.elements).filter(k => !this.elements[k]),
            rotatorActive: !!this.rotatorTimer
        };
    }
}

/**
 * 🌍 GLOBAL INSTANCE - Single UI connector for entire app
 */
window.WozniakUI = null;

/**
 * 🎯 INITIALIZE WOZNIAK UI CONNECTORS
 */
async function initializeWozniakUI(trackingFoundation) {
    if (window.WozniakUI) {
        console.log('✅ Wozniak UI already initialized');
        return window.WozniakUI;
    }
    
    try {
        console.log('🎮 Initializing Wozniak UI Connectors...');
        
        window.WozniakUI = new WozniakUIConnectors();
        const success = await window.WozniakUI.connect(trackingFoundation);
        
        if (success) {
            console.log('🚀 Wozniak UI Connectors: ONLINE');
            return window.WozniakUI;
        } else {
            throw new Error('UI connection failed');
        }
        
    } catch (error) {
        console.error('❌ Wozniak UI initialization failed:', error);
        return null;
    }
}

// 🚀 WOZNIAK FIX: Export to global window scope for browser access  
window.initializeWozniakUI = initializeWozniakUI;
window.WozniakUIConnectors = WozniakUIConnectors;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WozniakUIConnectors, initializeWozniakUI };
}