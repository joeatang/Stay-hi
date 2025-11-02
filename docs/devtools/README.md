# 🔧 Hi App Developer Tools

**Development-only debugging tools for the Hi App**  
**Environment**: Local development only (not for production)  
**Last Updated**: 2025-11-01  

---

## HiFlags Diagnostics Tool

### Quick Console Loader

To attach HiFlags debugging to the browser console during development:

```javascript
import('/devtools/HiFlagsDiag.js');
```

### Usage After Loading

Once loaded, you'll have access to these global debugging tools:

```javascript
// Show all flags in a nice table
hiFlags.debug();

// Check individual flags
hiFlags.getFlag('hi_map_animation');
hiFlags.isEnabled('referrals_enabled');

// Direct class access
HiFlags.prototype.someMethod;

// Get all flags data
hiFlags.getAllFlags();
```

### Console Output Example

```
🔧 HiFlagsDiag attached - window.HiFlags and window.hiFlags now available
💡 Try: hiFlags.debug() or HiFlags.isEnabled("flag_name")

> hiFlags.debug()
🚩 HiFlags Debug Information
┌─────────────────────┬─────────┬──────────────────────────────────┬──────────┐
│        (index)      │ enabled │            description           │  source  │
├─────────────────────┼─────────┼──────────────────────────────────┼──────────┤
│  hi_map_animation   │  true   │ 'Enable animated map interactions'│ fallback │
│ premium_ux_effects  │  true   │ 'Enable glassmorphism styling'   │ fallback │
│ referrals_enabled   │  false  │ 'Enable referral code system'   │ fallback │
│ token_rewire_mode   │  false  │ 'Enable design token CSS vars'  │ fallback │
│monitoring_analytics │  true   │ 'Enable HiMonitor tracking'     │ fallback │
└─────────────────────┴─────────┴──────────────────────────────────┴──────────┘
📊 Total flags: 5
🔧 Available methods:
  • hiFlags.getFlag(name, default)
  • hiFlags.isEnabled(name)
  • hiFlags.getAllFlags()
  • hiFlags.debug() (this method)
```

---

## Automatic Dev Loading (Local Only)

For convenience during development, you can add `?dev=1` to any local URL:

```
http://localhost:3030/public/welcome.html?dev=1
```

This automatically loads the diagnostics tool when:
- Running on `localhost` or `127.0.0.1`
- URL contains `?dev=1` parameter
- Does NOT affect production deployments

### Implementation

The auto-loader is implemented as a guarded script in `welcome.html`:

```javascript
<script type="module">
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const params = new URLSearchParams(location.search);
  if (isLocal && params.has('dev')) {
    import('/devtools/HiFlagsDiag.js');
  }
</script>
```

---

## Safety Features

### Production Protection
- **Hostname Gate**: Only loads on `localhost` or `127.0.0.1`
- **Parameter Gate**: Requires explicit `?dev=1` parameter
- **No Auto-Loading**: Never loads automatically in production
- **Import-Only**: Must be manually imported or URL parameter added

### Development Benefits
- **Console Access**: Easy flag debugging without module imports
- **Visual Tables**: Formatted flag status display
- **Method Discovery**: List of available debugging functions
- **Real-time Testing**: Modify and test flags during development

---

## File Structure

```
/devtools/
├── HiFlagsDiag.js          # Main diagnostics tool
└── README.md               # This documentation

/docs/devtools/
├── README.md               # Usage documentation
└── (future tools...)       # Additional dev tools
```

---

## Troubleshooting

### "HiFlagsDiag not found"
- Ensure you're running on localhost
- Check that `/devtools/` path is accessible from your dev server
- Verify the import path: `import('/devtools/HiFlagsDiag.js')`

### "window.hiFlags undefined"
- Run the import command first: `import('/devtools/HiFlagsDiag.js')`
- Wait for the "HiFlagsDiag attached" console message
- Check if HiFlags module loaded successfully

### "getAllFlags is not a function"
- This indicates HiFlags class didn't initialize properly
- Check console for HiFlags loading errors
- Verify Supabase connection (flags may fall back to local JSON)

---

## Best Practices

### Development Workflow
1. **Start local server**: `python3 -m http.server 3030`
2. **Open with dev flag**: `http://localhost:3030/public/welcome.html?dev=1`
3. **Wait for auto-load**: Look for "HiFlagsDiag attached" message
4. **Debug flags**: Use `hiFlags.debug()` in console

### Manual Loading
```javascript
// In browser console during development
import('/devtools/HiFlagsDiag.js').then(() => {
  console.log('Dev tools loaded');
  hiFlags.debug();
});
```

### Flag Testing
```javascript
// Test flag changes
hiFlags.getFlag('new_feature', false);

// Check flag sources (remote vs fallback)
hiFlags.getAllFlags();

// Monitor flag evaluation
hiFlags.debug();
```

---

*Development Tools | Local Only | Zero Production Impact*