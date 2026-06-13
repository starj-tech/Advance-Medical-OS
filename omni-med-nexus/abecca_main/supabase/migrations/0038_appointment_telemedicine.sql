-- Phase 5 (telemedicine ↔ appointment link) — make an appointment modality-aware
-- and connect it to its backing video session. A telemedicine janji temu spawns a
-- tele_sessions row at booking; check-in admits the patient to the virtual waiting
-- room instead of the physical antrian. The link is mutual (both nullable).
alter table public.appointments
  add column if not exists modality text not null default 'in_person',
  add column if not exists tele_session_id uuid
    references public.tele_sessions(id) on delete set null;

alter table public.tele_sessions
  add column if not exists appointment_id uuid
    references public.appointments(id) on delete set null;

create index if not exists tele_sessions_appointment_idx
  on public.tele_sessions(appointment_id);
