-- ============================================================================
-- 🔥 EMERGENCY FIX: Anonymous shares broken by streak fix trigger
-- ============================================================================
-- Root cause: trigger_update_stats_on_share() runs even for NULL user_id
-- Solution: Skip stats update when user_id IS NULL (anonymous shares)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_stats_on_share()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 🔥 FIX: Only update stats for authenticated users (skip anonymous)
    IF NEW.user_id IS NOT NULL THEN
      PERFORM update_user_stats_from_public_shares(NEW.user_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 🔥 FIX: Only update stats for authenticated users (skip anonymous)
    IF OLD.user_id IS NOT NULL THEN
      PERFORM update_user_stats_from_public_shares(OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Also fix check-in trigger (same issue could occur)
CREATE OR REPLACE FUNCTION trigger_update_stats_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check-ins always have user_id, but be safe
    IF NEW.user_id IS NOT NULL THEN
      PERFORM update_user_stats_from_public_shares(NEW.user_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      PERFORM update_user_stats_from_public_shares(OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ✅ Test: Try creating an anonymous share - should work now
-- SELECT create_public_share('Test anonymous', 'anonymous', 'test');
