-- Access telemetry table for batching gating funnel events
create table if not exists public.access_telemetry (
  id bigserial primary key,
  ts timestamptz not null default now(),
  type text not null,
  context text,
  reason text,
  session_id uuid,
  user_id uuid,
  ingest_source text,
  failure_cycle integer,
  decision_latency_ms numeric,
  inserted_at timestamptz not null default now()
);

-- Indexes for attribution queries
create index if not exists access_telemetry_ts_idx on public.access_telemetry(ts desc);
create index if not exists access_telemetry_user_idx on public.access_telemetry(user_id);
create index if not exists access_telemetry_session_idx on public.access_telemetry(session_id);

-- Ensure new columns exist when upgrading from earlier schema versions
alter table public.access_telemetry add column if not exists ingest_source text;
alter table public.access_telemetry add column if not exists failure_cycle integer;
alter table public.access_telemetry add column if not exists decision_latency_ms numeric;

-- Basic RLS enable
alter table public.access_telemetry enable row level security;

-- Allow authenticated users to insert (optional; restrict further if needed)
create policy "access_telemetry_insert_auth" on public.access_telemetry for insert
  to authenticated using ( true );

-- Allow read for service role only (no anonymous read)
create policy "access_telemetry_read_service" on public.access_telemetry for select
  to service_role using ( true );

-- Allow authenticated users to select for realtime admin dashboards (can refine to admin-only later)
create policy "access_telemetry_select_auth" on public.access_telemetry for select
  to authenticated using ( true );

-- Optionally block updates/deletes
create policy "access_telemetry_block_updates" on public.access_telemetry for update to authenticated using ( false );
create policy "access_telemetry_block_deletes" on public.access_telemetry for delete to authenticated using ( false );
