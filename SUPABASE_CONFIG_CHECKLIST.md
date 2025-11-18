# Supabase Configuration Checklist (Hi-OS Auth)

## 1. Project Settings
- Project URL: Confirm matches codebase usage in `lib/HiSupabase.v3.js`.
- Anon/Public Key present and not hard-coded in any public HTML (only JS module).

## 2. Redirect URLs (Auth > URL Configuration)
Add EACH production redirect explicitly:
- https://<prod-domain>/public/post-auth.html
- https://<prod-domain>/post-auth.html (fallback)
- https://<prod-domain>/signin.html
Optionally dev:
- http://localhost:3030/public/post-auth.html
- http://localhost:3030/post-auth.html

## 3. Email (Magic Link) Template
- Use variable that constructs URL with token parameters (`{{ .RedirectURL }}` or appropriate Supabase variable).
- Avoid hard-coded staging domain remnants.
- Ensure trailing `/public/post-auth.html` for primary landing.

## 4. Allowed Domains
- Production apex & www (if used): `stay-hi.example`, `www.stay-hi.example`.
- Localhost for development.

## 5. Authentication Policies
- Passwordless/Magic Link enabled.
- Disable phone signup (if unused) to reduce surface area.
- Adjust token expiration only if business requirement (default is fine).

## 6. Rate Limits & Abuse Prevention
- Monitor auth logs for unusual volume.
- Consider enabling email domain allow/deny lists if abuse occurs.

## 7. Storage & RLS (If Avatar or Profile Data)
- Ensure RLS policies do not block post-auth profile fetch.
- Confirm bucket public/private settings align with avatar serving approach.

## 8. Testing Flow
1. Clear local storage/session.
2. Trigger magic link from `/signin.html`.
3. Email arrival: link host & path correct.
4. Click: lands on post-auth page, session established.
5. Redirect to dashboard without 404.

## 9. Post-Auth Failure Handling
- Root fallback `post-auth.html` covers legacy links lacking `/public` segment.
- JS debug logging enabled (non-verbose) to diagnose any failing token exchange.

## 10. Periodic Audit
- Quarterly: verify redirect URLs list matches current deployment.
- Remove deprecated staging domains.

---
Maintain this checklist in release notes for future environment migrations.
