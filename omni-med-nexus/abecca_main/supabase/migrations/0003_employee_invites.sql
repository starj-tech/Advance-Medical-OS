-- Phase 2 — employee invitations. Invited users set their own password via a
-- one-time tokenised link; only the sha256 of the token is stored.
alter table public.users add column if not exists invite_token_hash text;
alter table public.users add column if not exists invite_expires_at timestamptz;
create index if not exists users_invite_token_idx on public.users(invite_token_hash);
