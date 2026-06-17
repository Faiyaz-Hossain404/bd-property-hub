# BD Property Hub

A bilingual (English / বাংলা) real-estate marketplace for the Bangladesh market,
built expatriate-first. Property owners list land, apartments, buildings,
warehouses, and factories; buyers and renters discover them through a fast,
photography-forward catalog. Every deal is **intermediated** — buyers and
sellers never transact directly; platform staff broker each conversation in
real time. The platform also supports fractional co-ownership (group buying)
and installment-sale listings.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) · TypeScript · next-intl · Tailwind CSS |
| Backend | NestJS modular monolith · Mongoose |
| Database | MongoDB (Atlas in the cloud; local replica set in dev) |
| Real-time | Socket.IO + Redis adapter (`chat-gateway`) |
| Jobs | BullMQ workers (lifecycle, media, email, indexing) |
| Search / Geo | MongoDB Atlas Search · 2dsphere |
| Auth | Dual provider — Clerk **and** first-party email/password |
| Storage | Cloudflare R2 / Cloudinary (private bucket for sensitive documents) |
| Tooling | pnpm workspaces · Turborepo · Docker Compose |

## Monorepo Layout

```
app/
├─ apps/web/          # Next.js — public site, buyer/seller portals, admin
├─ apps/api/          # NestJS — REST API (/api/v1) + OpenAPI
├─ apps/chat-gateway/ # Socket.IO + Redis adapter
├─ apps/workers/      # BullMQ consumers & scheduled jobs
├─ packages/types/    # Shared DTOs / Zod schemas (one FE↔BE source of truth)
├─ packages/config/   # Shared lint / TS presets
├─ infra/             # IaC & deployment helpers
└─ docker-compose.yml # Local MongoDB (replica set) + Redis
```

## Prerequisites

- Node.js ≥ 20.11 (`.nvmrc` pins the version)
- pnpm ≥ 9 (`corepack enable` will provision it)
- Docker + Docker Compose (for local MongoDB and Redis)

## Getting Started

```bash
# 1. Install dependencies (from the app/ root)
pnpm install

# 2. Configure environment
cp .env.example .env        # then fill in any service keys you need

# 3. Start local infrastructure (MongoDB replica set + Redis)
pnpm infra:up

# 4. Run everything in dev
pnpm dev
```

Default local ports:

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Chat gateway | ws://localhost:4100 |
| MongoDB | mongodb://localhost:27017 |
| Redis | redis://localhost:6379 |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in watch mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint the workspace |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm test` | Run tests |
| `pnpm format` | Format with Prettier |
| `pnpm infra:up` / `infra:down` | Start / stop local MongoDB + Redis |
| `pnpm infra:reset` | Stop and **delete** local data volumes |

## Environment & Cost Model

The architecture is full-strength but runs **free during development** (MongoDB
Atlas M0 + local Docker, free tiers for third-party services) and becomes a paid
**config swap at launch** — no rewrite. Every secret lives in `.env`, which is
gitignored and never committed. See `.env.example` for the full list.

## Authentication

Two sign-in paths run side by side behind a single `AuthProvider` seam and
resolve to **one canonical user record**:

- **Clerk** — hosted UI, social login, MFA.
- **First-party** — email/password with Argon2id, OTP, and httpOnly sessions.

Authorization (RBAC + ownership checks) is identical regardless of how a user
signed in.

## Contributing

Branch and push workflows are codified as repository skills:

- **New feature** → `.claude/skills/feature-push/SKILL.md`
- **Bug fix** → `.claude/skills/bugfix-push/SKILL.md`

## License

Proprietary — © MorseGrid (a division of Systro AI LLC). All rights reserved.
