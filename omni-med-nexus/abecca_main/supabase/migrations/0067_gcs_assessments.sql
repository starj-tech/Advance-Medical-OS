-- Glasgow Coma Scale assessments (Domain A/E): one row per neuro assessment. score/severity are
-- computed server-side from eye/verbal/motor. Tenant-scoped; RLS on (app-layer isolation by
-- company_id, service_role bypass).

create table if not exists public.gcs_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id text not null,
  patient_name text not null,
  eye smallint not null,
  verbal smallint not null,
  motor smallint not null,
  score smallint not null,
  severity text not null,               -- mild | moderate | severe
  note text,
  assessed_by uuid references public.users(id),
  assessed_at timestamptz not null default now()
);

create index if not exists gcs_company_idx on public.gcs_assessments (company_id, assessed_at desc);
create index if not exists gcs_patient_idx on public.gcs_assessments (company_id, patient_id);

alter table public.gcs_assessments enable row level security;
