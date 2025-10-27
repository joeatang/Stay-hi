# 🏗️ Stay Hi - Gold Standard Architecture Guide

## Core Philosophy: Progressive Enhancement + Component Isolation

**Problem**: New CSS/JS breaks old functionality because there's no component boundaries.

**Solution**: Use CSS namespacing, scoped styles, and modular JavaScript patterns.

---

## 🎯 CSS Architecture - The Rules

### 1. **NEVER Use Global Selectors Without Namespacing**

❌ **BAD - Breaks other pages:**
```css
.card { background: white; }
.tab { color: blue; }
body { padding: 0; }
```

✅ **GOOD - Scoped to component:**
```css
/* Prefix with page class */
.hi-island .card { background: white; }
.hi-island .tab { color: blue; }

/* Or use direct descendant */
.feed-container > .card { background: white; }
```

### 2. **Use BEM Methodology for Component Styles**

```css
/* Block */
.hi-island-feed { }

/* Element */
.hi-island-feed__card { }
.hi-island-feed__card-title { }

/* Modifier */
.hi-island-feed__card--highlighted { }
```

### 3. **Avoid !important Unless Absolutely Necessary**

❌ **BAD:**
```css
.text { color: black !important; } /* Nuclear option, hard to override */
```

✅ **GOOD:**
```css
.feed-container .card .text { color: black; } /* Specific selector wins */
```

### 4. **Progressive Enhancement Pattern**

```css
/* Base styles - work everywhere */
.card {
  background: white;
  padding: 16px;
}

/* Enhanced styles - only when supported */
@supports (backdrop-filter: blur(10px)) {
  .card {
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.9);
  }
}
```

---

## 🧩 JavaScript Architecture - The Rules

### 1. **Module Pattern - Encapsulate Everything**

❌ **BAD - Global namespace pollution:**
```javascript
function loadData() { }
function renderCards() { }
var currentFilter = 'all';
```

✅ **GOOD - Self-contained module:**
```javascript
const HiIslandFeed = (function() {
  // Private state
  let currentFilter = 'all';
  
  // Private functions
  function loadData() { }
  function renderCards() { }
  
  // Public API
  return {
    init: function() { },
    setFilter: function(filter) { currentFilter = filter; }
  };
})();

// Use it
HiIslandFeed.init();
```

### 2. **Event Delegation - Bulletproof Event Handling**

❌ **BAD - Fragile, breaks when DOM changes:**
```javascript
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', handleClick);
});
```

✅ **GOOD - Works even when cards added dynamically:**
```javascript
document.getElementById('feedContainer').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) handleClick(card);
});
```

### 3. **Defensive DOM Access**

❌ **BAD - Crashes if element doesn't exist:**
```javascript
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.addEventListener('click', handler));
```

✅ **GOOD - Graceful degradation:**
```javascript
const tabs = document.querySelectorAll('.tab');
if (tabs.length === 0) {
  console.warn('Tabs not found, skipping initialization');
  return;
}
tabs.forEach(t => t.addEventListener('click', handler));
```

### 4. **Debounce/Throttle User Interactions**

```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Use it
const handleScroll = debounce(() => {
  console.log('Scrolled!');
}, 200);

window.addEventListener('scroll', handleScroll);
```

---

## 📁 File Organization

```
public/
├── assets/
│   ├── core/              # Core utilities, never touch
│   │   ├── supabase-init.js
│   │   ├── auth.js
│   │   └── db.js
│   ├── shared/            # Shared across pages
│   │   ├── header.js
│   │   ├── premium-ux.js
│   │   └── theme.css
│   └── components/        # Page-specific
│       ├── island.js      # Hi Island logic only
│       ├── muscle.js      # Hi Muscle logic only
│       └── composer.js    # Composer logic only
├── index.html            # Home page
├── hi-island.html        # Island page
└── hi-muscle.html        # Muscle page
```

---

## 🚀 Development Workflow

### Before Adding New Features:

1. **Identify scope** - Which page(s) does this affect?
2. **Check existing code** - Is there already a pattern for this?
3. **Namespace it** - Use page-specific class prefix
4. **Test in isolation** - Does it work alone?
5. **Test with others** - Does it break existing features?

### When Debugging Issues:

1. **Check browser console** - Look for errors
2. **Verify DOM structure** - Use browser DevTools
3. **Check CSS specificity** - Use DevTools computed styles
4. **Isolate the problem** - Comment out recent changes
5. **Fix progressively** - One thing at a time

---

## 🎨 CSS Specificity Calculator

```
Inline styles:           1000 points  (avoid!)
IDs:                      100 points  (avoid!)
Classes/attributes:        10 points  (use these!)
Elements:                   1 point   (use these!)
```

**Example:**
```css
/* 1 point */
div { }

/* 11 points */
div.card { }

/* 21 points */
.feed-container .card { }

/* 111 points (TOO SPECIFIC!) */
#feed .container div.card { }
```

---

## 🔧 Common Patterns

### Loading States
```javascript
function setLoading(element, isLoading) {
  if (isLoading) {
    element.setAttribute('aria-busy', 'true');
    element.innerHTML = '<div class="loading">Loading...</div>';
  } else {
    element.setAttribute('aria-busy', 'false');
  }
}
```

### Error Handling
```javascript
async function loadData() {
  try {
    const data = await fetchData();
    renderData(data);
  } catch (error) {
    console.error('Failed to load:', error);
    showUserFriendlyError('Could not load data. Please refresh.');
  }
}
```

### Feature Detection
```javascript
// Check if feature available before using
if ('IntersectionObserver' in window) {
  // Use modern API
  const observer = new IntersectionObserver(callback);
} else {
  // Fallback for older browsers
  useLegacyScrollDetection();
}
```

---

## ✅ Checklist for Every Change

- [ ] Does it work when JavaScript is disabled? (Progressive enhancement)
- [ ] Does it work on mobile? (Responsive design)
- [ ] Does it break other pages? (Test all pages)
- [ ] Is it accessible? (Keyboard navigation, screen readers)
- [ ] Does it handle errors gracefully? (Try/catch, null checks)
- [ ] Is it performant? (Debounce, throttle, lazy load)
- [ ] Can it be reused? (Modular, DRY principle)

---

## 🐛 Debugging Commands

```javascript
// In browser console:

// Check what's loaded
console.log('HiIsland:', window.HiIsland);
console.log('PremiumUX:', window.PremiumUX);

// Check DOM elements
console.log('Tabs:', document.querySelectorAll('.tab').length);
console.log('Cards:', document.querySelectorAll('.card').length);

// Check CSS specificity
getComputedStyle(document.querySelector('.tab')).color;

// Check event listeners (Chrome only)
getEventListeners(document.querySelector('.tab'));
```

---

## 📚 Resources

- **CSS Specificity**: https://specificity.keegan.st/
- **BEM Methodology**: https://getbem.com/
- **Progressive Enhancement**: https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement
- **Module Pattern**: https://www.patterns.dev/posts/module-pattern

---

## 🎯 Remember

**"Add new features without breaking old ones"**

1. Scope everything (CSS namespacing, JS modules)
2. Test incrementally (one change at a time)
3. Fail gracefully (defensive coding, error handling)
4. Document patterns (this file!)

**Last Updated**: October 25, 2025
