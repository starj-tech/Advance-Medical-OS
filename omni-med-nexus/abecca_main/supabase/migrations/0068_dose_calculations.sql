-- Paediatric dose calculations (Domain B / CDS): saved weight-based dose computations, doubling
-- as a dosing audit trail. per_dose/per_day are computed server-side from drug + weight. Tenant-
-- scoped; RLS on (app-layer isolation by company_id, service_role bypass).

create table if not exists public.dose_calculations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id text not null,
  patient_name text not null,
  drug_code text not null,
  drug_name text not null,
  weight_kg numeric not null,
  per_dose numeric not null,
  per_day numeric not null,
  frequency_per_day integer not null,
  capped boolean not null default false,
  computed_by uuid references public.users(id),
  computed_at timestamptz not null default now()
);

create index if not exists dose_calc_company_idx on public.dose_calculations (company_id, computed_at desc);
create index if not exists dose_calc_patient_idx on public.dose_calculations (company_id, patient_id);

alter table public.dose_calculations enable row level security;
