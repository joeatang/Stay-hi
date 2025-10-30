/**
 * Tesla-Grade Smooth Redirect System
 * Provides buttery smooth transitions between pages
 */

class TeslaSmoothRedirect {
  constructor() {
    this.isRedirecting = false;
    this.transitionDuration = 300; // milliseconds
  }

  /**
   * Smooth redirect with fade effect - Tesla-grade UX
   * @param {string} url - Destination URL
   * @param {boolean} replace - Use replace instead of href (default: false for smooth experience)
   */
  async redirect(url, replace = false) {
    if (this.isRedirecting) return; // Prevent double redirects
    
    this.isRedirecting = true;

    try {
      // Add fade-out effect to body
      document.body.style.transition = `opacity ${this.transitionDuration}ms ease-out`;
      document.body.style.opacity = '0';

      // Wait for fade-out animation
      await new Promise(resolve => setTimeout(resolve, this.transitionDuration));

      // Navigate to new page
      if (replace) {
        window.location.replace(url);
      } else {
        window.location.href = url;
      }
    } catch (error) {
      console.warn('Smooth redirect failed, using fallback:', error);
      // Fallback to immediate redirect
      if (replace) {
        window.location.replace(url);
      } else {
        window.location.href = url;
      }
    }
  }

  /**
   * Instant redirect for emergency auth situations
   * @param {string} url - Destination URL
   */
  instantRedirect(url) {
    window.location.replace(url);
  }

  /**
   * Smooth redirect to signin with next parameter
   * @param {string} nextUrl - URL to redirect to after signin
   */
  async redirectToSignin(nextUrl = null) {
    const currentUrl = nextUrl || window.location.pathname + window.location.search;
    const signinUrl = `/signin.html?next=${encodeURIComponent(currentUrl)}`;
    
    await this.redirect(signinUrl, true); // Use replace for auth redirects
  }

  /**
   * Smooth redirect after successful authentication
   * @param {string} nextUrl - URL to redirect to (default: index.html)
   */
  async redirectAfterAuth(nextUrl = 'index.html') {
    await this.redirect(nextUrl, true);
  }
}

// Global instance for Tesla-grade smooth redirects
window.teslaRedirect = new TeslaSmoothRedirect();

// Add fade-in animation for page loads
document.addEventListener('DOMContentLoaded', () => {
  // Ensure smooth entry animation
  if (document.body.style.opacity === '0') {
    document.body.style.transition = 'opacity 300ms ease-in';
    document.body.style.opacity = '1';
  }
});

// CSS for smooth transitions
const style = document.createElement('style');
style.textContent = `
  body {
    opacity: 1;
    transition: opacity 300ms ease-in-out;
  }
  
  /* Smooth loading state */
  body.tesla-loading {
    opacity: 0.7;
    pointer-events: none;
  }
`;
document.head.appendChild(style);