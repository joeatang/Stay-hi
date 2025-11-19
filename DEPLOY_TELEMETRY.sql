-- Telemetry persistence schema for Hi-OS
-- Run in Supabase (psql) or via SQL editor.
-- Requires: pgcrypto extension for gen_random_uuid() (enabled by default in Supabase).

-- Performance beacons
create table if not exists perf_beacons (
  id uuid primary key default gen_random_uuid(),
  ts bigint not null,
  build_tag text,
  path text,
  ttfb double precision,
  lcp double precision,
  fid double precision,
  cls double precision,
  fcp double precision,
  tbt double precision,
  long_tasks integer,
  resources jsonb,
  created_at timestamptz default now()
);
create index if not exists perf_beacons_path_idx on perf_beacons(path);
create index if not exists perf_beacons_build_idx on perf_beacons(build_tag);
create index if not exists perf_beacons_ts_idx on perf_beacons(ts);

-- Integrity events (missing / mismatch)
create table if not exists integrity_events (
  id uuid primary key default gen_random_uuid(),
  ts bigint not null,
  build_tag text,
  path text,
  src text not null,
  event_type text not null, -- 'missing' | 'mismatch'
  expected text,
  actual text,
  created_at timestamptz default now()
);
create index if not exists integrity_events_type_idx on integrity_events(event_type);
create index if not exists integrity_events_src_idx on integrity_events(src);
create index if not exists integrity_events_ts_idx on integrity_events(ts);

-- Error & promise rejection events
create table if not exists error_events (
  id uuid primary key default gen_random_uuid(),
  ts bigint not null,
  build_tag text,
  path text,
  type text not null, -- 'error' | 'promise'
  message text,
  stack text,
  src text,
  line int,
  col int,
  created_at timestamptz default now()
);
create index if not exists error_events_type_idx on error_events(type);
create index if not exists error_events_path_idx on error_events(path);
create index if not exists error_events_ts_idx on error_events(ts);

-- Track (custom) events (hiTrack)
create table if not exists track_events (
  id uuid primary key default gen_random_uuid(),
  ts bigint not null,
  build_tag text,
  path text,
  event text not null,
  data jsonb,
  created_at timestamptz default now()
);
create index if not exists track_events_event_idx on track_events(event);
create index if not exists track_events_path_idx on track_events(path);
create index if not exists track_events_ts_idx on track_events(ts);

-- Row Level Security (optional tighten later)
alter table perf_beacons enable row level security;
alter table integrity_events enable row level security;
alter table error_events enable row level security;
alter table track_events enable row level security;
-- Basic permissive policies (replace with service role usage or auth-based filtering later)
-- NOTE: For INSERT policies, Postgres only allows a WITH CHECK expression (USING is invalid for pure INSERT)
create policy "allow insert perf" on perf_beacons for insert with check (true);
create policy "allow insert integrity" on integrity_events for insert with check (true);
create policy "allow insert error" on error_events for insert with check (true);
create policy "allow insert track" on track_events for insert with check (true);

-- Future: add retention job to purge old rows (e.g., >30d)
