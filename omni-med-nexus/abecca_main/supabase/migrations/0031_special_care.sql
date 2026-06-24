-- Phase 4 (Unit Khusus) — ICU/HCU severity scoring (APACHE II), the
-- hemodialysis unit (machine master + slot-based session schedule), and
-- oncology chemotherapy courses. Tenant-scoped; RLS on, service_role BFF only.

-- ICU: one row per APACHE II assessment; raw inputs kept as jsonb for audit,
-- the graded result denormalised for the unit board.
create table if not exists public.icu_assessments (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  patient_id          text not null,
  encounter_id        uuid references public.encounters(id) on delete set null,
  inputs              jsonb not null,
  score               integer not null,
  physiologic_points  integer not null,
  age_points          integer not null,
  chronic_points      integer not null,
  estimated_mortality numeric not null,
  assessed_by         uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists icu_assessments_company_idx
  on public.icu_assessments(company_id, created_at);

alter table public.icu_assessments enable row level security;

-- Hemodialysis machine master.
create table if not exists public.hd_machines (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  status     text not null default 'active'
               check (status in ('active', 'maintenance')),
  created_at timestamptz not null default now()
);
create index if not exists hd_machines_company_idx
  on public.hd_machines(company_id, created_at);

alter table public.hd_machines enable row level security;

-- Hemodialysis schedule: one (non-cancelled) patient per machine per
-- date × shift slot; the BFF rejects double-bookings before inserting.
create table if not exists public.hd_sessions (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  patient_id     text not null,
  machine_id     uuid not null references public.hd_machines(id) on delete cascade,
  machine_name   text not null,
  date           text not null, -- YYYY-MM-DD calendar slot
  shift          text not null
                   check (shift in ('pagi', 'siang', 'sore')),
  duration_hours numeric not null default 4,
  status         text not null default 'scheduled'
                   check (status in ('scheduled', 'completed', 'cancelled')),
  note           text,
  created_by     uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists hd_sessions_slot_idx
  on public.hd_sessions(company_id, machine_id, date, shift);
create index if not exists hd_sessions_date_idx
  on public.hd_sessions(company_id, date);

alter table public.hd_sessions enable row level security;

-- Oncology chemotherapy courses: regimen denormalised from the catalogue;
-- cycle counter + next-due date advance as cycles are recorded.
create table if not exists public.chemo_courses (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  patient_id    text not null,
  regimen_code  text not null,
  regimen_name  text not null,
  indication    text not null,
  total_cycles  integer not null,
  interval_days integer not null,
  cycles_given  integer not null default 0,
  last_cycle_at timestamptz,
  next_due_at   timestamptz,
  status        text not null default 'active'
                  check (status in ('active', 'completed', 'stopped')),
  started_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists chemo_courses_company_idx
  on public.chemo_courses(company_id, created_at);

alter table public.chemo_courses enable row level security;
