-- Phase 3 — Appointment scheduling (janji temu).
-- A future-dated booking of a patient into a poliklinik with an optional
-- practitioner. Status runs scheduled → checked_in (queue_ticket_id records the
-- antrian ticket created on arrival) / cancelled / no_show. Tenant-scoped; RLS on,
-- service_role BFF only.
create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  patient_id      text not null,
  polyclinic      text not null,
  practitioner    text,
  scheduled_at    timestamptz not null,
  status          text not null default 'scheduled'
                    check (status in ('scheduled', 'checked_in', 'cancelled', 'no_show')),
  notes           text,
  queue_ticket_id uuid references public.queue_tickets(id) on delete set null,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists appointments_slot_idx
  on public.appointments(company_id, scheduled_at);

alter table public.appointments enable row level security;
