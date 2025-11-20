-- Daily check-in awarding with one-per-day enforcement

create table if not exists public.hi_points_daily_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  ts timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.hi_points_daily_checkins enable row level security;

-- Users can read their own check-ins (optional; for UI history)
create policy if not exists "checkins_select_self" on public.hi_points_daily_checkins for select to authenticated using ( auth.uid() = user_id );

-- Service role can manage records
create policy if not exists "checkins_all_service" on public.hi_points_daily_checkins for all to service_role using ( true ) with check ( true );

-- SECURITY DEFINER function to award daily check-in points for current user.
-- Prevents multiple awards by writing to checkins table.
create or replace function public.award_daily_checkin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date; -- UTC day; adjust if needed
  v_delta int := 5; -- points per check-in (MVP)
  v_balance bigint;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  -- try insert; if already exists, raise
  insert into public.hi_points_daily_checkins(user_id, day) values (v_user, v_day);
  perform public.hi_award_points(v_user, v_delta, 'daily-checkin', 'profile');
  select balance into v_balance from public.hi_points where user_id = v_user;
  return jsonb_build_object('awarded', true, 'delta', v_delta, 'balance', coalesce(v_balance,0));
exception when unique_violation then
  select balance into v_balance from public.hi_points where user_id = v_user;
  return jsonb_build_object('awarded', false, 'reason', 'already-checked-in', 'balance', coalesce(v_balance,0));
end;
$$;

revoke all on function public.award_daily_checkin() from public;
grant execute on function public.award_daily_checkin() to authenticated;
