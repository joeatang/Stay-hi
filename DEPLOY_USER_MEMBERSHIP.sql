-- User membership table and invite redeem wrapper for client-safe flow

create table if not exists public.user_membership (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null check (tier in ('T1','T2','T3')) default 'T1',
  updated_at timestamptz not null default now()
);

alter table public.user_membership enable row level security;

-- Users can read their own membership
create policy if not exists "user_membership_select_self" on public.user_membership for select to authenticated using ( auth.uid() = user_id );

-- Service role can upsert
create policy if not exists "user_membership_all_service" on public.user_membership for all to service_role using ( true ) with check ( true );

-- Helper to set tier (service-only, used internally by wrapper)
create or replace function public.set_user_tier(p_user uuid, p_tier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tier not in ('T1','T2','T3') then raise exception 'invalid_tier'; end if;
  insert into public.user_membership(user_id, tier)
  values (p_user, p_tier)
  on conflict (user_id) do update set tier = excluded.tier, updated_at = now();
end;
$$;

revoke all on function public.set_user_tier(uuid,text) from public;
grant execute on function public.set_user_tier(uuid,text) to service_role;

-- Client-safe invite redeem wrapper: uses auth.uid() and upgrades membership
create or replace function public.invite_redeem_user(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tier text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  -- call internal service-only redeem (same schema, allowed for definer)
  v_tier := public.invite_redeem(p_code, v_user);
  perform public.set_user_tier(v_user, v_tier);
  return v_tier;
end;
$$;

revoke all on function public.invite_redeem_user(text) from public;
grant execute on function public.invite_redeem_user(text) to authenticated;

create index if not exists user_membership_tier_idx on public.user_membership(tier);
