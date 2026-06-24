-- Nursing risk assessments (Domain E): Morse Fall Scale & Braden Scale results, one row per
-- assessment. score/band are computed server-side from `items` (the per-question answers, kept
-- as jsonb for audit). Tenant-scoped; RLS on (app-layer isolation by company_id, service_role
-- bypass).

create table if not exists public.nursing_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id text not null,
  patient_name text not null,
  scale text not null,                 -- morse | braden
  score integer not null,
  band text not null,                  -- morse: low|medium|high · braden: none|mild|moderate|high|very_high
  items jsonb not null default '{}'::jsonb,
  note text,
  assessed_by uuid references public.users(id),
  assessed_at timestamptz not null default now()
);

create index if not exists nursing_assessments_company_idx on public.nursing_assessments (company_id, assessed_at desc);
create index if not exists nursing_assessments_patient_idx on public.nursing_assessments (company_id, patient_id);

alter table public.nursing_assessments enable row level security;
