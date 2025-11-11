-- ========================================
-- 🎯 TESLA-GRADE STAN-HI OS INTEGRATION 
-- Unified 5-Tier System with Perfect Price Psychology
-- ========================================

-- Enhanced hi_members table for Stan integration
ALTER TABLE hi_members 
ADD COLUMN IF NOT EXISTS stan_customer_id TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'paused', 'cancelled', 'expired')),
ADD COLUMN IF NOT EXISTS conversion_source TEXT; -- '24hr_trial', 'direct_signup', 'invite_code'

-- Stan pricing tier mapping
CREATE OR REPLACE VIEW stan_tier_mapping AS
SELECT 
  price_usd,
  tier_level,
  tier_name,
  tier_description,
  capabilities
FROM (VALUES
  (5.55, 1, 'Starter', 'Full Hi access with core features', ARRAY['drop_hi', 'view_archive', 'create_profile', 'share_public']),
  (15.55, 2, 'Enhanced', 'Premium analytics and trend insights', ARRAY['drop_hi', 'view_archive', 'create_profile', 'share_public', 'view_trends', 'premium_analytics']),
  (55.55, 3, 'Collective', 'Exclusive access and VIP features', ARRAY['drop_hi', 'view_archive', 'create_profile', 'share_public', 'view_trends', 'premium_analytics', 'view_hi_show', 'beta_access'])
) AS stan_tiers(price_usd, tier_level, tier_name, tier_description, capabilities);

-- ========================================
-- 🚀 ENHANCED STAN WEBHOOK PROCESSOR
-- ========================================

CREATE OR REPLACE FUNCTION process_stan_purchase_v2(
  p_customer_email TEXT,
  p_customer_name TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL,
  p_stan_customer_id TEXT DEFAULT NULL,
  p_stan_transaction_id TEXT DEFAULT NULL,
  p_billing_cycle TEXT DEFAULT 'monthly'
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
  v_target_tier INTEGER;
  v_tier_name TEXT;
  v_expiry_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Step 1: Determine tier based on amount
  SELECT tier_level, tier_name INTO v_target_tier, v_tier_name
  FROM stan_tier_mapping 
  WHERE price_usd = p_amount
  LIMIT 1;
  
  IF v_target_tier IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid subscription amount',
      'amount', p_amount
    );
  END IF;
  
  -- Step 2: Calculate expiry based on billing cycle
  v_expiry_date := CASE p_billing_cycle
    WHEN 'monthly' THEN NOW() + INTERVAL '1 month'
    WHEN 'yearly' THEN NOW() + INTERVAL '1 year'
    WHEN 'lifetime' THEN NOW() + INTERVAL '100 years' -- Effectively permanent
    ELSE NOW() + INTERVAL '1 month'
  END;
  
  -- Step 3: Get or create user
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = p_customer_email;
  
  IF v_user_id IS NULL THEN
    -- For webhook, we'll create a pending membership record
    -- User will be created when they first authenticate
    INSERT INTO hi_pending_memberships (
      email,
      target_tier,
      stan_customer_id,
      subscription_amount,
      subscription_start,
      tier_expires_at,
      billing_cycle,
      subscription_status,
      conversion_source,
      created_at
    ) VALUES (
      p_customer_email,
      v_target_tier,
      p_stan_customer_id,
      p_amount,
      NOW(),
      v_expiry_date,
      p_billing_cycle,
      'active',
      'stan_purchase',
      NOW()
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Pending membership created for new user',
      'email', p_customer_email,
      'tier', v_target_tier,
      'expires_at', v_expiry_date
    );
  END IF;
  
  -- Step 4: Update existing member
  UPDATE hi_members SET
    access_tier = v_target_tier,
    tier_expires_at = v_expiry_date,
    stan_customer_id = p_stan_customer_id,
    subscription_amount = p_amount,
    subscription_start = NOW(),
    subscription_status = 'active',
    billing_cycle = p_billing_cycle,
    conversion_source = COALESCE(conversion_source, 'stan_purchase'),
    tier_upgraded_at = NOW(),
    membership_tier = v_tier_name,
    tier_history = COALESCE(tier_history, '[]'::jsonb) || jsonb_build_object(
      'timestamp', NOW(),
      'action', 'stan_purchase',
      'from_tier', access_tier,
      'to_tier', v_target_tier,
      'amount', p_amount,
      'billing_cycle', p_billing_cycle,
      'stan_transaction_id', p_stan_transaction_id
    )
  WHERE user_id = v_user_id
  RETURNING id INTO v_member_id;
  
  -- Step 5: Create membership transaction record
  INSERT INTO hi_membership_transactions (
    member_id,
    transaction_type,
    amount,
    currency,
    payment_method,
    stan_transaction_id,
    stan_customer_id,
    tier_granted,
    metadata,
    created_at
  ) VALUES (
    v_member_id,
    'subscription_purchase',
    p_amount,
    'USD',
    'stan_platform',
    p_stan_transaction_id,
    p_stan_customer_id,
    v_target_tier,
    jsonb_build_object(
      'billing_cycle', p_billing_cycle,
      'tier_name', v_tier_name,
      'customer_name', p_customer_name
    ),
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Membership upgraded successfully',
    'member_id', v_member_id,
    'tier', v_target_tier,
    'tier_name', v_tier_name,
    'expires_at', v_expiry_date,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 📊 STAN CONVERSION TRACKING TABLES
-- ========================================

-- Pending memberships for users who haven't signed up yet
CREATE TABLE IF NOT EXISTS hi_pending_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  target_tier INTEGER NOT NULL,
  stan_customer_id TEXT,
  subscription_amount DECIMAL(10,2),
  subscription_start TIMESTAMPTZ,
  tier_expires_at TIMESTAMPTZ,
  billing_cycle TEXT,
  subscription_status TEXT,
  conversion_source TEXT,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membership transaction history
CREATE TABLE IF NOT EXISTS hi_membership_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES hi_members(id),
  transaction_type TEXT NOT NULL, -- 'subscription_purchase', 'renewal', 'upgrade', 'downgrade', 'cancellation'
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  payment_method TEXT, -- 'stan_platform', 'stripe', 'paypal'
  stan_transaction_id TEXT,
  stan_customer_id TEXT,
  tier_granted INTEGER,
  tier_previous INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 🎯 CONVERSION FUNNEL FUNCTIONS
-- ========================================

-- Function to claim pending membership when user signs up
CREATE OR REPLACE FUNCTION claim_pending_membership(p_user_id UUID, p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_record hi_pending_memberships%ROWTYPE;
BEGIN
  -- Check for pending membership
  SELECT * INTO v_pending_record
  FROM hi_pending_memberships
  WHERE email = p_email AND claimed_at IS NULL;
  
  IF FOUND THEN
    -- Update member with pending membership data
    UPDATE hi_members SET
      access_tier = v_pending_record.target_tier,
      tier_expires_at = v_pending_record.tier_expires_at,
      stan_customer_id = v_pending_record.stan_customer_id,
      subscription_amount = v_pending_record.subscription_amount,
      subscription_start = v_pending_record.subscription_start,
      subscription_status = v_pending_record.subscription_status,
      billing_cycle = v_pending_record.billing_cycle,
      conversion_source = v_pending_record.conversion_source,
      tier_upgraded_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Mark pending membership as claimed
    UPDATE hi_pending_memberships SET
      claimed_at = NOW(),
      claimed_by = p_user_id
    WHERE id = v_pending_record.id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track conversion from 24hr trial to Stan subscription
CREATE OR REPLACE FUNCTION track_stan_conversion(
  p_member_id UUID,
  p_source_code TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE hi_members SET
    conversion_source = CASE 
      WHEN p_source_code LIKE 'HI24%' THEN '24hr_trial'
      WHEN p_source_code IS NOT NULL THEN 'invite_code'
      ELSE 'direct_signup'
    END,
    tier_history = COALESCE(tier_history, '[]'::jsonb) || jsonb_build_object(
      'timestamp', NOW(),
      'action', 'conversion_tracked',
      'source_code', p_source_code,
      'conversion_type', CASE 
        WHEN p_source_code LIKE 'HI24%' THEN '24hr_trial_conversion'
        ELSE 'direct_conversion'
      END
    )
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 📈 ANALYTICS VIEWS FOR STAN INTEGRATION
-- ========================================

-- Stan subscription analytics
CREATE OR REPLACE VIEW stan_subscription_analytics AS
SELECT 
  subscription_amount as price_tier,
  COUNT(*) as subscriber_count,
  SUM(subscription_amount) as monthly_revenue,
  AVG(subscription_amount) as avg_subscription_value,
  COUNT(CASE WHEN conversion_source = '24hr_trial' THEN 1 END) as trial_conversions,
  COUNT(CASE WHEN conversion_source = 'direct_signup' THEN 1 END) as direct_signups,
  ROUND(
    (COUNT(CASE WHEN conversion_source = '24hr_trial' THEN 1 END)::FLOAT / 
     NULLIF(COUNT(*), 0)) * 100, 2
  ) as trial_conversion_rate_percent
FROM hi_members 
WHERE subscription_status = 'active' 
  AND subscription_amount IS NOT NULL
GROUP BY subscription_amount
ORDER BY subscription_amount;

-- Conversion funnel analysis
CREATE OR REPLACE VIEW stan_conversion_funnel AS
WITH funnel_stages AS (
  -- Stage 1: 24hr trial codes used
  SELECT 'trial_activated' as stage, COUNT(*) as count
  FROM hi_members WHERE conversion_source = '24hr_trial'
  
  UNION ALL
  
  -- Stage 2: Trial users who subscribed
  SELECT 'trial_converted' as stage, COUNT(*) as count
  FROM hi_members 
  WHERE conversion_source = '24hr_trial' 
    AND subscription_status = 'active'
  
  UNION ALL
  
  -- Stage 3: Total active subscribers
  SELECT 'total_subscribers' as stage, COUNT(*) as count
  FROM hi_members WHERE subscription_status = 'active'
)
SELECT 
  stage,
  count,
  LAG(count) OVER (ORDER BY 
    CASE stage 
      WHEN 'trial_activated' THEN 1
      WHEN 'trial_converted' THEN 2  
      WHEN 'total_subscribers' THEN 3
    END
  ) as previous_stage_count,
  CASE 
    WHEN LAG(count) OVER (ORDER BY 
      CASE stage 
        WHEN 'trial_activated' THEN 1
        WHEN 'trial_converted' THEN 2
        WHEN 'total_subscribers' THEN 3  
      END
    ) > 0 THEN
      ROUND((count::FLOAT / LAG(count) OVER (ORDER BY 
        CASE stage
          WHEN 'trial_activated' THEN 1
          WHEN 'trial_converted' THEN 2
          WHEN 'total_subscribers' THEN 3
        END
      )) * 100, 2)
    ELSE NULL
  END as conversion_rate_percent
FROM funnel_stages;

-- ========================================
-- 🔄 MIGRATION AND SETUP COMMENTS
-- ========================================

/*
TESLA-GRADE STAN INTEGRATION SUMMARY:

1. **Unified Tier System**: Stan subscriptions map directly to Hi OS tiers
   - $5.55 → Tier 1 (Starter) 
   - $15.55 → Tier 2 (Enhanced)
   - $55.55 → Tier 3 (Collective)

2. **Seamless Conversion Flow**: 
   - Anonymous → 24hr trial → Stan subscription
   - All tracked in single membership system

3. **Advanced Analytics**:
   - Conversion funnel tracking
   - Revenue analytics by tier
   - Trial-to-paid conversion rates

4. **Pending Memberships**: 
   - Handle Stan purchases before user signup
   - Automatic claim when user authenticates

DEPLOYMENT CHECKLIST:
□ Run this SQL on production Supabase
□ Update Stan webhook endpoint to use process_stan_purchase_v2()
□ Configure Stan product IDs to send correct amounts
□ Test conversion flow: trial → subscription
□ Verify analytics views return expected data

TESLA-GRADE BENEFITS:
✅ Single source of truth for all memberships
✅ Real-time tier updates across all Hi apps  
✅ Perfect conversion funnel optimization
✅ Comprehensive revenue and user analytics
✅ Bulletproof pending membership system
*/