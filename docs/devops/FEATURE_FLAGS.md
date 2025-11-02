# 🚩 Hi App Feature Flags System

**Tesla-Grade Feature Management**: Controlled rollouts with zero-downtime deployments  
**Philosophy**: Ship fast, fail safe, iterate quickly  
**Last Updated**: 2025-11-01  

---

## Overview

The HiFlags system enables controlled feature rollouts, A/B testing, and emergency feature toggles without code deployments. Built with Tesla-grade reliability and graceful degradation.

### Key Benefits
- **Zero Downtime**: Toggle features without deployment
- **Risk Mitigation**: Quick rollback via flag toggle
- **A/B Testing**: Gradual user rollouts
- **Emergency Control**: Instant feature disable
- **Offline Resilience**: Local fallback when remote unavailable

---

## Database Schema

### hi_flags Table Definition
```sql
CREATE TABLE hi_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  target_percentage INTEGER DEFAULT 100 CHECK (target_percentage BETWEEN 0 AND 100),
  user_groups TEXT[], -- For targeted rollouts
  environment TEXT DEFAULT 'all' -- 'dev', 'preview', 'prod', 'all'
);

-- Create indexes for performance
CREATE INDEX idx_hi_flags_enabled ON hi_flags(enabled);
CREATE INDEX idx_hi_flags_environment ON hi_flags(environment);
CREATE INDEX idx_hi_flags_updated ON hi_flags(last_updated);

-- Enable RLS for security
ALTER TABLE hi_flags ENABLE ROW LEVEL SECURITY;

-- Admin read access
CREATE POLICY "flags_admin_read" ON hi_flags
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  current_setting('role') = 'service_role'
);

-- Public read access (for client-side flags)
CREATE POLICY "flags_public_read" ON hi_flags  
FOR SELECT USING (
  environment IN ('all', 'prod') AND
  flag_name NOT LIKE 'admin_%'
);

-- Admin write access only
CREATE POLICY "flags_admin_write" ON hi_flags
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  current_setting('role') = 'service_role'
);
```

---

## Current Feature Flags

### Core System Flags

| Flag Name | Default | Description | Phase |
|-----------|---------|-------------|-------|
| `referrals_enabled` | `false` | Enable referral code system and rewards | Post-MVP |
| `token_rewire_mode` | `false` | Enable design token CSS variable system | Post-MVP |
| `hi_map_animation` | `true` | Enable animated map interactions | MVP |
| `premium_ux_effects` | `true` | Enable glassmorphism and premium styling | MVP |
| `monitoring_analytics` | `true` | Enable HiMonitor tracking and analytics | MVP |

### Experimental Flags

| Flag Name | Default | Description | Phase |
|-----------|---------|-------------|-------|
| `offline_mode` | `false` | Enable service worker offline functionality | Post-MVP |
| `beta_features` | `false` | Enable experimental features for beta users | Post-MVP |
| `ai_recommendations` | `false` | Enable AI-powered content recommendations | Future |
| `real_time_chat` | `false` | Enable real-time user communication | Future |

---

## Usage Patterns

### Client-Side Usage
```javascript
// Check if feature is enabled
if (HiFlags.isEnabled('premium_ux_effects')) {
  // Apply glassmorphism styling
  applyPremiumEffects();
}

// Get flag with default fallback
const animationsEnabled = HiFlags.getFlag('hi_map_animation', true);

// Conditional feature loading
if (HiFlags.isEnabled('monitoring_analytics')) {
  HiMonitor.trackEvent('page_view', { page: 'dashboard' });
}

// Get detailed flag information
const flagDetails = HiFlags.getFlagDetails('referrals_enabled');
console.log('Referrals flag:', flagDetails);
```

### Server-Side Usage (API Routes)
```javascript
// In API route or server function
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFeatureFlag(flagName) {
  const { data, error } = await supabase
    .from('hi_flags')
    .select('enabled')
    .eq('flag_name', flagName)
    .single();
    
  return data?.enabled || false;
}

// Usage in API handler
export default async function handler(req, res) {
  const referralsEnabled = await checkFeatureFlag('referrals_enabled');
  
  if (!referralsEnabled) {
    return res.status(404).json({ error: 'Feature not available' });
  }
  
  // Process referral logic...
}
```

### CSS Feature Detection
```css
/* Conditional styling based on flags */
.premium-effects[data-flag-premium="true"] {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.1);
}

.map-container[data-flag-animations="false"] .marker {
  transition: none;
}
```

---

## Administration

### Flag Management Functions

#### Create New Flag
```sql
-- Insert new feature flag
INSERT INTO hi_flags (flag_name, enabled, description, environment)
VALUES ('new_feature_name', false, 'Description of new feature', 'prod');
```

#### Enable Feature for Gradual Rollout
```sql
-- Start with 10% of users
UPDATE hi_flags 
SET enabled = true, 
    target_percentage = 10,
    last_updated = NOW()
WHERE flag_name = 'new_feature_name';

-- Increase to 50% after monitoring
UPDATE hi_flags 
SET target_percentage = 50,
    last_updated = NOW()
WHERE flag_name = 'new_feature_name';

-- Full rollout (100%)
UPDATE hi_flags 
SET target_percentage = 100,
    last_updated = NOW()
WHERE flag_name = 'new_feature_name';
```

#### Emergency Disable
```sql
-- Instant feature disable
UPDATE hi_flags 
SET enabled = false,
    last_updated = NOW(),
    updated_by = auth.uid()
WHERE flag_name = 'problematic_feature';
```

### Admin Dashboard Queries

#### Active Flags Summary
```sql
SELECT 
  flag_name,
  enabled,
  target_percentage,
  environment,
  last_updated
FROM hi_flags 
WHERE enabled = true
ORDER BY last_updated DESC;
```

#### Flag Usage Analytics
```sql
-- Track flag evaluations (requires custom logging)
SELECT 
  flag_name,
  COUNT(*) as evaluations,
  COUNT(CASE WHEN enabled THEN 1 END) as enabled_evaluations
FROM flag_evaluation_log 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY flag_name
ORDER BY evaluations DESC;
```

---

## Rollout Strategies

### Strategy 1: Gradual Percentage Rollout
1. **Start**: 0% - Flag disabled for all users
2. **Test**: 5% - Enable for small test group
3. **Expand**: 25% - Broader testing if metrics good
4. **Scale**: 75% - Majority rollout
5. **Complete**: 100% - Full deployment

### Strategy 2: Environment-Based Rollout  
1. **Dev**: Enable in development environment first
2. **Preview**: Deploy to preview/staging environment
3. **Canary**: Enable for beta users in production
4. **Production**: Full production rollout

### Strategy 3: User Group Rollout
1. **Internal**: Enable for team members only
2. **Beta Users**: Enable for opted-in beta testers  
3. **Premium Users**: Enable for paying customers first
4. **All Users**: Complete rollout

---

## Monitoring & Alerting

### Flag Performance Metrics
- **Evaluation Rate**: How often flags are checked
- **Error Rate**: Flag evaluation failures
- **Response Time**: Flag lookup performance
- **Cache Hit Rate**: Local vs remote flag fetches

### Alert Conditions
- **High Error Rate**: >5% flag evaluation failures
- **Slow Response**: Flag lookups >100ms
- **Missing Flags**: Requests for undefined flags
- **Emergency Toggles**: Admin emergency disables

### Monitoring Queries
```sql
-- Flag evaluation performance
SELECT 
  flag_name,
  AVG(evaluation_time_ms) as avg_time,
  COUNT(*) as total_evaluations,
  COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as error_count
FROM flag_performance_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY flag_name;
```

---

## Best Practices

### Flag Naming Convention
- **Feature Flags**: `feature_name_enabled` (e.g., `referrals_enabled`)
- **Experiment Flags**: `experiment_name_variant` (e.g., `signup_flow_v2`)
- **Kill Switches**: `system_name_disabled` (e.g., `payments_disabled`)
- **Admin Flags**: `admin_feature_name` (e.g., `admin_debug_mode`)

### Code Integration
- **Default Safe**: Always provide safe fallback values
- **Non-Blocking**: Flag evaluation must not block user experience
- **Consistent**: Use same flag names across client/server
- **Documented**: Document flag purpose and lifecycle

### Lifecycle Management
- **Temporary**: Most flags should be temporary (remove after rollout)
- **Permanent**: Only keep long-term operational flags
- **Cleanup**: Regular audit and removal of unused flags
- **Documentation**: Update docs when adding/removing flags

---

## Emergency Procedures

### Emergency Feature Disable
1. **Access Supabase Dashboard** → Database → SQL Editor
2. **Run emergency disable**:
   ```sql
   UPDATE hi_flags 
   SET enabled = false 
   WHERE flag_name = 'problematic_feature';
   ```
3. **Verify change** - flags update in real-time
4. **Monitor impact** - check error rates decrease

### Flag System Recovery
```sql
-- If flag system fails, disable all experimental flags
UPDATE hi_flags 
SET enabled = false 
WHERE flag_name LIKE '%_experiment%' 
   OR flag_name LIKE '%_beta%'
   OR environment != 'prod';
```

---

*Feature Flag System | Tesla-Grade Reliability | Zero-Downtime Deployments*