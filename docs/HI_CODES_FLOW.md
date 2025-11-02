# HI CODES FLOW — Server-Safe Referral System with Gift Integration

**System**: Hi App Referral Codes  
**Security**: Server-generated codes only (no client minting)  
**Integration**: Stan signups + "Gift a Hi" use same secure backend

## Overview

Hi App uses a unified, server-safe referral system that handles both traditional referral sharing and gift-giving flows through the same secure backend infrastructure.

## Schema Architecture

```sql
-- Extended referrals table with gift system support
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(12) NOT NULL UNIQUE,          -- Server-generated code
    type VARCHAR(20) NOT NULL,                 -- 'signup' or 'gift'
    issued_by UUID REFERENCES profiles(id),    -- User who created referral
    redeemed_by UUID REFERENCES profiles(id),  -- User who redeemed (nullable)
    status VARCHAR(20) DEFAULT 'active',       -- 'active', 'redeemed', 'expired'
    recipient_email VARCHAR(255),              -- For gift type referrals
    expires_at TIMESTAMP WITH TIME ZONE,       -- Expiration timestamp
    created_at TIMESTAMP DEFAULT NOW(),
    redeemed_at TIMESTAMP
);
```

## Flow Patterns

### 1. Stan Signup Flow (Traditional Referral)

```javascript
// User Stan wants to share Hi with friends
const referral = await HiBase.referrals.createReferral({
    type: 'signup',
    issued_by: stanUserId,
    expires_hours: 168 // 7 days
});

// Share URL: https://hi.app/welcome.html?ref=HI2K8X4M9P
const shareUrl = `${baseUrl}/welcome.html?ref=${referral.code}`;
```

### 2. Gift a Hi Flow 

```javascript
// User wants to gift Hi to a specific person
const giftData = await HiBase.referrals.giftHi({
    fromUserId: currentUser.id,
    toEmail: 'friend@example.com',
    message: 'I think you\'ll love this mindfulness app!'
});

// Gift URL: https://hi.app/welcome.html?gift=HG7N2M4K8L
// Email sent to recipient with personalized message
```

## Server Functions (Supabase)

### create_referral_code()

```sql
CREATE OR REPLACE FUNCTION create_referral_code(
    referral_type TEXT,
    issuer_id UUID,
    recipient_email TEXT DEFAULT NULL,
    expires_hours INTEGER DEFAULT 168
) RETURNS JSON AS $$
DECLARE
    new_code TEXT;
    referral_record RECORD;
BEGIN
    -- Generate cryptographically secure code
    new_code := generate_referral_code(referral_type);
    
    -- Insert referral record
    INSERT INTO referrals (
        code, type, issued_by, recipient_email, expires_at
    ) VALUES (
        new_code, 
        referral_type, 
        issuer_id, 
        recipient_email,
        NOW() + (expires_hours || ' hours')::INTERVAL
    ) RETURNING * INTO referral_record;
    
    -- Return with issuer info for gift personalization
    RETURN json_build_object(
        'code', referral_record.code,
        'type', referral_record.type,
        'expires_at', referral_record.expires_at,
        'issuer_name', (SELECT display_name FROM profiles WHERE id = issuer_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### redeem_referral_code()

```sql
CREATE OR REPLACE FUNCTION redeem_referral_code(
    referral_code TEXT,
    redeemer_id UUID
) RETURNS JSON AS $$
DECLARE
    referral_record RECORD;
    rewards RECORD;
BEGIN
    -- Validate and update referral
    UPDATE referrals 
    SET status = 'redeemed', 
        redeemed_by = redeemer_id,
        redeemed_at = NOW()
    WHERE code = UPPER(referral_code)
      AND status = 'active'
      AND expires_at > NOW()
    RETURNING * INTO referral_record;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Invalid or expired code');
    END IF;
    
    -- Process rewards (points, streak freezes, etc.)
    SELECT * INTO rewards FROM process_referral_rewards(
        referral_record.issued_by, 
        redeemer_id,
        referral_record.type
    );
    
    RETURN json_build_object(
        'success', true,
        'rewards', rewards.redeemer_rewards,
        'referrer_rewards', rewards.referrer_rewards
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## HiBase API Usage

### Creating Referrals

```javascript
// Traditional referral for sharing
const signupReferral = await HiBase.referrals.createReferral({
    type: 'signup',
    issued_by: userId
});

// Gift referral with email targeting
const giftReferral = await HiBase.referrals.createReferral({
    type: 'gift',
    issued_by: userId,
    recipient_email: 'friend@example.com',
    expires_hours: 720 // 30 days for gifts
});

// Gift helper (recommended)
const giftData = await HiBase.referrals.giftHi({
    fromUserId: userId,
    toEmail: 'friend@example.com',
    message: 'Check out this amazing app!'
});
```

### Redeeming Codes

```javascript
// When user signs up with ?ref=CODE or ?gift=CODE
const urlParams = new URLSearchParams(window.location.search);
const referralCode = urlParams.get('ref') || urlParams.get('gift');

if (referralCode && currentUser) {
    try {
        const result = await HiBase.referrals.redeemCode({
            code: referralCode,
            redeemed_by: currentUser.id
        });
        
        // Show rewards UI
        showWelcomeRewards(result.rewards);
        
    } catch (error) {
        console.log('Referral code invalid or expired');
    }
}
```

## Feature Flag Integration

```javascript
// Check if HiBase referrals are enabled
const useHiBaseReferrals = HiFlags.isEnabled('hibase_referrals_enabled');

if (useHiBaseReferrals) {
    // Use HiBase.referrals.*
    const referral = await HiBase.referrals.createReferral(params);
} else {
    // Fall back to legacy system
    const referral = await createLegacyReferral(params);
}
```

## Security Features

### Server-Side Code Generation
- Codes generated using cryptographically secure random functions
- No client-side minting prevents code prediction attacks
- Unique constraint prevents duplicates

### Validation & Expiration
- Server validates all codes before redemption
- Automatic expiration based on timestamp
- One-time use enforcement (status tracking)

### Gift System Security
- Email association prevents code sharing abuse
- Longer expiration for gifts (30 days vs 7 days)
- Sender identification for personalization

## URL Patterns

| Type | URL Pattern | Usage |
|------|-------------|--------|
| Signup Referral | `/welcome.html?ref=HI2K8X4M9P` | General sharing |
| Gift Referral | `/welcome.html?gift=HG7N2M4K8L` | Targeted gifts |
| Deep Link | `/app?onboard=gift&code=HG...` | Mobile app integration |

## Analytics & Tracking

```javascript
// Track referral events
HiMonitor.trackEvent('referral_created', {
    type: referral.type,
    code: referral.code,
    issued_by: referral.issued_by
});

HiMonitor.trackEvent('referral_redeemed', {
    code: referral.code,
    type: referral.type,
    rewards_given: result.rewards
});
```

## Migration Strategy

1. **Phase 1**: Deploy HiBase referrals with `hibase_referrals_enabled=false`
2. **Phase 2**: Enable flag for beta users to test gift system
3. **Phase 3**: Full rollout with legacy system fallback
4. **Phase 4**: Remove legacy code after validation period

## Testing Scenarios

### Development Testing
```javascript
// Console testing
await HiFlags.toggle('hibase_referrals_enabled', true);

// Create test referral
const test = await HiBase.referrals.createReferral({
    type: 'gift',
    issued_by: 'test-user-id',
    recipient_email: 'test@example.com'
});

console.log('Test gift code:', test.code);
```

### Production Validation
- Monitor referral creation/redemption rates
- Compare HiBase vs legacy performance metrics
- Track gift flow conversion rates
- Validate email delivery for gift referrals

---

**Result**: Unified, secure referral system supporting both Stan signup sharing and targeted gift-giving through the same server-safe infrastructure.