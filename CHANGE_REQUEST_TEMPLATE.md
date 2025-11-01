# 🚀 Stay Hi Change Request Template
## Foundation Preservation Protocol

**CRITICAL**: All changes must maintain the core UI/UX vision established in v2.0-foundation

---

## Change Request Details

### **Type of Change** (Select one)
- [ ] 🎨 **UI/UX Refinement** - Visual polish, animations, transitions
- [ ] ⚡ **Performance Optimization** - Speed, loading, responsiveness
- [ ] 🔧 **Technical Debt** - Code cleanup, architecture improvement
- [ ] 🆕 **Feature Addition** - New functionality (requires extra scrutiny)
- [ ] 🐛 **Bug Fix** - Fixing broken functionality
- [ ] 📱 **Mobile Enhancement** - iOS/Android specific improvements

### **Problem Statement**
*What specific issue needs addressing? Include screenshots/evidence.*

### **Proposed Solution**
*How will you solve this while maintaining foundation integrity?*

### **Foundation Impact Assessment**
- [ ] **Zero Impact** - Pure refinement, no architectural changes
- [ ] **Low Impact** - Minor changes that enhance existing patterns
- [ ] **Medium Impact** - Requires careful testing of core flows
- [ ] **High Impact** - Major changes requiring thorough validation

### **UI/UX Vision Compliance**
- [ ] Maintains Tesla-grade centering and layout
- [ ] Preserves mobile-first responsive design
- [ ] Keeps gold-standard component hierarchy
- [ ] Enhances (doesn't break) current user flows

### **Testing Requirements**
- [ ] Desktop testing (Chrome, Safari, Firefox)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Authentication flow validation
- [ ] Anonymous user experience verification
- [ ] Performance impact measurement

---

## Implementation Checklist

### **Pre-Implementation**
- [ ] Review v2.0-foundation tag for reference
- [ ] Create feature branch from main
- [ ] Document current behavior (screenshots/videos)

### **During Implementation** 
- [ ] Make minimal, surgical changes
- [ ] Test each change incrementally
- [ ] Maintain existing CSS class structure
- [ ] Preserve component naming conventions

### **Post-Implementation**
- [ ] Side-by-side comparison with foundation version
- [ ] Performance regression testing
- [ ] Cross-browser validation
- [ ] Mobile device testing
- [ ] User flow end-to-end testing

---

## Quality Gates

### **🚫 AUTOMATIC REJECTION CRITERIA**
- Breaks mobile responsiveness
- Changes core layout/centering system
- Introduces visual artifacts or flashing
- Degrades performance metrics
- Breaks accessibility standards
- Introduces console errors

### **✅ APPROVAL CRITERIA**  
- Enhances existing UI/UX patterns
- Improves user experience measurably
- Maintains or improves performance
- Passes all foundation compliance tests
- Documentation updated appropriately

---

## Example Usage

**Good Request:**
> "Eliminate the 200ms redirect flash when authenticated users visit root URL. Proposal: Add CSS loading state that smoothly transitions to welcome content."

**Bad Request:** 
> "Completely redesign the welcome page layout and add new navigation system."

---

*Remember: We're polishing a diamond, not rebuilding the foundation.*