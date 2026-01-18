# 📊 Hi-OS Analytics v2.0 — Implementation Gameplan

**Date:** January 18, 2026  
**Philosophy:** Measure practice (effort) + feeling (Hi Scale) = Authentic inspiration  
**Constraints:** Honor v1.1.0 simplicity, maintain code quality, respect user data  

---

## 🎯 YOUR CONCERNS ADDRESSED

### **1. Social Metrics (Community Impact) — MINIMAL** ✅

**Your stance:** "Not that important as the goal isn't for this to be a social app per se."

**My approach:**
- **✂️ CUT**: Reciprocity scores, "consistent tappers", conversation tracking
- **✂️ CUT**: "People you inspired" counts
- **✅ KEEP (minimal)**: "Your most inspiring shares" (top 3 by taps) — shows resonance without making it competitive
- **✅ KEEP**: Total taps given (generosity metric, not leaderboard)

**Result:** Analytics focus on YOUR journey (practice + feeling), not social comparison.

---

### **2. Gaps & Coverage — COMPREHENSIVE** ✅

**What's measured:**

| Dimension | What | Why |
|-----------|------|-----|
| **Practice** | Shares, taps, check-ins, Hi Gym visits, streak | Shows effort/consistency |
| **Feeling** | Hi Scale (1-5 daily rating) | Shows actual inspiration level |
| **Timing** | Peak activity hours, best/worst days | Reveals personal patterns |
| **Impact** | Hi Index (practice × feeling), personal progress | Balances objective + subjective |
| **Recovery** | Bounce-back time after low days | Resilience metric |
| **Correlations** | What helps YOU (sharing boost, gym effect) | Actionable insights |

**Gaps filled:**
- ✅ Emotional journey (not just activity counts)
- ✅ Time-of-day patterns (when you feel best)
- ✅ Weekly rhythm (Tuesdays vs Thursdays)
- ✅ Streak resilience (return behavior after breaks)
- ✅ Personalized insights (what works for YOU)

---

### **3. Tier-Gated Delivery — DILIGENT** ✅

**Bronze / Hi Friend (Free):**
- ✅ Last 7 days only
- ✅ Basic emotional journey (line chart)
- ✅ Current streak + share count
- ✅ ONE simple insight: "Your best day: Sunday (4.2/5 avg)"
- ✅ Hi Index (community + personal)

**Silver / Hi Pathfinder ($):**
- ✅ Last 30 days
- ✅ Weekly pattern analysis (best/worst days chart)
- ✅ Streak calendar (GitHub-style heatmap)
- ✅ Top 3 personalized insights
- ✅ Emotional trends (this week vs last week)

**Gold / Hi Champion ($$):**
- ✅ All-time data access (unlimited history)
- ✅ 90-day+ trends
- ✅ Full insight library (5+ personalized)
- ✅ Correlation charts (sharing boost, timing)
- ✅ Export data (CSV download)
- ✅ Predictive trends ("Trending toward 4.5/5")

**Enforcement:**
```javascript
// Frontend check (HiPulse.js)
const tier = window.HiMembership?.get()?.tier || 'anonymous';

if (tier === 'bronze' && requestedDays > 7) {
  showUpgradeModal('Silver', 'See 30-day trends');
  return;
}

if (tier !== 'gold' && feature === 'export') {
  showUpgradeModal('Gold', 'Export your data');
  return;
}
```

**Backend enforcement (RPC):**
```sql
-- In get_user_emotional_journey()
DECLARE
  v_tier TEXT;
  v_max_days INTEGER;
BEGIN
  -- Get user's tier from profiles
  SELECT tier INTO v_tier FROM profiles WHERE id = p_user_id;
  
  -- Enforce limits
  v_max_days := CASE v_tier
    WHEN 'gold' THEN 36500 -- ~100 years (unlimited)
    WHEN 'silver' THEN 30
    ELSE 7 -- bronze/anonymous
  END;
  
  -- Cap requested days
  p_days := LEAST(p_days, v_max_days);
  
  -- Return data...
```

---

### **4. Notifications — FUTURE-READY** 🔮

**Phase 1 (Now):** Data collection only
- Track patterns, calculate insights
- No push notifications yet

**Phase 2 (Q2 2026):** Gentle nudges
- **Low 3-day average:** "Noticed you've been at 2/5 for 3 days. Want to share what's on your mind?" (NOT "You're slipping!")
- **Streak at risk:** "Haven't seen you today. Your 12-day streak is still alive!" (24 hours before expiry)
- **Positive reinforcement:** "Your best week yet! 4.8/5 average 🌟" (weekly summary)

**Technology stack:**
- **Web Push API** (PWA standard)
- **Supabase Edge Functions** (scheduled triggers)
- **User preferences** (opt-in, frequency control in settings)

**Example implementation:**
```javascript
// Notification trigger (Edge Function, runs nightly)
export async function triggerInsightNotifications() {
  const users = await getUsersWithLowAverage(3); // 3-day avg < 2.5
  
  for (const user of users) {
    await sendNotification(user.id, {
      title: 'Hi-OS Check-In',
      body: 'Noticed a tough few days. Want to share?',
      url: '/hi-dashboard.html',
      tier_required: 'silver' // Only Silver+ get notifications
    });
  }
}
```

---

### **5. AI Integration — ARCHITECTED** 🤖

**Phase 1 (Now):** Rule-based insights
- "Sharing boosts your feeling by +0.7" (correlation calculation)
- "Your best time: 8am (4.3/5 avg)" (statistical analysis)

**Phase 2 (Q3 2026):** AI-powered insights (OpenAI GPT-4)
- Analyze journal text patterns (Hi Gym entries)
- Generate personalized prompts: "You often mention 'overwhelm' on Thursdays. Try Hi Gym at 2pm?"
- Emotional arc analysis: "Your 'frustrated → focused' journey worked 8/10 times"

**Gold Standard architecture:**
```javascript
// ai-insight-generator.js (Edge Function)
import OpenAI from 'openai';

export async function generatePersonalizedInsight(userId) {
  // 1. Fetch user's data (privacy-first)
  const journey = await supabase.rpc('get_user_emotional_journey', { 
    p_user_id: userId, 
    p_days: 30 
  });
  
  const gymEntries = await supabase
    .from('hi_gym_sessions')
    .select('current_emotion, desired_emotion, journal_text')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // 2. Build privacy-safe prompt (no PII to OpenAI)
  const prompt = `
Analyze this anonymous user's wellness data:
- Last 30 days Hi Scale: [${journey.map(d => d.hi_scale_rating).join(', ')}]
- Common emotions: frustrated (5x), hopeful (3x), calm (2x)
- Gym pattern: frustrated → calm (successful 7/10 times)

Generate ONE actionable insight (40 words max) that's:
- Encouraging (not clinical)
- Specific to their patterns
- Actionable (what to try)
  `;
  
  // 3. Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100
  });
  
  // 4. Store insight (with confidence = 'ai_generated')
  await supabase.from('user_behavior_insights').insert({
    user_id: userId,
    insight_type: 'ai_personalized',
    insight_text: completion.choices[0].message.content,
    confidence_score: 0.70, // AI insights = medium confidence
    insight_category: 'ai_generated'
  });
}
```

**Privacy safeguards:**
- ✅ No PII sent to OpenAI (anonymized patterns only)
- ✅ User opt-in required (Gold tier feature)
- ✅ Data encrypted at rest/transit
- ✅ User can delete AI insights anytime

---

## 🏗️ WHERE DATA LIVES (UI/UX Architecture)

### **Decision: Hi Pulse v2.0 = Analytics Hub** 💫

**Why:**
- Already exists ([hi-pulse.html](file:///Users/joeatang/Documents/GitHub/Stay-hi/public/hi-pulse.html))
- Footer icon 💫 = insights/analytics (established meaning)
- Doesn't clutter Dashboard (honors v1.1.0 simplicity push)
- Scalable (tabbed interface like Hi Island)

**Current Hi Pulse (v1.1.0):**
```
Hi Pulse
├── Ticker (scrolling news)
├── Hi Index Card (community wellness score)
├── Global Stats (everyone sees)
└── Personal Stats (auth users only)
```

**New Hi Pulse v2.0 (Tabbed):**
```
Hi Pulse 💫
├── Tab: Overview (current page - no changes)
│   ├── Ticker
│   ├── Hi Index
│   ├── Global stats
│   └── Personal stats
│
├── Tab: Your Journey 🔒 Silver+
│   ├── 7/30/90-day emotional journey (line chart)
│   ├── This week vs last week comparison
│   └── Current streak + share count
│
├── Tab: Patterns 🔒 Gold+
│   ├── Weekly rhythm (best/worst days)
│   ├── Peak times (when you feel best)
│   ├── Correlations (sharing boost, gym effect)
│   └── Personalized insights (top 5)
│
└── Tab: Milestones 🔒 Silver+
    ├── Streak calendar (heatmap)
    ├── Hi Points progress
    └── Achievement badges
```

**User flow example:**
1. **Dashboard** (action) → Tap medallion, check in, drop a Hi
2. **Hi Pulse** (reflection) → "How am I doing? What helps me?"
3. **Hi Island** (community) → Read others' shares, send waves
4. **Hi Gym** (introspection) → Frustrated → Calm journey work

---

### **Why NOT Hi Island "Trends" Tab?**

**Current Hi Island tabs:**
1. General Shares (community feed)
2. My Archive (your past shares)
3. **Emotional Trends** (currently empty)
4. Points Milestones
5. Hi Show Shares

**Problem with using Island:**
- Mental model conflict: Island = community/social, Pulse = personal measurement
- Already has 5 tabs (adding analytics makes 6-7 = cluttered)
- Footer icon 🏝️ means "connect with others", not "track yourself"

**Better: Keep Emotional Trends tab for Hi Island-specific insights:**
- "Community is trending 'hopeful' this week" (aggregate emotions)
- "Most active time: 7pm EST" (when people share most)
- "Your shares get 2.3x more taps on Sundays" (minimal social insight)

---

### **Why NOT Profile Page?**

**Current Profile:**
- Avatar, username, bio
- Tier badge
- Settings (privacy, notifications, timezone)

**Problem:**
- Profile = identity/account management, not measurement
- Users expect settings/preferences, not charts
- Less discoverable (hidden in menu)

---

## 📐 FRONTEND ARCHITECTURE (Maintain Code Quality)

### **Component Structure (ES6 Modules)**

```
/public/components/HiAnalytics/
├── HiAnalytics.js          # Main controller
├── HiAnalytics.css         # Styles
├── charts/
│   ├── EmotionalJourneyChart.js   # Line chart (Hi Scale over time)
│   ├── WeeklyPatternChart.js      # Bar chart (day-of-week comparison)
│   ├── StreakCalendar.js          # GitHub-style heatmap (already exists!)
│   └── CorrelationChart.js        # Scatter/correlation charts
├── insights/
│   ├── InsightCard.js             # Individual insight display
│   └── InsightList.js             # List of insights with filtering
└── exports/
    └── DataExporter.js            # CSV export (Gold tier)
```

### **Data Flow (Clean & Performant)**

```javascript
// HiAnalytics.js
export class HiAnalytics {
  constructor() {
    this.supabase = window.HiSupabase?.getClient();
    this.cache = new Map(); // 5min TTL
    this.currentTab = 'overview';
  }
  
  async init() {
    // 1. Check tier access
    const tier = window.HiMembership?.get()?.tier || 'anonymous';
    this.tier = tier;
    
    // 2. Load appropriate data
    await this.loadOverviewData(); // Always load
    
    // 3. Setup tab listeners
    this.setupTabs();
    
    // 4. Render initial view
    this.render();
  }
  
  async loadEmotionalJourney(days = 7) {
    // Check cache first
    const cacheKey = `journey_${days}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5min TTL
        return cached.data;
      }
    }
    
    // Tier enforcement
    const maxDays = this.getMaxDays();
    if (days > maxDays) {
      this.showUpgradePrompt(days <= 30 ? 'silver' : 'gold');
      days = maxDays;
    }
    
    // Fetch from database
    const { data, error } = await this.supabase.rpc(
      'get_user_emotional_journey',
      { p_user_id: this.userId, p_days: days }
    );
    
    if (error) {
      console.error('Error loading journey:', error);
      return [];
    }
    
    // Cache result
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }
  
  getMaxDays() {
    switch(this.tier) {
      case 'gold': return 36500; // Unlimited
      case 'silver': return 30;
      default: return 7; // bronze/anonymous
    }
  }
  
  renderEmotionalJourney(data) {
    // Use Chart.js or similar
    const ctx = document.getElementById('emotionalJourneyChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.snapshot_date),
        datasets: [{
          label: 'Hi Scale (1-5)',
          data: data.map(d => d.hi_scale_rating),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4
        }]
      },
      options: {
        scales: {
          y: { min: 1, max: 5, ticks: { stepSize: 1 } }
        }
      }
    });
  }
}

// Init on Hi Pulse page
if (window.location.pathname.includes('hi-pulse.html')) {
  window.HiAnalytics = new HiAnalytics();
  window.HiAnalytics.init();
}
```

---

### **Maintains Current Vibe:**

**Design system (already exists):**
```css
/* HiAnalytics.css - Use existing variables */
.analytics-tab {
  background: var(--hi-card-bg); /* Existing */
  border-radius: var(--hi-radius-lg); /* Existing */
  padding: var(--spacing-xl);
  backdrop-filter: blur(20px);
}

.insight-card {
  /* Match existing card styles (HiIndexCard.js) */
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08), 
    rgba(255, 255, 255, 0.02)
  );
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* Chart colors match Hi-OS palette */
--chart-color-1: #00d4ff; /* Hi cyan */
--chart-color-2: #ff006e; /* Hi pink */
--chart-color-3: #8338ec; /* Hi purple */
```

**Animation continuity:**
```javascript
// Use existing animation patterns
element.style.animation = 'fadeInUp 0.6s ease-out'; // Same as Hi Island
```

---

## 🔧 USER DATA INTEGRITY

### **No Existing Data Changes**

**Zero impact on:**
- ✅ `user_stats` (streaks, totals, points)
- ✅ `public_shares` (all shares preserved)
- ✅ `hi_points_ledger` (transaction history intact)
- ✅ `global_stats` (community counts)

**New tables are additive only:**
- ✅ `user_daily_snapshots` (new data, doesn't touch existing)
- ✅ `user_trend_summaries` (computed cache, regeneratable)
- ✅ `user_behavior_insights` (computed insights, deleteable)

---

### **Data Collection Strategy**

**Passive collection (no user action required):**
```javascript
// When user shares (existing flow, add one line)
async function submitShare(shareData) {
  // Existing code...
  const result = await supabase.rpc('record_hi_moment', shareData);
  
  // NEW: Update daily snapshot
  await supabase.rpc('upsert_daily_snapshot', {
    p_user_id: user.id,
    p_hi_scale_rating: null, // Will be set separately
    p_activity_type: 'share'
  });
  
  // Rest of existing code...
}
```

**Active collection (Hi Scale rating):**
```javascript
// Add to check-in flow (dashboard-main.js)
async function recordCheckin() {
  // Existing streak logic...
  
  // NEW: Ask for Hi Scale rating (1-5)
  const rating = await showHiScaleModal(); // "How inspired do you feel? 1-5"
  
  if (rating) {
    await supabase.rpc('upsert_daily_snapshot', {
      p_user_id: user.id,
      p_hi_scale_rating: rating,
      p_activity_type: 'checkin'
    });
  }
}

function showHiScaleModal() {
  // Simple modal: "Rate your feeling: 😫 1 2 3 4 5 😊"
  // One-tap rating, dismissible, no pressure
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="hi-scale-prompt">
        <p>How inspired do you feel?</p>
        <div class="rating-buttons">
          <button data-rating="1">😫 1</button>
          <button data-rating="2">😕 2</button>
          <button data-rating="3">😐 3</button>
          <button data-rating="4">🙂 4</button>
          <button data-rating="5">😊 5</button>
        </div>
        <button class="skip-btn">Skip</button>
      </div>
    `;
    // ... button click handlers
  });
}
```

---

### **Privacy & Data Ownership**

**User controls:**
- ✅ View all their data (Hi Pulse → Export CSV)
- ✅ Delete analytics data (Settings → Privacy → "Clear my analytics")
- ✅ Opt out of AI insights (Settings → "No AI analysis")
- ✅ Opt out of notifications (Settings → "No insight notifications")

**SQL for user data deletion:**
```sql
-- User clicks "Clear my analytics"
CREATE OR REPLACE FUNCTION delete_user_analytics_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete snapshots
  DELETE FROM user_daily_snapshots WHERE user_id = p_user_id;
  
  -- Delete trend summaries
  DELETE FROM user_trend_summaries WHERE user_id = p_user_id;
  
  -- Delete insights
  DELETE FROM user_behavior_insights WHERE user_id = p_user_id;
  
  -- NOTE: Does NOT delete user_stats (streaks, totals) - only analytics
END;
$$;
```

---

## 🚀 ROLLOUT PLAN (Phased & Safe)

### **Phase 1: Foundation (Week 1-2)**

**Backend:**
1. ✅ Deploy `DEPLOY_ANALYTICS_GOLD_STANDARD_v2.sql`
2. ✅ Test data collection (your account only)
3. ✅ Verify tier enforcement works
4. ✅ Add Hi Scale prompt to check-in flow (dashboard)

**Frontend:**
1. ✅ Add "Your Journey" tab to Hi Pulse (7-day chart only)
2. ✅ Test with 3 beta users (you + 2 Gold tier friends)
3. ✅ Gather feedback on UX

**Success criteria:**
- Data populates correctly
- Charts render without errors
- Tier gates block Bronze users from 30-day data
- No performance issues (<2sec load time)

---

### **Phase 2: Insights (Week 3-4)**

**Backend:**
1. ✅ Deploy insight generation functions
2. ✅ Run nightly job: `regenerate_user_insights()` for all users
3. ✅ Monitor insight quality (are they useful?)

**Frontend:**
1. ✅ Add "Patterns" tab (Gold tier)
2. ✅ Add insight cards ("Sharing boosts your feeling by +0.7")
3. ✅ Add upgrade prompts for Bronze/Silver users

**Success criteria:**
- At least 70% of users have ≥1 insight after 7 days
- Insights are actionable (not generic)
- Upgrade prompts convert 5%+ users

---

### **Phase 3: Full Launch (Week 5-6)**

**Backend:**
1. ✅ Add weekly trend summaries (pre-computed aggregates)
2. ✅ Optimize queries (add indexes if slow)

**Frontend:**
1. ✅ Add "Milestones" tab (streak calendar, achievements)
2. ✅ Add CSV export (Gold tier)
3. ✅ Polish UI/UX (animations, loading states)

**Marketing:**
1. ✅ Announce in ticker: "New: Track your journey on Hi Pulse 💫"
2. ✅ Email to paid users: "See what helps you most"
3. ✅ Blog post: "Why we built analytics that don't lie"

---

### **Phase 4: Notifications (Q2 2026)**

**Backend:**
1. Setup Web Push (service worker)
2. Deploy Edge Functions (notification triggers)
3. Add user preferences (opt-in, frequency)

**Frontend:**
1. Notification permission prompt (after 7 days of use)
2. Settings UI for notification control
3. In-app notification badge (🔔)

---

### **Phase 5: AI Insights (Q3 2026)**

**Backend:**
1. OpenAI API integration (Edge Function)
2. Privacy audit (no PII to external APIs)
3. Cost analysis (GPT-4 API pricing)

**Frontend:**
1. AI insight cards (labeled "AI-generated")
2. Opt-in UI (Gold tier)
3. Feedback loop ("Was this helpful?")

---

## 📊 SUCCESS METRICS

### **Adoption:**
- 80%+ active users check Hi Pulse at least weekly
- 40%+ users rate Hi Scale at least 3x per week
- 15%+ free users upgrade to see 30-day trends

### **Engagement:**
- Average session time on Hi Pulse: 2-3 minutes
- Users return to "Your Journey" tab 3x per week
- Insight cards have 60%+ "helpful" rating

### **Business:**
- 20% increase in Silver conversions (see 30-day data)
- 10% increase in Gold conversions (see full insights)
- Retention improves by 15% (users see progress)

---

## 🎓 WHAT YOU NEED TO KNOW

### **For Product Decisions:**
- Analytics live in Hi Pulse (💫), not Dashboard (maintains simplicity)
- Social metrics minimal (focus on personal journey)
- Tier gates enforced backend + frontend (diligent)
- Notifications opt-in, gentle, future phase

### **For Code Review:**
- ES6 modules (same pattern as existing components)
- Caching strategy (5min TTL, same as HiIndex.js)
- No breaking changes to existing data
- Follows existing design system (colors, spacing, animations)

### **For Data Privacy:**
- Users can export/delete analytics data
- AI insights opt-in only (Gold tier)
- No PII sent to external APIs
- GDPR/CCPA compliant

---

## 🤝 DECISION POINTS

**You need to decide:**

1. **Hi Scale prompt frequency:**
   - Option A: Every check-in (1x per day)
   - Option B: 3x per week (Mon, Wed, Fri)
   - Option C: User chooses (Settings preference)
   - **Recommendation:** Option A (daily = best data quality)

2. **Upgrade prompt aggressiveness:**
   - Option A: Soft blur ("Upgrade to see more" overlay)
   - Option B: Hard block ("This requires Silver" modal)
   - **Recommendation:** Option A (less frustrating, higher conversion)

3. **AI insights priority:**
   - Option A: Q3 2026 (Phase 5 as planned)
   - Option B: Q4 2026 (focus on core analytics first)
   - **Recommendation:** Option B (validate manual insights work first)

4. **Notification opt-in timing:**
   - Option A: Day 1 (after signup)
   - Option B: Day 7 (after user sees value)
   - **Recommendation:** Option B (higher opt-in rate)

---

## ✅ NEXT STEPS

**Ready to proceed?**

1. **Review this gameplan** — Any concerns? Changes?
2. **Deploy database schema** — Run `DEPLOY_ANALYTICS_GOLD_STANDARD_v2.sql`
3. **Test data collection** — Add Hi Scale prompt to your dashboard
4. **Build Hi Pulse v2.0** — Add "Your Journey" tab (7-day chart)
5. **Beta test** — You + 2 Gold tier friends use it for 1 week
6. **Iterate** — Adjust based on feedback
7. **Launch** — Roll out to all users

**This is gold standard. Diligent. Thoughtful. Maintains your foundation.**

---

**Questions?** I'm here.
