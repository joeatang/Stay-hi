# 🗺️ HI-OS REPOSITORY MAP
*Single source of truth for Stay-hi codebase navigation*

## 🎯 **ACTIVE PAGES** (`public/*.html`)
**Primary Application:**
- `public/welcome.html` - Landing page with S10 stats, webroot guard, Tesla-grade responsive design
- `public/hi-dashboard.html` - Main application UI with Hi5 flow, medallion system, calendar integration
- `public/hi-island-NEW.html` - Secondary experience interface

**Development/Testing:**
- `public/dev/preflight/index.html` - HI-OS preflight checks with S-ARCH/2 dual-root detector
- `public/webroot-test.html` - Standalone webroot guard test page

## 📚 **ACTIVE LIBRARIES** (`public/lib/**`)
**Core System:**
- `public/lib/HiSupabase.v3.js` - v3 ESM Supabase client (757B, uses esm.sh CDN)
- `public/lib/HiStats.js` - S10 stats fetcher (1.5KB, v3-only with flag gates)
- `public/lib/HiMetrics.js` - Tesla-grade metrics system (3.4KB, 30s cache + subscribers)
- `public/lib/HiFlags.js` - Feature flags system (10.8KB, runtime configuration)

**Database & API:**
- `public/lib/HiDB.js` - Database access layer (23.8KB)
- `public/lib/hibase/` - Unified API system (complete module directory)
  - `index.js` - Main HiBase entry point
  - `stats.js` - Statistics module (18.8KB)
  - `auth.js` - Authentication module
  - `shares.js` - Sharing system
  - `streaks.js` - User streaks functionality
  - `users.js` - User management

**UI & Flow:**
- `public/lib/HiFlowController.js` - Smart routing controller (27.4KB)
- `public/lib/HiMembership.js` - Membership tier system (13.7KB)
- `public/lib/HiPWA.js` - Progressive Web App features (5.8KB)

## ⚠️ **LEGACY/DO-NOT-USE AREAS**

**Repo Root Duplicates (DEPRECATED):**
- `/lib/` - **DO NOT USE** - Duplicated libraries, use `public/lib/` instead
- `/lib/DEPRECATED_DO_NOT_USE.js` - S-ARCH/2 tripwire (triggers RED alerts if loaded)
- `/lib/HiSupabase.legacy.js` - Legacy Supabase client (2.7KB, use v3 version)

**Backup Files:**
- `public/*.bak` - Legacy HTML backups
- `public/*backup*.html` - Archive copies

**Legacy Scripts:**
- Commented `<script>` tags in HTML files
- Unused asset references

## 🚀 **DEVELOPMENT WORKFLOW**

### **Primary Commands (ALWAYS from /public):**
```bash
cd public
python3 -m http.server 3030
# or use the wrapper script:
# ./dev-server.sh
```

### **Verification:**
- ✅ **GREEN webroot badge**: Correctly served from `/public`
- ❌ **RED webroot badge**: Wrong server root, move to `/public`
- ✅ **Console `[HI-OS][WEBROOT] GREEN`**: Proper setup
- ❌ **Console `[HI-OS][DEPRECATED-LIB] RED`**: Serving from wrong directory

### **Production Deploy:**
```bash
vercel --prod  # Automatically uses outputDirectory: "public"
```

## 📁 **WHERE TO ADD NEW FILES**

### **New HTML Pages:**
- `public/[page-name].html` - All HTML files go in public root
- `public/dev/[tool-name].html` - Development tools in dev subdirectory

### **New JavaScript Libraries:**
- `public/lib/[ModuleName].js` - Core libraries
- `public/lib/[category]/[ModuleName].js` - Categorized modules (e.g., auth/, monitoring/)

### **New Assets:**
- `public/assets/[category]/[file]` - Images, CSS, static files

### **Configuration:**
- Root level for build/deploy config (`vercel.json`, `package.json`)
- `public/` for runtime config files

## 🔧 **TROUBLESHOOTING**

### **RED Webroot Badge Appears:**
1. **Problem**: Server running from repo root instead of `/public`
2. **Solution**: `cd public && python3 -m http.server 3030`
3. **Verify**: Badge should turn GREEN, console shows `[HI-OS][WEBROOT] GREEN`

### **Import Errors (404s):**
1. **Problem**: ES modules not found (`./lib/Module.js` → 404)
2. **Cause**: Serving from wrong directory (imports resolve relative to server root)
3. **Solution**: Always serve from `/public` directory

### **S-ARCH/2 Tripwire Fires:**
1. **Console**: `[HI-OS][DEPRECATED-LIB] RED`
2. **Meaning**: You're accessing repo-root `/lib` files (deprecated)
3. **Solution**: Use `/public/lib/` equivalents, serve from `/public`

### **Development Server Issues:**
1. Kill existing servers: `pkill -f "python3.*http.server"`
2. Clear port: `lsof -ti :3030 | xargs kill -9`
3. Start fresh from `/public`: `cd public && python3 -m http.server 3030`

---

**Last Updated**: November 4, 2025  
**HI-OS Version**: S-ARCH/3  
**Maintained By**: HI-DEV Team