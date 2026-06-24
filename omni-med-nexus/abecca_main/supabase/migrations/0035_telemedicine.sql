-- Phase 5 (Telemedicine) — video-visit sessions. Each session carries a room id
-- and the resolved join URL (from the hospital's configured provider, or a
-- public Jitsi room fallback). Optionally linked to an encounter. No media is
-- stored — the video runs in the external provider. Tenant-scoped; RLS on,
-- service_role BFF only.
create table if not exists public.tele_sessions (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  patient_id   text not null,
  encounter_id uuid references public.encounters(id) on delete set null,
  scheduled_at timestamptz not null,
  status       text not null default 'scheduled'
                 check (status in ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled')),
  room_id      text not null,
  room_url     text not null,
  clinician_id uuid references public.users(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists tele_sessions_company_idx
  on public.tele_sessions(company_id, scheduled_at);
create index if not exists tele_sessions_status_idx
  on public.tele_sessions(company_id, status);

alter table public.tele_sessions enable row level security;
