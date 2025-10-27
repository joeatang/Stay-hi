# 🧭 Supabase Dashboard Navigation Guide

## Where to Find Your Data

### 🔍 **PROFILE ACCOUNT INFO**

Your profile data is stored in multiple places in Supabase:

#### 1. **Table Editor → `profiles` table**
```
Dashboard → Table Editor → profiles
```
**What you'll find:**
- `id` - Your unique user ID
- `username` - Your chosen username
- `display_name` - Your display name
- `avatar_url` - URL to your avatar image
- `bio` - Your profile bio
- `is_public` - Whether your profile is public
- `created_at` - When you joined
- `updated_at` - Last profile update

#### 2. **Table Editor → `user_stats` table**
```
Dashboard → Table Editor → user_stats
```
**What you'll find:**
- `user_id` - Links to your profile
- `total_hi_moments` - Your total Hi! moments
- `current_streak` - Your current streak
- `longest_streak` - Your best streak ever
- `level` - Your current level
- `experience_points` - Your XP
- `last_hi_date` - When you last said Hi!

### 📸 **AVATAR STORAGE**

Your avatar images are stored in the Storage section:

#### **Storage → `avatars` bucket**
```
Dashboard → Storage → avatars → [your-user-id]/
```

**Expected structure:**
```
avatars/
└── [your-user-id]/
    ├── avatar.webp        (optimized version)
    ├── avatar.png         (original upload)
    └── thumbnail.webp     (small version)
```

**If bucket appears empty:**
1. ✅ Check if you're signed in to the app
2. ✅ Try uploading an avatar through the profile page
3. ✅ Look for your specific user ID folder

### 🏆 **ACHIEVEMENTS & ACTIVITY**

#### **Table Editor → `user_achievements` table**
```
Dashboard → Table Editor → user_achievements
```
**What you'll find:**
- Your unlocked achievements
- When you earned them
- Achievement progress

#### **Table Editor → `hi_moments` table**
```
Dashboard → Table Editor → hi_moments
```
**What you'll find:**
- Every Hi! moment you've recorded
- Timestamps and locations
- Mood and emotion data

---

## 🚨 Troubleshooting Empty Buckets

### Why Your `avatars` Bucket Might Look Empty:

1. **No Avatar Uploaded Yet**
   - The bucket only shows files after you upload an avatar
   - Go to Profile page → Upload an avatar image

2. **User ID Folders**
   - Files are organized by user ID: `avatars/[user-id]/filename.ext`
   - Look for a folder with your user ID (long string of letters/numbers)

3. **Permission Issues**
   - Make sure you're signed in to the app
   - The storage policies only show your own files

4. **Schema Not Applied**
   - Ensure the Supabase schema SQL was executed
   - The bucket should be created automatically

### Quick Debug Steps:

1. **Check Authentication:**
   ```javascript
   // Run in browser console on your app
   window.supabaseDebug.quickCheck()
   ```

2. **Full System Check:**
   ```javascript
   // Run comprehensive debug
   window.supabaseDebug.runDebugCheck()
   ```

3. **Test Avatar Upload:**
   ```javascript
   // Test upload functionality
   window.supabaseDebug.testAvatarUpload()
   ```

---

## 🎯 Quick Reference

### Finding Your User ID:
1. Go to Authentication → Users
2. Find your email
3. Copy the UUID - this is your user ID

### Common Locations:
| Data Type | Location | Table/Bucket |
|-----------|----------|--------------|
| Basic Profile | Table Editor | `profiles` |
| Statistics | Table Editor | `user_stats` |
| Achievements | Table Editor | `user_achievements` |
| Hi! Moments | Table Editor | `hi_moments` |
| Avatar Images | Storage | `avatars` |

### Expected File Structure:
```
Supabase Project
├── Table Editor
│   ├── profiles (basic profile info)
│   ├── user_stats (streaks, levels, XP)
│   ├── user_achievements (unlocked achievements)
│   ├── hi_moments (all Hi! recordings)
│   └── achievements (achievement definitions)
└── Storage
    └── avatars
        └── [user-id]
            ├── avatar.webp
            ├── avatar.png
            └── thumbnail.webp
```

---

## 💡 Pro Tips

1. **Use Filters**: In Table Editor, filter by your user ID to see only your data
2. **Check RLS**: Row Level Security ensures you only see your own data
3. **Debug Tools**: Use the built-in debug tools to verify everything is working
4. **Storage URLs**: Avatar URLs in the `profiles` table point to files in Storage

The bucket appearing empty is normal if you haven't uploaded an avatar yet - try uploading one through the profile page and then check the Storage section again!