/**
 * HiScale - Intensity Selector Component
 * 
 * 5-point scale for measuring Hi state (1-5):
 * - 1-2: 🌱 Opportunity (low energy, growth potential)
 * - 3: ⚖️ Neutral (balanced state)
 * - 4-5: ⚡ Hi Energy (elevated, inspired)
 * 
 * Optional feature - users can skip without selecting
 * 
 * Usage:
 *   const scale = new HiScale(container, { onChange: (value) => {...} });
 *   scale.getValue() // returns null or 1-5
 *   scale.reset()
 */

export default class HiScale {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('HiScale requires a container element');
    }
    
    this.container = container;
    this.selectedValue = null;
    this.onChange = options.onChange || (() => {});
    this.render();
  }
  
  render() {
    const scales = [
      { value: 1, emoji: '🌱', label: 'Opportunity', color: '#A8DADC' },
      { value: 2, emoji: '🌱', label: 'Opportunity', color: '#A8DADC' },
      { value: 3, emoji: '⚖️', label: 'Neutral', color: '#888888' },
      { value: 4, emoji: '⚡', label: 'Hi Energy', color: '#FFD166' },
      { value: 5, emoji: '⚡', label: 'Highly Inspired', color: '#F4A261' }
    ];
    
    this.container.innerHTML = `
      <div class="hi-scale-selector" role="radiogroup" aria-label="Hi Scale Intensity">
        ${scales.map(scale => `
          <button 
            type="button"
            class="hi-scale-button" 
            data-value="${scale.value}"
            role="radio"
            aria-checked="false"
            aria-label="${scale.label} (${scale.value})"
            style="--scale-color: ${scale.color}"
            title="${scale.label}"
          >
            <span class="hi-scale-emoji" aria-hidden="true">${scale.emoji}</span>
            <span class="hi-scale-value">${scale.value}</span>
          </button>
        `).join('')}
      </div>
      <div class="hi-scale-labels" aria-hidden="true">
        <span class="hi-scale-label-start">Low</span>
        <span class="hi-scale-label-middle">Neutral</span>
        <span class="hi-scale-label-end">Hi Energy</span>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    const buttons = this.container.querySelectorAll('.hi-scale-button');
    
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const value = parseInt(e.currentTarget.dataset.value);
        this.selectValue(value);
      });
    });
    
    // Keyboard navigation (Arrow keys)
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        
        const buttons = Array.from(this.container.querySelectorAll('.hi-scale-button'));
        const currentIndex = this.selectedValue ? this.selectedValue - 1 : 0;
        const newIndex = e.key === 'ArrowLeft' 
          ? Math.max(0, currentIndex - 1)
          : Math.min(4, currentIndex + 1);
        
        this.selectValue(newIndex + 1);
        buttons[newIndex].focus();
      }
    });
  }
  
  selectValue(value) {
    // Deselect all buttons
    const buttons = this.container.querySelectorAll('.hi-scale-button');
    buttons.forEach(btn => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-checked', 'false');
    });
    
    // Toggle selection (allow deselection by clicking same value)
    if (this.selectedValue === value) {
      this.selectedValue = null; // Deselect
    } else {
      this.selectedValue = value;
      const selectedButton = this.container.querySelector(`[data-value="${value}"]`);
      if (selectedButton) {
        selectedButton.classList.add('selected');
        selectedButton.setAttribute('aria-checked', 'true');
      }
    }
    
    // Notify onChange callback
    this.onChange(this.selectedValue);
  }
  
  getValue() {
    return this.selectedValue; // null or 1-5
  }
  
  setValue(value) {
    if (value === null || value === undefined) {
      this.reset();
    } else if (value >= 1 && value <= 5) {
      this.selectValue(value);
    }
  }
  
  reset() {
    this.selectedValue = null;
    const buttons = this.container.querySelectorAll('.hi-scale-button');
    buttons.forEach(btn => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-checked', 'false');
    });
    this.onChange(null);
  }
  
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// 🔧 CRITICAL FIX: Export to window for HiShareSheet compatibility
// HiShareSheet expects HiScale as a global, but it's loaded as a module
window.HiScale = HiScale;
