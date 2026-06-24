-- SBAR handovers / serah-terima pasien (Domain E, KARS SKP-2 effective communication). One row
-- per handover between staff capturing the four SBAR parts; acknowledged once by the receiving
-- nurse. Tenant-scoped; RLS on (app-layer isolation by company_id, service_role bypass).

create table if not exists public.handovers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id text not null,
  patient_name text not null,
  from_staff text not null,
  to_staff text,
  shift text,                          -- morning | afternoon | night
  situation text not null,
  background text not null,
  assessment text not null,
  recommendation text not null,
  status text not null default 'pending',  -- pending | acknowledged
  acknowledged_by uuid references public.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists handovers_company_idx on public.handovers (company_id, created_at desc);
create index if not exists handovers_patient_idx on public.handovers (company_id, patient_id);

alter table public.handovers enable row level security;
