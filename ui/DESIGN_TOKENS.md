# 🎨 Hi App Design Tokens

## Overview

This document defines the design token system for all Hi App UI components. All components in `/ui/*` should consume these tokens from `/styles/tokens.css` instead of hard-coded values.

## Token Categories

### Colors
```css
/* Primary Colors */
--hi-bg: #FFFDF9              /* Main background */
--hi-ink: #0F172A             /* Primary text */
--hi-muted: #6B7280           /* Secondary text */
--hi-border: #E5E7EB          /* Borders */

/* Brand Accents */
--hi-green: #0a8a3a           /* Primary green */
--hi-orange-1: #FF7A18        /* Primary orange */
--hi-orange-2: #FFD166        /* Secondary orange */

/* Tesla Premium */
--tesla-black: #1A1A1A
--tesla-dark: #212121
--tesla-silver: #E8E8E8
```

### Spacing (8px base scale)
```css
--space-xs: 4px               /* 4px */
--space-sm: 8px               /* 8px */
--space-md: 16px              /* 16px */
--space-lg: 24px              /* 24px */
--space-xl: 32px              /* 32px */
--space-2xl: 48px             /* 48px */
--space-3xl: 64px             /* 64px */
```

### Border Radius
```css
--radius-sm: 8px              /* Small radius */
--radius-md: 12px             /* Medium radius */
--radius-lg: 16px             /* Large radius */
--radius-xl: 20px             /* Extra large */
--radius-btn: 14px            /* Button radius */
--radius-card: 16px           /* Card radius */
--radius-full: 9999px         /* Fully rounded */
```

### Shadows
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15)
--shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.2)
--shadow-premium: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
--shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.37)
```

### Transitions & Motion
```css
--transition-fast: 150ms ease         /* Quick interactions */
--transition-normal: 300ms ease       /* Standard interactions */
--transition-slow: 500ms ease         /* Slow animations */
--transition-smooth: cubic-bezier(0.4, 0, 0.2, 1)
--transition-bounce: cubic-bezier(0.25, 0.8, 0.25, 1)
```

### Typography
```css
--font-system: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
--font-size-xs: 12px
--font-size-sm: 14px
--font-size-md: 16px
--font-size-lg: 18px
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

## Usage Guidelines

### ✅ DO
- Use CSS variables: `background: var(--hi-bg);`
- Reference tokens for all visual properties
- Create component stylesheets in `/styles/components/` if needed
- Maintain visual consistency across components

### ❌ DON'T  
- Hard-code colors: `background: #FFFDF9;`
- Hard-code spacing: `padding: 16px;`
- Invent new values not in the token system
- Modify existing token values without design system approval

## Component Integration

All UI components should follow this pattern:

```css
.hi-component {
  background: var(--hi-bg);
  color: var(--hi-ink);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);
}
```

## Token Evolution

- New tokens should be added to `/styles/tokens.css` only
- Breaking changes require versioning and migration plan  
- All components must be updated when tokens change
- Dark mode variants follow the same token names