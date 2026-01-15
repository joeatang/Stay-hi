-- ============================================================================
-- HI POINTS SYSTEM - PHASE 7: REDEMPTION TABLE
-- ============================================================================
-- Purpose: Future-ready table for spending points on rewards
-- 
-- Supported redemption types (future):
--   - 'comment'  : Leave a comment on a share (50 pts)
--   - 'merch'    : Store credit (1000 pts = $1)
--   - 'feature'  : Unlock premium feature temporarily
--   - 'boost'    : Boost share visibility (250 pts)
--   - 'frame'    : Custom avatar frame (500 pts)
--
-- This table is created now for architecture but functions will be added later
-- ============================================================================

-- Create redemption tracking table
CREATE TABLE IF NOT EXISTS public.hi_points_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  points_spent bigint NOT NULL CHECK (points_spent > 0),
  redemption_type text NOT NULL,
  
  -- Item/feature details
  item_id text,                    -- Reference to specific item (merch SKU, feature key, etc.)
  item_details jsonb DEFAULT '{}', -- Full details (size, color, address for merch, etc.)
  
  -- Status tracking
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  
  -- Audit trail
  ledger_entry_id bigint,          -- Reference to hi_points_ledger entry (for debit)
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  refunded_at timestamptz
);

-- Add comments for documentation
COMMENT ON TABLE public.hi_points_redemptions IS 'Tracks point redemptions for rewards (merch, features, comments, etc.)';
COMMENT ON COLUMN public.hi_points_redemptions.redemption_type IS 'Type: comment, merch, feature, boost, frame';
COMMENT ON COLUMN public.hi_points_redemptions.status IS 'pending=processing, completed=done, refunded=points returned, failed=error';

-- Enable RLS
ALTER TABLE public.hi_points_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own redemptions
CREATE POLICY IF NOT EXISTS "hi_points_redemptions_select_self" 
  ON public.hi_points_redemptions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Service role can manage all records
CREATE POLICY IF NOT EXISTS "hi_points_redemptions_all_service" 
  ON public.hi_points_redemptions 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hi_points_redemptions_user 
  ON public.hi_points_redemptions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hi_points_redemptions_type 
  ON public.hi_points_redemptions(redemption_type);

CREATE INDEX IF NOT EXISTS idx_hi_points_redemptions_status 
  ON public.hi_points_redemptions(status) 
  WHERE status = 'pending';

-- ============================================================================
-- PLACEHOLDER: Future spend_points() function
-- This will be implemented when redemption features go live
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION public.spend_points(
  p_amount bigint,
  p_redemption_type text,
  p_item_id text DEFAULT NULL,
  p_item_details jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_balance bigint;
  v_redemption_id uuid;
BEGIN
  -- Check balance >= amount
  SELECT balance INTO v_current_balance FROM hi_points WHERE user_id = v_user_id;
  
  IF COALESCE(v_current_balance, 0) < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'insufficient_balance',
      'balance', v_current_balance,
      'required', p_amount
    );
  END IF;
  
  -- Debit points (negative delta)
  PERFORM hi_award_points(v_user_id, -p_amount, 'redemption_' || p_redemption_type, p_item_details::text);
  
  -- Record redemption
  INSERT INTO hi_points_redemptions (user_id, points_spent, redemption_type, item_id, item_details, status, completed_at)
  VALUES (v_user_id, p_amount, p_redemption_type, p_item_id, p_item_details, 'completed', now())
  RETURNING id INTO v_redemption_id;
  
  -- Get new balance
  SELECT balance INTO v_current_balance FROM hi_points WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'points_spent', p_amount,
    'new_balance', v_current_balance
  );
END;
$$;
*/

-- ============================================================================
-- REDEMPTION PRICING REFERENCE (for future implementation)
-- ============================================================================
-- CREATE TABLE IF NOT EXISTS public.hi_points_redemption_catalog (
--   item_key text PRIMARY KEY,
--   display_name text NOT NULL,
--   description text,
--   point_cost bigint NOT NULL,
--   redemption_type text NOT NULL,
--   is_active boolean DEFAULT true,
--   metadata jsonb DEFAULT '{}'
-- );
-- 
-- INSERT INTO hi_points_redemption_catalog VALUES
--   ('comment_unlock', 'Unlock Comments', 'Leave one comment on any share', 50, 'comment', true, '{}'),
--   ('merch_credit_1', '$1 Store Credit', 'Redeem for merchandise', 1000, 'merch', true, '{}'),
--   ('boost_24h', '24h Share Boost', 'Feature your share for 24 hours', 250, 'boost', true, '{}'),
--   ('frame_gold', 'Gold Avatar Frame', 'Premium gold profile frame', 500, 'frame', true, '{}');

-- ============================================================================
-- VERIFICATION QUERIES (run after deployment)
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'hi_points_redemptions' ORDER BY ordinal_position;
-- Expected: 10 columns

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS public.hi_points_redemptions CASCADE;
