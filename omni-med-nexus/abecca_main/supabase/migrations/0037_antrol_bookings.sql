-- Phase 5 (BPJS Antrol) — Antrean Online bookings, one per queue ticket pushed
-- to BPJS. The resolved booking code (kodebooking) from the Antrean Online
-- "tambah antrean" endpoint is persisted here (mock or live). Tenant-scoped;
-- RLS on, service_role BFF only.
create table if not exists public.antrol_bookings (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  ticket_id    uuid not null references public.queue_tickets(id) on delete cascade,
  patient_id   text not null,
  no_kartu     text not null,
  kode_booking text not null,
  poli         text not null,
  is_mock      boolean not null default false,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (company_id, ticket_id)
);
create index if not exists antrol_bookings_company_idx
  on public.antrol_bookings(company_id, created_at);

alter table public.antrol_bookings enable row level security;
