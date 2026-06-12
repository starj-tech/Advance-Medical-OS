-- Phase 4 (SSO/MFA) — opt-in TOTP second factor on user accounts. The secret is
-- a base32 string stored server-side; mfa_enabled flips on only after the user
-- proves a valid code (two-step enrollment). Additive columns; RLS already on
-- the users table. service_role BFF only — never exposed to the client except
-- as the one-time provisioning payload at enrollment.
alter table public.users
  add column if not exists mfa_secret  text,
  add column if not exists mfa_enabled boolean not null default false;
