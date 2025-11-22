-- ========================================
-- 🔧 FINAL FIX v2: use_invite_code with email lookup
-- ========================================

DROP FUNCTION IF EXISTS use_invite_code(text, uuid);

CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID) RETURNS JSONB AS $$
DECLARE
  v_code_id UUID;
  v_grants_tier TEXT;
  v_trial_days INTEGER;
  v_membership_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get code details and lock the row for update
  SELECT id, grants_tier, trial_days
  INTO v_code_id, v_grants_tier, v_trial_days
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  -- Verify code exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found');
  END IF;

  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email not found');
  END IF;

  -- Increment usage count
  UPDATE invitation_codes
  SET 
    current_uses = current_uses + 1,
    last_used_at = NOW()
  WHERE id = v_code_id;

  -- CRITICAL FIX: Ensure public.users table entry exists with email
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (p_user_id, v_user_email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email, updated_at = NOW();

  -- Create membership record if tier is granted
  IF v_grants_tier IS NOT NULL THEN
    INSERT INTO user_memberships (
      user_id, 
      tier, 
      status, 
      invitation_code, 
      trial_start,
      trial_end,
      trial_days_total,
      created_at, 
      updated_at
    )
    VALUES (
      p_user_id, 
      v_grants_tier, 
      'active', 
      p_code, 
      NOW(),
      NOW() + (v_trial_days || ' days')::INTERVAL,
      v_trial_days,
      NOW(), 
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      tier = EXCLUDED.tier, 
      status = EXCLUDED.status, 
      invitation_code = EXCLUDED.invitation_code,
      trial_start = EXCLUDED.trial_start,
      trial_end = EXCLUDED.trial_end,
      trial_days_total = EXCLUDED.trial_days_total,
      updated_at = NOW()
    RETURNING id INTO v_membership_id;
  END IF;

  -- Log the transaction
  INSERT INTO membership_transactions (
    user_id, 
    membership_id,
    transaction_type, 
    description,
    metadata,
    created_at
  )
  VALUES (
    p_user_id,
    v_membership_id,
    'invite_code_redemption',
    'Account created via invite code: ' || p_code,
    jsonb_build_object(
      'invitation_code_id', v_code_id,
      'granted_tier', v_grants_tier,
      'trial_days', v_trial_days,
      'email', v_user_email
    ),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'code_id', v_code_id, 'tier', v_grants_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION use_invite_code(TEXT, UUID) TO authenticated;

SELECT 'use_invite_code function fixed - includes email lookup!' AS status;
