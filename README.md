# RegTriage — Regulatory Intelligence Triage Pipeline

A full-stack application for regulatory compliance officers to view, triage, and manage simulated regulatory updates. Built with a **dense, workstation-style UI** designed for rapid information processing.

---

## 🚀 Quick Start (< 5 Minutes)

### Prerequisites
- **Node.js** ≥ 18
- **PostgreSQL** 14+ (via Docker, Homebrew, Postgres.app, or any local install)

### Option A: Using Neon Cloud PostgreSQL (Fastest — Zero Local DB Setup)
If using cloud Neon PostgreSQL (or your own cloud database):
```bash
# 1. Copy sample environment file
cp .env.example .env

# 2. Add your Neon pooled and direct connection strings in .env:
#    DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.neon.tech/neondb?sslmode=require"
#    DATABASE_URL_UNPOOLED="postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require"

# 3. Setup (generates client, pushes schema, seeds mock messy data)
npm run setup

# 4. Start both backend and frontend concurrently
npm run dev
```

### Option B: Using Docker (Recommended for Local Dev)
```bash
# 1. Start PostgreSQL container
docker compose up -d

# 2. Install dependencies, generate client, push schema, seed data
npm run setup

# 3. Start both backend and frontend
npm run dev
```

### Option C: Using Existing Local PostgreSQL
```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE regtriage;"

# 2. Configure .env with your local credentials:
#    DATABASE_URL="postgresql://postgres:password@localhost:5432/regtriage?schema=public"
#    DATABASE_URL_UNPOOLED="postgresql://postgres:password@localhost:5432/regtriage?schema=public"

# 3. Setup & launch
npm run setup
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

---

## 🏗️ Architecture

```
regTriage/
├── docker-compose.yml          # PostgreSQL 16 (optional)
├── packages/
│   ├── db/                     # Prisma ORM + Seed Script
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema (5 entities)
│   │   │   └── seed.ts         # Mock data with intentional anomalies
│   │   └── src/client.ts       # Shared Prisma client
│   ├── server/                 # Hono API Server
│   │   └── src/
│   │       ├── routes/         # REST endpoints
│   │       ├── services/       # DataQualityService (anomaly detection)
│   │       ├── validators/     # Zod schemas
│   │       └── middleware/     # Error handling
│   └── web/                    # React + Vite Frontend
│       └── src/
│           ├── components/     # Triage table, detail panel, filters
│           ├── hooks/          # TanStack Query hooks
│           └── api/            # API client
```

**Layered Backend Architecture:**
```
Request → Route → Zod Validator → Service → Prisma ORM → PostgreSQL
                                    ↕
                          DataQualityService (anomaly detection)
```

---

## 📊 Database Schema

```
┌──────────────────────┐       ┌──────────────────────────┐       ┌──────────────────┐
│  RegulatoryAuthority │       │   ComplianceDirective    │       │    ActionItem     │
├──────────────────────┤       ├──────────────────────────┤       ├──────────────────┤
│ id (PK, UUID)        │──┐    │ id (PK, UUID)            │──┐    │ id (PK, UUID)    │
│ name (UNIQUE)        │  └───>│ authority_id (FK)         │  └───>│ directive_id(FK) │
│ acronym (UNIQUE)     │       │ reference_code            │       │ assignee_id (FK) │
│ jurisdiction         │       │ title                     │       │ title            │
│ website_url          │       │ description (TEXT)        │       │ notes (TEXT)     │
└──────────────────────┘       │ category (ENUM)           │       │ priority (ENUM)  │
                               │ severity (ENUM)           │       │ status (ENUM)    │
┌──────────────────────┐       │ status (ENUM)             │       │ due_date         │
│   AffectedProduct    │       │ effective_date            │       │ resolved_at      │
├──────────────────────┤       │ comment_deadline          │       │ is_flagged       │
│ id (PK, UUID)        │<─────>│ published_date            │       │ has_data_anomaly │
│ name                 │  M:N  │ raw_metadata (JSONB)      │       │ anomaly_details  │
│ ndc_code (nullable)  │       │ has_data_anomaly          │       └──────────────────┘
│ therapeutic_area     │       │ anomaly_details           │              │
└──────────────────────┘       └──────────────────────────┘              │
                               ┌──────────────────────┐                  │
                               │      Assignee        │<─────────────────┘
                               ├──────────────────────┤
                               │ id (PK, UUID)        │
                               │ name                 │
                               │ email (UNIQUE)       │
                               │ department           │
                               └──────────────────────┘
```

### Why This Design

| Decision | Rationale |
|---|---|
| **5 entities** | Models the real regulatory domain — authorities issue directives, directives generate action items, action items are assigned to people, directives affect products |
| **Enums at DB level** | `category`, `severity`, `status`, `priority` are PostgreSQL enums preventing data corruption — no "pendng" typos |
| **`has_data_anomaly` + `anomaly_details`** | Backend-detected quality issues stored alongside data. Frontend renders visual ⚠️ flags without hiding bad data. This is the core architectural decision. |
| **Many-to-many (Directive ↔ Product)** | A recall can affect multiple drugs; a drug can be subject to multiple directives |
| **Nullable dates** | Real regulatory data often has missing effective dates or deadlines — intentional design, not a bug |
| **`raw_metadata` as JSONB** | Real regulatory feeds come with unstructured metadata. JSONB stores it without schema pollution while remaining queryable |
| **Strategic indexes** | Indexes on `status`, `severity`, `hasDataAnomaly`, and FK columns for fast filtered queries |

---

## ⚠️ Messy Data & Edge Cases

The seed script intentionally introduces **8 categories of data anomalies** that the backend's `DataQualityService` detects and flags:

| # | Anomaly | Detection Rule |
|---|---|---|
| 1 | Published directive with **missing effective date** | `status = PUBLISHED AND effective_date IS NULL` |
| 2 | **Overdue** action items still marked as PENDING | `status = PENDING AND due_date < NOW()` |
| 3 | **Withdrawn** directive with pending action items | Cross-entity status conflict check |
| 4 | **Malformed reference codes** | Regex: `/^[A-Z]{2,5}-\d{4}-[A-Z]-\d+$/` |
| 5 | **Critical P0** action items with no assignee | `priority = P0 AND assignee_id IS NULL` |
| 6 | Directive with **future published date** | `published_date > NOW()` |
| 7 | **Duplicate reference codes** | Count matching codes across directives |
| 8 | **Malformed descriptions** (embedded HTML/scripts, >5000 chars) | Regex detection + output sanitization |

### How the backend handles it:
- Anomalies are **flagged, not hidden** — `has_data_anomaly` and `anomaly_details` fields written to DB
- Malformed HTML in descriptions is **sanitized on API output** (`<script>` → `[SCRIPT_REMOVED]`)
- Anomaly detection **re-runs after every mutation** (status change, assignment, etc.) to catch state-transition anomalies (e.g., resolving an action item on a withdrawn directive)
- The frontend renders ⚠️ icons, amber row borders, and "Anomalies Only" filter toggle

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/directives` | List directives (paginated, filterable, sortable) |
| `GET` | `/api/directives/:id` | Get directive with action items & products |
| `PATCH` | `/api/directives/:id` | Update directive (triggers anomaly re-audit) |
| `GET` | `/api/action-items` | List action items (filterable, sortable) |
| `PATCH` | `/api/action-items/:id` | Update action item (triggers anomaly re-audit) |
| `GET` | `/api/authorities` | List regulatory authorities |
| `GET` | `/api/assignees` | List assignees |
| `GET` | `/api/stats/overview` | Aggregate counts for the stats bar |

### Query Parameters Example
```
GET /api/directives?page=1&limit=25&status=PUBLISHED&severity=CRITICAL&hasAnomaly=true&search=metformin&sortBy=severity&sortOrder=desc
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Database** | PostgreSQL 16 | Relational integrity, JSONB, native enums, robust indexing |
| **ORM** | Prisma 6 | Type-safe, excellent migrations, TS-first, spec preference |
| **Backend** | Hono | TypeScript-first, Web Standards (Request/Response), fast, modern |
| **Validation** | Zod | Runtime validation with TypeScript type inference |
| **Frontend** | React 19 + Vite 6 | Fast DX, SPA — no SSR needed for internal tools |
| **Table** | TanStack Table v8 | Headless, fully typed, built for data-dense UIs |
| **State** | TanStack Query v5 | Server state caching, background refetching, optimistic updates |

---

## 📋 Available Scripts

| Command | Description |
|---|---|
| `npm run setup` | Full setup: install → generate → migrate → seed |
| `npm run dev` | Start backend + frontend concurrently |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:seed` | Re-run the seed script |
| `npm run db:studio` | Open Prisma Studio (GUI DB browser) |

---

## 🎥 Loom Video Walkthrough Guide (5-Minute Script)

When recording your 5-minute walkthrough, hit these three core talking points:

### 1. The Schema (Why it is designed this way)
- **5 Relational Entities**: `RegulatoryAuthority`, `ComplianceDirective`, `ActionItem`, `AffectedProduct`, `Assignee`.
- **Domain Modeling**: Directives don't exist in a vacuum — they are issued by international authorities (FDA, EMA, PMDA) and impact real products (M:N join table). Action items represent the human accountability layer assigned to compliance officers.
- **Enums at the Database Level**: Native Postgres enums for `DirectiveCategory`, `Severity`, `DirectiveStatus`, `Priority`, and `ActionItemStatus`. Typos cannot enter the database.
- **Non-Destructive Anomaly Tracking**: Instead of rejecting or hiding messy data, we store `has_data_anomaly: Boolean` and `anomaly_details: Text` directly on the record. Real regulatory officers must see and resolve anomalies, not have them quietly dropped.
- **Unstructured Ingestion**: `raw_metadata: JSONB` captures unstructured ingestion feeds (source URLs, confidence scores, scrapers) without polluting the relational schema.

### 2. The Edge Cases (Handling "Messy Data" Chaos)
- **8 Distinct Anomaly Types Seeded**: Missing effective dates on published rules, overdue pending tasks, cross-entity status conflicts (withdrawn directive with active pending actions), malformed reference codes, unassigned P0 critical tasks, future published dates, duplicate reference codes, and malformed XSS/excessive text.
- **Dynamic Re-Auditing**: Anomaly detection isn't a one-time script — the `DataQualityService` re-audits directives and action items after every `PATCH` mutation. If you resolve an overdue task or reassign a P0 item, the anomaly clears automatically.
- **Output Sanitization**: Dangerous script tags in descriptions are sanitized to `[SCRIPT_REMOVED]` before reaching the frontend.

### 3. The AI Workflow (AI Hallucination & Resolution)
- **The AI Suggestion/Bug**: The AI assistant recommended using standard `prisma migrate dev --name init` against the Neon PostgreSQL instance.
- **How I Caught It**: When running the migration, the process stalled indefinitely. Investigating the database logs and serverless architecture revealed that `prisma migrate dev` attempts to create an ad-hoc shadow database (`CREATE DATABASE ..._shadow`), which serverless Postgres providers (like Neon) restrict.
- **How I Fixed It**: Replaced `prisma migrate dev` with `prisma db push` in `package.json`, and configured `directUrl = env("DATABASE_URL_UNPOOLED")` in `schema.prisma` to route schema sync directly past PgBouncer connection poolers.

---

## License

MIT
