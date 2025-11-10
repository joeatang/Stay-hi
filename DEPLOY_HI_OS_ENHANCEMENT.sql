-- 🚀 HI OS ECOSYSTEM: Minimal Database Functions
-- SURGICAL DEPLOYMENT: Adds Hi OS tracking without disrupting existing systems
-- Deploy after DEPLOY_GOLD_STANDARD_MANUAL.sql has been successfully run

-- 🔧 STEP 1: Create user activity tracking (optional enhancement)
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced BOOLEAN DEFAULT TRUE
);

-- 🔧 STEP 2: Create milestones table (gamification layer)
CREATE TABLE IF NOT EXISTS user_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  milestone_type TEXT NOT NULL, -- 'total_his_10', 'daily_streak_7', etc.
  milestone_title TEXT NOT NULL,
  milestone_description TEXT,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_shown BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, milestone_type)
);

-- 🔧 STEP 3: Hi OS activity tracking function (non-disruptive)
CREATE OR REPLACE FUNCTION track_user_activity(
  user_id UUID,
  activity_type TEXT,
  activity_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert activity log (helps with analytics and achievements)
  INSERT INTO user_activity_log (user_id, activity_type, activity_data)
  VALUES (user_id, activity_type, activity_data);
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  -- Never fail - Hi OS is enhancement only
  RETURN FALSE;
END;
$$;

-- 🔧 STEP 4: Milestone checking function
CREATE OR REPLACE FUNCTION check_user_milestones(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_submissions INTEGER;
  new_milestones JSONB DEFAULT '[]';
  milestone_record RECORD;
BEGIN
  -- Get user's total submissions from activity log
  SELECT COUNT(*) INTO total_submissions
  FROM user_activity_log 
  WHERE user_id = check_user_milestones.user_id 
    AND activity_type = 'share_submission';
  
  -- Check for milestone achievements (progressive system)
  FOR milestone_record IN 
    WITH milestones AS (
      SELECT 
        CASE 
          WHEN total_submissions >= 1 AND NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = check_user_milestones.user_id AND milestone_type = 'first_share') 
            THEN ('first_share', 'First Hi Shared! 🎉', 'You shared your first Hi moment')
          WHEN total_submissions >= 5 AND NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = check_user_milestones.user_id AND milestone_type = 'hi_sharer') 
            THEN ('hi_sharer', 'Hi Sharer 🌟', 'Shared 5 Hi moments with the community')
          WHEN total_submissions >= 10 AND NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = check_user_milestones.user_id AND milestone_type = 'hi_enthusiast') 
            THEN ('hi_enthusiast', 'Hi Enthusiast 🚀', 'Shared 10 Hi moments - you''re on fire!')
          WHEN total_submissions >= 25 AND NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = check_user_milestones.user_id AND milestone_type = 'hi_champion') 
            THEN ('hi_champion', 'Hi Champion 👑', 'Shared 25 Hi moments - community leader!')
          WHEN total_submissions >= 50 AND NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = check_user_milestones.user_id AND milestone_type = 'hi_legend') 
            THEN ('hi_legend', 'Hi Legend 🏆', 'Shared 50 Hi moments - absolute legend!')
        END as milestone
    )
    SELECT milestone 
    FROM milestones 
    WHERE milestone IS NOT NULL
  LOOP
    -- Insert new milestone
    INSERT INTO user_milestones (user_id, milestone_type, milestone_title, milestone_description)
    VALUES (user_id, milestone_record.milestone.f1, milestone_record.milestone.f2, milestone_record.milestone.f3);
    
    -- Add to return array
    new_milestones = new_milestones || jsonb_build_object(
      'type', milestone_record.milestone.f1,
      'title', milestone_record.milestone.f2,
      'description', milestone_record.milestone.f3,
      'achieved_at', NOW()
    );
  END LOOP;
  
  RETURN new_milestones;
  
EXCEPTION WHEN OTHERS THEN
  -- Never fail - return empty array
  RETURN '[]'::JSONB;
END;
$$;

-- 🔧 STEP 5: Grant permissions (non-disruptive)
GRANT SELECT, INSERT ON user_activity_log TO authenticated;
GRANT SELECT, INSERT ON user_milestones TO authenticated;
GRANT EXECUTE ON FUNCTION track_user_activity(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_milestones(UUID) TO authenticated;

-- Enable RLS (security)
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies (users can only see their own data)
CREATE POLICY "Users can view own activity" ON user_activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON user_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own milestones" ON user_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones" ON user_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 🧪 STEP 6: Test Hi OS functions (optional)
-- SELECT track_user_activity(auth.uid(), 'test_activity', '{"test": true}');
-- SELECT check_user_milestones(auth.uid());

-- ✅ DEPLOYMENT COMPLETE
SELECT 'Hi OS Enhancement Layer database functions deployed successfully' as status;