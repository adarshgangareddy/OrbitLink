# OrbitLink — AI-Powered Network Intelligence Platform

OrbitLink is an AI-powered network intelligence, usage analytics, and connectivity optimisation platform. It is engineered to monitor real device-level network performance on your laptop, provide deterministic cost and usage analytics, predict connection quality, and simulate future telecommunications / satellite links.

---

## Visual Design System
- **Primary Accent**: Vivid Orange (`#F97316`)
- **Secondary Accent**: Burnt Orange (`#EA580C`)
- **Canvas / Background**: Clean White (`#FFFFFF`) with warm off-white highlights (`#FFF7F0`)
- **Text & Borders**: Charcoal (`#1F2937`) and neutral border grey (`#E5E7EB`)
- **Strict Constraint**: Zero blue/purple/indigo gradients; no fabricated measurements.

---

## Repository Structure

```
OrbitLink/
├── backend/                  # FastAPI Modular Monolith
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint and lifespan
│   │   ├── core/             # Configuration & logging
│   │   ├── database/         # SQLAlchemy 2.0 session & Base
│   │   ├── models/           # Declarative database models
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── monitoring/       # Hardware counters & network latency probes
│   │   ├── services/         # Database persistence & business logic
│   │   └── api/              # RESTful API routes (v1)
│   ├── alembic/              # Alembic database migration scripts
│   ├── tests/                # Automated pytest test suite
│   ├── requirements.txt      # Python dependencies
│   └── alembic.ini           # Migration settings
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Metric cards, status badges, UI components
│   │   ├── services/         # API client bindings
│   │   ├── types/            # TypeScript data contracts
│   │   ├── App.tsx           # Network Operations Dashboard
│   │   └── main.tsx          # Application entrypoint
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md       # Detailed technical architecture
│   └── CHECKLIST_14_DAYS.md  # 14-day implementation checklist
└── README.md
```

---

## Prerequisites

- **Python**: 3.10+ (tested with Python 3.14)
- **Node.js**: 18+ (tested with Node.js v24)
- **Git**: 2.30+
- **Database**: PostgreSQL 14+ (or development SQLite fallback)

---

## Quickstart & Local Setup

### 1. Backend Setup

From the repository root:

```bash
# On Linux / macOS:
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# On Windows (PowerShell):
python -m venv backend/.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r .\backend\requirements.txt
```

#### Database Configuration

By default, the backend looks for PostgreSQL using the `DATABASE_URL` environment variable:
```env
DATABASE_URL="postgresql+psycopg://orbitlink_user:orbitlink_pass@localhost:5432/orbitlink"
```

If you have PostgreSQL installed on your Ubuntu machine:
```bash
sudo -u postgres psql -c "CREATE USER orbitlink_user WITH PASSWORD 'orbitlink_pass';"
sudo -u postgres psql -c "CREATE DATABASE orbitlink OWNER orbitlink_user;"
```

Then run the migrations:
```bash
alembic upgrade head
```

> **Development Fallback Note**: If PostgreSQL is not currently running on your local machine, OrbitLink gracefully activates an automatic local development SQLite fallback (`sqlite:///./orbitlink.db`). This ensures you can develop and test immediately without blocking on database installation.

#### Start the Backend Server

```bash
uvicorn app.main:app --app-dir backend --reload --port 8000
```
- API Documentation (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Endpoint: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

- Web Dashboard: [http://localhost:5173](http://localhost:5173)

---

## Running the Automated Test Suite

### Backend Tests
OrbitLink includes automated tests for counter tracking, unit conversions (decimal GB vs binary GiB), rollover reset prevention, health check, and live measurement collection:

```bash
pytest backend/tests -v
```

### Frontend Type-Check & Build
```bash
cd frontend
npm run build
```

---

## Phase 1 Vertical Slice Capabilities

The Phase 1 release validates the end-to-end telemetry pipeline:
1. **Live Device Probing**: Reads actual system network counters (`psutil`) and tests roundtrip latency via ICMP ping (with HTTP fallback).
2. **Database Persistence**: Stores each measurement with full provenance, timestamps, interface metadata, and explicit `is_simulated = False` flags.
3. **Operations Dashboard**: Displays real download throughput, latency, data received, system health, and history table with the orange-accented minimalist visual design system.
