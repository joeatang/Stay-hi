# Tiers, Points, and Invites (MVP)

Version: 0.1.0

## Goals
- Keep tier checks modular and pluggable (T1/T2/T3).
- Ship a safe MVP for Hi Points (credits) with audit ledger.
- Add invite codes with expiry, usage caps, and tier grants.

## Components
- `public/lib/access/HiTier.js`: Lightweight helper exposing `getTier()`, `isAtLeast('T2')`, and refresh on membership/auth events. Reads from membership bridge, Supabase metadata, or `user_membership` table.
- `DEPLOY_USER_MEMBERSHIP.sql`: `user_membership` table and client-safe `invite_redeem_user(code)` wrapper that upgrades tier via SECURITY DEFINER.
- `DEPLOY_HI_POINTS.sql`: Tables `hi_points` (balance) and `hi_points_ledger` (immutable audit). Function `hi_award_points(user, delta, reason, context)` (service-only).
- `public/lib/rewards/HiPoints.js`: Read-only client to fetch balance and recent ledger rows.
- `DEPLOY_INVITE_CODES.sql`: Tables `invite_codes` and `invite_redemptions` with service-only `invite_redeem(code, user)` backing the client wrapper.

## Suggested Flows
- Tier Checks: Use `HiTier.isAtLeast('T2')` to gate perks. Keep page logic simple: if not eligible, show upgrade CTA.
- Points Earning: Award via server/cron/scripts by calling `hi_award_points` (service role). Suggested starters: daily check-in, streak log completion.
- Rewards Redemption: Read balance via `HiPoints.getBalance()`, display sticker packs/drops gated by balance or tier. Redemptions should be service-side (deduct points + grant reward).
- Invite Entry: Use `public/invite.html` or call RPC `invite_redeem_user(code)` from the client after auth; on success the membership tier is upgraded server-side and `hi:membership-changed` can update UI.

## Security Notes
- No client writes to points or invites. All mutations are service-only via RLS and SECURITY DEFINER functions.
- Users can read only their own balances and ledgers.

## Next Steps (Optional)
- Daily Check-in RPC: `award_daily_checkin()` SECURITY DEFINER enforces once-per-day and awards +5 (see `DEPLOY_POINTS_DAILY_CHECKIN.sql`).
- Edge Function: `award_points` and `redeem_invite` wrappers for client calls with checks.
- Rewards Tables: `rewards_catalog` and `user_rewards` for sticker pack unlocks.
- Telemetry: Emit `hi:rewards-redeemed`, `hi:points-awarded` events for observability.
- Admin UI: Simple tools to mint invites and view redemption stats.

## Minimal Usage Snippets
- Tier check:
```html
<script src="/public/lib/access/HiTier.js"></script>
<script>
  document.addEventListener('hi:tier-ready', ()=>{
    if(HiTier.isAtLeast('T2')){
      // show perk
    }
  });
</script>
```
- Points read:
 - Daily check-in (profile):
```html
<script>
  async function dailyCheckIn(){
    const { data, error } = await supabaseClient.rpc('award_daily_checkin');
    if(error) alert(error.message);
    else alert(data.awarded ? `+${data.delta} points!` : 'Already checked in today');
  }
  // Hook to a button
  document.getElementById('dailyCheckinBtn')?.addEventListener('click', dailyCheckIn);
 </script>
```
```html
<script src="/public/lib/rewards/HiPoints.js"></script>
<script>
  document.addEventListener('hi:points-ready', async ()=>{
    const { balance } = await HiPoints.getBalance();
    console.log('Points balance:', balance);
  });
</script>
```