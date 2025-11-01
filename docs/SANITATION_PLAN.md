# 🧹 SANITATION PLAN
*Hi Standard Protocol - 5-year foundation cleanup roadmap*

---

## 🎯 SCOPE & OBJECTIVES

**Mission**: Archive orphaned files, consolidate duplicates into `/ui` and `/lib`, preserve MVP functionality.

**Success Criteria**: Clean repo with Hi-branded organization, zero regression, maintainable architecture.

---

## 📋 SANITATION SPRINT PHASES

### **Phase 1: ARCHIVE ONLY** (PR #1)
- **Scope**: Move 60+ test/debug/backup files to `/archive/2025-11-01/`
- **Rules**: 
  - No import changes
  - One-line reasoning per archived file
  - Verify routes still render
- **Files**: All ARCHIVE decisions from matrix
- **Verification**: Welcome, Dashboard, HiIsland, HiGym, Profile render with no console errors

### **Phase 2: SHARED UI BASE** (PR #2)  
- **Scope**: Consolidate truly duplicated visual components → `/ui`
- **Targets**: HiHeader, HiFooter, HiModal/Sheet, HiTabs, HiShareSheet
- **Rules**:
  - Update imports in kept pages only
  - No style changes beyond path updates
  - Hi-branded naming (HiComponent pattern)
- **Verification**: All reachable pages render correctly

### **Phase 3: SHARED LIB BASE** (PR #3)
- **Scope**: Consolidate duplicated logic → `/lib`  
- **Targets**: supabase-init, db, hi-flow-controller, unified-membership-system, pwa-manager, performance-manager
- **Rules**:
  - Update imports in kept pages only
  - Preserve exact functionality
  - Hi-branded exports where appropriate
- **Verification**: Authentication, routing, database operations work

### **Phase 4: STYLE GUARDRAILS** (PR #4)
- **Scope**: Wire `/ui` components to consume `/styles/tokens.css`
- **Rules**:
  - No page restyling  
  - Only wire tokens where components were consolidated
  - Maintain visual parity
- **Verification**: Design consistency preserved

---

## 🛡️ STOP-CHECKPOINT RULES

**PAUSE and ask before proceeding if:**
- Any import change breaks a live route
- Any PWA file scope is touched (`manifest.json`, `sw.js`)
- Any auth path changes
- Avatar/location flows regress

---

## 📁 DIRECTORY STRUCTURE

### **Target Architecture**
```
/ui/                    # Shared visual components (Hi-branded)
  HiHeader/
  HiFooter/ 
  HiModal/
  HiShareSheet/
  HiTabs/

/lib/                   # Shared logic utilities
  supabase-init.js
  database.js
  hi-flow-controller.js
  membership-system.js
  pwa-manager.js
  performance-manager.js

/styles/               # Global design system  
  tokens.css           # Design tokens (KEEP HERE)
  base.css
  modal-base.css

/archive/2025-11-01/   # Quarantined files
  test-files/
  backup-versions/
  debug-utilities/
  legacy-pages/
```

---

## 🔍 DEFINITION OF DONE

### **Per-PR Acceptance Criteria**

**Functional Requirements**
- [ ] Welcome page loads and routes correctly
- [ ] Dashboard displays medallion interface  
- [ ] HiIsland (NEW) shows map and feed
- [ ] HiGym tracks activities
- [ ] Profile manages user settings
- [ ] Admin panel accessible (if admin user)
- [ ] Authentication flow works (signin/signup/magic links)
- [ ] PWA installation prompts appear
- [ ] No console errors on any reachable page

**Technical Requirements**  
- [ ] All imports resolve correctly
- [ ] No broken file references
- [ ] Vercel deployment succeeds
- [ ] Service worker functions
- [ ] Database connections work
- [ ] Privacy controls active

**Quality Gates**
- [ ] Hi Standard Dev Protocol followed
- [ ] Git history preserves context
- [ ] Rollback plans documented
- [ ] No regression in core user flows

---

## 🚨 RISK MITIGATION

### **High-Risk Operations**
1. **Auth system changes** → Full system test required
2. **Database utility moves** → Verify all CRUD operations  
3. **PWA file touching** → Test installation + offline
4. **Routing changes** → Test all navigation paths

### **Rollback Strategy**
- Each PR is atomic and reversible
- Git revert for emergency rollback
- Asset moves documented with original paths
- Import changes tracked per file

---

## 📊 SUCCESS METRICS

- **Repo Cleanliness**: 60+ files archived, duplicates consolidated
- **Maintainability**: Clear separation between `/ui`, `/lib`, core files
- **Stability**: Zero functional regression
- **Developer Experience**: Faster navigation, clearer structure
- **Hi Standard Compliance**: Premium architecture, Hi-branded naming

---

*Sanitation plan approved per Hi Standard Dev Protocol with surgical precision*