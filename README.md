# Omni-Med Nexus

> **Advance-Medical-OS** — an early-stage scaffold for a multi-tenant medical operating
> system aimed at hospital and clinic networks (the "Abecca" ecosystem).

> [!WARNING]
> **Project status: early scaffold.** The major building blocks exist independently —
> a Rust core engine, four Next.js front-ends, and Terraform-managed cloud
> infrastructure — but they are **not yet wired together end-to-end**. The front-ends
> render static / placeholder UI, and the core engine is currently a library with no
> API server. Treat this repository as an architectural skeleton, not a production system.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Front-ends (Next.js 16 · React 19 · Tailwind 4)             │
│  abecca_main · abecca_admin · abecca_demo · abecca_it         │
└──────────────────────────────────────────────────────────────┘
                   ▲  (integration layer not built yet)
┌──────────────────────────────────────────────────────────────┐
│  Core engine (Rust library)                                  │
│  blockchain audit · AES-256-GCM · Postgres/Redis pools · seed │
└──────────────────────────────────────────────────────────────┘
                   ▲
┌──────────────────────────────────────────────────────────────┐
│  Data: PostgreSQL 15 · Redis 7 · Qdrant   (docker-compose)   │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│  Infra: Terraform → GCP (Cloud SQL HA, VPC) · asia-southeast1 │
└──────────────────────────────────────────────────────────────┘
```

## Repository layout

```
Advance-Medical-OS/
├── .github/workflows/ci_cd_pipeline.yml   # CI: Rust, web apps, Terraform
└── omni-med-nexus/
    ├── core_engine/               # Rust library: blockchain audit, AES-256-GCM, DB pools, seeder
    ├── abecca_main/               # Next.js — clinical portal (public-facing)
    ├── abecca_admin/              # Next.js — hospital administration (internal)
    ├── abecca_demo/               # Next.js — demo & training sandbox (internal)
    ├── abecca_it/                 # Next.js — IT operations console (internal)
    ├── infrastructure/terraform/  # GCP: Cloud SQL (HA), VPC
    └── docker-compose.yml         # Local PostgreSQL + Redis + Qdrant
```

## Tech stack

| Layer          | Technology                                                     |
| -------------- | -------------------------------------------------------------- |
| Front-ends     | Next.js 16, React 19, Tailwind CSS 4, TypeScript               |
| Core engine    | Rust (edition 2024) — `aes-gcm`, `sha2`, `sqlx`, `redis`, `tokio` |
| Data           | PostgreSQL 15, Redis 7, Qdrant                                 |
| Infrastructure | Terraform, Google Cloud Platform (Cloud SQL, VPC)             |
| CI             | GitHub Actions                                                 |

## Getting started

**Prerequisites:** Rust (stable), Node.js 20+, Docker. Terraform 1.x is optional
(only needed to work on the infrastructure).

### 1. Local data services

```bash
cd omni-med-nexus
docker compose up -d   # PostgreSQL :5432, Redis :6379, Qdrant :6333/:6334
```

### 2. Core engine (Rust)

```bash
cd omni-med-nexus/core_engine
cargo test                      # run unit tests
cargo clippy -- -D warnings     # lint
cargo fmt --all -- --check      # formatting check
```

### 3. Web apps (Next.js)

Each app is independent. For example:

```bash
cd omni-med-nexus/abecca_main
npm install
npm run dev                     # http://localhost:3000
```

To run several apps at once, give each its own port: `npm run dev -- -p 3001`.
The four apps are: `abecca_main`, `abecca_admin`, `abecca_demo`, `abecca_it`.

#### Deploying the front-ends

Each app is a self-contained Next.js project, ready to deploy to a PaaS such as
Vercel or Netlify. Set the project root to the app directory (e.g.
`omni-med-nexus/abecca_main`); the bundled `vercel.json` pins the Next.js preset.

Per-app production hardening is already in place: security headers
(`next.config.ts`), full SEO/OpenGraph metadata, PWA manifest, `robots.txt` and
`sitemap.xml`, plus `not-found` / `error` / `loading` boundaries. Each app's
public identity lives in `src/config/site.ts`. Set `NEXT_PUBLIC_SITE_URL` (see
`.env.example`) so canonical URLs, `robots.txt` and the sitemap resolve to the
real domain. `abecca_main` is indexable; the admin, demo and IT consoles are
marked `noindex` by default.

### 4. Infrastructure (Terraform, optional)

```bash
cd omni-med-nexus/infrastructure/terraform
terraform init -backend=false
terraform fmt -check
terraform validate
```

## Continuous integration

`.github/workflows/ci_cd_pipeline.yml` runs on push / pull request to `main` and
`staging`:

- **core-engine-tests** — `cargo fmt`, `cargo clippy -D warnings`, `cargo test`
- **web-apps** — `npm ci`, `npm run lint`, `npm run build` for all four apps (matrix)
- **infrastructure-validation** — `terraform fmt -check`, `terraform validate`

## Security notes

- Patient PII (SSN, medical history) is encrypted with AES-256-GCM
  (`core_engine/src/security/encryption.rs`).
- `SecurityManager::new()` generates an **ephemeral in-memory key** intended for tests.
  In production, load a stable key from a secret manager / KMS and construct the manager
  with `SecurityManager::from_key()`.
- The audit trail (`core_engine/src/blockchain/`) hashes each record with SHA-256 into an
  append-only chain for tamper-evident logging.
