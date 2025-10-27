/**
 * Tesla-Grade Asset Bundler & Performance Monitor
 * Combines CSS/JS, implements lazy loading, and tracks performance
 */
(function() {
  'use strict';

  class AssetManager {
    constructor() {
      this.loadedAssets = new Set();
      this.criticalAssets = new Set();
      this.bundleCache = new Map();
      this.performanceMetrics = {
        loadTimes: {},
        bundleSizes: {},
        cacheHits: 0,
        totalRequests: 0
      };
      
      this.initPerformanceMonitoring();
    }

    // Initialize performance monitoring
    initPerformanceMonitoring() {
      // Track page load performance
      if ('performance' in window) {
        window.addEventListener('load', () => {
          const perfData = performance.getEntriesByType('navigation')[0];
          this.performanceMetrics.pageLoad = {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            totalTime: perfData.loadEventEnd - perfData.navigationStart
          };
          
          console.debug('[AssetManager] Page load metrics:', this.performanceMetrics.pageLoad);
        });
      }

      // Track resource loading
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('.css') || entry.name.includes('.js')) {
            const fileName = entry.name.split('/').pop();
            this.performanceMetrics.loadTimes[fileName] = {
              duration: entry.duration,
              size: entry.transferSize || 0,
              cached: entry.transferSize === 0
            };
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }

    // Bundle and load critical CSS
    async loadCriticalCSS(stylesheets) {
      const bundleKey = 'critical-css-' + stylesheets.join('-');
      
      if (this.bundleCache.has(bundleKey)) {
        this.performanceMetrics.cacheHits++;
        return this.bundleCache.get(bundleKey);
      }

      try {
        const startTime = performance.now();
        const cssPromises = stylesheets.map(href => this.fetchCSS(href));
        const cssContents = await Promise.all(cssPromises);
        
        // Combine and minify CSS
        const bundledCSS = this.minifyCSS(cssContents.join('\n'));
        
        // Inject as inline styles for critical path
        const styleElement = document.createElement('style');
        styleElement.textContent = bundledCSS;
        styleElement.setAttribute('data-bundle', bundleKey);
        document.head.appendChild(styleElement);
        
        const loadTime = performance.now() - startTime;
        this.performanceMetrics.loadTimes[bundleKey] = { duration: loadTime };
        this.bundleCache.set(bundleKey, styleElement);
        
        console.debug(`[AssetManager] Critical CSS bundled in ${loadTime.toFixed(2)}ms`);
        return styleElement;
        
      } catch (error) {
        console.error('[AssetManager] Critical CSS loading failed:', error);
        // Fallback to individual stylesheets
        return this.loadStylesheetsIndividually(stylesheets);
      }
    }

    // Fetch CSS content
    async fetchCSS(href) {
      const response = await fetch(href);
      if (!response.ok) throw new Error(`Failed to load ${href}`);
      return response.text();
    }

    // Basic CSS minification
    minifyCSS(css) {
      return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s{2,}/g, ' ') // Collapse whitespace
        .replace(/;\s*}/g, '}') // Remove last semicolon in rules
        .replace(/\s*{\s*/g, '{') // Clean braces
        .replace(/}\s*/g, '}') // Clean braces
        .replace(/;\s*/g, ';') // Clean semicolons
        .trim();
    }

    // Lazy load non-critical assets
    lazyLoadAssets(assets, trigger = 'intersection') {
      const loadAsset = (asset) => {
        if (this.loadedAssets.has(asset.src)) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
          const element = asset.type === 'script' 
            ? document.createElement('script')
            : document.createElement('link');
            
          element.onload = () => {
            this.loadedAssets.add(asset.src);
            resolve(element);
          };
          element.onerror = reject;
          
          if (asset.type === 'script') {
            element.src = asset.src;
            element.async = true;
          } else {
            element.rel = 'stylesheet';
            element.href = asset.src;
          }
          
          document.head.appendChild(element);
        });
      };

      if (trigger === 'intersection') {
        // Load when elements come into view
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const assetPromises = assets.map(loadAsset);
              Promise.all(assetPromises).then(() => {
                console.debug('[AssetManager] Lazy assets loaded via intersection');
              });
              observer.disconnect();
            }
          });
        }, { threshold: 0.1 });
        
        // Observe trigger element or body
        const triggerElement = document.querySelector('[data-lazy-trigger]') || document.body;
        observer.observe(triggerElement);
        
      } else if (trigger === 'idle') {
        // Load when browser is idle
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            const assetPromises = assets.map(loadAsset);
            Promise.all(assetPromises).then(() => {
              console.debug('[AssetManager] Lazy assets loaded via idle callback');
            });
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            const assetPromises = assets.map(loadAsset);
            Promise.all(assetPromises);
          }, 2000);
        }
      }
    }

    // Preload critical resources
    preloadCriticalResources(resources) {
      resources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as || 'script';
        if (resource.type) link.type = resource.type;
        document.head.appendChild(link);
      });
      
      console.debug('[AssetManager] Critical resources preloaded:', resources.length);
    }

    // Fallback for individual stylesheets
    loadStylesheetsIndividually(stylesheets) {
      const promises = stylesheets.map(href => {
        return new Promise((resolve, reject) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.onload = () => resolve(link);
          link.onerror = reject;
          document.head.appendChild(link);
        });
      });
      
      return Promise.all(promises);
    }

    // Get performance report
    getPerformanceReport() {
      const report = {
        ...this.performanceMetrics,
        cacheHitRate: this.performanceMetrics.totalRequests > 0 
          ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        loadedAssets: this.loadedAssets.size,
        bundleCacheSize: this.bundleCache.size
      };
      
      console.table(report.loadTimes);
      return report;
    }

    // Tesla-grade initialization for Stay Hi
    async initializeStayHi() {
      console.log('[AssetManager] 🚀 Initializing Tesla-grade performance...');
      
      // 1. Preload critical resources
      this.preloadCriticalResources([
        { href: 'assets/theme.css', as: 'style' },
        { href: 'assets/supabase-init.js', as: 'script' },
        { href: 'assets/db.js', as: 'script' }
      ]);

      // 2. Bundle critical CSS
      await this.loadCriticalCSS([
        'assets/theme.css',
        'assets/create-parity.css'
      ]);

      // 3. Lazy load non-critical assets
      this.lazyLoadAssets([
        { src: 'assets/image-optimizer.js', type: 'script' },
        { src: 'assets/premium-ux.css', type: 'style' },
        { src: 'assets/premium-stats.css', type: 'style' }
      ], 'idle');

      // 4. Initialize performance monitoring
      setTimeout(() => {
        const report = this.getPerformanceReport();
        console.log('[AssetManager] 📊 Performance Report:', report);
      }, 3000);
    }
  }

  // Initialize asset manager
  window.AssetManager = AssetManager;
  window.assetManager = new AssetManager();
  
  console.debug('[AssetManager] Tesla-grade asset management ready');
})();