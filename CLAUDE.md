# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered SaaS application ("Fear Not") built on the ShipAny framework. Generates AI videos, images, and music. Uses Next.js 16 App Router with locale-based routing, Drizzle ORM with PostgreSQL, Better Auth for authentication, and multiple payment providers (Stripe, PayPal, Creem).

## Commands

```bash
npm run dev              # Dev server with Turbopack
npm run build            # Production build
npm run lint             # ESLint
npm run format           # Prettier format
npm run format:check     # Prettier check

# Database (Drizzle Kit)
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema directly to DB
npm run db:studio        # Open Drizzle Studio

# Auth & RBAC
npm run auth:generate    # Generate Better Auth types
npm run rbac:init        # Initialize RBAC roles (npx tsx scripts/init-rbac.ts)
npm run rbac:assign      # Assign roles (npx tsx scripts/assign-role.ts)

# Cloudflare deployment
npm run cf:deploy        # Build and deploy to Cloudflare
```

## Architecture

### Path Alias

`@/*` maps to `./src/*`. Example: `@/shared/components/ui/button`.

### Source Layout (`src/`)

- **`app/`** — Next.js App Router. All pages are under `[locale]/` for i18n routing. Route groups: `(landing)` for user-facing pages, `(auth)` for auth flows, `(chat)` for chat UI, `(admin)` for admin dashboard, `(docs)` for documentation. API routes live in `app/api/`.
- **`core/`** — Infrastructure singletons: auth (`core/auth/`), database (`core/db/`), i18n (`core/i18n/`), RBAC (`core/rbac/`), theme (`core/theme/`), docs (`core/docs/`).
- **`config/`** — App configuration. `config/index.ts` exports `envConfigs` with all environment variables. `config/db/schema.ts` is the Drizzle database schema.
- **`shared/`** — Shared code used across the app:
  - `components/ui/` — shadcn/ui components (new-york style, Lucide icons)
  - `blocks/` — Feature-level UI blocks (generator, payment, chat, admin, dashboard, etc.)
  - `services/` — Business logic layer (ai, payment, storage, email, video processing)
  - `models/` — Data access layer (credit, order, chat, notification, etc.)
  - `hooks/` — Custom React hooks
  - `lib/` — Pure utility functions
  - `types/` — TypeScript type definitions
- **`extensions/`** — Pluggable integrations: payment providers (`stripe.ts`, `paypal.ts`, `creem.ts`), storage providers (`s3.ts`, `r2.ts`), AI providers (`fal.ts`, `kie.ts`), customer service (`crisp/`, `tawk/`).

### Key Patterns

- **Locale routing**: All user-facing routes are under `app/[locale]/`. Uses `next-intl` with config at `core/i18n/request.ts`.
- **Database**: Drizzle ORM. Schema at `src/config/db/schema.ts`. Drizzle Kit config at `src/core/db/config.ts`. Supports PostgreSQL, SQLite, MySQL, Turso via `DATABASE_PROVIDER` env var.
- **Auth**: Better Auth at `core/auth/`. Client-side auth via `core/auth/client.ts`.
- **Service layer**: API routes call services in `shared/services/`, which call models in `shared/models/` for data access.
- **MDX content**: Blog posts, docs, and pages in `content/` directory. Powered by fumadocs-mdx.
- **PM2 production**: `ecosystem.config.js` runs the app and a cron job (`sync-pending-tasks.ts` every 10 min).

### shadcn/ui Configuration

Components install to `@/shared/components/ui`. Utils at `@/shared/lib/utils`. Hooks at `@/shared/hooks`. Global CSS at `src/config/style/global.css`.

## Development Standards (from Agent.md)

- **No hardcoded text** — All user-visible strings must use i18n (`useI18n()` / `t()`)
- **Mobile-first** responsive design with progressive enhancement for desktop
- **Structured logging** — Use `logger.error("module.action.failed", { context })`, never raw `console.log`
- **Service layer separation** — Components should not call APIs directly; use services
- **File size limit** — Keep files under 300 lines; split if larger
- **Reuse ShipAny built-ins** before creating new abstractions
