# Copilot Context — Stay Hi Legacy (DO NOT MODIFY)

## ⚠️ WARNING: This is the LEGACY repo.

This repo (`Stay-hi`) is the **old Vercel/Supabase version of Stay Hi**.
It is kept for frontend source reference only.

### The active production app is in a DIFFERENT repo:

| | Legacy (this repo) | Production |
|---|---|---|
| **Repo** | `Stay-hi` | `stay-hi-trac` |
| **Backend** | Supabase (deprecated) | Trac Network + VPS |
| **State** | Supabase tables | `app-state.json` on VPS |
| **Blockchain** | None | MSB on Trac mainnet |
| **Status** | Frozen / reference only | Active, 19 users |

### Rules

- Do NOT make backend logic changes in this repo
- Do NOT treat `.md` docs here as current truth about the system
- Do NOT deploy from this repo
- If you need to change how the app works, switch to `stay-hi-trac`
- The protocol for making changes is in `stay-hi-trac/STAY_HI_TRAC_UPDATE_PROTOCOL.md`

### What IS okay to do here

- Read frontend source code for reference
- Read old docs for historical context (but verify against live system)
- Update frontend files IF they are deployed separately to Vercel (confirm with user first)
