/**
 * public/lib/HiPerformance.js
 * Relocated from /lib to public scope for correct asset path resolution.
 * Tesla-Grade Asset Bundler & Performance Monitor
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

    initPerformanceMonitoring() {
      if ('performance' in window) {
        window.addEventListener('load', () => {
          const nav = performance.getEntriesByType('navigation')[0];
          if (!nav) return;
          this.performanceMetrics.pageLoad = {
            domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            loadComplete: nav.loadEventEnd - nav.loadEventStart,
            totalTime: nav.loadEventEnd - nav.navigationStart
          };
          console.debug('[AssetManager] Page load metrics:', this.performanceMetrics.pageLoad);
        });
      }
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
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
      } catch (e) {
        console.debug('[AssetManager] PerformanceObserver not available');
      }
    }

    async loadCriticalCSS(stylesheets) {
      const bundleKey = 'critical-css-' + stylesheets.join('-');
      if (this.bundleCache.has(bundleKey)) {
        this.performanceMetrics.cacheHits++;
        return this.bundleCache.get(bundleKey);
      }
      try {
        const start = performance.now();
        const cssContents = await Promise.all(stylesheets.map(href => this.fetchCSS(href)));
        const bundled = this.minifyCSS(cssContents.join('\n'));
        const styleEl = document.createElement('style');
        styleEl.textContent = bundled;
        styleEl.setAttribute('data-bundle', bundleKey);
        document.head.appendChild(styleEl);
        const loadTime = performance.now() - start;
        this.performanceMetrics.loadTimes[bundleKey] = { duration: loadTime };
        this.bundleCache.set(bundleKey, styleEl);
        console.debug(`[AssetManager] Critical CSS bundled in ${loadTime.toFixed(2)}ms`);
        return styleEl;
      } catch (err) {
        console.error('[AssetManager] Critical CSS bundle failed, falling back:', err);
        return this.loadStylesheetsIndividually(stylesheets);
      }
    }

    async fetchCSS(href) {
      const response = await fetch(href);
      if (!response.ok) throw new Error(`Failed to load ${href}`);
      return response.text();
    }

    minifyCSS(css) {
      return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/;\s*}/g, '}')
        .replace(/\s*{\s*/g, '{')
        .replace(/}\s*/g, '}')
        .replace(/;\s*/g, ';')
        .trim();
    }

    lazyLoadAssets(assets, trigger = 'intersection') {
      const loadAsset = (asset) => {
        if (this.loadedAssets.has(asset.src)) return Promise.resolve();
        return new Promise((resolve, reject) => {
          const el = asset.type === 'script' ? document.createElement('script') : document.createElement('link');
          el.onload = () => { this.loadedAssets.add(asset.src); resolve(el); };
          el.onerror = reject;
          if (asset.type === 'script') {
            el.src = asset.src;
            el.async = true;
          } else {
            el.rel = 'stylesheet';
            el.href = asset.src;
          }
          document.head.appendChild(el);
        });
      };

      if (trigger === 'intersection') {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              Promise.all(assets.map(loadAsset)).then(() => console.debug('[AssetManager] Lazy assets loaded via intersection'));
              observer.disconnect();
            }
          });
        }, { threshold: 0.1 });
        observer.observe(document.querySelector('[data-lazy-trigger]') || document.body);
      } else if (trigger === 'idle') {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            Promise.all(assets.map(loadAsset)).then(() => console.debug('[AssetManager] Lazy assets loaded via idle'));
          });
        } else {
          setTimeout(() => Promise.all(assets.map(loadAsset)), 2000);
        }
      }
    }

    preloadCriticalResources(resources) {
      resources.forEach(r => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = r.href;
        link.as = r.as || 'script';
        if (r.type) link.type = r.type;
        document.head.appendChild(link);
      });
      console.debug('[AssetManager] Critical resources preloaded:', resources.length);
    }

    loadStylesheetsIndividually(stylesheets) {
      return Promise.all(stylesheets.map(href => new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve(link);
        link.onerror = reject;
        document.head.appendChild(link);
      })));
    }

    getPerformanceReport() {
      return {
        ...this.performanceMetrics,
        cacheHitRate: this.performanceMetrics.totalRequests > 0 ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : '0%',
        loadedAssets: this.loadedAssets.size,
        bundleCacheSize: this.bundleCache.size
      };
    }

    async initializeStayHi() {
      console.log('[AssetManager] 🚀 Initializing performance sequence');
      this.preloadCriticalResources([
        { href: '/assets/theme.css', as: 'style' },
        { href: '/assets/supabase-init.js', as: 'script' },
        { href: '/assets/db.js', as: 'script' }
      ]);
      await this.loadCriticalCSS([
        '/assets/theme.css',
        '/assets/create-parity.css'
      ]);
      this.lazyLoadAssets([
        { src: '/assets/image-optimizer.js', type: 'script' },
        { src: '/assets/premium-ux.css', type: 'style' },
        { src: '/assets/premium-stats.css', type: 'style' }
      ], 'idle');
      setTimeout(() => console.log('[AssetManager] 📊 Performance Report:', this.getPerformanceReport()), 3000);
    }
  }

  window.AssetManager = AssetManager;
  window.assetManager = new AssetManager();
  console.debug('[AssetManager] Ready (public scope)');
})();
