/**
 * Social Media Grade Avatar Upload System
 * Built like Instagram/Twitter - simple, reliable, always works
 */

class SocialAvatarUploader {
  constructor(options = {}) {
    this.container = options.container;
    this.onSave = options.onSave || this.defaultSave;
    this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB
    this.cropSize = options.cropSize || 300;
    
    this.currentFile = null;
    this.cropData = null;
    this.isDragging = false;
    this.isResizing = false;
    
    this.init();
  }
  
  init() {
    this.createFileInput();
    this.createOverlay();
    this.bindEvents();
  }
  
  createFileInput() {
    // Hidden file input - social media standard
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);
    
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
  }
  
  createOverlay() {
    // Full-screen overlay like Instagram
    this.overlay = document.createElement('div');
    this.overlay.className = 'social-avatar-overlay';
    this.overlay.innerHTML = `
      <div class="social-avatar-modal">
        <div class="social-header">
          <button class="social-cancel">Cancel</button>
          <h3>Edit Profile Photo</h3>
          <button class="social-save" disabled>Save</button>
        </div>
        <div class="social-crop-area">
          <canvas class="social-crop-canvas"></canvas>
          <div class="social-crop-frame">
            <div class="social-crop-handle nw"></div>
            <div class="social-crop-handle ne"></div>
            <div class="social-crop-handle sw"></div>
            <div class="social-crop-handle se"></div>
          </div>
        </div>
      </div>
    `;
    
    // Social media styling
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.9);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
    `;
    
    document.body.appendChild(this.overlay);
    this.setupOverlayElements();
  }
  
  setupOverlayElements() {
    this.modal = this.overlay.querySelector('.social-avatar-modal');
    this.canvas = this.overlay.querySelector('.social-crop-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.cropFrame = this.overlay.querySelector('.social-crop-frame');
    this.saveBtn = this.overlay.querySelector('.social-save');
    this.cancelBtn = this.overlay.querySelector('.social-cancel');
    
    // Modal styling
    this.modal.style.cssText = `
      background: #1a1a1a;
      border-radius: 12px;
      width: 90vw;
      max-width: 500px;
      overflow: hidden;
    `;
    
    // Header styling  
    this.overlay.querySelector('.social-header').style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #333;
    `;
    
    // Canvas styling
    this.canvas.style.cssText = `
      display: block;
      max-width: 100%;
      max-height: 400px;
      margin: 0 auto;
    `;
    
    // Crop area styling
    this.overlay.querySelector('.social-crop-area').style.cssText = `
      position: relative;
      padding: 20px;
      text-align: center;
    `;
    
    // Crop frame styling - Enhanced visibility
    this.cropFrame.style.cssText = `
      position: absolute;
      border: 3px solid #4ECDC4;
      background: transparent;
      cursor: move;
      display: none;
      box-shadow: 0 0 0 2px rgba(0,0,0,0.8), 0 0 0 4px rgba(78,205,196,0.3);
      border-radius: 2px;
    `;
    
    // Button styling
    [this.saveBtn, this.cancelBtn].forEach(btn => {
      btn.style.cssText = `
        background: none;
        border: none;
        color: #4ECDC4;
        font-size: 16px;
        cursor: pointer;
        padding: 8px 12px;
      `;
    });
    
    this.saveBtn.style.opacity = '0.5';
  }
  
  bindEvents() {
    // Modal events
    this.cancelBtn.addEventListener('click', () => this.close());
    this.saveBtn.addEventListener('click', () => this.save());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    
    // Crop events - like Instagram
    this.cropFrame.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.stopDrag());
    
    // Touch events for mobile
    this.cropFrame.addEventListener('touchstart', (e) => this.startDrag(e));
    document.addEventListener('touchmove', (e) => this.drag(e));
    document.addEventListener('touchend', () => this.stopDrag());
  }
  
  // Public method to trigger file selection
  selectFile() {
    this.fileInput.click();
  }
  
  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    if (file.size > this.maxSize) {
      alert('Image too large. Please select an image under 5MB');
      return;
    }
    
    this.currentFile = file;
    this.loadImage(file);
  }
  
  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.setupCropper(img);
        this.show();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  setupCropper(img) {
    // Calculate canvas size to fit image
    const maxSize = 400;
    let { width, height } = img;
    
    if (width > height) {
      if (width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
    }
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    // Draw image
    this.ctx.drawImage(img, 0, 0, width, height);
    this.originalImage = img;
    
    // Setup crop frame - center square like Instagram
    const cropSize = Math.min(width, height) * 0.8;
    const x = (width - cropSize) / 2;
    const y = (height - cropSize) / 2;
    
    this.setCropFrame(x, y, cropSize, cropSize);
    this.saveBtn.disabled = false;
    this.saveBtn.style.opacity = '1';
  }
  
  setCropFrame(x, y, width, height) {
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.overlay.querySelector('.social-crop-area').getBoundingClientRect();
    
    this.cropFrame.style.left = (canvasRect.left - containerRect.left + x) + 'px';
    this.cropFrame.style.top = (canvasRect.top - containerRect.top + y) + 'px';
    this.cropFrame.style.width = width + 'px';
    this.cropFrame.style.height = height + 'px';
    this.cropFrame.style.display = 'block';
    
    this.cropData = { x, y, width, height };
  }
  
  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
    const rect = this.cropFrame.getBoundingClientRect();
    this.dragOffset = {
      x: (e.clientX || e.touches[0].clientX) - rect.left,
      y: (e.clientY || e.touches[0].clientY) - rect.top
    };
  }
  
  drag(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    
    const containerRect = this.overlay.querySelector('.social-crop-area').getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    let newX = clientX - containerRect.left - this.dragOffset.x;
    let newY = clientY - containerRect.top - this.dragOffset.y;
    
    // Constrain to canvas bounds
    const canvasLeft = canvasRect.left - containerRect.left;
    const canvasTop = canvasRect.top - containerRect.top;
    
    newX = Math.max(canvasLeft, Math.min(newX, canvasLeft + this.canvas.width - this.cropData.width));
    newY = Math.max(canvasTop, Math.min(newY, canvasTop + this.canvas.height - this.cropData.height));
    
    this.cropFrame.style.left = newX + 'px';
    this.cropFrame.style.top = newY + 'px';
    
    // Update crop data
    this.cropData.x = newX - canvasLeft;
    this.cropData.y = newY - canvasTop;
  }
  
  stopDrag() {
    this.isDragging = false;
  }
  
  show() {
    this.overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  
  close() {
    this.overlay.style.display = 'none';
    document.body.style.overflow = '';
    this.cropFrame.style.display = 'none';
    this.fileInput.value = '';
  }
  
  async save() {
    if (!this.currentFile || !this.cropData) return;
    
    try {
      // Create cropped image
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      
      croppedCanvas.width = this.cropSize;
      croppedCanvas.height = this.cropSize;
      
      // Draw cropped portion
      croppedCtx.drawImage(
        this.canvas,
        this.cropData.x, this.cropData.y, this.cropData.width, this.cropData.height,
        0, 0, this.cropSize, this.cropSize
      );
      
      // Convert to blob
      const blob = await new Promise(resolve => {
        croppedCanvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      
      // Call save handler
      await this.onSave(blob, this.currentFile);
      
      this.close();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save image. Please try again.');
    }
  }
  
  defaultSave(blob, originalFile) {
    // Default implementation - convert to data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('Cropped image ready:', e.target.result);
      // Trigger custom event for integration
      window.dispatchEvent(new CustomEvent('avatarCropped', { 
        detail: { dataUrl: e.target.result, blob, originalFile } 
      }));
    };
    reader.readAsDataURL(blob);
  }
}

// Auto-initialize for easy integration
window.SocialAvatarUploader = SocialAvatarUploader;