-- Abecca IT operations console: services, incidents, security controls.
--
-- RLS is enabled with no anon policy (deny-by-default); the server BFF uses the
-- service_role key, which bypasses RLS, matching the other Abecca tables. Apply
-- this before setting SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for abecca_it,
-- then load seed.sql.

create table if not exists public.services (
  id          text primary key,
  name        text not null,
  kind        text not null,
  status      text not null,
  uptime      numeric not null,
  latency_ms  integer not null,
  detail      text not null
);

create table if not exists public.incidents (
  id         text primary key,
  title      text not null,
  severity   text not null,
  service    text not null,
  status     text not null,
  opened_at  timestamptz not null
);

create table if not exists public.controls (
  id      text primary key,
  name    text not null,
  status  text not null,
  detail  text not null
);

alter table public.services  enable row level security;
alter table public.incidents enable row level security;
alter table public.controls  enable row level security;
