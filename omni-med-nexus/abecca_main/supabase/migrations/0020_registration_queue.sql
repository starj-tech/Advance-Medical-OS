-- Phase 1 — Outpatient registration & queue (pendaftaran + antrian).
-- One row per registered visit; a per-clinic, per-day sequential queue number is
-- assigned by the BFF and the visit is tied to its outpatient encounter.
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.queue_tickets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  patient_id    text not null,
  polyclinic    text not null,
  queue_date    date not null default current_date,
  queue_number  integer not null,
  status        text not null default 'waiting',   -- waiting|called|in_service|done|no_show
  encounter_id  uuid references public.encounters(id) on delete set null,
  created_at    timestamptz not null default now(),
  called_at     timestamptz
);
create index if not exists queue_tickets_day_idx
  on public.queue_tickets(company_id, queue_date, polyclinic, queue_number);
create unique index if not exists queue_tickets_number_uq
  on public.queue_tickets(company_id, polyclinic, queue_date, queue_number);

alter table public.queue_tickets enable row level security;
