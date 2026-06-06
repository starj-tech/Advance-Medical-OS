-- Phase 3 — Follow-up / recall reminders (pengingat kontrol ulang).
-- A DPJP schedules a future recall from an encounter; front desk dispatches the
-- day's due reminders, which fan out to the DPJP (in-app) and the patient
-- (WhatsApp). Status runs scheduled → sent / cancelled. Tenant-scoped; RLS on,
-- service_role BFF only.
create table if not exists public.follow_ups (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  encounter_id   uuid not null references public.encounters(id) on delete cascade,
  patient_id     text not null,
  due_date       date not null,
  reason         text not null,
  patient_phone  text,
  notify_user_id uuid references public.users(id) on delete set null,
  status         text not null default 'scheduled'
                   check (status in ('scheduled', 'sent', 'cancelled')),
  created_by     uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);
create index if not exists follow_ups_due_idx
  on public.follow_ups(company_id, status, due_date);
create index if not exists follow_ups_encounter_idx
  on public.follow_ups(company_id, encounter_id, due_date);

alter table public.follow_ups enable row level security;
