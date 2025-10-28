/**
 * ===================================================================
 * 🎨 AVATAR UTILITIES - Tesla-Grade Avatar System
 * Reusable utilities for generating and displaying user avatars
 * ===================================================================
 */

window.AvatarUtils = {
  /**
   * Generate user initials from name/email
   * @param {string} displayName - User's display name
   * @param {string} username - User's username
   * @param {string} email - User's email (fallback)
   * @returns {string} 1-2 character initials
   */
  getInitials(displayName, username, email) {
    // Try display name first
    if (displayName && displayName.trim()) {
      const parts = displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return displayName.trim().substring(0, 2).toUpperCase();
    }
    
    // Try username
    if (username && username.trim()) {
      const cleaned = username.replace('@', '').trim();
      return cleaned.substring(0, 2).toUpperCase();
    }
    
    // Fallback to email
    if (email && email.trim()) {
      const emailPart = email.split('@')[0];
      return emailPart.substring(0, 2).toUpperCase();
    }
    
    // Ultimate fallback
    return 'HI';
  },

  /**
   * Generate a color based on a string (consistent hashing)
   * @param {string} str - Input string (email, username, etc)
   * @returns {object} { background, text } color pair
   */
  getColorFromString(str) {
    if (!str) str = 'default';
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to hue (0-360)
    const hue = Math.abs(hash % 360);
    
    // Use HSL for beautiful, accessible colors
    // Saturation: 65-75% for vibrant but not overwhelming
    // Lightness: 45-55% for good contrast
    const saturation = 65 + (Math.abs(hash) % 10);
    const lightness = 45 + (Math.abs(hash >> 8) % 10);
    
    return {
      background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      text: lightness > 50 ? '#1a1a2e' : '#ffffff'
    };
  },

  /**
   * Create an avatar element (img or initials div)
   * @param {object} user - User object { avatar_url, display_name, username, email }
   * @param {object} options - { size: '40px', className: 'custom-class', showInitials: true }
   * @returns {HTMLElement} Avatar element ready to insert
   */
  createAvatar(user, options = {}) {
    const {
      size = '40px',
      className = '',
      showInitials = true,
      isAnonymous = false
    } = options;
    
    // Anonymous users get a generic avatar
    if (isAnonymous) {
      return this.createAnonymousAvatar(size, className);
    }
    
    const container = document.createElement('div');
    container.className = `avatar-container ${className}`.trim();
    container.style.cssText = `
      position: relative;
      width: ${size};
      height: ${size};
      flex-shrink: 0;
    `;
    
    // If avatar URL exists, try to load image
    if (user.avatar_url && user.avatar_url.trim()) {
      const img = document.createElement('img');
      img.className = 'avatar-image';
      img.style.cssText = `
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        display: block;
      `;
      img.src = user.avatar_url;
      
      // Fallback to initials on error
      if (showInitials) {
        img.onerror = () => {
          container.innerHTML = '';
          container.appendChild(
            this.createInitialsAvatar(user, size)
          );
        };
      }
      
      container.appendChild(img);
    } else if (showInitials) {
      // No avatar URL, use initials
      container.appendChild(
        this.createInitialsAvatar(user, size)
      );
    }
    
    return container;
  },

  /**
   * Create initials-based avatar div
   * @param {object} user - User object
   * @param {string} size - CSS size value
   * @returns {HTMLElement} Initials div
   */
  createInitialsAvatar(user, size = '40px') {
    const initials = this.getInitials(
      user.display_name,
      user.username,
      user.email
    );
    
    const colorSeed = user.email || user.username || user.display_name || 'default';
    const colors = this.getColorFromString(colorSeed);
    
    const div = document.createElement('div');
    div.className = 'avatar-initials';
    div.textContent = initials;
    
    // Calculate font size based on container size
    const sizeNum = parseInt(size);
    const fontSize = Math.max(Math.floor(sizeNum * 0.4), 12);
    
    div.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: ${colors.background};
      color: ${colors.text};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      user-select: none;
    `;
    
    return div;
  },

  /**
   * Create anonymous user avatar
   * @param {string} size - CSS size value
   * @param {string} className - Additional classes
   * @returns {HTMLElement} Anonymous avatar
   */
  createAnonymousAvatar(size = '40px', className = '') {
    const container = document.createElement('div');
    container.className = `avatar-container avatar-anonymous ${className}`.trim();
    
    const sizeNum = parseInt(size);
    const fontSize = Math.max(Math.floor(sizeNum * 0.5), 14);
    
    container.style.cssText = `
      width: ${size};
      height: ${size};
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
      border: 2px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      flex-shrink: 0;
    `;
    
    container.innerHTML = '👤';
    
    return container;
  },

  /**
   * Update an existing img element to show initials on error
   * Useful for progressive enhancement
   * @param {HTMLImageElement} imgElement - Image element to enhance
   * @param {object} user - User data for initials fallback
   */
  enhanceImageWithInitialsFallback(imgElement, user) {
    if (!imgElement || imgElement.tagName !== 'IMG') {
      console.warn('enhanceImageWithInitialsFallback: Invalid img element');
      return;
    }
    
    imgElement.onerror = () => {
      // Replace image with initials div
      const initialsDiv = this.createInitialsAvatar(user, 
        imgElement.style.width || imgElement.width + 'px'
      );
      
      // Preserve classes
      initialsDiv.className = imgElement.className;
      
      // Replace in DOM
      if (imgElement.parentNode) {
        imgElement.parentNode.replaceChild(initialsDiv, imgElement);
      }
    };
  },

  /**
   * Get avatar CSS as inline style (for elements that need it)
   * @param {object} user - User object
   * @param {string} size - CSS size
   * @returns {string} CSS style string
   */
  getAvatarStyle(user, size = '40px') {
    const colors = this.getColorFromString(
      user.email || user.username || user.display_name || 'default'
    );
    
    return `
      width: ${size};
      height: ${size};
      border-radius: 50%;
      background: ${colors.background};
      color: ${colors.text};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: ${Math.floor(parseInt(size) * 0.4)}px;
    `;
  }
};

// Log initialization
console.log('✅ Avatar Utils loaded');
