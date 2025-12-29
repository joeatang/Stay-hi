-- Hi Points MVP schema: per-user balance + immutable ledger

create table if not exists public.hi_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.hi_points_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta bigint not null,
  reason text,
  context text,
  ts timestamptz not null default now()
);

alter table public.hi_points enable row level security;
alter table public.hi_points_ledger enable row level security;

drop policy if exists "hi_points_select_self" on public.hi_points;
create policy "hi_points_select_self" on public.hi_points for select to authenticated using ( auth.uid() = user_id );

drop policy if exists "hi_points_ledger_select_self" on public.hi_points_ledger;
create policy "hi_points_ledger_select_self" on public.hi_points_ledger for select to authenticated using ( auth.uid() = user_id );

drop policy if exists "hi_points_all_service" on public.hi_points;
create policy "hi_points_all_service" on public.hi_points for all to service_role using ( true ) with check ( true );

drop policy if exists "hi_points_ledger_all_service" on public.hi_points_ledger;
create policy "hi_points_ledger_all_service" on public.hi_points_ledger for all to service_role using ( true ) with check ( true );

create index if not exists hi_points_ledger_user_ts_idx on public.hi_points_ledger(user_id, ts desc);

create or replace function public.hi_award_points(p_user uuid, p_delta bigint, p_reason text, p_context text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delta = 0 then return; end if;
  insert into public.hi_points_ledger(user_id, delta, reason, context) values (p_user, p_delta, p_reason, p_context);
  insert into public.hi_points(user_id, balance)
  values (p_user, p_delta)
  on conflict (user_id) do update set balance = public.hi_points.balance + excluded.balance, updated_at = now();
end;
$$;

revoke all on function public.hi_award_points(uuid,bigint,text,text) from public;
grant execute on function public.hi_award_points(uuid,bigint,text,text) to service_role;
