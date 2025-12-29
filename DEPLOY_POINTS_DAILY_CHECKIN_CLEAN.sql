-- Daily check-in awarding with one-per-day enforcement

create table if not exists public.hi_points_daily_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  ts timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.hi_points_daily_checkins enable row level security;

drop policy if exists "checkins_select_self" on public.hi_points_daily_checkins;
create policy "checkins_select_self" on public.hi_points_daily_checkins for select to authenticated using ( auth.uid() = user_id );

drop policy if exists "checkins_all_service" on public.hi_points_daily_checkins;
create policy "checkins_all_service" on public.hi_points_daily_checkins for all to service_role using ( true ) with check ( true );

create or replace function public.award_daily_checkin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
  v_delta int := 5;
  v_balance bigint;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
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
