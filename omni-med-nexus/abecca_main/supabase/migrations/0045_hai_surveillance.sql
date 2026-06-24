-- Phase 5 (PPI/infection control, Domain I) — HAI surveillance. A line-list of
-- healthcare-associated infection cases plus the monthly device-day denominators;
-- incidence density per 1000 device-days is computed from the two. Tenant-scoped;
-- RLS on, service_role BFF only.
create table if not exists public.hai_cases (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  patient_id  text not null,
  hai_type    text not null,
  unit        text not null,
  onset_date  date not null,
  note        text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists hai_cases_idx on public.hai_cases(company_id, onset_date desc);
alter table public.hai_cases enable row level security;

create table if not exists public.hai_denominators (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  period      text not null,
  hai_type    text not null,
  unit        text not null,
  device_days integer not null default 0,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists hai_denominators_idx on public.hai_denominators(company_id, period);
alter table public.hai_denominators enable row level security;
