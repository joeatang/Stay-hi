# HiBase - Unified Supabase Access Layer

**Version**: 1.0.0  
**Status**: Production Ready  
**Location**: `/lib/hibase/`

## Overview

HiBase is a comprehensive, modular database access layer that provides a unified API for all Hi App database operations. It eliminates the need for direct Supabase client usage throughout the UI and ensures consistent error handling, data formatting, and business logic enforcement.

## Architecture

```
/lib/hibase/
├── HiBaseClient.js      # Singleton client with connection management
├── auth.js              # Authentication operations 
├── users.js             # User profile CRUD operations
├── shares.js            # Hi shares insert/get operations
├── streaks.js           # Streak tracking and management
├── referrals.js         # Referral code system
├── stats.js             # Global statistics and leaderboards
└── index.js             # Unified exports and auto-initialization
```

## Core Principles

1. **Structured Responses**: All functions return `{ data, error }` format
2. **Business Logic Isolation**: No raw SQL in UI components  
3. **Error Handling**: Graceful degradation and meaningful error messages
4. **Type Safety**: Consistent data validation and transformation
5. **Performance**: Built-in caching for frequently accessed data

## Module Documentation

### HiBaseClient.js
**Purpose**: Singleton Supabase client wrapper with connection validation

**Key Features**:
- Connection state management
- Automatic reconnection attempts
- Operation execution with error handling
- Connection diagnostics and testing

### auth.js
**Purpose**: Authentication and session management

**Operations**:
- `signUp(email, password, metadata)` - Create new user account
- `signIn(email, password)` - Authenticate existing user
- `signOut()` - End current session
- `getCurrentSession()` - Get active session info
- `getCurrentUser()` - Get authenticated user data
- `resetPassword(email)` - Send password reset email
- `updatePassword(newPassword)` - Update user password
- `updateUserMetadata(metadata)` - Update user profile data
- `onAuthStateChange(callback)` - Listen for auth events

### users.js 
**Purpose**: User profile CRUD operations

**Operations**:
- `createProfile(profileData)` - Create new user profile
- `getProfile(userId)` - Get user profile by ID
- `getProfileByEmail(email)` - Get user profile by email
- `updateProfile(userId, updates)` - Update user profile
- `deleteProfile(userId)` - Delete user profile
- `profileExists(userId)` - Check if profile exists
- `getUserStats(userId)` - Get user activity statistics
- `searchUsers(query, limit)` - Search users by username/email
- `getUserRank(userId)` - Get user's leaderboard position
- `updateUserActivity(userId, activityData)` - Bulk activity updates

### shares.js
**Purpose**: Hi shares operations (both raw and friendly functions)

**Raw Operations** (direct Supabase):
- `insertShare(shareData)` - Direct insert to hi_shares table
- `getPublicShares(limit)` - Direct fetch from public_hi_feed view
- `getUserShares(userId, limit)` - Direct fetch user's shares

**Friendly Operations** (with validation and processing):
- `createHiShare(shareData)` - Create share with validation
- `getCommunityFeed(options)` - Get formatted community feed
- `getUserHiHistory(userId, options)` - Get user's share history
- `updateShareEngagement(shareId, action)` - Track likes/views
- `deleteShare(shareId, userId)` - Delete share with authorization
- `getShareById(shareId)` - Get share with full details

### streaks.js
**Purpose**: User engagement streak tracking

**Operations**:
- `getUserStreak(userId)` - Get current streak information
- `updateStreak(userId, options)` - Update streak after Hi activity
- `useStreakFreeze(userId)` - Use freeze to maintain streak
- `getStreakLeaderboard(limit)` - Get top streak holders
- `addStreakFreezes(userId, count, reason)` - Grant streak freezes

**Streak Logic**:
- Daily Hi activity extends streaks
- Missed days break streaks unless freeze is used
- Automatic calculation of streak status and expiration
- Leaderboard ranking by current streak length

### referrals.js
**Purpose**: Referral code system with rewards

**Operations**:
- `redeemReferralCode(userId, code)` - Redeem code and apply rewards
- `createReferralCode(userId, options)` - Generate new referral code
- `getUserReferralStats(userId)` - Get user's referral statistics
- `getReferralLeaderboard(limit)` - Top referrers leaderboard
- `validateReferralCode(code)` - Check code validity without redeeming

**Referral Features**:
- Automatic reward distribution (points, streak freezes)
- Usage limits and expiration dates
- Referrer statistics tracking
- Code validation and fraud prevention

### stats.js
**Purpose**: Global statistics and analytics with caching

**Operations**:
- `getGlobalStats(forceRefresh)` - Community-wide statistics
- `getPointsLeaderboard(limit, options)` - Top users by points
- `getActivityLeaderboard(limit)` - Most active users
- `getRecentActivity(limit)` - Latest Hi shares feed
- `getLocationStats(location)` - Location-based analytics
- `getUserRankings(userId)` - User's position in all leaderboards
- `getPerformanceAnalytics()` - System performance metrics
- `clearStatsCache()` - Force cache refresh

**Caching Strategy**:
- 5-minute TTL for global stats
- Automatic cache invalidation
- Manual cache clearing for real-time updates

## Usage Examples

### Basic Import Patterns

```javascript
// Import entire HiBase
import HiBase from '/lib/hibase/index.js';
await HiBase.auth.signIn(email, password);

// Import specific modules  
import { auth, users, shares } from '/lib/hibase/index.js';
const session = await auth.getCurrentSession();

// Import individual functions
import { signIn } from '/lib/hibase/auth.js';
const result = await signIn(email, password);
```

### Authentication Flow

```javascript
// Sign up new user
const { data, error } = await HiBase.auth.signUp(
    'user@example.com', 
    'password123',
    { username: 'newuser' }
);

if (data && !data.needsConfirmation) {
    // User signed up and logged in
    console.log('Welcome!', data.user);
} else if (data && data.needsConfirmation) {
    // Email confirmation required
    console.log('Check your email for confirmation');
}

// Sign in existing user
const loginResult = await HiBase.auth.signIn('user@example.com', 'password123');
if (loginResult.data) {
    const user = loginResult.data.user;
    console.log('Logged in as:', user.email);
}

// Listen for auth changes
HiBase.auth.onAuthStateChange(({ event, session, user }) => {
    console.log('Auth event:', event, 'User:', user?.email);
});
```

### User Management

```javascript
// Create user profile
const profileResult = await HiBase.users.createProfile({
    username: 'cooluser',
    display_name: 'Cool User',
    bio: 'Just saying Hi!',
    location: 'San Francisco'
});

// Update profile
await HiBase.users.updateProfile(userId, {
    bio: 'Updated bio text',
    level: 2
});

// Get user statistics
const stats = await HiBase.users.getUserStats(userId);
console.log('User has', stats.data.stats.total_his, 'total His');

// Search users
const searchResults = await HiBase.users.searchUsers('john', 10);
console.log('Found', searchResults.data.count, 'users');
```

### Hi Shares Management

```javascript
// Create a new Hi share
const shareResult = await HiBase.shares.createHiShare({
    user_id: userId,
    message: 'Having a great day! 🌟',
    location: 'Central Park',
    latitude: 40.785091,
    longitude: -73.968285,
    is_public: true
});

// Get community feed
const feed = await HiBase.shares.getCommunityFeed({
    limit: 20,
    location: 'San Francisco',
    timeframe: 'day'
});

console.log('Found', feed.data.count, 'recent shares');

// Get user's Hi history
const history = await HiBase.shares.getUserHiHistory(userId, {
    limit: 10,
    includePrivate: false
});

// Update share engagement
await HiBase.shares.updateShareEngagement(shareId, 'like');
```

### Streak Management

```javascript
// Get user's current streak
const streak = await HiBase.streaks.getUserStreak(userId);
console.log('Current streak:', streak.data.current, 'days');
console.log('Status:', streak.data.status);

// Update streak after Hi activity
const streakUpdate = await HiBase.streaks.updateStreak(userId);
console.log(streakUpdate.data.message);

// Use a streak freeze
if (streak.data.canUseFreeze) {
    const freezeResult = await HiBase.streaks.useStreakFreeze(userId);
    console.log('Freeze used!', freezeResult.data.freeze.message);
}

// Get streak leaderboard
const leaderboard = await HiBase.streaks.getStreakLeaderboard(10);
leaderboard.data.leaderboard.forEach((user, i) => {
    console.log(`#${user.rank}: ${user.username} - ${user.streakDays} days`);
});
```

### Referral System

```javascript
// Redeem a referral code
const redemption = await HiBase.referrals.redeemReferralCode(userId, 'HI123ABC');
if (redemption.data) {
    console.log('Rewards received:', redemption.data.rewards);
}

// Create a referral code
const newCode = await HiBase.referrals.createReferralCode(userId, {
    codeType: 'personal',
    maxUses: 5,
    expiresInDays: 30,
    rewardConfig: { points: 150, streakFreezes: 2 }
});

console.log('Share this URL:', newCode.data.shareUrl);

// Get referral statistics
const referralStats = await HiBase.referrals.getUserReferralStats(userId);
console.log('Total referrals:', referralStats.data.statistics.totalReferrals);
```

### Statistics and Analytics

```javascript
// Get global community stats
const globalStats = await HiBase.stats.getGlobalStats();
console.log('Total His:', globalStats.data.totalHis);
console.log('Active users (24h):', globalStats.data.activeUsers24h);

// Get points leaderboard
const pointsLeaderboard = await HiBase.stats.getPointsLeaderboard(10);
console.log('Top user has', pointsLeaderboard.data.topPoints, 'points');

// Get user's rankings across all categories
const userRankings = await HiBase.stats.getUserRankings(userId);
console.log('Points rank:', userRankings.data.rankings.points.rank);
console.log('Activity rank:', userRankings.data.rankings.activity.rank);
console.log('Streak rank:', userRankings.data.rankings.streak.rank);

// Get recent community activity
const recentActivity = await HiBase.stats.getRecentActivity(15);
recentActivity.data.activities.forEach(activity => {
    console.log(`${activity.username}: ${activity.message} (${activity.timeAgo})`);
});
```

## Error Handling

All HiBase functions return a standardized `{ data, error }` response format:

```javascript
const result = await HiBase.users.getProfile(userId);

if (result.error) {
    console.error('Operation failed:', result.error.message);
    // Handle specific error codes
    switch (result.error.code) {
        case 'CLIENT_NOT_READY':
            // Database connection issue
            break;
        case 'VALIDATION_ERROR':
            // Input validation failed
            break;
        case 'PGRST116':
            // Record not found
            break;
    }
} else {
    console.log('Success:', result.data);
}
```

## Testing and Diagnostics

```javascript
// Test database connection
const connectionTest = await HiBase.utils.testConnection();
console.log('Connection status:', connectionTest.client.data ? 'OK' : 'Failed');

// Get HiBase status
const status = HiBase.utils.getStatus();
console.log('Modules loaded:', status.modules);

// Manual initialization (auto-runs on load)
const initResult = await HiBase.utils.initialize();
console.log('Initialization successful:', initResult.success);
```

## Integration Notes

- **UI Integration**: Import HiBase functions instead of using Supabase client directly
- **Error Display**: Use structured error responses for user-friendly messaging  
- **Loading States**: All operations are async and return promises
- **Caching**: Stats module includes built-in caching for performance
- **Global Access**: HiBase is available at `window.HiBase` for console testing

## Migration from Direct Supabase

**Before** (direct Supabase usage):
```javascript
const { data, error } = await supabase
    .from('hi_users')
    .select('*')
    .eq('id', userId)
    .single();
```

**After** (HiBase):
```javascript
const { data, error } = await HiBase.users.getProfile(userId);
```

**Benefits**:
- Consistent error handling
- Business logic validation
- Structured response format
- Better maintainability
- Enhanced debugging capabilities