-- ========================================
-- 🔧 FIX: Update use_invite_code function only
-- ========================================

DROP FUNCTION IF EXISTS use_invite_code(text, uuid);

CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID) RETURNS JSONB AS $$
DECLARE
  v_code_id UUID;
  v_grants_tier TEXT;
  v_trial_days INTEGER;
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

  -- Increment usage count
  UPDATE invitation_codes
  SET 
    current_uses = current_uses + 1,
    last_used_at = NOW()
  WHERE id = v_code_id;

  -- Create membership record if tier is granted (simplified - no started_at/expires_at)
  IF v_grants_tier IS NOT NULL THEN
    INSERT INTO user_memberships (user_id, tier, status)
    VALUES (
      p_user_id,
      v_grants_tier,
      'active'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      tier = EXCLUDED.tier,
      status = EXCLUDED.status;
  END IF;

  -- Log the transaction
  INSERT INTO membership_transactions (user_id, transaction_type, tier, invitation_code_id)
  VALUES (p_user_id, 'invite_code_redemption', v_grants_tier, v_code_id);

  RETURN jsonb_build_object('success', true, 'code_id', v_code_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION use_invite_code(TEXT, UUID) TO authenticated;

SELECT 'use_invite_code function updated successfully!' AS status;
