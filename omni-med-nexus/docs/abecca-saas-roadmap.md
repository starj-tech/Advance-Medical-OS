# Abecca SaaS — Multi-Tenant Onboarding, Billing & RBAC (Design / Roadmap)

> Status: **DRAFT for alignment.** Sections marked _(to confirm)_ need a product
> decision before implementation. The RBAC taxonomy and architecture are stable
> enough to build against.

## 1. Vision & scope

Abecca evolves from four seeded demo apps into a **multi-tenant SaaS** sold to
hospital companies for internal operational use. The clinical app (`abecca_main`)
becomes the front door: a hospital **registers as a company**, picks a
**subscription bundle**, **pays via Stripe (monthly)**, and is then provisioned a
**Company ID + password** (emailed to the registrant). Staff log into the
Abecca apps (`main`, `it`, …) scoped by their **role** and the company tenant.

Each company is an isolated **tenant**; its employees are **users** with a
**role tier** (Executive / Manager / Doctor) and a specific **sub-role** (job
title) that drives fine-grained permissions.

## 2. Current state (what exists vs. what is greenfield)

| Area | Today | This roadmap |
| --- | --- | --- |
| Data BFF | Supabase + in-memory fallback (patients, formulary, wards, staff, invoices, services/incidents/controls, devices) | add tenant scoping (`company_id`) |
| Auth / login | **none** | register + login (Company ID + password) |
| RBAC | **none** in code (only `Staff.role` strings) | 3 role tiers × sub-roles + permission matrix |
| Billing | **none** | Stripe subscriptions, 3 bundles, webhooks, entitlements |
| Multi-tenancy | **none** | companies as tenants, RLS isolation, seat limits |
| Transactional email | **none** | credentials + receipts (Resend/SMTP) |

So auth, billing, tenancy and RBAC are **additive and greenfield** — they don't
conflict with the existing BFF.

## 3. End-to-end onboarding flow

1. Visitor opens `abecca_main` → **/register** (company sign-up).
2. Fills the **company registration form**:
   - Official company (hospital) legal name
   - PIC / representative email (account owner)
   - Number of employees + employee roster (name, email, job title/sub-role) —
     manual entry and/or CSV bulk import
   - Other required fields: hospital type/class, address, NPWP/tax id, phone,
     billing contact
3. Selects one of **3 bundles** → redirected to **Stripe Checkout** (monthly
   subscription; seat count may feed quantity-based pricing).
4. On payment success, Stripe fires `checkout.session.completed` → our
   **webhook** provisions the tenant:
   - create `company` (tenant) + generate **Company ID** (`company_code`)
   - generate the **admin password** (auto) **or** honor a self-chosen password
   - create **employee accounts** from the roster, assign role tiers + sub-roles
   - record the Stripe customer/subscription + entitlements
5. **Email** to the PIC: Company ID + password (+ login link). _(Self-set
   passwords skip emailing the secret; we email the Company ID + a set-password
   link instead.)_
6. **Login (main & it apps): Company ID + password** → session → role-scoped UI.
   Company ID identifies the tenant; the password authenticates the individual
   user. The PIC is the company **admin** who can manage users/seats afterward.

## 4. Architecture

- **Tenancy:** every domain row carries `company_id`. Reads/writes are filtered
  by tenant; Postgres **RLS** enforces isolation as defense-in-depth (the BFF
  already runs as `service_role`, so it also scopes explicitly in queries).
- **Auth _(to confirm, see §10)_:** Company ID + password. Proposed: custom
  credentials stored in Supabase Postgres (`users.password_hash`, argon2/bcrypt),
  signed **httpOnly session cookie** (JWT or DB session). Reason: a
  Company-ID-scoped login isn't email-native, which is awkward for Supabase Auth
  (email-centric). Alternative: Supabase Auth (email+password) with a tenant
  claim.
- **Billing:** Stripe **Products + monthly Prices** (one per bundle), **Checkout
  Session** for sign-up, **Webhooks** (`checkout.session.completed`,
  `customer.subscription.updated|deleted`, `invoice.payment_failed`) to keep
  entitlements in sync, and the **Customer Portal** for self-serve plan/seat/card
  management. Seats → quantity-based pricing _(to confirm)_.
- **Entitlements / feature-gating:** `plan → { apps, modules, seat_cap,
  features }`. Middleware blocks app/route access not included in the plan.
- **Email:** transactional provider (Resend or SMTP) for the credential email and
  payment receipts.
- **Apps in scope:** `main` (clinical) and `it` require login per the brief;
  `admin` is the company-admin surface; `demo` stays public/static.

## 5. Data model (sketch, not final)

```
companies            id, company_code (Company ID, unique), legal_name,
                     hospital_class, npwp, address, phone,
                     pic_email, plan, seats_purchased,
                     stripe_customer_id, stripe_subscription_id,
                     status (trialing|active|past_due|canceled), created_at

users                id, company_id -> companies, full_name, email,
                     role_tier (executive|manager|doctor),
                     sub_role (slug, see §6), password_hash,
                     status (active|invited|disabled), is_company_admin,
                     must_set_password, created_at
                     UNIQUE (company_id, email)

subscriptions        id, company_id, stripe_subscription_id, plan,
                     current_period_end, seats, status            -- mirror of Stripe

invitations/roster   (optional staging for bulk employee import)
audit_auth           login events, provisioning events (ties into the
                     existing SHA-256 audit chain concept)
```

All existing tables (`patients`, `wards`, `staff`, `invoices`, …) gain
`company_id` + RLS keyed to the tenant.

## 6. RBAC — role taxonomy (the core ask)

**Model:** `Role Tier` (breadth of access) × `Sub-Role` (hospital job title →
department context + granular permissions). The 3 tiers stay; each gets a full
catalogue of sub-roles reflecting Indonesian hospital org structure, so a
hospital with hundreds of differently-titled doctors/managers/executives maps
cleanly.

### Tier 1 — Executive (strategic, organisation-wide)
Direksi & pimpinan puncak. Org-wide dashboards, finance, all departments.
- Direktur Utama (CEO / President Director)
- Direktur Medik / Pelayanan Medis (Chief Medical Officer)
- Direktur Keperawatan (Chief Nursing Officer)
- Direktur Keuangan (CFO)
- Direktur Operasional (COO)
- Direktur SDM & Umum (CHRO)
- Direktur Penunjang Medik
- Chief Information Officer / Direktur TI (CIO)
- Komisaris / Dewan Pengawas (Board / Supervisory)
- Kepala Satuan Pemeriksaan Internal (SPI / Internal Audit)

### Tier 2 — Manager (departmental / operational)
Kepala bidang / instalasi / ruang & manajer fungsional. Scoped to their
department(s); manage staff, inventory, approvals, dept dashboards.

_Clinical / department heads_
- Kepala Instalasi Gawat Darurat (IGD / ER)
- Kepala Instalasi Rawat Inap (Inpatient)
- Kepala Instalasi Rawat Jalan (Outpatient)
- Kepala Instalasi Bedah Sentral (OK / OR)
- Kepala Instalasi Perawatan Intensif (ICU / HCU)
- Kepala Instalasi Farmasi (Pharmacy)
- Kepala Instalasi Laboratorium (Lab)
- Kepala Instalasi Radiologi
- Kepala Instalasi Gizi (Nutrition)
- Kepala Instalasi Rekam Medis (Medical Records)
- Kepala Bidang Keperawatan (Nursing)
- Kepala Ruang / Karu (Ward head)

_Support / back-office_
- Manajer Keuangan & Akuntansi
- Manajer Penagihan / Revenue Cycle / Kasir
- Manajer SDM (HR)
- Manajer Umum & Rumah Tangga (General Affairs)
- Manajer Pengadaan & Logistik (Procurement / Supply Chain)
- Manajer Mutu & Keselamatan Pasien (PMKP / Quality & Patient Safety)
- Manajer Teknologi Informasi (IT) → primary persona for `abecca_it`
- Manajer Hukum & Kepatuhan (Legal / Compliance)
- Manajer Humas & Pemasaran (PR / Marketing)
- Manajer Pelayanan Pasien / Case Manager (MPP)

### Tier 3 — Doctor / Clinical (front-line care providers)
Tenaga medis & klinis garis depan. Patient charts, vitals/EWS, diagnoses,
orders/prescriptions within their assignment.

_Dokter_
- Dokter Umum (GP)
- Dokter Spesialis: Penyakit Dalam, Bedah, Anak, Obstetri & Ginekologi,
  Jantung & Pembuluh Darah (Kardiologi), Saraf (Neurologi), Paru (Pulmonologi),
  Anestesiologi, Radiologi, Patologi Klinik, Patologi Anatomi, Mata,
  THT-KL, Kulit & Kelamin, Kedokteran Jiwa (Psikiatri), Orthopedi & Traumatologi,
  Urologi, Bedah Saraf, Onkologi, Rehabilitasi Medik, Mikrobiologi Klinik,
  Kedokteran Forensik, Gizi Klinik, Emergensi
- Dokter Sub-spesialis / Konsultan (mis. Sp.PD-KGH, Sp.A Neonatologi)
- Dokter Gigi & Dokter Gigi Spesialis (Bedah Mulut, Orthodonti, dll.)
- Dokter Residen (PPDS) / Dokter Internship

_Allied health — included as Tier-3 sub-roles **if** Tier 3 is treated as
"Clinical / Care Provider" (see §10 decision):_
- Perawat: Perawat Pelaksana, Perawat Primer/PJ, Perawat Spesialis (ICU/OK/Anestesi)
- Bidan (Midwife)
- Apoteker & Tenaga Teknis Kefarmasian
- Analis Laboratorium (ATLM)
- Radiografer
- Ahli Gizi (Dietitian)
- Fisioterapis / Okupasi Terapis / Terapis Wicara
- Perekam Medis (Medical Recorder)

> **Open point:** nurses/pharmacists/technicians are clinical but not doctors.
> Either (a) broaden Tier 3 to "Clinical/Care Provider" and keep them as
> sub-roles, (b) add a 4th tier "Staff/Clinician", or (c) keep 3 strict tiers.
> See §10.

## 7. Permission matrix (sketch)

`R` = read, `W` = write/act, `—` = no access, `scoped` = own dept/assignment.

| Module | Executive | Manager | Doctor/Clinical |
| --- | --- | --- | --- |
| Org / exec dashboards | R | scoped | — |
| Patients & charts | R | scoped R | scoped R/W |
| Vitals / EWS / diagnoses | R | scoped R | scoped W |
| Prescriptions / dispense | R | scoped | W (role-limited) |
| Wards / beds | R | W (own) | R |
| Staff management | R | W (own dept) | — |
| Billing / invoices / tariffs | R/W | scoped | — |
| Formulary / stock | R | W (pharmacy) | R |
| Audit trail | R | scoped R | — |
| Devices / fleet | R | scoped | R (own) |
| IT ops (`abecca_it`) | R | IT mgr: W | — |
| Company / user / billing admin | company-admin only | — | — |

Granularity beyond tier comes from the **sub-role** (e.g., only Pharmacy roles
write formulary; only IT Manager writes IT ops). Final matrix to be refined with
you.

## 8. Bundles _(draft — names/features/prices to confirm)_

| | **Starter** | **Professional** | **Enterprise** |
| --- | --- | --- | --- |
| Target | Klinik / RS kecil | RS menengah | RS besar / grup |
| Apps | `main` | `main` + `admin` | `main` + `admin` + `it` |
| Seats | up to N₁ | up to N₂ | large / custom |
| Features | clinical core, audit | + billing, wards, staff, formulary | + device integration, IT ops, SSO, priority support |
| Price (IDR/mo) | _TBD_ | _TBD_ | _TBD_ |

Differentiation axis (module access vs. seats vs. hybrid) and pricing are your
call — see §10.

## 9. Phased delivery plan

- **Phase 0 — Design (this doc)** + RBAC constants (`role_tier`, `sub_role`
  catalogue) as typed data.
- **Phase 1 — Auth & tenancy:** companies/users schema, register-company +
  login (Company ID + password), sessions, RBAC guard, tenant scoping.
- **Phase 2 — Billing:** Stripe products/prices, Checkout, webhooks,
  entitlements, Customer Portal.
- **Phase 3 — Onboarding & provisioning:** company form + employee bulk import,
  webhook provisioning, credential email.
- **Phase 4 — RBAC enforcement:** role/sub-role gating across UI + company-admin
  user management screens.
- **Phase 5 — Hardening:** per-tenant RLS, seat enforcement, auth audit trail,
  dunning on failed payments.

## 10. Open decisions (need your input)

1. **Credential model** — Company ID (tenant) + per-employee password
   (recommended) vs. Supabase Auth email/password + tenant tag vs. single shared
   company login.
2. **Bundle differentiation & pricing** — module access (drafted) vs. seats vs.
   hybrid; and the IDR monthly prices.
3. **Clinical tier scope** — broaden Tier 3 to "Clinical/Care Provider" (incl.
   nurses/pharmacists/techs) vs. add a 4th tier vs. keep 3 strict.
4. **Password issuance** — system auto-generates vs. registrant self-sets (or
   both: auto for admin, invite link for employees).
5. **Email provider** — Resend (recommended) vs. SMTP vs. Supabase.
