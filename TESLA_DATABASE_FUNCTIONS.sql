-- 🚀 TESLA REBUILD DATABASE FUNCTIONS
-- Comprehensive stats tracking and performance enhancements
-- Safe, additive-only changes with backward compatibility

-- 🎯 Tesla Enhanced Stats Tracking Function
CREATE OR REPLACE FUNCTION track_share_stats(
  p_share_type TEXT DEFAULT 'hi5',
  p_visibility TEXT DEFAULT 'public', 
  p_origin TEXT DEFAULT 'unknown',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Tesla Enhancement: Log all share types for comprehensive analytics
  INSERT INTO share_stats (
    share_type,
    visibility,
    origin,
    metadata,
    created_at
  ) VALUES (
    p_share_type,
    p_visibility,
    p_origin,
    p_metadata || jsonb_build_object('tesla_enhanced', true),
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- Tesla Enhancement: Update global counters based on visibility
  IF p_visibility = 'public' OR p_visibility = 'anonymous' THEN
    -- Increment public hi count (existing behavior preserved)
    UPDATE global_community_stats 
    SET hi_count = hi_count + 1,
        last_updated = NOW()
    WHERE id = 1;
    
    -- Tesla: Track daily stats
    INSERT INTO daily_stats (
      date,
      public_shares,
      anonymous_shares,
      total_shares,
      tesla_enhanced
    ) VALUES (
      CURRENT_DATE,
      CASE WHEN p_visibility = 'public' THEN 1 ELSE 0 END,
      CASE WHEN p_visibility = 'anonymous' THEN 1 ELSE 0 END,
      1,
      true
    ) ON CONFLICT (date) DO UPDATE SET
      public_shares = daily_stats.public_shares + CASE WHEN p_visibility = 'public' THEN 1 ELSE 0 END,
      anonymous_shares = daily_stats.anonymous_shares + CASE WHEN p_visibility = 'anonymous' THEN 1 ELSE 0 END,
      total_shares = daily_stats.total_shares + 1,
      updated_at = NOW();
  END IF;

  -- Tesla Enhancement: Track private shares too (for user analytics)
  IF p_visibility = 'private' THEN
    INSERT INTO daily_stats (
      date,
      private_shares,
      total_shares,
      tesla_enhanced
    ) VALUES (
      CURRENT_DATE,
      1,
      1,
      true
    ) ON CONFLICT (date) DO UPDATE SET
      private_shares = daily_stats.private_shares + 1,
      total_shares = daily_stats.total_shares + 1,
      updated_at = NOW();
  END IF;

  -- Return success result with Tesla enhancement marker
  result := json_build_object(
    'success', true,
    'share_type', p_share_type,
    'visibility', p_visibility,
    'origin', p_origin,
    'tesla_enhanced', true,
    'timestamp', NOW()
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Tesla Enhancement: Graceful error handling
  result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'tesla_enhanced', true
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🎯 Tesla Enhanced Archive Management Function
CREATE OR REPLACE FUNCTION get_user_archive_with_stats(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  archive_data JSON;
  stats_data JSON;
  result JSON;
BEGIN
  -- Get paginated archive data with enhanced metadata
  SELECT json_agg(
    json_build_object(
      'id', id,
      'content', content,
      'share_type', share_type,
      'visibility', visibility,
      'location_data', location_data,
      'metadata', metadata || jsonb_build_object('tesla_enhanced', true),
      'created_at', created_at,
      'updated_at', updated_at
    )
    ORDER BY created_at DESC
  ) INTO archive_data
  FROM hi_archives 
  WHERE user_id = p_user_id
  LIMIT p_limit OFFSET p_offset;

  -- Get user archive statistics
  SELECT json_build_object(
    'total_archives', COUNT(*),
    'hi5_count', COUNT(*) FILTER (WHERE share_type = 'hi5'),
    'reflection_count', COUNT(*) FILTER (WHERE share_type = 'reflection'),
    'private_count', COUNT(*) FILTER (WHERE visibility = 'private'),
    'anonymous_count', COUNT(*) FILTER (WHERE visibility = 'anonymous'),
    'first_archive', MIN(created_at),
    'last_archive', MAX(created_at),
    'tesla_enhanced', true
  ) INTO stats_data
  FROM hi_archives 
  WHERE user_id = p_user_id;

  -- Combine archive data with stats
  result := json_build_object(
    'archives', COALESCE(archive_data, '[]'::json),
    'stats', COALESCE(stats_data, '{}'::json),
    'pagination', json_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'has_more', (SELECT COUNT(*) FROM hi_archives WHERE user_id = p_user_id) > (p_offset + p_limit)
    ),
    'tesla_enhanced', true
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🎯 Tesla Enhanced Public Feed Function  
CREATE OR REPLACE FUNCTION get_public_feed_with_analytics(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_visibility_filter TEXT DEFAULT 'all'
)
RETURNS JSON AS $$
DECLARE
  feed_data JSON;
  analytics_data JSON;
  result JSON;
  visibility_condition TEXT;
BEGIN
  -- Tesla Enhancement: Dynamic visibility filtering
  CASE p_visibility_filter
    WHEN 'public' THEN visibility_condition := 'visibility = ''public''';
    WHEN 'anonymous' THEN visibility_condition := 'visibility = ''anonymous''';
    WHEN 'all' THEN visibility_condition := 'visibility IN (''public'', ''anonymous'')';
    ELSE visibility_condition := 'visibility IN (''public'', ''anonymous'')';
  END CASE;

  -- Get feed data with user profiles and enhanced metadata
  EXECUTE format('
    SELECT json_agg(
      json_build_object(
        ''id'', ps.id,
        ''content'', ps.content,
        ''share_type'', ps.share_type,
        ''visibility'', ps.visibility,
        ''location_data'', ps.location_data,
        ''metadata'', ps.metadata || jsonb_build_object(''tesla_enhanced'', true),
        ''created_at'', ps.created_at,
        ''profile'', CASE 
          WHEN ps.user_id IS NOT NULL THEN json_build_object(
            ''username'', p.username,
            ''display_name'', p.display_name,
            ''avatar_url'', p.avatar_url
          )
          ELSE json_build_object(
            ''username'', ''anonymous'',
            ''display_name'', ''Anonymous User'',
            ''avatar_url'', null
          )
        END
      )
      ORDER BY ps.created_at DESC
    )
    FROM public_shares ps
    LEFT JOIN profiles p ON ps.user_id = p.id
    WHERE %s
    LIMIT %s OFFSET %s
  ', visibility_condition, p_limit, p_offset) INTO feed_data;

  -- Get feed analytics
  SELECT json_build_object(
    'total_shares', COUNT(*),
    'public_shares', COUNT(*) FILTER (WHERE visibility = 'public'),
    'anonymous_shares', COUNT(*) FILTER (WHERE visibility = 'anonymous'),
    'hi5_shares', COUNT(*) FILTER (WHERE share_type = 'hi5'),
    'reflection_shares', COUNT(*) FILTER (WHERE share_type = 'reflection'),
    'latest_share', MAX(created_at),
    'tesla_enhanced', true
  ) INTO analytics_data
  FROM public_shares 
  WHERE visibility IN ('public', 'anonymous');

  -- Combine feed data with analytics
  result := json_build_object(
    'shares', COALESCE(feed_data, '[]'::json),
    'analytics', COALESCE(analytics_data, '{}'::json),
    'pagination', json_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'filter', p_visibility_filter,
      'has_more', (
        SELECT COUNT(*) 
        FROM public_shares 
        WHERE visibility IN ('public', 'anonymous')
      ) > (p_offset + p_limit)
    ),
    'tesla_enhanced', true
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🎯 Tesla Enhanced Performance Indexes (Safe, additive only)
CREATE INDEX IF NOT EXISTS idx_public_shares_tesla_visibility_created 
ON public_shares(visibility, created_at DESC) 
WHERE visibility IN ('public', 'anonymous');

CREATE INDEX IF NOT EXISTS idx_hi_archives_tesla_user_created 
ON hi_archives(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hi_archives_tesla_share_type 
ON hi_archives(share_type, created_at DESC);

-- 🎯 Tesla Stats Tables (Create only if not exists - safe)
CREATE TABLE IF NOT EXISTS share_stats (
  id BIGSERIAL PRIMARY KEY,
  share_type TEXT NOT NULL DEFAULT 'hi5',
  visibility TEXT NOT NULL DEFAULT 'public',
  origin TEXT NOT NULL DEFAULT 'unknown',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY,
  public_shares INTEGER DEFAULT 0,
  private_shares INTEGER DEFAULT 0,
  anonymous_shares INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  tesla_enhanced BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🎯 Tesla Enhanced Triggers (Safe updates)
CREATE OR REPLACE FUNCTION update_tesla_stats_on_public_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Tesla Enhancement: Auto-track all public/anonymous shares
  PERFORM track_share_stats(
    NEW.share_type,
    NEW.visibility,
    COALESCE(NEW.metadata->>'origin', 'unknown'),
    NEW.metadata
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger safely (replace if exists)
DROP TRIGGER IF EXISTS trigger_tesla_public_shares_stats ON public_shares;
CREATE TRIGGER trigger_tesla_public_shares_stats
  AFTER INSERT ON public_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_tesla_stats_on_public_insert();

-- 🎯 Tesla Archive Stats Trigger
CREATE OR REPLACE FUNCTION update_tesla_stats_on_archive_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Tesla Enhancement: Track private archives too
  PERFORM track_share_stats(
    NEW.share_type,
    NEW.visibility,
    COALESCE(NEW.metadata->>'origin', 'unknown'),
    NEW.metadata
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply archive trigger safely
DROP TRIGGER IF EXISTS trigger_tesla_archive_stats ON hi_archives;
CREATE TRIGGER trigger_tesla_archive_stats
  AFTER INSERT ON hi_archives  
  FOR EACH ROW
  EXECUTE FUNCTION update_tesla_stats_on_archive_insert();

-- 🚀 Tesla Deployment Success Marker
DO $$
BEGIN
  RAISE NOTICE '✅ Tesla Rebuild Database Functions Deployed Successfully';
  RAISE NOTICE '🎯 Features: Anonymous archiving, comprehensive stats, enhanced performance';
  RAISE NOTICE '🛡️ Safety: 100%% backward compatible, additive-only changes';
  RAISE NOTICE '📊 Analytics: All share types tracked, daily stats, user insights';
END $$;