-- Phase 1 — Bedside observations + EWS (NEWS2).
-- One row per observation set against an encounter; the NEWS2 aggregate score
-- and escalation band are computed at write time and stored with the raw vitals,
-- so the band is fixed to the vitals as recorded. Tenant-scoped; RLS on,
-- service_role BFF only.
create table if not exists public.observations (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  encounter_id     uuid not null references public.encounters(id) on delete cascade,
  patient_id       text not null,
  respiratory_rate integer not null,
  spo2             integer not null,
  on_oxygen        boolean not null default false,
  temperature      numeric(4,1) not null,
  systolic_bp      integer not null,
  pulse            integer not null,
  consciousness    text not null default 'alert',  -- ACVPU: alert|confusion|voice|pain|unresponsive
  ews_score        integer not null,
  ews_band         text not null,                  -- low|medium|high
  recorded_by      uuid references public.users(id) on delete set null,
  recorded_at      timestamptz not null default now()
);
create index if not exists observations_encounter_idx
  on public.observations(company_id, encounter_id, recorded_at);

alter table public.observations enable row level security;
