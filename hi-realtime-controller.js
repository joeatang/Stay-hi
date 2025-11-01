/**
 * 🚀 TESLA-GRADE REAL-TIME HI FLOW SYSTEM
 * Live Hi tracking with WebSocket connections, instant updates, and community feed
 * Designed for thousands of concurrent users and instant global synchronization
 */

class HiRealTimeController {
    constructor() {
        this.supabase = null;
        this.realtimeChannel = null;
        this.connectionStatus = 'disconnected';
        this.heartbeatInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.eventListeners = new Map();
        
        // Performance tracking
        this.metrics = {
            messagesReceived: 0,
            messagesSent: 0,
            connectionUptime: 0,
            lastLatency: 0,
            averageLatency: 0
        };
        
        // Initialize connection
        this.initializeRealTimeConnection();
        
        console.log('🔄 Hi Real-Time Controller initialized - Tesla-grade performance');
    }
    
    /**
     * Initialize Supabase real-time connection with auto-reconnect
     */
    async initializeRealTimeConnection() {
        try {
            // Initialize Supabase client (assume it's already configured)
            if (typeof window !== 'undefined' && window.supabase) {
                this.supabase = window.supabase;
            }
            
            if (!this.supabase) {
                console.warn('⚠️ Supabase client not found - using mock mode');
                this.initializeMockConnection();
                return;
            }
            
            // Create real-time channel for Hi shares
            this.realtimeChannel = this.supabase
                .channel('hi-global-feed')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'hi_shares_geo'
                    },
                    (payload) => this.handleHiShareUpdate(payload)
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'hi_global_stats'
                    },
                    (payload) => this.handleGlobalStatsUpdate(payload)
                )
                .subscribe((status) => {
                    this.connectionStatus = status;
                    this.handleConnectionStatusChange(status);
                });
            
            // Start heartbeat monitoring
            this.startHeartbeat();
            
        } catch (error) {
            console.error('❌ Real-time connection failed:', error);
            this.scheduleReconnect();
        }
    }
    
    /**
     * Mock connection for development/testing
     */
    initializeMockConnection() {
        this.connectionStatus = 'connected';
        console.log('🔄 Mock real-time connection active');
        
        // Simulate periodic updates for testing
        setInterval(() => {
            this.triggerMockUpdate();
        }, 10000); // Every 10 seconds
    }
    
    /**
     * Handle Hi share real-time updates
     */
    handleHiShareUpdate(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        this.metrics.messagesReceived++;
        
        switch (eventType) {
            case 'INSERT':
                this.handleNewHiShare(newRecord);
                break;
                
            case 'UPDATE':
                this.handleHiShareUpdate(newRecord, oldRecord);
                break;
                
            case 'DELETE':
                this.handleHiShareDelete(oldRecord);
                break;
        }
        
        // Update UI instantly
        this.notifyListeners('hi-share-update', {
            eventType,
            data: newRecord || oldRecord
        });
    }
    
    /**
     * Handle new Hi share creation
     */
    handleNewHiShare(hiShare) {
        console.log('✨ New Hi share received:', hiShare);
        
        // Add to live feed
        this.addToLiveFeed(hiShare);
        
        // Update counters
        this.incrementGlobalCounters();
        
        // Show notification if enabled
        this.showHiNotification(hiShare);
        
        // Trigger celebration animation
        this.triggerCelebration('new-hi');
    }
    
    /**
     * Handle global stats updates
     */
    handleGlobalStatsUpdate(payload) {
        const { new: newStats } = payload;
        
        // Update global counters instantly
        this.updateGlobalCounters(newStats);
        
        // Notify listeners
        this.notifyListeners('global-stats-update', newStats);
    }
    
    /**
     * Add new Hi share to live feed
     */
    addToLiveFeed(hiShare) {
        const feedContainer = document.querySelector('#live-hi-feed');
        if (!feedContainer) return;
        
        const hiElement = this.createHiShareElement(hiShare);
        
        // Add with fade-in animation
        hiElement.style.opacity = '0';
        hiElement.style.transform = 'translateY(-20px)';
        
        feedContainer.insertBefore(hiElement, feedContainer.firstChild);
        
        // Animate in
        requestAnimationFrame(() => {
            hiElement.style.transition = 'all 0.3s ease-out';
            hiElement.style.opacity = '1';
            hiElement.style.transform = 'translateY(0)';
        });
        
        // Remove oldest items if feed is getting long
        const feedItems = feedContainer.children;
        if (feedItems.length > 50) {
            const oldestItem = feedItems[feedItems.length - 1];
            oldestItem.style.transition = 'all 0.3s ease-out';
            oldestItem.style.opacity = '0';
            oldestItem.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                if (oldestItem.parentNode) {
                    oldestItem.remove();
                }
            }, 300);
        }
    }
    
    /**
     * Create Hi share element for live feed
     */
    createHiShareElement(hiShare) {
        const element = document.createElement('div');
        element.className = 'hi-share-item live-item';
        element.innerHTML = `
            <div class="hi-share-content">
                <div class="hi-share-header">
                    <div class="hi-share-emoji">${hiShare.current_emoji || '👋'}</div>
                    <div class="hi-share-info">
                        <div class="hi-share-username">@${hiShare.member_username || 'Anonymous'}</div>
                        <div class="hi-share-location">${hiShare.location_name || 'Somewhere'}</div>
                    </div>
                    <div class="hi-share-time">${this.formatTimeAgo(hiShare.created_at)}</div>
                </div>
                <div class="hi-share-text">${this.sanitizeText(hiShare.share_text)}</div>
                <div class="hi-share-actions">
                    <button class="hi-action-btn" onclick="hiRealTime.sendHi('${hiShare.id}')">
                        <span class="hi-action-emoji">👋</span>
                        <span class="hi-action-count">${hiShare.hi_count || 0}</span>
                    </button>
                    <button class="hi-action-btn" onclick="hiRealTime.viewLocation('${hiShare.id}')">
                        <span class="hi-action-emoji">📍</span>
                        <span class="hi-action-text">View</span>
                    </button>
                </div>
            </div>
        `;
        
        return element;
    }
    
    /**
     * Update global counters with smooth animations
     */
    updateGlobalCounters(stats) {
        const counters = {
            'total-members': stats.total_members,
            'total-shares': stats.total_shares,
            'daily-active': stats.daily_active_users,
            'live-shares': stats.current_live_shares
        };
        
        Object.entries(counters).forEach(([id, newValue]) => {
            const element = document.querySelector(`[data-counter="${id}"]`);
            if (element) {
                this.animateCounter(element, newValue);
            }
        });
    }
    
    /**
     * Animate counter with smooth transitions
     */
    animateCounter(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - currentValue) / 20);
        let currentCount = currentValue;
        
        const updateCounter = () => {
            currentCount += increment;
            if (currentCount >= targetValue) {
                currentCount = targetValue;
                element.textContent = this.formatNumber(currentCount);
                
                // Add pulse animation for significant changes
                if (targetValue > currentValue) {
                    element.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        element.style.transform = 'scale(1)';
                    }, 200);
                }
                return;
            }
            
            element.textContent = this.formatNumber(currentCount);
            requestAnimationFrame(updateCounter);
        };
        
        if (increment > 0) {
            updateCounter();
        }
    }
    
    /**
     * Send Hi to another user's share
     */
    async sendHi(shareId) {
        try {
            if (!this.supabase) {
                console.log('📡 Mock Hi sent to share:', shareId);
                this.showSuccessMessage('Hi sent! 👋');
                return;
            }
            
            // Record the interaction
            const { data, error } = await this.supabase
                .from('hi_interactions')
                .insert({
                    share_id: shareId,
                    interaction_type: 'hi',
                    sender_coordinates: await this.getCurrentLocation()
                });
            
            if (error) throw error;
            
            // Update the share's hi count
            await this.supabase
                .from('hi_shares_geo')
                .update({ 
                    hi_count: this.supabase.sql`hi_count + 1`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', shareId);
            
            // Show success feedback
            this.showSuccessMessage('Hi sent! 👋');
            this.triggerCelebration('hi-sent');
            
        } catch (error) {
            console.error('❌ Error sending Hi:', error);
            this.showErrorMessage('Failed to send Hi. Please try again.');
        }
    }
    
    /**
     * Create new Hi share
     */
    async createHiShare(shareData) {
        try {
            if (!this.supabase) {
                console.log('📡 Mock Hi share created:', shareData);
                this.showSuccessMessage('Your Hi is now live! ✨');
                return;
            }
            
            const { data, error } = await this.supabase
                .rpc('create_hi_share', {
                    p_member_id: shareData.memberId,
                    p_share_text: shareData.text,
                    p_current_emoji: shareData.emoji,
                    p_location_name: shareData.locationName,
                    p_lat: shareData.lat,
                    p_lng: shareData.lng,
                    p_origin_page: shareData.originPage || 'web'
                });
            
            if (error) throw error;
            
            this.showSuccessMessage('Your Hi is now live! ✨');
            this.triggerCelebration('hi-created');
            
            return data;
            
        } catch (error) {
            console.error('❌ Error creating Hi share:', error);
            this.showErrorMessage('Failed to share Hi. Please try again.');
            throw error;
        }
    }
    
    /**
     * Get current user location
     */
    async getCurrentLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                () => resolve(null),
                { timeout: 5000, maximumAge: 300000 }
            );
        });
    }
    
    /**
     * Connection status handling
     */
    handleConnectionStatusChange(status) {
        console.log('🔄 Connection status:', status);
        
        const statusElement = document.querySelector('[data-connection-status]');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `connection-status status-${status}`;
        }
        
        if (status === 'SUBSCRIBED') {
            this.reconnectAttempts = 0;
            this.startConnectionTimer();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.scheduleReconnect();
        }
    }
    
    /**
     * Auto-reconnect with exponential backoff
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('⚠️ Max reconnect attempts reached');
            return;
        }
        
        const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
        this.reconnectAttempts++;
        
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.initializeRealTimeConnection();
        }, delay);
    }
    
    /**
     * Heartbeat monitoring
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.realtimeChannel && this.connectionStatus === 'SUBSCRIBED') {
                const startTime = Date.now();
                
                // Send a ping to measure latency
                this.realtimeChannel.send({
                    type: 'heartbeat',
                    timestamp: startTime
                });
                
                // Calculate average latency
                this.metrics.lastLatency = Date.now() - startTime;
                this.metrics.averageLatency = 
                    (this.metrics.averageLatency + this.metrics.lastLatency) / 2;
            }
        }, 30000); // Every 30 seconds
    }
    
    /**
     * Event listener management
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    notifyListeners(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('❌ Event listener error:', error);
                }
            });
        }
    }
    
    /**
     * UI Helper Methods
     */
    triggerCelebration(type) {
        const celebrationElement = document.querySelector('.celebration-container');
        if (celebrationElement) {
            celebrationElement.className = `celebration-container ${type}`;
            setTimeout(() => {
                celebrationElement.className = 'celebration-container';
            }, 2000);
        }
    }
    
    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }
    
    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }
    
    showMessage(message, type = 'info') {
        const messageContainer = document.querySelector('#message-container') || 
            this.createMessageContainer();
        
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.innerHTML = `
            <div class="message-content">${message}</div>
            <button class="message-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        messageContainer.appendChild(messageElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.style.opacity = '0';
                setTimeout(() => messageElement.remove(), 300);
            }
        }, 5000);
    }
    
    createMessageContainer() {
        const container = document.createElement('div');
        container.id = 'message-container';
        container.className = 'message-container';
        document.body.appendChild(container);
        return container;
    }
    
    /**
     * Utility Methods
     */
    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }
    
    formatNumber(num) {
        if (num < 1000) return num.toString();
        if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
        return (num / 1000000).toFixed(1) + 'M';
    }
    
    sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Mock update for testing
     */
    triggerMockUpdate() {
        const mockHiShare = {
            id: `mock-${Date.now()}`,
            share_text: 'Hello from the Hi community! 👋',
            current_emoji: '👋',
            location_name: 'San Francisco, CA',
            member_username: 'hi_pioneer',
            created_at: new Date().toISOString(),
            hi_count: Math.floor(Math.random() * 20)
        };
        
        this.handleNewHiShare(mockHiShare);
    }
    
    /**
     * Performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            connectionStatus: this.connectionStatus,
            uptime: Date.now() - this.metrics.connectionUptime
        };
    }
    
    /**
     * Cleanup on page unload
     */
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
        }
        
        this.eventListeners.clear();
    }
}

// Global instance
const hiRealTime = new HiRealTimeController();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HiRealTimeController;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    hiRealTime.destroy();
});

console.log('✨ Tesla-grade Real-Time Hi Flow System loaded');