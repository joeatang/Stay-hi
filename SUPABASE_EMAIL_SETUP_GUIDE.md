# 📧 Supabase Email Setup Guide - Password Reset Not Working

**Issue**: User submitted password reset request but no email arrived  
**Date**: December 3, 2025  
**Status**: 🔧 Configuration Check Required

---

## 🚨 IMMEDIATE DIAGNOSIS

If password reset emails are not arriving, it means **Supabase email configuration needs to be set up or verified**.

### Quick Check (2 minutes):
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `gfcubvroxgfvjhacinic`
3. Navigate to: **Authentication** → **Settings** → **SMTP Settings**
4. Check if SMTP is configured

---

## 🎯 GOLD STANDARD EMAIL SETUP

### Option 1: Use Supabase's Default Email (Fastest)

**Supabase provides free email service for auth flows**, but it has limitations:

1. Go to: **Authentication** → **Settings**
2. Scroll to "Email Auth"
3. Ensure these are **ENABLED**:
   - ✅ Enable email provider
   - ✅ Confirm email
   - ✅ Secure email change

**Limitations**:
- May be flagged as spam
- Slower delivery (2-5 minutes)
- Limited customization

---

### Option 2: Configure Custom SMTP (Production-Grade) ⭐ RECOMMENDED

Use a dedicated email service for reliable delivery:

#### **A. Using SendGrid (Free Tier: 100 emails/day)**

1. **Sign up for SendGrid**:
   - Go to https://sendgrid.com
   - Create free account
   - Verify your domain or use single sender verification

2. **Get SMTP Credentials**:
   - Navigate to: Settings → API Keys
   - Create new API key with "Mail Send" permissions
   - Copy the API key (this is your SMTP password)
   
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: <your-api-key>
   ```

3. **Configure in Supabase**:
   - Go to: **Authentication** → **Settings** → **SMTP Settings**
   - Click "Enable Custom SMTP"
   - Enter:
     ```
     Sender email: noreply@yourdomain.com
     Sender name: Stay Hi
     Host: smtp.sendgrid.net
     Port: 587
     Username: apikey
     Password: <your-sendgrid-api-key>
     ```
   - Click "Save"

#### **B. Using Resend (Modern, Developer-Friendly)**

1. **Sign up for Resend**:
   - Go to https://resend.com
   - Create free account (100 emails/day)
   - Verify your domain

2. **Get API Key**:
   - Navigate to: API Keys
   - Create new API key
   - Copy the key

3. **Configure in Supabase**:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: <your-resend-api-key>
   ```

#### **C. Using Gmail (Quick Setup, Not Recommended for Production)**

1. **Enable 2-Step Verification** on your Gmail account
2. **Generate App Password**:
   - Go to: Google Account → Security → 2-Step Verification → App passwords
   - Create password for "Mail"
   - Copy the 16-character password

3. **Configure in Supabase**:
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: your-gmail@gmail.com
   Password: <app-password>
   ```

**⚠️ Warning**: Gmail may flag emails as spam, and has daily sending limits

---

## 📝 EMAIL TEMPLATE CONFIGURATION

After SMTP is configured, update email templates:

### 1. Navigate to Email Templates
**Path**: Authentication → Email Templates → Password Recovery

### 2. Update Template (Gold Standard)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui;
      background: linear-gradient(135deg, #2d1e4f 0%, #ff7a18 60%, #ffd166 100%);
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(135deg, #FFD166 0%, #FF7B24 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-align: center;
      margin-bottom: 24px;
    }
    h1 {
      color: #2d1e4f;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #FFD166 0%, #FF7B24 100%);
      color: #2d1e4f;
      font-weight: 700;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      margin: 24px 0;
    }
    .footer {
      color: #718096;
      font-size: 14px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Stay Hi</div>
    <h1>Reset Your Password</h1>
    <p>Hi there! 👋</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
    <p><strong>⏰ This link expires in 1 hour</strong></p>
    <p>If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.</p>
    <div class="footer">
      <p>Need help? Reply to this email or contact support.</p>
      <p>© Stay Hi - Mindful Wellness</p>
    </div>
  </div>
</body>
</html>
```

### 3. Configure Redirect URL

**CRITICAL**: The `{{ .ConfirmationURL }}` must redirect correctly.

In Supabase Dashboard → Authentication → URL Configuration:

**Add these to "Redirect URLs"**:
```
https://your-production-domain.com/reset-password.html
http://localhost:3030/reset-password.html
```

---

## 🧪 TESTING EMAIL DELIVERY

### Test 1: Check SMTP Connection
```bash
# Test SMTP connectivity
telnet smtp.sendgrid.net 587
# If successful, you'll see: "220 smtp.sendgrid.net ESMTP"
```

### Test 2: Send Test Email from Supabase
1. Go to: **Authentication** → **Settings** → **SMTP Settings**
2. Click "Send Test Email"
3. Check your inbox

### Test 3: Test Password Reset Flow
1. Go to your app's forgot-password page
2. Enter your email
3. Click "Send Reset Link"
4. Check inbox (should arrive within 30 seconds if SMTP configured correctly)

---

## 🔍 COMMON ISSUES & FIXES

### Issue 1: Email Goes to Spam
**Fix**:
- Add SPF, DKIM, DMARC records to your domain
- Use verified sending domain in email service
- Avoid spam trigger words in subject/body

### Issue 2: Emails Delayed (5+ minutes)
**Fix**:
- Default Supabase email is slow - switch to custom SMTP
- Use SendGrid or Resend for faster delivery

### Issue 3: No Error, But No Email
**Fix**:
- Check Supabase logs: **Dashboard → Logs → Auth**
- Verify SMTP credentials are correct
- Check daily sending limits haven't been exceeded

### Issue 4: "SMTP Authentication Failed"
**Fix**:
- Re-generate SMTP credentials
- Ensure username/password are correct
- Check if 2FA/App Password is required (Gmail)

---

## 📊 RECOMMENDED SOLUTION FOR PRODUCTION

**Best Option**: Use **Resend** or **SendGrid**

**Why**:
- ✅ 99.9% delivery rate
- ✅ Fast (emails arrive in seconds)
- ✅ Free tier sufficient for most apps
- ✅ Professional email templates
- ✅ Detailed delivery analytics

**Setup Time**: ~10 minutes  
**Cost**: Free for <100 emails/day

---

## 🚀 IMMEDIATE ACTION ITEMS

1. **Right Now** (5 min):
   - [ ] Log into Supabase Dashboard
   - [ ] Navigate to Authentication → Settings → SMTP
   - [ ] Check if SMTP is configured
   - [ ] If not, choose an email service (Resend recommended)

2. **Next** (10 min):
   - [ ] Sign up for email service (Resend/SendGrid)
   - [ ] Get SMTP credentials
   - [ ] Configure in Supabase
   - [ ] Send test email

3. **Verify** (2 min):
   - [ ] Test password reset flow
   - [ ] Confirm email arrives within 30 seconds
   - [ ] Check email appears in inbox (not spam)

---

## 💡 GOLD STANDARD USER EXPERIENCE

**What Users See** (with fixes deployed):

1. **Immediate Feedback**:
   - ✅ "Reset link sent! Check your inbox"
   - 📬 "Check spam folder if you don't see it in 2-3 minutes"

2. **After 30 Seconds** (automatic):
   - Shows troubleshooting tips
   - "Email not arriving?" section appears
   - Offers retry button

3. **If Email Delayed**:
   - Clear instructions to wait 2-3 minutes
   - Explains spam folder check
   - Easy retry option

**This matches your brand**: Mindful, helpful, efficient, no stress

---

## 📞 NEED HELP?

If emails still aren't working after SMTP setup:

1. **Check Supabase Logs**:
   - Dashboard → Logs → Auth
   - Look for email-related errors

2. **Verify Email Service**:
   - Log into SendGrid/Resend dashboard
   - Check "Activity" tab for delivery status

3. **Test Alternative**:
   - Try different email address (work email, personal email)
   - Some corporate email servers block automated emails

---

## ✅ SUCCESS CHECKLIST

- [ ] SMTP configured in Supabase
- [ ] Email template updated
- [ ] Redirect URLs added
- [ ] Test email sent successfully
- [ ] Password reset flow tested end-to-end
- [ ] Emails arriving within 30 seconds
- [ ] Emails in inbox (not spam)
- [ ] UI improvements deployed (30-second troubleshooting tips)

---

**Status**: Once SMTP is configured, password reset emails will work perfectly!

**Timeline**: 
- Setup: 10-15 minutes
- Testing: 2-3 minutes
- User Impact: Immediate improvement in email delivery
