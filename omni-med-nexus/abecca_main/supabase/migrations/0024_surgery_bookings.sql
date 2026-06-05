-- Phase 3 — Operating-theatre scheduling (penjadwalan kamar operasi).
-- One booking reserves a procedure for a patient with a surgeon, theatre (OK room)
-- and time slot; status runs scheduled → in_progress → done / cancelled.
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.surgery_bookings (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  patient_id    text not null,
  procedure     text not null,
  surgeon       text not null,
  theatre       text not null,
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled'
                  check (status in ('scheduled', 'in_progress', 'done', 'cancelled')),
  notes         text,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists surgery_bookings_slot_idx
  on public.surgery_bookings(company_id, scheduled_at);

alter table public.surgery_bookings enable row level security;
