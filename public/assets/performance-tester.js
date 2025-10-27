/**
 * Tesla-Grade Performance Testing Suite
 * Measures and reports app performance metrics
 */
(function() {
  'use strict';

  class PerformanceTester {
    constructor() {
      this.metrics = {
        loadTime: null,
        firstPaint: null,
        firstContentfulPaint: null,
        largestContentfulPaint: null,
        cumulativeLayoutShift: null,
        firstInputDelay: null,
        totalBlockingTime: null,
        assetSizes: {},
        compressionRatios: {},
        cacheHitRate: 0
      };
      
      this.testResults = [];
      this.isRunning = false;
    }

    // Run comprehensive performance test
    async runTestSuite() {
      if (this.isRunning) {
        console.warn('[PerformanceTester] Test already running');
        return;
      }

      console.log('🚀 Starting Tesla-Grade Performance Test Suite...');
      this.isRunning = true;

      try {
        // 1. Core Web Vitals
        await this.measureCoreWebVitals();
        
        // 2. Asset Performance
        await this.measureAssetPerformance();
        
        // 3. Image Optimization Test
        await this.testImageOptimization();
        
        // 4. Bundle Analysis
        await this.analyzeBundles();
        
        // 5. Generate Report
        const report = this.generateReport();
        this.displayReport(report);
        
        return report;
        
      } catch (error) {
        console.error('[PerformanceTester] Test failed:', error);
      } finally {
        this.isRunning = false;
      }
    }

    // Measure Core Web Vitals
    async measureCoreWebVitals() {
      return new Promise((resolve) => {
        // Performance Observer for various metrics
        if ('PerformanceObserver' in window) {
          // First Paint & First Contentful Paint
          const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-paint') {
                this.metrics.firstPaint = entry.startTime;
              }
              if (entry.name === 'first-contentful-paint') {
                this.metrics.firstContentfulPaint = entry.startTime;
              }
            }
          });
          paintObserver.observe({ entryTypes: ['paint'] });

          // Largest Contentful Paint
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.metrics.largestContentfulPaint = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // Layout Shift
          const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            this.metrics.cumulativeLayoutShift = clsValue;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        }

        // Navigation timing
        window.addEventListener('load', () => {
          const navTiming = performance.getEntriesByType('navigation')[0];
          if (navTiming) {
            this.metrics.loadTime = navTiming.loadEventEnd - navTiming.navigationStart;
            this.metrics.totalBlockingTime = this.calculateTotalBlockingTime();
          }
          resolve();
        });
      });
    }

    // Calculate Total Blocking Time
    calculateTotalBlockingTime() {
      const longTasks = performance.getEntriesByType('longtask');
      let totalBlockingTime = 0;
      
      longTasks.forEach(task => {
        if (task.duration > 50) {
          totalBlockingTime += task.duration - 50;
        }
      });
      
      return totalBlockingTime;
    }

    // Measure asset performance
    async measureAssetPerformance() {
      const resources = performance.getEntriesByType('resource');
      
      resources.forEach(resource => {
        const fileName = resource.name.split('/').pop();
        
        if (fileName.includes('.css') || fileName.includes('.js') || fileName.includes('.png') || fileName.includes('.jpg') || fileName.includes('.webp')) {
          this.metrics.assetSizes[fileName] = {
            transferSize: resource.transferSize || 0,
            encodedBodySize: resource.encodedBodySize || 0,
            decodedBodySize: resource.decodedBodySize || 0,
            duration: resource.duration,
            cached: resource.transferSize === 0
          };
        }
      });
    }

    // Test image optimization
    async testImageOptimization() {
      if (!window.imageOptimizer) {
        console.warn('[PerformanceTester] Image optimizer not available');
        return;
      }

      try {
        // Create test image blob
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        
        // Draw test pattern
        const gradient = ctx.createLinearGradient(0, 0, 1000, 1000);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#4ecdc4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1000, 1000);
        
        // Convert to blob
        const testBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png', 1.0);
        });
        
        // Optimize
        const startTime = performance.now();
        const optimized = await window.imageOptimizer.optimizeImage(testBlob);
        const optimizationTime = performance.now() - startTime;
        
        this.metrics.compressionRatios['test-image'] = {
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          compressionRatio: optimized.compressionRatio,
          optimizationTime: optimizationTime,
          format: optimized.format
        };
        
      } catch (error) {
        console.error('[PerformanceTester] Image optimization test failed:', error);
      }
    }

    // Analyze bundle performance
    async analyzeBundles() {
      if (!window.assetManager) {
        console.warn('[PerformanceTester] Asset manager not available');
        return;
      }

      const assetReport = window.assetManager.getPerformanceReport();
      this.metrics.cacheHitRate = parseFloat(assetReport.cacheHitRate);
    }

    // Generate performance report
    generateReport() {
      const report = {
        timestamp: new Date().toISOString(),
        score: this.calculatePerformanceScore(),
        metrics: this.metrics,
        recommendations: this.generateRecommendations(),
        grade: this.getPerformanceGrade()
      };

      return report;
    }

    // Calculate overall performance score (0-100)
    calculatePerformanceScore() {
      let score = 100;
      
      // FCP penalty (should be < 1.8s)
      if (this.metrics.firstContentfulPaint > 1800) {
        score -= 20;
      } else if (this.metrics.firstContentfulPaint > 1000) {
        score -= 10;
      }
      
      // LCP penalty (should be < 2.5s)
      if (this.metrics.largestContentfulPaint > 2500) {
        score -= 25;
      } else if (this.metrics.largestContentfulPaint > 1500) {
        score -= 10;
      }
      
      // CLS penalty (should be < 0.1)
      if (this.metrics.cumulativeLayoutShift > 0.25) {
        score -= 20;
      } else if (this.metrics.cumulativeLayoutShift > 0.1) {
        score -= 10;
      }
      
      // Load time penalty
      if (this.metrics.loadTime > 3000) {
        score -= 15;
      } else if (this.metrics.loadTime > 2000) {
        score -= 5;
      }
      
      return Math.max(score, 0);
    }

    // Get performance grade
    getPerformanceGrade() {
      const score = this.calculatePerformanceScore();
      
      if (score >= 90) return 'A+ (Tesla Grade)';
      if (score >= 80) return 'A (Excellent)';
      if (score >= 70) return 'B (Good)';
      if (score >= 60) return 'C (Fair)';
      return 'D (Needs Improvement)';
    }

    // Generate recommendations
    generateRecommendations() {
      const recommendations = [];
      
      if (this.metrics.firstContentfulPaint > 1800) {
        recommendations.push('Reduce First Contentful Paint by optimizing critical CSS');
      }
      
      if (this.metrics.largestContentfulPaint > 2500) {
        recommendations.push('Optimize largest content element (likely images)');
      }
      
      if (this.metrics.cumulativeLayoutShift > 0.1) {
        recommendations.push('Add size attributes to images and reserve space for dynamic content');
      }
      
      if (this.metrics.totalBlockingTime > 300) {
        recommendations.push('Reduce JavaScript execution time with code splitting');
      }
      
      if (this.metrics.cacheHitRate < 50) {
        recommendations.push('Improve caching strategy for better performance');
      }
      
      return recommendations;
    }

    // Display report in console
    displayReport(report) {
      console.log('📊 TESLA-GRADE PERFORMANCE REPORT');
      console.log('=================================');
      console.log(`🏆 Grade: ${report.grade}`);
      console.log(`📈 Score: ${report.score}/100`);
      console.log('');
      console.log('⚡ Core Web Vitals:');
      console.log(`  First Paint: ${(report.metrics.firstPaint || 0).toFixed(2)}ms`);
      console.log(`  First Contentful Paint: ${(report.metrics.firstContentfulPaint || 0).toFixed(2)}ms`);
      console.log(`  Largest Contentful Paint: ${(report.metrics.largestContentfulPaint || 0).toFixed(2)}ms`);
      console.log(`  Cumulative Layout Shift: ${(report.metrics.cumulativeLayoutShift || 0).toFixed(4)}`);
      console.log(`  Total Load Time: ${(report.metrics.loadTime || 0).toFixed(2)}ms`);
      console.log('');
      
      if (report.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        report.recommendations.forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`);
        });
      } else {
        console.log('✅ No recommendations - Performance is Tesla-grade!');
      }
      
      console.log('=================================');
    }

    // Run quick test
    async quickTest() {
      const startTime = performance.now();
      
      await this.measureAssetPerformance();
      
      const testTime = performance.now() - startTime;
      
      console.log(`⚡ Quick Performance Check (${testTime.toFixed(2)}ms):`);
      console.log(`📦 Assets loaded: ${Object.keys(this.metrics.assetSizes).length}`);
      
      const totalSize = Object.values(this.metrics.assetSizes)
        .reduce((sum, asset) => sum + (asset.transferSize || 0), 0);
      
      console.log(`📊 Total transfer size: ${(totalSize / 1024).toFixed(2)} KB`);
      
      return {
        assetsLoaded: Object.keys(this.metrics.assetSizes).length,
        totalSize: totalSize,
        testTime: testTime
      };
    }
  }

  // Initialize and expose globally
  window.PerformanceTester = PerformanceTester;
  window.performanceTester = new PerformanceTester();
  
  // Auto-run quick test after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      window.performanceTester.quickTest();
    }, 1000);
  });
  
  console.debug('[PerformanceTester] Tesla-grade performance testing ready');
  console.log('💡 Run window.performanceTester.runTestSuite() for full performance analysis');
})();