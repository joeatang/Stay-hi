-- ========================================
-- 🚀 TESLA STAN INTEGRATION WEBHOOK
-- Supabase Edge Function for Stan→Hi Collective Bridge
-- ========================================

-- CREATE WEBHOOK PROCESSING FUNCTION
CREATE OR REPLACE FUNCTION process_stan_purchase(
  p_customer_email TEXT,
  p_customer_name TEXT DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL,
  p_stan_customer_id TEXT DEFAULT NULL,
  p_stan_transaction_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_membership_id UUID;
  v_invitation_code TEXT;
  v_trial_days INTEGER := 30; -- Default 30-day trial for Stan customers
  v_result JSONB;
BEGIN
  -- Step 1: Check if user already exists in auth.users
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = p_customer_email;
  
  -- Step 2: Create or update membership record
  INSERT INTO user_memberships (
    user_id,
    tier,
    status,
    trial_start,
    trial_end,
    trial_days_total,
    subscription_status,
    subscription_start,
    features_enabled,
    created_at
  ) VALUES (
    v_user_id,
    'premium', -- Stan customers get premium access
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    v_trial_days,
    'active',
    NOW(),
    ARRAY['basic_hi', 'location_sharing', 'premium_features'],
    NOW()
  ) 
  ON CONFLICT (user_id) DO UPDATE SET
    tier = 'premium',
    status = 'active',
    subscription_status = 'active',
    subscription_start = NOW(),
    features_enabled = ARRAY['basic_hi', 'location_sharing', 'premium_features'],
    updated_at = NOW()
  RETURNING id INTO v_membership_id;
  
  -- Step 3: Generate unique invitation code for Stan customer
  v_invitation_code := 'STAN-' || UPPER(SUBSTR(MD5(p_customer_email || NOW()::TEXT), 1, 8));
  
  INSERT INTO invitation_codes (
    code,
    code_type,
    trial_days,
    grants_tier,
    max_uses,
    current_uses,
    valid_until,
    features_granted,
    metadata,
    created_at
  ) VALUES (
    v_invitation_code,
    'stan_purchase',
    v_trial_days,
    'premium',
    1, -- Single use
    0,
    NOW() + INTERVAL '7 days', -- Code expires in 7 days
    ARRAY['basic_hi', 'location_sharing', 'premium_features'],
    jsonb_build_object(
      'stan_customer_id', p_stan_customer_id,
      'stan_transaction_id', p_stan_transaction_id,
      'customer_email', p_customer_email,
      'product_name', p_product_name,
      'amount', p_amount
    ),
    NOW()
  );
  
  -- Step 4: Record transaction for audit trail
  INSERT INTO membership_transactions (
    user_id,
    membership_id,
    transaction_type,
    amount,
    currency,
    payment_method,
    external_transaction_id,
    metadata,
    processed_at
  ) VALUES (
    v_user_id,
    v_membership_id,
    'stan_purchase',
    p_amount,
    'USD',
    'stan_store',
    p_stan_transaction_id,
    jsonb_build_object(
      'platform', 'stan_store',
      'customer_name', p_customer_name,
      'product_name', p_product_name,
      'invitation_code', v_invitation_code
    ),
    NOW()
  );
  
  -- Step 5: Return success response with invitation code
  v_result := jsonb_build_object(
    'success', true,
    'invitation_code', v_invitation_code,
    'customer_email', p_customer_email,
    'membership_tier', 'premium',
    'trial_days', v_trial_days,
    'expires_at', (NOW() + INTERVAL '7 days')::TEXT,
    'message', 'Stan purchase processed successfully'
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- Error handling
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'customer_email', p_customer_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_stan_purchase TO anon, authenticated;

-- ========================================
-- 🔧 WEBHOOK ENDPOINT SIMULATION
-- Test this function before Zapier integration
-- ========================================

-- Test Example:
-- SELECT process_stan_purchase(
--   'customer@example.com',
--   'John Doe',
--   'Hi Collective Premium Membership',
--   29.99,
--   'stan_cust_123',
--   'stan_txn_456'
-- );