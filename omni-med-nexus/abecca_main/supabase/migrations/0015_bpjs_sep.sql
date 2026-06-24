-- Phase 2 — BPJS SEP (Surat Eligibilitas Peserta) issued per encounter.
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.bpjs_sep (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  encounter_id    uuid not null references public.encounters(id) on delete cascade,
  patient_id      text not null,
  no_kartu        text not null,
  sep_number      text not null,
  diagnosis       text,
  poli            text,
  peserta_nama    text,
  peserta_kelas   text,
  peserta_status  text,
  is_mock         boolean not null default false,
  status          text not null default 'issued',  -- issued|cancelled
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists bpjs_sep_encounter_idx
  on public.bpjs_sep(company_id, encounter_id, created_at desc);

alter table public.bpjs_sep enable row level security;
