/**
 * Tesla-Grade Avatar Cropping & Upload System
 * Fixes cropping save issues and implements proper Supabase storage
 */
(function() {
  'use strict';

  class TeslaAvatarCropper {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.currentImage = null;
      this.cropArea = {
        x: 0,
        y: 0,
        size: 0
      };
      this.isDragging = false;
      this.isResizing = false;
      this.cropperActive = false;
    }

    // Initialize the cropper for an image
    initCropper(imageElement, containerElement) {
      console.log('🎨 Initializing Tesla-grade avatar cropper...');
      
      this.currentImage = imageElement;
      this.container = containerElement;
      
      // Create canvas overlay for cropping
      this.createCropperOverlay();
      
      // Set initial crop area (center square)
      this.calculateInitialCropArea();
      
      // Add event listeners
      this.addEventListeners();
      
      this.cropperActive = true;
      
      return this;
    }

    // Create visual cropping overlay
    createCropperOverlay() {
      if (this.canvas) {
        this.canvas.remove();
      }

      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      
      const rect = this.currentImage.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      
      // Style the canvas overlay
      Object.assign(this.canvas.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        cursor: 'crosshair',
        zIndex: '1000',
        pointerEvents: 'auto'
      });
      
      this.container.style.position = 'relative';
      this.container.appendChild(this.canvas);
      
      console.log('📐 Cropper overlay created');
    }

    // Calculate initial crop area (center square)
    calculateInitialCropArea() {
      const rect = this.currentImage.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      // Use relative coordinates within the container
      const size = Math.min(rect.width, rect.height) * 0.8;
      
      this.cropArea = {
        x: (rect.width - size) / 2,
        y: (rect.height - size) / 2,
        size: size
      };
      
      this.drawCropArea();
    }

    // Draw the crop area overlay
    drawCropArea() {
      if (!this.ctx) return;
      
      const { width, height } = this.canvas;
      
      // Clear canvas
      this.ctx.clearRect(0, 0, width, height);
      
      // Draw semi-transparent overlay
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(0, 0, width, height);
      
      // Clear the crop area (make it transparent)
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.fillRect(
        this.cropArea.x,
        this.cropArea.y,
        this.cropArea.size,
        this.cropArea.size
      );
      
      // Reset composite operation
      this.ctx.globalCompositeOperation = 'source-over';
      
      // Draw crop border
      this.ctx.strokeStyle = '#4ECDC4';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        this.cropArea.x,
        this.cropArea.y,
        this.cropArea.size,
        this.cropArea.size
      );
      
      // Draw corner handles
      this.drawCornerHandles();
      
      console.log('🎯 Crop area drawn:', this.cropArea);
    }

    // Draw corner resize handles
    drawCornerHandles() {
      const handleSize = 12;
      const { x, y, size } = this.cropArea;
      
      this.ctx.fillStyle = '#4ECDC4';
      
      // Top-left
      this.ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
      
      // Top-right
      this.ctx.fillRect(x + size - handleSize/2, y - handleSize/2, handleSize, handleSize);
      
      // Bottom-left
      this.ctx.fillRect(x - handleSize/2, y + size - handleSize/2, handleSize, handleSize);
      
      // Bottom-right
      this.ctx.fillRect(x + size - handleSize/2, y + size - handleSize/2, handleSize, handleSize);
    }

    // Tesla-Grade Event Listeners with Touch Support
    addEventListeners() {
      let startX, startY, startCropX, startCropY, startCropSize;
      let animationFrame = null;
      
      // Unified pointer event handler
      const handlePointerStart = (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        startX = x;
        startY = y;
        startCropX = this.cropArea.x;
        startCropY = this.cropArea.y;
        startCropSize = this.cropArea.size;
        
        // Tesla-Grade Visual Feedback
        this.canvas.style.transition = 'none';
        
        // Check if clicking on resize handle
        if (this.isOnResizeHandle(x, y)) {
          this.isResizing = true;
          this.canvas.style.cursor = 'nw-resize';
          this.canvas.style.filter = 'brightness(1.1)';
        } else if (this.isInsideCropArea(x, y)) {
          this.isDragging = true;
          this.canvas.style.cursor = 'move';
          this.canvas.style.filter = 'brightness(1.05)';
        }
      };
      
      // Mouse events
      this.canvas.addEventListener('mousedown', handlePointerStart);
      
      // Touch events for mobile
      this.canvas.addEventListener('touchstart', handlePointerStart, { passive: false });
      
      // Unified pointer move handler with smooth animation
      const handlePointerMove = (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Cancel previous animation frame
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        
        // Tesla-Grade Smooth Animation
        animationFrame = requestAnimationFrame(() => {
          if (this.isResizing) {
            // Smooth resize with momentum
            const deltaX = x - startX;
            const deltaY = y - startY;
            const avgDelta = (deltaX + deltaY) / 2;
            
            let newSize = Math.max(50, startCropSize + avgDelta);
            
            // Keep within bounds with smooth clamping
            newSize = Math.min(
              newSize,
              this.canvas.width - this.cropArea.x,
              this.canvas.height - this.cropArea.y
            );
            
            // Smooth size transition
            const sizeDiff = newSize - this.cropArea.size;
            this.cropArea.size += sizeDiff * 0.8; // Easing factor
            
            this.drawCropArea();
            
          } else if (this.isDragging) {
            // Smooth movement with momentum
            const deltaX = x - startX;
            const deltaY = y - startY;
            
            const targetX = Math.max(0, Math.min(
              startCropX + deltaX,
              this.canvas.width - this.cropArea.size
            ));
            
            const targetY = Math.max(0, Math.min(
              startCropY + deltaY,
              this.canvas.height - this.cropArea.size
            ));
            
            // Smooth position transition
            const xDiff = targetX - this.cropArea.x;
            const yDiff = targetY - this.cropArea.y;
            
            this.cropArea.x += xDiff * 0.9; // Smooth easing
            this.cropArea.y += yDiff * 0.9;
            
            this.drawCropArea();
            
          } else {
            // Tesla-Grade Hover Effects
            if (this.isOnResizeHandle(x, y)) {
              this.canvas.style.cursor = 'nw-resize';
              this.canvas.style.filter = 'brightness(1.02)';
            } else if (this.isInsideCropArea(x, y)) {
              this.canvas.style.cursor = 'move';
              this.canvas.style.filter = 'brightness(1.02)';
            } else {
              this.canvas.style.cursor = 'crosshair';
              this.canvas.style.filter = 'brightness(1)';
            }
          }
        });
      };
      
      // Mouse and touch move events
      this.canvas.addEventListener('mousemove', handlePointerMove);
      this.canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
      
      // Unified pointer end handler
      const handlePointerEnd = (e) => {
        e.preventDefault();
        
        // Tesla-Grade Smooth Release Animation
        this.canvas.style.transition = 'filter 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        this.canvas.style.filter = 'brightness(1)';
        
        // Clean up states
        this.isDragging = false;
        this.isResizing = false;
        this.canvas.style.cursor = 'crosshair';
        
        // Cancel any pending animation
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        
        // Haptic feedback for mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      };
      
      // Mouse and touch end events
      this.canvas.addEventListener('mouseup', handlePointerEnd);
      this.canvas.addEventListener('touchend', handlePointerEnd, { passive: false });
      
      // Handle mouse leave and touch cancel
      this.canvas.addEventListener('mouseleave', handlePointerEnd);
      this.canvas.addEventListener('touchcancel', handlePointerEnd, { passive: false });
    }

    // Check if point is on resize handle
    isOnResizeHandle(x, y) {
      const handleSize = 12;
      const { x: cropX, y: cropY, size } = this.cropArea;
      
      // Check all four corners
      const corners = [
        { x: cropX, y: cropY },
        { x: cropX + size, y: cropY },
        { x: cropX, y: cropY + size },
        { x: cropX + size, y: cropY + size }
      ];
      
      return corners.some(corner => 
        Math.abs(x - corner.x) <= handleSize/2 && 
        Math.abs(y - corner.y) <= handleSize/2
      );
    }

    // Check if point is inside crop area
    isInsideCropArea(x, y) {
      const { x: cropX, y: cropY, size } = this.cropArea;
      return x >= cropX && x <= cropX + size && 
             y >= cropY && y <= cropY + size;
    }

    // Get cropped image as blob
    async getCroppedImage(quality = 0.9) {
      if (!this.currentImage || !this.cropperActive) {
        throw new Error('Cropper not initialized');
      }
      
      console.log('✂️ Extracting cropped image...');
      
      // Create a temporary canvas for cropping
      const cropCanvas = document.createElement('canvas');
      const cropCtx = cropCanvas.getContext('2d');
      
      // Set output size (square, high quality)
      const outputSize = 512;
      cropCanvas.width = outputSize;
      cropCanvas.height = outputSize;
      
      // Calculate scale factors
      const imageRect = this.currentImage.getBoundingClientRect();
      const scaleX = this.currentImage.naturalWidth / imageRect.width;
      const scaleY = this.currentImage.naturalHeight / imageRect.height;
      
      // Calculate source crop area in image coordinates
      const sourceX = this.cropArea.x * scaleX;
      const sourceY = this.cropArea.y * scaleY;
      const sourceSize = this.cropArea.size * scaleX;
      
      console.log('🔍 Crop details:', {
        canvas: { width: imageRect.width, height: imageRect.height },
        natural: { width: this.currentImage.naturalWidth, height: this.currentImage.naturalHeight },
        scale: { x: scaleX, y: scaleY },
        cropArea: this.cropArea,
        source: { x: sourceX, y: sourceY, size: sourceSize }
      });
      
      // Draw cropped and scaled image
      cropCtx.drawImage(
        this.currentImage,
        sourceX, sourceY, sourceSize, sourceSize, // Source rectangle
        0, 0, outputSize, outputSize              // Destination rectangle
      );
      
      // Convert to WebP blob for optimal compression
      return new Promise((resolve) => {
        cropCanvas.toBlob(resolve, 'image/webp', quality);
      });
    }

    // Clean up cropper
    destroy() {
      if (this.canvas) {
        this.canvas.remove();
        this.canvas = null;
        this.ctx = null;
      }
      
      this.cropperActive = false;
      this.currentImage = null;
      
      console.log('🧹 Avatar cropper cleaned up');
    }
  }

  // Enhanced Avatar Upload Manager
  class TeslaAvatarUploader {
    constructor() {
      this.cropper = new TeslaAvatarCropper();
      this.isUploading = false;
    }

    // Initialize upload system
    async init() {
      console.log('🚀 Initializing Tesla Avatar Upload System...');
      
      // Check Supabase connection
      if (!window.supabaseClient) {
        throw new Error('Supabase client not initialized');
      }
      
      // Check storage bucket
      await this.verifyStorageBucket();
      
      console.log('✅ Tesla Avatar Upload System ready');
    }

    // Verify storage bucket exists
    async verifyStorageBucket() {
      try {
        console.log('🔍 Verifying storage bucket...');
        
        // Try multiple methods to verify bucket exists
        
        // Method 1: List buckets (may fail due to RLS)
        const { data: buckets, error: listError } = await window.supabaseClient.storage.listBuckets();
        
        if (!listError && buckets) {
          const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
          
          if (avatarsBucket) {
            console.log('✅ Storage bucket verified via bucket listing');
            return true;
          }
        }
        
        // Method 2: Try to list files in avatars bucket (works even with RLS)
        console.log('🔄 Trying alternative bucket verification...');
        
        const { data: files, error: filesError } = await window.supabaseClient.storage
          .from('avatars')
          .list('', { limit: 1 });
        
        if (!filesError) {
          console.log('✅ Storage bucket verified via file listing');
          return true;
        }
        
        // Method 3: Try a test upload to see if bucket exists
        console.log('🔄 Trying test upload verification...');
        
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        const testPath = 'test-bucket-verification.txt';
        
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
          .from('avatars')
          .upload(testPath, testBlob);
        
        if (!uploadError) {
          console.log('✅ Storage bucket verified via test upload');
          
          // Clean up test file
          await window.supabaseClient.storage
            .from('avatars')
            .remove([testPath]);
          
          return true;
        }
        
        // All methods failed
        console.log('❌ Storage bucket verification failed:', {
          listError: listError?.message,
          filesError: filesError?.message,
          uploadError: uploadError?.message
        });
        
        throw new Error('Avatars storage bucket not found or not accessible');
        
      } catch (error) {
        console.error('❌ Storage verification failed:', error);
        throw error;
      }
    }

    // Handle file selection and cropping
    async handleFileSelect(file, previewElement, containerElement) {
      try {
        console.log('📁 File selected:', file.name, file.type, file.size);
        
        // Validate file
        this.validateFile(file);
        
        // Create preview
        const imageUrl = await this.createImagePreview(file);
        
        // Update preview element
        previewElement.src = imageUrl;
        previewElement.onload = () => {
          // Instead of inline cropping, open the sheet modal!
          console.log('🎯 Opening Tesla sheet modal for cropping...');
          
          // Store the image data for the modal
          window.currentCropImage = {
            src: imageUrl,
            file: file,
            previewElement: previewElement
          };
          
          // Open our sheet modal instead of inline cropper
          if (typeof showCropModalWithAnimation === 'function') {
            showCropModalWithAnimation();
          } else {
            console.error('❌ Sheet modal function not found');
          }
        };
        
      } catch (error) {
        console.error('❌ File selection failed:', error);
        this.showError(error.message);
        throw error;
      }
    }

    // Validate uploaded file
    validateFile(file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      const maxSize = 15 * 1024 * 1024; // 15MB
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Please use: ${allowedTypes.join(', ')}`);
      }
      
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 15MB.');
      }
      
      console.log('✅ File validation passed');
    }

    // Create image preview from file
    createImagePreview(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        
        reader.readAsDataURL(file);
      });
    }

    // Show crop controls
    showCropControls(container) {
      // Remove existing controls
      const existingControls = container.querySelector('.crop-controls');
      if (existingControls) {
        existingControls.remove();
      }
      
      // Create controls
      const controls = document.createElement('div');
      controls.className = 'crop-controls';
      controls.id = 'teslaCropControls';
      controls.innerHTML = `
        <div style="
          position: absolute;
          bottom: -80px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          padding: 15px 25px;
          border-radius: 25px;
          display: flex;
          gap: 15px;
          z-index: 1001;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
        ">
          <button id="saveCroppedAvatar" style="
            background: linear-gradient(135deg, #4ECDC4, #3A9F98);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
          ">💾 Save Avatar</button>
          <button id="cancelCrop" style="
            background: linear-gradient(135deg, #FF6B6B, #E55A5A);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
          ">❌ Cancel</button>
        </div>
      `;
      
      container.appendChild(controls);
      
      // Add Tesla-grade hover effects
      const saveBtn = controls.querySelector('#saveCroppedAvatar');
      const cancelBtn = controls.querySelector('#cancelCrop');
      
      saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.transform = 'translateY(-2px)';
        saveBtn.style.boxShadow = '0 8px 25px rgba(78, 205, 196, 0.4)';
      });
      
      saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.transform = 'translateY(0)';
        saveBtn.style.boxShadow = '0 4px 15px rgba(78, 205, 196, 0.3)';
      });
      
      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.transform = 'translateY(-2px)';
        cancelBtn.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
      });
      
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.transform = 'translateY(0)';
        cancelBtn.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
      });
      
      // Add event listeners
      saveBtn.addEventListener('click', () => {
        this.saveCroppedAvatar();
      });
      
      cancelBtn.addEventListener('click', () => {
        this.cancelCrop(container);
      });
    }

    // Save cropped avatar to Supabase storage
    async saveCroppedAvatar() {
      if (this.isUploading) return;
      
      try {
        this.isUploading = true;
        console.log('💾 Saving cropped avatar...');
        
        // Show uploading state
        this.showUploadingState();
        
        // Get cropped image
        const croppedBlob = await this.cropper.getCroppedImage(0.9);
        
        // Get current user
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) {
          throw new Error('User not authenticated');
        }
        
        const userId = session.user.id;
        
        // Generate filename
        const timestamp = Date.now();
        const fileName = `avatar-${timestamp}.webp`;
        const filePath = `${userId}/${fileName}`;
        
        console.log('📤 Uploading to:', filePath);
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
          .from('avatars')
          .upload(filePath, croppedBlob, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        
        console.log('✅ Upload successful:', uploadData);
        
        // Get public URL
        const { data: urlData } = window.supabaseClient.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        const avatarUrl = urlData.publicUrl;
        console.log('🔗 Avatar URL:', avatarUrl);
        
        // Update profile in database
        const { error: updateError } = await window.supabaseClient
          .from('profiles')
          .update({ 
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          throw new Error(`Profile update failed: ${updateError.message}`);
        }
        
        console.log('✅ Profile updated with new avatar URL');
        
        // Show success
        this.showSuccess('Avatar uploaded successfully!');
        
        // Update UI
        this.updateAvatarDisplay(avatarUrl);
        
        // Clean up
        this.cropper.destroy();
        this.hideCropControls();
        
      } catch (error) {
        console.error('❌ Avatar save failed:', error);
        this.showError(error.message);
      } finally {
        this.isUploading = false;
        this.hideUploadingState();
      }
    }

    // Cancel cropping
    cancelCrop(container) {
      this.cropper.destroy();
      this.hideCropControls();
      
      // Reset preview to placeholder
      const preview = container.querySelector('img');
      if (preview) {
        preview.src = '/assets/images/avatar-placeholder.svg';
      }
    }

    // Update avatar display after successful upload
    updateAvatarDisplay(avatarUrl) {
      // Update all avatar images on the page
      const avatarElements = document.querySelectorAll('.profile-avatar, .avatar-preview');
      avatarElements.forEach(element => {
        if (element.tagName === 'IMG') {
          element.src = avatarUrl;
        } else {
          element.style.backgroundImage = `url(${avatarUrl})`;
        }
      });
    }

    // UI Helper methods
    showUploadingState() {
      const button = document.querySelector('#saveCroppedAvatar');
      if (button) {
        button.innerHTML = '⏳ Uploading...';
        button.disabled = true;
      }
    }

    hideUploadingState() {
      const button = document.querySelector('#saveCroppedAvatar');
      if (button) {
        button.innerHTML = '💾 Save Avatar';
        button.disabled = false;
      }
    }

    hideCropControls() {
      const controls = document.querySelector('.crop-controls');
      if (controls) {
        controls.remove();
      }
    }

    showSuccess(message) {
      this.showToast(message, 'success');
    }

    showError(message) {
      this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
      // Use existing toast system if available
      if (window.showTeslaToast) {
        window.showTeslaToast(message, type);
      } else {
        alert(message);
      }
    }
  }

  // Initialize and expose globally
  window.TeslaAvatarCropper = TeslaAvatarCropper;
  window.TeslaAvatarUploader = TeslaAvatarUploader;
  window.teslaAvatarUploader = new TeslaAvatarUploader();
  
  console.debug('[TeslaAvatarSystem] Avatar cropping and upload system ready');
})();