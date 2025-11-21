-- ========================================
-- 🔐 RESET ADMIN PASSWORD
-- Run this in Supabase SQL Editor to set a password
-- ========================================

-- Option 1: Update via Supabase Dashboard (RECOMMENDED)
-- Go to: Authentication > Users > Find joeatang7@gmail.com > Reset Password
-- OR use "Send Magic Link" to set a new password via email

-- Option 2: Generate password reset link (run in SQL)
-- This generates a recovery link you can use
SELECT auth.gen_recovery_link('joeatang7@gmail.com');

-- The result will be a recovery URL like:
-- https://gfcubvroxgfvjhacinic.supabase.co/auth/v1/verify?token=...&type=recovery
-- Open that URL to set a new password

-- ========================================
-- 📝 RECOMMENDED: Add password auth to test page
-- After setting password, use the test-admin-auth.html page
-- ========================================
