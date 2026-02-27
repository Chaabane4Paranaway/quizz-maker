# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + client + server)
npm run install:all

# Dev mode (client on :3001, server on :3000)
npm run dev

# Build everything (Next.js static export + server TypeScript)
npm run build

# Start production server
npm run start
```

## Architecture

Monolithic SaaS app where the Hono server (`server/`) both serves the API and hosts the Next.js static export (`client/out/`). A single Railway deployment runs both.

**Stack:** Next.js 15 (static export), React 19, Tailwind CSS, Hono, SQLite via better-sqlite3, JWT auth.

```
survey-app/
├── client/src/app/
│   ├── page.tsx           # Home — token entry + admin login toggle
│   ├── admin/page.tsx     # Admin panel — create surveys, list with tokens
│   ├── survey/page.tsx    # Participant flow — pseudo → priority voting → done
│   ├── results/page.tsx   # Admin stats — Recharts bar chart + ranking cards
│   └── lib/api.ts         # Shared apiCall() wrapper (attaches admin JWT)
└── server/src/
    ├── index.ts           # Hono app — mounts API routes, serves static files, SPA fallback
    ├── db.ts              # SQLite init + schema (surveys, responses tables)
    └── routes/
        ├── auth.ts        # POST /api/auth/login → JWT (single admin user)
        └── surveys.ts     # CRUD surveys + POST /:token/respond + GET /:token/stats
```

## Key Design Decisions

**Auth:** Single admin user (`mindmaster2027`). JWT stored in `localStorage` as `admin_token`. All admin API routes call `verifyAdmin()` from `auth.ts`.

**Scoring algorithm:** For a participant who selected N choices, rank 1 gets N points, rank 2 gets N-1 points, …, rank R gets N-R+1 points. Scores are summed across all respondents.

**SPA routing:** The server maps `/admin`, `/survey`, `/results` to their respective `index.html` files from the Next.js static build. All unmatched routes fall back to the root `index.html`.

**Uniqueness:** Survey tokens are 6-character alphanumeric (A-Z, 0-9), generated with a retry loop to guarantee uniqueness. Participant pseudo + survey token forms a unique constraint to prevent duplicate responses.

## Environment Variables

```
PORT=3000                    # Set automatically by Railway
JWT_SECRET=...               # Secret for signing admin JWTs
DB_PATH=./data/survey.db     # SQLite file location
```
