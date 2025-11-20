-- Access telemetry anomaly alerts table
create table if not exists public.access_telemetry_alerts (
  id bigserial primary key,
  window_start timestamptz not null,
  window_end timestamptz not null,
  total_requested bigint not null,
  total_blocked bigint not null,
  blocked_ratio numeric not null,
  baseline_ratio numeric,
  threshold_ratio numeric not null,
  min_blocked_threshold bigint not null,
  triggered boolean not null default false,
  context text,
  severity text not null default 'warning',
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolution_note text
);

alter table public.access_telemetry_alerts enable row level security;

-- Read access for authenticated (admin gating handled at app layer)
create policy if not exists "access_telemetry_alerts_select_auth" on public.access_telemetry_alerts for select to authenticated using ( true );
create policy if not exists "access_telemetry_alerts_select_service" on public.access_telemetry_alerts for select to service_role using ( true );
create policy if not exists "access_telemetry_alerts_insert_service" on public.access_telemetry_alerts for insert to service_role with check ( true );
create policy if not exists "access_telemetry_alerts_update_service" on public.access_telemetry_alerts for update to service_role using ( true ) with check ( true );

create index if not exists access_telemetry_alerts_window_idx on public.access_telemetry_alerts(window_start, window_end);
create index if not exists access_telemetry_alerts_trigger_idx on public.access_telemetry_alerts(triggered) where triggered = true;
create index if not exists access_telemetry_alerts_context_idx on public.access_telemetry_alerts(context);
