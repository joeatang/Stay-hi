# 📦 Supabase Migrations

This folder contains all database migrations for the Hi App.

## 📁 Structure

```
supabase/migrations/
├── YYYY-MM-DD_NNN_description.sql     # Forward migration
├── YYYY-MM-DD_NNN_ROLLBACK_*.sql      # Rollback script
└── README.md                           # This file
```

## 🚀 Deployment Process

### 1. Create a Migration
```bash
# Naming convention: YYYY-MM-DD_NNN_description.sql
# Example: 2026-01-17_001_fix_get_user_stats_rpc.sql
```

### 2. Deploy to Supabase
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Paste the migration SQL
4. Click **Run**

### 3. Verify
```sql
-- Test the function
SELECT get_user_stats(NULL::UUID);
```

### 4. Document
- Add entry to `docs/HI_CODE_MAP.md` changelog
- Update any affected documentation

---

## ⏪ Rollback Process

If a migration causes issues:

1. Find the corresponding `*_ROLLBACK_*.sql` file
2. Run it in Supabase SQL Editor
3. Document the rollback in changelog

---

## 📋 Migration Log

| Date | Migration | Description | Status |
|------|-----------|-------------|--------|
| 2026-01-17 | 001 | Fix get_user_stats RPC (personal stats + global_stats table) | ✅ Deployed |

---

## ⚠️ Important Notes

1. **Database changes are immediate** - Unlike frontend code, SQL runs directly in production
2. **Always create a rollback** - Every migration should have a corresponding rollback script
3. **Test in SQL Editor first** - Run SELECT queries to verify before CREATE/UPDATE
4. **No staging database** - We only have one Supabase instance (production)

---

## 🔗 Related Files

- [FIX_RPC_USER_COUNT.sql](../../FIX_RPC_USER_COUNT.sql) - Original fix file (for reference)
- [docs/HI_CODE_MAP.md](../../docs/HI_CODE_MAP.md) - System documentation
