-- Phase 5 (pengalaman pasien, Domain M) — patient experience survey (CSAT + NPS).
-- Companion to the complaints register: complaints capture what went wrong, feedback
-- captures overall sentiment. Each response carries an NPS score (0–10) and an optional
-- CSAT rating (1–5); the net promoter score & mean satisfaction are derived in app code
-- (lib/feedback). Tenant-scoped; RLS on, service_role BFF.
create table if not exists public.patient_feedback (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  patient_id  text,
  source      text not null,
  nps_score   integer not null,
  csat_rating integer,
  comment     text,
  created_at  timestamptz not null default now()
);
create index if not exists patient_feedback_company_idx on public.patient_feedback(company_id, created_at desc);

alter table public.patient_feedback enable row level security;
