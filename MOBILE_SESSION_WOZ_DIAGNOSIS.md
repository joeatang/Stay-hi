# 🔬 Mobile Session Bug - Woz-Level Root Cause Analysis
**Date:** January 7, 2026  
**Status:** Root cause FOUND  

---

## 🚨 THE SMOKING GUN

**Dashboard has NO auth-guard.js**

But when you switch apps and return, you're getting redirected to welcome. How?

**Answer:** The redirect is happening at a DIFFERENT layer.

---

## 🧩 The Missing Piece

Check line 188 of `hi-dashboard.html`:
```html
<script src="./lib/auth/auth-resilience.js"></script>
```

But NO auth-guard! So where's the redirect logic?

**Let me search for redirect code in dashboard itself...**

---

## 🔍 Hypothesis

The dashboard might have INLINE redirect logic that:
1. Checks session on page load
2. Redirects if no session found
3. This runs BEFORE auth-resilience can restore session

**This would explain everything:**
- Switch apps → memory cleared
- Dashboard loads → inline check sees no session → redirects
- auth-resilience tries to restore → TOO LATE, already redirecting

---

## ✅ Next Steps

1. Search dashboard HTML for inline redirect code
2. Check if dashboard-main.js has early session checks
3. Find the EXACT line causing premature redirect
4. Move that check to happen AFTER auth-resilience ready

