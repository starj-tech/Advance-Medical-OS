-- Phase 1 — Referrals (rujukan).
-- An outgoing referral against an encounter — the record behind a SISRUTE / BPJS
-- rujukan to another facility. Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.referrals (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  encounter_id         uuid not null references public.encounters(id) on delete cascade,
  patient_id           text not null,
  destination_facility text not null,
  reason               text not null,
  urgency              text not null default 'rutin',  -- rutin|segera|emergensi
  notes                text,
  referred_by          uuid references public.users(id) on delete set null,
  created_at           timestamptz not null default now()
);
create index if not exists referrals_encounter_idx
  on public.referrals(company_id, encounter_id, created_at);

alter table public.referrals enable row level security;
