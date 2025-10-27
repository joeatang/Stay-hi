/**
 * Tesla-Grade Image Optimization System
 * Handles WebP/AVIF conversion, compression, and progressive loading
 */
(function() {
  'use strict';

  class ImageOptimizer {
    constructor() {
      this.supportWebP = null;
      this.supportAVIF = null;
      this.compressionQuality = 0.85;
      this.maxWidth = 1920;
      this.maxHeight = 1920;
      this.thumbnailSize = 400;
      
      this.detectFormatSupport();
    }

    // Detect browser support for modern formats
    async detectFormatSupport() {
      this.supportWebP = await this.checkFormatSupport('webp');
      this.supportAVIF = await this.checkFormatSupport('avif');
      
      console.debug(`[ImageOptimizer] WebP: ${this.supportWebP}, AVIF: ${this.supportAVIF}`);
    }

    checkFormatSupport(format) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        
        const testData = {
          webp: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==',
          avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAAFEbWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAQAAAAEAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACNtZGF0EgAKBzgAPtAGCCpjZWxsbV8yNGZwcy5hZm1ldGFkYXRh'
        };
        
        img.src = testData[format];
      });
    }

    // Optimize uploaded image with format conversion and compression
    async optimizeImage(file, options = {}) {
      const {
        maxWidth = this.maxWidth,
        maxHeight = this.maxHeight,
        quality = this.compressionQuality,
        generateThumbnail = true,
        format = 'auto' // 'auto', 'webp', 'avif', 'jpeg'
      } = options;

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Load original image
        const imageData = await this.loadImage(file, img);
        
        // Calculate optimal dimensions
        const { width, height } = this.calculateDimensions(
          img.naturalWidth, 
          img.naturalHeight, 
          maxWidth, 
          maxHeight
        );
        
        canvas.width = width;
        canvas.height = height;
        
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to optimal format
        const optimizedFormat = this.getOptimalFormat(format);
        const optimizedBlob = await this.canvasToBlob(canvas, optimizedFormat, quality);
        
        const result = {
          original: file,
          optimized: optimizedBlob,
          originalSize: file.size,
          optimizedSize: optimizedBlob.size,
          compressionRatio: ((file.size - optimizedBlob.size) / file.size * 100).toFixed(1),
          format: optimizedFormat,
          dimensions: { width, height }
        };
        
        // Generate thumbnail if requested
        if (generateThumbnail) {
          result.thumbnail = await this.generateThumbnail(canvas, optimizedFormat, quality);
        }
        
        console.debug(`[ImageOptimizer] Compressed ${file.name}: ${result.compressionRatio}% reduction`);
        return result;
        
      } catch (error) {
        console.error('[ImageOptimizer] Optimization failed:', error);
        throw error;
      }
    }

    // Load image from file
    loadImage(file, img) {
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    }

    // Calculate optimal dimensions maintaining aspect ratio
    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
      if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
        return { width: originalWidth, height: originalHeight };
      }
      
      const aspectRatio = originalWidth / originalHeight;
      
      let width = maxWidth;
      let height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      return { 
        width: Math.round(width), 
        height: Math.round(height) 
      };
    }

    // Get optimal format based on browser support
    getOptimalFormat(requestedFormat) {
      if (requestedFormat === 'auto') {
        if (this.supportAVIF) return 'image/avif';
        if (this.supportWebP) return 'image/webp';
        return 'image/jpeg';
      }
      
      const formatMap = {
        'avif': 'image/avif',
        'webp': 'image/webp', 
        'jpeg': 'image/jpeg',
        'png': 'image/png'
      };
      
      return formatMap[requestedFormat] || 'image/jpeg';
    }

    // Convert canvas to blob with compression
    canvasToBlob(canvas, format, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, format, quality);
      });
    }

    // Generate thumbnail
    async generateThumbnail(sourceCanvas, format, quality) {
      const thumbCanvas = document.createElement('canvas');
      const thumbCtx = thumbCanvas.getContext('2d');
      
      const { width, height } = this.calculateDimensions(
        sourceCanvas.width,
        sourceCanvas.height,
        this.thumbnailSize,
        this.thumbnailSize
      );
      
      thumbCanvas.width = width;
      thumbCanvas.height = height;
      
      thumbCtx.imageSmoothingEnabled = true;
      thumbCtx.imageSmoothingQuality = 'high';
      thumbCtx.drawImage(sourceCanvas, 0, 0, width, height);
      
      return this.canvasToBlob(thumbCanvas, format, quality * 0.8); // Lower quality for thumbnails
    }

    // Progressive image loading with placeholder
    createProgressiveImage(src, alt = '', placeholder = null) {
      const container = document.createElement('div');
      container.className = 'progressive-image-container';
      container.style.cssText = `
        position: relative;
        overflow: hidden;
        background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      `;
      
      // Low-quality placeholder
      if (placeholder) {
        const placeholderImg = document.createElement('img');
        placeholderImg.src = placeholder;
        placeholderImg.className = 'progressive-placeholder';
        placeholderImg.style.cssText = `
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(10px);
          transform: scale(1.1);
          opacity: 1;
          transition: opacity 0.3s ease;
        `;
        container.appendChild(placeholderImg);
      }
      
      // High-quality main image
      const mainImg = document.createElement('img');
      mainImg.src = src;
      mainImg.alt = alt;
      mainImg.className = 'progressive-main';
      mainImg.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      
      mainImg.onload = () => {
        mainImg.style.opacity = '1';
        if (placeholder) {
          container.querySelector('.progressive-placeholder').style.opacity = '0';
        }
      };
      
      container.appendChild(mainImg);
      return container;
    }

    // Preload critical images
    preloadImages(urls) {
      const promises = urls.map(url => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => reject(url);
          img.src = url;
        });
      });
      
      return Promise.allSettled(promises);
    }
  }

  // Initialize and expose globally
  window.ImageOptimizer = ImageOptimizer;
  window.imageOptimizer = new ImageOptimizer();
  
  console.debug('[ImageOptimizer] Tesla-grade image optimization ready');
})();