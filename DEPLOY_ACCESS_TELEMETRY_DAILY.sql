-- Daily aggregation table for access telemetry
create table if not exists public.access_telemetry_daily (
  day date not null,
  type text not null,
  total_count bigint not null default 0,
  user_count bigint not null default 0,
  unique_users bigint not null default 0,
  first_ts timestamptz,
  last_ts timestamptz,
  primary key (day, type)
);

alter table public.access_telemetry_daily enable row level security;

-- Read policies (service role and authenticated for dashboard)
create policy "access_telemetry_daily_select_auth" on public.access_telemetry_daily for select to authenticated using ( true );
create policy "access_telemetry_daily_select_service" on public.access_telemetry_daily for select to service_role using ( true );

-- Insert/update only by service role
create policy "access_telemetry_daily_upsert_service" on public.access_telemetry_daily for all to service_role using ( true ) with check ( true );

create index if not exists access_telemetry_daily_day_idx on public.access_telemetry_daily(day);
create index if not exists access_telemetry_daily_type_idx on public.access_telemetry_daily(type);
