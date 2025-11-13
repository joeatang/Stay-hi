/**
 * 🚀 Phase 3 Optimized Asset Loader
 * Tesla-grade performance with lazy loading and caching
 */

class Phase3Loader {
    constructor() {
        this.loadedAssets = new Set();
        this.loadingPromises = new Map();
        this.performanceMetrics = {};
    }
    
    async loadCriticalAssets() {
        const criticalAssets = [
            'tesla-edge-protection.css',
            'public/assets/hi-access-tiers.js'
        ];
        
        const loadPromises = criticalAssets.map(asset => this.loadAsset(asset));
        await Promise.all(loadPromises);
        
        console.log('✅ Phase 3 critical assets loaded');
    }
    
    async loadAsset(src) {
        if (this.loadedAssets.has(src)) {
            return Promise.resolve();
        }
        
        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src);
        }
        
        const startTime = performance.now();
        
        const promise = new Promise((resolve, reject) => {
            const extension = src.split('.').pop();
            let element;
            
            if (extension === 'css') {
                element = document.createElement('link');
                element.rel = 'stylesheet';
                element.href = src;
            } else if (extension === 'js') {
                element = document.createElement('script');
                element.src = src;
                element.async = true;
            }
            
            element.onload = () => {
                const loadTime = performance.now() - startTime;
                this.performanceMetrics[src] = loadTime;
                this.loadedAssets.add(src);
                resolve();
            };
            
            element.onerror = reject;
            document.head.appendChild(element);
        });
        
        this.loadingPromises.set(src, promise);
        return promise;
    }
}

// Initialize Phase 3 loader
const phase3Loader = new Phase3Loader();

// Load critical assets immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        phase3Loader.loadCriticalAssets();
    });
} else {
    phase3Loader.loadCriticalAssets();
}
