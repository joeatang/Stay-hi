// 🔥 SIMPLIFIED MODAL TEST
console.log('🚀 Simple modal test starting...');

class SimpleModal {
  constructor() {
    console.log('🏗️ SimpleModal constructor');
    this.isShown = false;
    this.testModal();
  }
  
  testModal() {
    console.log('🧪 Testing modal display...');
    
    // Wait a bit then show
    setTimeout(() => {
      console.log('⏰ Timeout reached, showing modal');
      this.showModal();
    }, 2000);
  }
  
  showModal() {
    console.log('📱 showModal called');
    
    if (this.isShown) {
      console.log('⚠️ Modal already shown, skipping');
      return;
    }
    
    this.isShown = true;
    console.log('🎨 Creating modal elements...');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #0F0F23 0%, #1A1A2E 100%);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui;
    `;
    
    modal.innerHTML = `
      <div style="margin-bottom: 24px;">
        <div style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFD93D, #FF7B24);
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        ">🔒</div>
        <h2 style="
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 12px;
          background: linear-gradient(135deg, #FFD93D, #4ECDC4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        ">Test Modal Working!</h2>
        <p style="
          font-size: 16px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        ">This is a test modal to verify the modal system is working correctly.</p>
      </div>
      
      <button id="closeBtn" style="
        background: linear-gradient(135deg, #FFD93D, #FF7B24);
        border: none;
        color: #111;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        width: 100%;
      ">Close Test Modal</button>
    `;
    
    // Add to overlay
    overlay.appendChild(modal);
    
    // Add event listener
    modal.querySelector('#closeBtn').addEventListener('click', () => {
      console.log('🚪 Close button clicked');
      this.hideModal(overlay);
    });
    
    // Add to page
    document.body.appendChild(overlay);
    console.log('✅ Modal added to page');
  }
  
  hideModal(overlay) {
    console.log('🚪 Hiding modal');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    this.isShown = false;
    console.log('✅ Modal hidden');
  }
}

// Initialize
console.log('🎯 Creating SimpleModal instance');
window.simpleModal = new SimpleModal();
console.log('✅ SimpleModal created');