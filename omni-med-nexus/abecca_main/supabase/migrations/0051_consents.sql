-- Phase 5 (kepatuhan, Domain I/N — UU PDP / GDPR / HIPAA / KARS) — informed consent.
-- Per-patient consent records with an optional validity window; withdrawal is
-- non-destructive (stamps withdrawn_at) to preserve the consent audit trail. Effective
-- status is derived in app code (lib/consent). Tenant-scoped; RLS on, service_role BFF.
create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  patient_id   text not null,
  consent_type text not null,
  decision     text not null default 'granted',
  grantor      text not null,
  relationship text,
  scope        text,
  valid_until  date,
  withdrawn_at timestamptz,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists consents_company_idx on public.consents(company_id, patient_id, created_at desc);

alter table public.consents enable row level security;
