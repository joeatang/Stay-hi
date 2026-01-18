#!/bin/bash
# Test Session Persistence Fix - Phone Sleep Simulation

echo "🧪 SESSION PERSISTENCE TEST"
echo "=========================="
echo ""
echo "📋 Testing URL-based navigation detection"
echo ""

# Start dev server if not running
if ! lsof -ti:3030 > /dev/null 2>&1; then
  echo "🚀 Starting dev server..."
  python3 -m http.server 3030 > /dev/null 2>&1 &
  sleep 2
fi

echo "✅ Dev server running on http://localhost:3030"
echo ""
echo "🧪 TEST SCENARIOS:"
echo ""
echo "1️⃣  PHONE SLEEP/WAKE (Should preserve session)"
echo "   → Open: http://localhost:3030/hi-dashboard.html"
echo "   → Sign in"
echo "   → Open Chrome DevTools Console"
echo "   → Switch to different tab (simulate phone sleep)"
echo "   → Wait 5 seconds"
echo "   → Switch back to Hi-OS tab"
echo "   → EXPECTED in console:"
echo "      [HiSupabase] 📱 Phone wake detected (URL unchanged) - preserving client ✅"
echo "      [AuthReady] 📱 Phone wake detected (URL unchanged) - preserving auth state ✅"
echo ""

echo "2️⃣  BACK/FORWARD NAV (Should clear + recreate)"
echo "   → From dashboard, click Profile"
echo "   → Press browser back button"
echo "   → EXPECTED in console:"
echo "      [HiSupabase] 🔥 Return navigation detected (URL changed) - clearing stale client"
echo "      [AuthReady] ✅ BFCache navigation (URL changed) - resetting stale state"
echo ""

echo "3️⃣  MOBILE SIMULATION (Chrome DevTools)"
echo "   → Open DevTools (Cmd+Opt+I)"
echo "   → Toggle device toolbar (Cmd+Shift+M)"
echo "   → Select iPhone 13 Pro"
echo "   → Application tab → Background Fetch"
echo "   → Test phone lock/unlock simulation"
echo ""

echo "📱 For REAL DEVICE testing:"
echo "   → Deploy to production (Vercel)"
echo "   → Open on iPhone Safari: https://hi.degenmentality.com/hi-dashboard.html"
echo "   → Sign in"
echo "   → Lock phone (power button)"
echo "   → Wait 1 minute"
echo "   → Unlock phone"
echo "   → Return to Safari"
echo "   → Should NOT be signed out ✅"
echo ""

echo "🔍 MONITORING COMMANDS:"
echo "   tail -f /tmp/hi-session-test.log  (if logging added)"
echo "   Chrome → chrome://inspect → Devices (for mobile debugging)"
echo ""

echo "🎯 SUCCESS CRITERIA:"
echo "   ✅ Tab switching preserves session (no sign-out)"
echo "   ✅ Phone lock/unlock preserves session"
echo "   ✅ Back/forward navigation still clears stale client"
echo "   ✅ No 'restoring from localStorage' messages on wake"
echo "   ✅ Fast return (< 200ms) - no restoration delay"
echo ""

echo "Ready to test! Open browser now:"
echo "http://localhost:3030/hi-dashboard.html"
