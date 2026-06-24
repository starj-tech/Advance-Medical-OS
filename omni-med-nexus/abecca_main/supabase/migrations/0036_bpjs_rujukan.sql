-- Phase 5 (BPJS VClaim) — referrals (rujukan) looked up per encounter, the
-- prerequisite for a rawat-jalan SEP. Mirrors the bpjs_sep shape (0015): the
-- resolved referral from VClaim /Rujukan/Peserta is persisted here, mock or
-- live. Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.bpjs_rujukan (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  no_kartu      text not null,
  no_rujukan    text not null,
  asal_faskes   text,
  diagnosa_kode text,
  diagnosa_nama text,
  tgl_rujukan   text,
  is_mock       boolean not null default false,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists bpjs_rujukan_encounter_idx
  on public.bpjs_rujukan(company_id, encounter_id, created_at);

alter table public.bpjs_rujukan enable row level security;
