-- Performance alerts focused on access decision latency (p95)

create table if not exists public.access_telemetry_perf_alerts (
  id bigserial primary key,
  window_start timestamptz not null,
  window_end timestamptz not null,
  p95_latency_ms numeric not null,
  baseline_p95_ms numeric,
  threshold_ms numeric not null,
  total_decisions bigint not null,
  triggered boolean not null default false,
  context text,
  severity text not null default 'warning',
  created_at timestamptz not null default now()
);

alter table public.access_telemetry_perf_alerts enable row level security;

create policy if not exists "perf_alerts_select_auth" on public.access_telemetry_perf_alerts for select to authenticated using ( true );
create policy if not exists "perf_alerts_select_service" on public.access_telemetry_perf_alerts for select to service_role using ( true );
create policy if not exists "perf_alerts_insert_service" on public.access_telemetry_perf_alerts for insert to service_role with check ( true );
create policy if not exists "perf_alerts_update_service" on public.access_telemetry_perf_alerts for update to service_role using ( true ) with check ( true );

create index if not exists perf_alerts_window_idx on public.access_telemetry_perf_alerts(window_start, window_end);
create index if not exists perf_alerts_trigger_idx on public.access_telemetry_perf_alerts(triggered) where triggered = true;
create index if not exists perf_alerts_context_idx on public.access_telemetry_perf_alerts(context);
