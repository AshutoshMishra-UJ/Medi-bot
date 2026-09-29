# MediBot — Phases 0 · 1 · 2 Backend

> Standalone, merge-ready Node.js + TypeScript backend for the MediBot AI Health Assistant.

---

## Quick Start

### 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 16+ | [postgresql.org](https://www.postgresql.org/download/windows/) |
| Python | 3.10+ | [python.org](https://www.python.org) |


### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your local PostgreSQL password + JWT_SECRET
```

### 3. Database Setup

```bash
# Create the database (run once)
psql -U postgres -c "CREATE DATABASE medibot_dev;"

# Run Prisma migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Python NER Service Setup

```bash
cd services/ner-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m spacy download en_core_sci_sm
```

### 6. Run All Services

Open 3 terminal windows:

```bash
# Terminal 1 — API Gateway (port 3000)
npm run dev:gateway

# Terminal 2 — Patient Service (port 3001)
npm run dev:patient

# Terminal 3 — Document Service (port 3002)
npm run dev:docs

# Terminal 4 — Python NER Service (port 8000)
cd services/ner-service
.venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 7. Verify Everything is Running

```bash
curl http://localhost:3000/health   # API Gateway
curl http://localhost:3001/health   # Patient Service
curl http://localhost:3002/health   # Document Service
curl http://localhost:8000/health   # Python NER Service
```

All four should return `{ "status": "ok" }`.

---

## Architecture

```
medibot/
├── apps/
│   ├── api-gateway/      Port 3000 — Auth + consent + audit + rate-limit + proxy
│   ├── patient-service/  Port 3001 — Patient 360 CRUD + AI Integration Contracts
│   └── document-service/ Port 3002 — Upload + OCR + NER + confidence gating
├── services/
│   └── ner-service/      Port 8000 — Python FastAPI + scispaCy NER
├── packages/
│   ├── db/               Shared Prisma client
│   ├── types/            Shared Zod schemas + TypeScript types
│   └── config/           Shared env loader
└── prisma/
    └── schema.prisma     Single database schema (18 models)
```

---

## API Reference

### Auth (`/auth` — public)
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login → returns JWT |
| POST | `/auth/consent` | Grant/revoke consent (requires auth) |
| GET | `/auth/me` | Get current user (requires auth) |

### Patient 360 (requires `Authorization: Bearer <token>` + consent)
| Method | Path | Description |
|---|---|---|
| POST | `/patients/:userId/profile` | Create patient profile |
| GET | `/patients/:patientId` | Full Patient 360 |
| GET | `/patients/:patientId/conditions` | List conditions |
| POST | `/patients/:patientId/conditions` | Add condition |
| GET | `/patients/:patientId/allergies` | List allergies |
| POST | `/patients/:patientId/allergies` | Add allergy |
| GET | `/patients/:patientId/medications` | List medications |
| POST | `/patients/:patientId/medications` | Add medication |
| PUT | `/patients/:patientId/medications/:id/stop` | Stop medication |
| GET | `/patients/:patientId/labs` | Lab history |
| POST | `/patients/:patientId/labs` | Add lab result |
| GET | `/patients/:patientId/timeline` | Medical timeline |
| GET | `/patients/:patientId/context` | **AI Contract** — query-scoped context |
| GET | `/patients/:patientId/wearables/readings` | Wearable readings |
| GET | `/patients/:patientId/wearables/trends` | Wearable trends |

### Encounters (AI Integration — Phase 3 Orchestrator uses these)
| Method | Path | Description |
|---|---|---|
| POST | `/encounters` | Create encounter |
| GET | `/encounters/:id` | Get encounter |
| PUT | `/encounters/:id/status` | Update status/risk |
| POST | `/encounters/:id/messages` | Append message |
| GET | `/encounters/:id/symptom-state` | Get symptom object |
| PUT | `/encounters/:id/symptom-state` | Update symptom object |
| POST | `/encounters/:id/toolcall` | Log tool call |
| POST | `/encounters/:id/modelrun` | Log model run |

### Documents (requires auth + consent)
| Method | Path | Description |
|---|---|---|
| POST | `/documents` | Upload document |
| GET | `/documents/:id/status` | Extraction status |
| GET | `/documents/:id/extracted` | Extracted fields |
| POST | `/documents/:id/confirm` | Confirm/reject fields |
| GET | `/documents/patient/:patientId` | List patient documents |

---

## Merge Guide

See [MERGE_GUIDE.md](./MERGE_GUIDE.md) for instructions on integrating MediBot with the main app BE.
