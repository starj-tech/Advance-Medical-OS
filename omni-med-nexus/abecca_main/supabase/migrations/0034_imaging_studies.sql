-- Phase 4 (PACS-lite) — imaging study registry. One row per radiology study,
-- optionally linked to its diagnostic order (RIS, 0030). No DICOM binaries are
-- stored: `images` is a JSON list of URL references (WADO-RS /rendered, VNA,
-- cloud object storage, or data: URIs) that the web viewer renders directly.
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.imaging_studies (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  order_id    uuid references public.diagnostic_orders(id) on delete set null,
  patient_id  text not null,
  accession   text,
  modality    text not null,
  description text not null,
  images      jsonb not null,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists imaging_studies_company_idx
  on public.imaging_studies(company_id, created_at);
create index if not exists imaging_studies_patient_idx
  on public.imaging_studies(company_id, patient_id, created_at);

alter table public.imaging_studies enable row level security;
