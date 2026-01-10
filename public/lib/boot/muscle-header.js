// Tesla-Grade Header JavaScript (extracted)
// Navigation Modal Control
function openNavigation() {
  const modal = document.getElementById('navigationModal');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
    }, 10);
  }
}

function closeNavigation() {
  const modal = document.getElementById('navigationModal');
  if (modal) {
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

// Calendar functionality - Tesla-grade with fallbacks
function showCalendar() {
  if (window.hiCalendarInstance && typeof window.hiCalendarInstance.show === 'function') {
    window.hiCalendarInstance.show();
  } else if (window.PremiumCalendar) {
    // Initialize if not already done
    console.log('📅 Initializing calendar on Hi Muscle...');
    window.hiCalendarInstance = new window.PremiumCalendar();
    window.hiCalendarInstance.show();
  } else {
    console.error('❌ Calendar not available - premium-calendar.js not loaded');
    // Show user-friendly message
    alert('📅 Calendar is loading... Please try again in a moment.');
  }
}

// Home navigation functionality
function navigateToHome() {
  window.location.href = (window.hiPaths?.page ? window.hiPaths.page('dashboard') : 'hi-dashboard.html');
}

// Membership tier management
async function updateMembershipTier() {
  try {
    if (window.HiMembership && typeof window.HiMembership.getCurrentTier === 'function') {
      const tierData = await window.HiMembership.getCurrentTier();
      const tierElement = document.getElementById('membershipTier');
      const tierText = tierElement?.querySelector('.tier-text');
      
      if (tierText && tierData) {
        tierText.textContent = tierData.name || 'Standard';
        
        // Apply tier-specific styling
        const tierColors = {
          'Standard': '#6B7280',
          'Premium': '#FFD166', 
          'Elite': '#FF6B6B',
          'Legend': '#4ECDC4'
        };
        
        const color = tierColors[tierData.name] || '#6B7280';
        document.documentElement.style.setProperty('--hi-tier-color', color);
      }
    }
  } catch (error) {
    console.log('Membership tier update:', error.message);
  }
}

// Initialize header on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Track current page visit for smart navigation
  try {
    const currentPage = {
      url: window.location.href,
      name: 'Hi Muscle',
      timestamp: Date.now()
    };
    
    const navHistory = JSON.parse(sessionStorage.getItem('hiNavHistory') || '[]');
    // Remove any existing entry for this page
    const filtered = navHistory.filter(page => page.url !== currentPage.url);
    // Add current page to front
    filtered.unshift(currentPage);
    // Keep last 10 pages
    filtered.splice(10);
    sessionStorage.setItem('hiNavHistory', JSON.stringify(filtered));
  } catch (error) {
    // Silent fail for tracking
  }

  // Update membership tier
  updateMembershipTier();
  
  // Add keyboard navigation support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNavigation();
    }
  });
});
