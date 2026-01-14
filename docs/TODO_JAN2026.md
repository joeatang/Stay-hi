# 📋 Hi-OS TODO — January 2026

> **Started:** January 13, 2026  
> **Status:** Active  
> **Rollover:** Incomplete items move to `TODO_FEB2026.md` at month end

---

## 🎯 Active Tasks

### Mission Control Fixes
- [ ] **Fix User Statistics button** — Create `get_admin_user_stats()` RPC with SECURITY DEFINER to safely query auth.users
- [ ] **Fix Recent Signups button** — Create `get_admin_recent_signups()` RPC (same pattern)
- [ ] **Improve Membership Analytics formatting** — Better UI display instead of raw JSON
- [ ] **Audit Security Events RLS** — Ensure admin_access_logs is accessible

### Documentation
- [x] Add Mission Control to Hi Code Map (completed 2026-01-13)

---

## ✅ Completed

| Task | Completed | Notes |
|------|-----------|-------|
| Profile check-in button fix | 2026-01-13 | Removed duplicate handlers, fixed balance property |
| Mission Control added to Hi Code Map | 2026-01-13 | Full architecture docs |
| Grant degenmentality admin access | 2026-01-13 | SQL executed in Supabase |

---

## 📝 Backlog (To Be Prioritized)

_Add items here as they come up. Move to Active when ready to work._

- [ ] Bulk invite code generation UI
- [ ] User search in Mission Control
- [ ] Tier upgrade/downgrade UI in Mission Control

---

## 🔄 Rolled Over from Previous Month

_N/A — First month_

---

## 📅 End of Month Checklist

At end of January:
1. Move incomplete Active tasks to `TODO_FEB2026.md`
2. Archive this file (keep for reference)
3. Update completion stats

---

> **Maintained by:** Joe  
> **Last Updated:** January 13, 2026
