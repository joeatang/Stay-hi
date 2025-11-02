# 🔧 Phase 7 HI DEV Manual Test Protocol

## Test URLs

### Production Verification (Standard Flow)
```
http://localhost:3030/public/phase7-verification.html
```
- Should load the standard verification page
- Uses CommonJS globals for compatibility
- Production-safe testing environment

### Dev-Only Verification (Isolated ESM Testing)
```
http://localhost:3030/public/phase7-verification.html?dev=1
```
- Automatically redirects to `/public/dev/phase7/index.html`
- Uses pure ES6 modules with proper imports
- No production path contamination
- Dev banner clearly visible

### Direct Dev Access
```
http://localhost:3030/public/dev/phase7/index.html
```
- Direct access to isolated dev environment
- For advanced testing and debugging

## Expected Results

### ✅ PASS Indicators
- **Flags**: Both `hiFeatureFlags.hifeed_enabled = true` AND `HiFlags.isEnabled('hifeed_enabled') = true`
- **Modules**: All 3-4 modules load (HiFeed API, HiFeed Component, HiStreaks Component, Supabase Client)
- **Components**: Both HiFeed and HiStreaks can be instantiated without errors
- **Feed**: Returns valid array (empty or populated) without crashes
- **Performance**: Total verification time under 3000ms

### 🔧 Manual Test Actions

1. **Redirect Test**
   - Load `phase7-verification.html` → Should see production page
   - Load `phase7-verification.html?dev=1` → Should redirect to dev environment
   - Verify dev banner is visible: "🛠️ DEV-ONLY ENVIRONMENT"

2. **Full Auto Test**
   - Click "Run Full Test" button
   - Watch console output in real-time
   - Verify all 4 test categories show PASS
   - Check overall status shows "READY FOR ROLLOUT"

3. **Individual Tests**
   - Click "Test Flags Only" → Should show flag system status
   - Click "Test Modules Only" → Should show module loading results
   - Click "Test Components Only" → Should show component instantiation

4. **Manual Console Testing**
   ```javascript
   // Test individual components
   window.phase7.testFlags()
   window.phase7.testModules() 
   window.phase7.testComponents()
   
   // Access modules directly
   window.phase7.HiFeedAPI.getUnifiedFeed('test-user')
   window.phase7.HiFlags.isEnabled('hifeed_enabled')
   
   // View results
   window.phase7VerificationResults
   ```

## Critical Success Criteria

1. **Production Isolation**: `/public/dev/phase7/` directory completely separate from production paths
2. **ESM Module System**: All imports working without CommonJS globals
3. **Flag System Dual Verification**: Both feature flag systems returning `true`
4. **Component Instantiation**: Both UI components can be created without errors
5. **Feed API Functional**: Unified feed returns valid data structure
6. **Performance Threshold**: Under 3 second total verification time

## Troubleshooting

### If Redirect Fails
- Check browser console for JavaScript errors
- Verify `?dev=1` parameter is in URL
- Clear browser cache and retry

### If ESM Imports Fail
- Check Network tab for 404 errors on module files
- Verify server is serving from project root
- Check file paths are absolute (start with `/`)

### If Components Fail to Initialize
- Check for missing dependencies
- Verify HiFlags is properly initialized before component creation
- Look for DOM-related errors in console

## Expected Timeline
- **Auto Test**: 2-3 seconds total
- **Manual Testing**: 5-10 minutes for comprehensive verification
- **Debug Session**: 15-30 minutes if issues found

## Next Steps After PASS
1. Review `window.phase7VerificationResults` object
2. Validate all systems show PASS status
3. Proceed with confidence to Phase 8 or deployment consideration
4. Archive verification results for audit trail

---
**HI DEV Protocol**: This isolated verification system ensures zero contamination of production paths while providing comprehensive ESM module testing capability.