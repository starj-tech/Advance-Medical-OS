-- Phase 5 (webhooks) — outgoing webhook endpoints. A tenant registers an https URL
-- subscribed to one or more domain events; each delivery is a signed POST
-- (HMAC-SHA256 over `${timestamp}.${body}` with the shared secret). The secret is
-- shown once and kept here to sign deliveries. last_status/last_delivery_at record
-- the most recent attempt. Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.webhook_endpoints (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  url              text not null,
  secret           text not null,
  events           jsonb not null default '[]'::jsonb,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  last_status      integer,
  last_delivery_at timestamptz
);
create index if not exists webhook_endpoints_company_idx
  on public.webhook_endpoints(company_id, created_at desc);

alter table public.webhook_endpoints enable row level security;
