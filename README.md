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

## Quickstart & How to Run OrbitLink

OrbitLink consists of a **FastAPI backend** (port `8000`), a **React + Vite frontend** (port `5173`), and an optional **Auto-Git Sync daemon**.

---

### Step 1: Run the Backend Server

You can run the backend either from the **repository root** or from inside the **`backend`** directory.

#### Method A: From the `backend/` Directory (Recommended)

1. Open a terminal and navigate into `backend`:
   ```bash
   cd backend
   ```

2. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
     *(If script execution is disabled in PowerShell, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or use Method B below).*
   - **Windows (Command Prompt / CMD)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

3. Install dependencies (first time only):
   ```bash
   pip install -r requirements.txt
   ```

4. Start the Uvicorn server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Or directly using python module:*
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

---

#### Method B: Without Activating venv (Direct Executable)

If `uvicorn` is not in your global system PATH, run it directly using the virtual environment's Python binary:

- **Windows (From `backend` folder)**:
  ```powershell
  .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
  ```

- **Windows (From project root)**:
  ```powershell
  .\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
  ```

- **macOS / Linux (From `backend` folder)**:
  ```bash
  .venv/bin/python -m uvicorn app.main:app --reload --port 8000
  ```

- **macOS / Linux (From project root)**:
  ```bash
  backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --reload --port 8000
  ```

Once running:
- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

> **Database Automatic Fallback**: If a local PostgreSQL instance is not configured, OrbitLink automatically activates the local SQLite development database at `backend/orbitlink.db`. Zero setup required.

---

### Step 2: Run the Frontend Dashboard

In a **separate terminal window**:

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies (first time only):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser at:
   - **Web Application**: [http://localhost:5173](http://localhost:5173)

---

### Step 3: Run the Auto-Git Sync Daemon (Optional)

OrbitLink includes an autonomous Git daemon that automatically stages, commits, and pushes any local updates to GitHub (`origin main`) every 2 minutes:

From the project root:
- **Windows**:
  ```powershell
  .\backend\.venv\Scripts\python.exe scripts\auto_git_sync.py
  ```
- **macOS / Linux**:
  ```bash
  backend/.venv/bin/python scripts/auto_git_sync.py
  ```

---

## Running the Automated Test Suite

### Backend Tests (Pytest)
From the project root:
- **Windows**:
  ```powershell
  .\backend\.venv\Scripts\pytest backend\tests -v
  ```
- **macOS / Linux**:
  ```bash
  backend/.venv/bin/pytest backend/tests -v
  ```
*All 21 unit & integration tests cover cost optimization, quality diagnostics, bandwidth scheduler, environmental calculations, ML forecasting, and AI RAG.*

### Frontend Type-Check & Production Build
From `frontend/`:
```bash
cd frontend
npm run build
```
*(Runs `tsc -b && vite build` to ensure 0 TypeScript compilation or bundling errors).*

---

## Core Capabilities & Feature Overview

OrbitLink is organized into 6 production optimization engines:

1. **Feature A — AI Internet Cost Optimizer**:
   - Deterministic financial model analyzing your actual measured interface data vs. configured plans.
   - Computes itemized monthly bills, allowance overage penalties, and net annual savings.
   - Evaluates suitability ratings (`Optimal`, `Viable`, `Risky`, `Unsuitable`) with zero fabricated ISP plans.

2. **Feature B — Network Quality Intelligence**:
   - Real RFC 3393 inter-arrival jitter, loaded-vs-idle bufferbloat identification, and Wi-Fi RF multi-wall attenuation diagnostics.
   - Before-and-after fix verification engine (`POST /api/v1/diagnostics/verify`) measuring empirical improvement.

3. **Feature C — Smart Bandwidth Efficiency & Off-Peak Scheduler**:
   - 24-hour diurnal demand heatmap from hourly interface observations.
   - Candidate off-peak window recommendation (e.g. `00:00 – 04:00`) with safe 70% throughput utilization (30% safety headroom for interactive traffic).

4. **Feature D — Environmental & Resource Transmission Efficiency**:
   - Transparent lifecycle network transmission energy (kWh) and GHG emissions (kg CO2e) derived from physical interface counters.
   - Grounded in peer-reviewed models (Aslan et al. 2018 / IEA 2022: `0.015 kWh/GB`, `475 g CO2e/kWh`).

5. **Feature E — Grounded AI Assistant & RAG**:
   - Answers technical network questions with verifiable citations and zero hallucination.
   - Executes 6 deterministic backend calculation tools with offline fallback.

6. **Feature F — Machine Learning Usage Forecasting**:
   - 7-day chronological horizon projection with 95% confidence bounds.
   - Rolling 3-day baseline comparison with tracked historical MAE and RMSE error metrics.

---

## Visual Design System & Starlink Telemetry
- **Deep Space Aerospace Aesthetic**: Deep charcoal (`#080C14` / `#0E1526`), electric cyan (`#00E5FF`), vivid Starlink orange (`#FF6B00`), and emerald accents.
- **Starlink Dish Status**: Real-time motor azimuth/elevation, hemispherical sky obstruction dome, thermal sensors, and LEO satellite transceiver link budget.
- **3-Stage Speedtest**: Device &rarr; Router (Wi-Fi) &rarr; Terminal (Cat6 PoE) &rarr; CDN Payload with radial arc speedometer.
