# 📱 Hi-OS App Store Deployment Guide

## How Your PWA + Capacitor Architecture Works

Your app uses a **PWA-in-a-shell** architecture (similar to Ionic apps):

```
┌─────────────────────────────────┐
│  Native Shell (Capacitor)       │  ← Rare updates (App Store review)
│  ┌───────────────────────────┐  │
│  │   WebView                 │  │
│  │   ┌───────────────────┐   │  │
│  │   │  Your PWA Code    │   │  │  ← Instant updates (Vercel)
│  │   │  (hosted on web)  │   │  │
│  │   └───────────────────┘   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### What This Means for Updates

| Layer | What | Update Method | Speed |
|-------|------|---------------|-------|
| **PWA Code** | HTML, CSS, JS, features | Push to GitHub → Vercel deploys | **Instant** (seconds) |
| **Native Shell** | App icon, splash, native plugins | App Store submission | Days (review required) |

**🎯 Key Insight:** 99% of your updates are PWA code changes → users get them immediately without App Store updates!

---

## Pre-Submission Checklist

### 1. Apple App Store (iOS)

#### Account Setup
- [ ] Apple Developer Account ($99/year) - https://developer.apple.com
- [ ] App Store Connect access
- [ ] Signing certificates & provisioning profiles (Xcode handles this)

#### App Store Requirements
- [ ] **App Icon**: 1024×1024 PNG (no alpha/transparency)
- [ ] **Screenshots**: 
  - iPhone 6.7" (1290×2796) - iPhone 15 Pro Max
  - iPhone 6.5" (1284×2778) - iPhone 14 Pro Max  
  - iPhone 5.5" (1242×2208) - iPhone 8 Plus
  - iPad 12.9" (2048×2732) - if supporting iPad
- [ ] **App Name**: "Stay Hi" or "Hi-OS" (30 char max)
- [ ] **Subtitle**: 30 characters describing the app
- [ ] **Description**: 4000 char max
- [ ] **Keywords**: 100 char total, comma-separated
- [ ] **Privacy Policy URL**: Required (host on your domain)
- [ ] **Support URL**: Required
- [ ] **Age Rating**: Complete questionnaire (likely 4+)
- [ ] **Category**: Health & Fitness (primary), Lifestyle (secondary)

#### Build & Submit
```bash
# In your iOS project folder
cd ios/App
pod install
open App.xcworkspace

# In Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product → Archive
# 3. Distribute App → App Store Connect
# 4. Upload
```

### 2. Google Play Store (Android)

#### Account Setup  
- [ ] Google Play Developer Account ($25 one-time) - https://play.google.com/console
- [ ] Signed release APK/AAB

#### Play Store Requirements
- [ ] **App Icon**: 512×512 PNG (32-bit with alpha)
- [ ] **Feature Graphic**: 1024×500 PNG/JPG
- [ ] **Screenshots**:
  - Phone: 2-8 screenshots, 16:9 or 9:16
  - Tablet: Optional but recommended (7" and 10")
- [ ] **App Name**: 50 char max
- [ ] **Short Description**: 80 char max  
- [ ] **Full Description**: 4000 char max
- [ ] **Privacy Policy URL**: Required
- [ ] **Category**: Health & Fitness
- [ ] **Content Rating**: Complete questionnaire (IARC)
- [ ] **Target Audience**: Declare age groups

#### Build & Submit
```bash
# Generate signed release
cd android
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
# Upload this AAB to Play Console
```

---

## Post-Launch: How Updates Work

### Scenario 1: Bug Fix or New Feature (99% of updates)

**What you do:**
```bash
# Make changes to public/ files
git add -A && git commit -m "feat: new feature"
git push origin main
```

**What happens:**
1. Vercel deploys automatically (30 seconds)
2. Users open app → loads latest code from your domain
3. **No App Store submission needed!**

**User experience:**
- App opens, shows latest version
- Optional: Show "What's New" modal for major features

### Scenario 2: Native Change Required (1% of updates)

**When needed:**
- New native plugin (camera, push notifications, etc.)
- App icon or splash screen change
- Deep link URL scheme change
- New iOS/Android permissions

**What you do:**
1. Update Capacitor config/native code
2. Rebuild native projects
3. Submit to App Store/Play Store
4. Wait for review (1-3 days Apple, hours for Google)

---

## Capacitor Project Setup

Your current setup needs a Capacitor wrapper. Here's the plan:

### Initial Setup (One-Time)

```bash
# From project root
npm init -y  # if no package.json
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# Initialize Capacitor
npx cap init "Stay Hi" "com.stayhi.app" --web-dir=public

# Add platforms
npx cap add ios
npx cap add android
```

### capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stayhi.app',
  appName: 'Stay Hi',
  webDir: 'public',
  server: {
    // For production: Load from your hosted URL
    url: 'https://stay-hi.vercel.app',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Stay Hi'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
```

### For Development (Local Testing)
```typescript
// Use local files instead of remote URL
const config: CapacitorConfig = {
  // ...
  server: {
    // Comment out `url` to use local webDir
    // url: 'https://stay-hi.vercel.app',
  }
};
```

---

## Version Strategy

### Semantic Versioning
- **Major.Minor.Patch** (e.g., 1.2.3)
- PWA changes: Update displayed version in your app
- Native changes: Bump App Store version

### Recommended Approach
```javascript
// In your app
const APP_VERSION = {
  display: '1.0.0',      // Shown to users
  build: '20260115',     // Internal tracking
  native: '1.0',         // App Store version
};
```

---

## Testing Before Submission

### iOS TestFlight
1. Archive app in Xcode
2. Upload to App Store Connect
3. Add internal testers (up to 100, instant)
4. Or external testers (up to 10,000, requires review)

### Android Internal Testing
1. Upload AAB to Play Console
2. Create Internal Testing track
3. Add tester emails
4. Testers get link to install

---

## Timeline Estimate

| Task | Time |
|------|------|
| Set up Capacitor project | 2-3 hours |
| Create app icons & screenshots | 2-4 hours |
| Write store descriptions | 1-2 hours |
| iOS submission & review | 1-3 days |
| Android submission & review | Hours to 1 day |

**Total: ~1 week to go live on both stores**

---

## Quick Reference Commands

```bash
# Sync web changes to native
npx cap sync

# Open iOS project
npx cap open ios

# Open Android project  
npx cap open android

# Run on device (with live reload)
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

---

## Summary

✅ **Good News:** Your PWA architecture means feature updates are instant via Vercel  
✅ **App Store builds** are just a thin shell that loads your web app  
✅ **Once published**, you rarely need to update the native app  
✅ **Users always get** the latest features without App Store updates

🎯 **Next Steps:**
1. Run SQL: `ADD_SOCIAL_LINKS_COLUMNS.sql` in Supabase
2. Set up Apple Developer & Google Play accounts
3. Create Capacitor project wrapper
4. Generate app icons and screenshots
5. Write store listing copy
6. Submit for review!
