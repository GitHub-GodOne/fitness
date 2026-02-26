# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Object2Workout — a full-stack AI SaaS fitness app built on the ShipAny Template Two. Users upload objects/images and get AI-generated workout videos. Built with Next.js 16 (App Router), React 19, TypeScript 5, and Tailwind CSS 4.

## Commands

```bash
pnpm dev                # Dev server with Turbopack
pnpm build              # Production build
pnpm build:fast         # Build with 4GB heap
pnpm lint               # ESLint
pnpm format             # Prettier
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Run migrations
pnpm db:push            # Push schema directly to DB
pnpm db:studio          # Open Drizzle Studio
pnpm rbac:init          # Initialize RBAC roles/permissions
pnpm cf:deploy          # Build + deploy to Cloudflare
```

## Architecture

### Path alias
`@/*` → `./src/*`

### Directory layout
- `src/app/` — Next.js App Router. Routes are under `[locale]/` for i18n. Major route groups: `(admin)/`, `(landing)/`, `(auth)/`, `(activity)/`.
- `src/app/api/` — API routes (REST endpoints for admin, payments, AI tasks, webhooks).
- `src/config/` — All configuration: DB schema (`db/schema.ts`), locale messages (`locale/messages/{en,zh}/`), styles, theme config.
- `src/core/` — Infrastructure: auth (Better Auth), database connection (Drizzle + Postgres), i18n (next-intl), RBAC, theme system.
- `src/extensions/` — Pluggable feature modules: `ai/` (Volcano, Replicate, Gemini, OpenRouter providers), `payment/` (Stripe, PayPal, Creem), `storage/` (Cloudflare R2), `email/` (Resend), `analytics/`, `ads/`, `affiliate/`, `customer-service/`.
- `src/shared/` — Shared code: `blocks/` (reusable UI blocks), `components/` (shadcn/ui-based), `contexts/`, `hooks/`, `lib/`, `models/` (data access layer), `services/` (business logic), `types/`, `utils/`.
- `src/themes/` — Theme implementations (currently `default/`).

### Key patterns
- **Database**: Drizzle ORM with PostgreSQL. Schema lives in `src/config/db/schema.ts`. Drizzle config at `src/core/db/config.ts`. Supports configurable schema name via `DB_SCHEMA` env var.
- **Auth**: Better Auth (`src/core/auth/`). RBAC with roles and permissions initialized via `scripts/init-rbac.ts`.
- **i18n**: next-intl with `en` and `zh` locales. Messages are split into namespaced JSON files under `src/config/locale/messages/{locale}/`. Locale prefix mode is `as-needed` (default locale has no prefix). When adding a new i18n namespace, register it in `src/config/locale/index.ts` → `localeMessagesPaths`.
- **AI providers**: Modular provider system in `src/extensions/ai/`. Each provider (Volcano, Replicate, Gemini, OpenRouter) is a separate file.
- **Payment**: Multi-provider support (Stripe, PayPal, Creem) in `src/extensions/payment/`.
- **Storage**: Cloudflare R2 via aws4fetch in `src/extensions/storage/`. CDN domain configurable via `NEXT_PUBLIC_CDN_DOMAIN`.
- **UI**: shadcn/ui components with Radix primitives. Icons from `@tabler/icons-react` and `lucide-react`. Animations via Framer Motion.
- **Data layer**: Models in `src/shared/models/` handle DB queries. Services in `src/shared/services/` contain business logic.
- **Docs**: fumadocs-mdx for documentation pages. MDX source generated to `.source/`.

### Environment
Config is centralized in `src/config/index.ts` which reads env vars with defaults. Key vars: `DATABASE_URL`, `DATABASE_PROVIDER`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CDN_DOMAIN`, `R2_BUCKET_NAME`, `DB_SCHEMA`.

### Deployment
Supports both Vercel (auto-detected, no `output: standalone`) and Cloudflare Workers (via `opennextjs-cloudflare`). Cloudflare types generated with `pnpm cf:typegen`.
