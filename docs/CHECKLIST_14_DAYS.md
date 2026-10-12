# OrbitLink 14-Day Implementation Checklist

This checklist tracks the delivery of OrbitLink for the college hackathon demonstration, ensuring incremental validation and tested vertical slices.

---

## Phase 1: Environment, Scaffolding & Vertical Slice (Days 1–2) — [COMPLETED]
- [x] **Environment Inspection**: Check availability of Python, Node.js, Git, and PostgreSQL.
- [x] **Project Repository**: Initialize Git version control and configure root `.gitignore`.
- [x] **Architecture Blueprint**: Document modular monolith architecture in `docs/ARCHITECTURE.md`.
- [x] **Implementation Checklist**: Establish 14-day roadmap in `docs/CHECKLIST_14_DAYS.md`.
- [x] **Backend Scaffolding**: Setup FastAPI application structure with Pydantic v2 schemas and settings.
- [x] **Database Engine & Model**:
  - [x] Setup SQLAlchemy 2.x session with PostgreSQL configuration and development SQLite fallback.
  - [x] Implement `NetworkMeasurement` model in `app/models/measurement.py`.
- [x] **Database Migrations**: Setup Alembic and generate initial migration `050e515e057c_create_network_measurements_table.py`.
- [x] **Network Probing Service**:
  - [x] Implement `counters.py` (reads interface counters via `psutil`, handles reboot counter resets, formats bytes).
  - [x] Implement `probes.py` (ICMP ping probe with HTTP fallback for restricted campus Wi-Fi).
  - [x] Implement `agent.py` for live snapshot capture.
- [x] **API Endpoints**:
  - [x] `GET /api/v1/health` (database health, active engine, timestamp).
  - [x] `POST /api/v1/measurements/collect` (live probe and database persistence).
  - [x] `GET /api/v1/measurements/latest` (most recent measurement retrieval).
  - [x] `GET /api/v1/measurements/history` (paginated history).
- [x] **Automated Tests**:
  - [x] Test health and root endpoints.
  - [x] Test counter delta calculations and rollover protection.
  - [x] Test measurement persistence and retrieval.
  - [x] Test live measurement collection.
- [x] **Frontend Scaffolding**:
  - [x] Initialize Vite React TypeScript project.
  - [x] Configure Tailwind CSS and OrbitLink color design tokens (#F97316 accent, warm off-white, clean white).
  - [x] Implement responsive layout with KPI cards matching the specification and design mockup.
  - [x] Connect frontend to FastAPI backend for live measurement collection and telemetry.

---

## Phase 2: Monitoring Enhancements & Real Persistence (Days 3–4) — [COMPLETED]
- [x] **Live Throughput Speed Test**:
  - [x] Implemented controlled, rate-limited download throughput test (`POST /api/v1/tests/run`) using CDN sample payloads.
  - [x] Calculated throughput in Mbps based on exact byte transfer duration.
- [x] **Multiplatform Wi-Fi Extraction**:
  - [x] Implemented Windows `netsh wlan show interfaces` parser for active SSID and signal percentage.
  - [x] Implemented Linux `nmcli` Wi-Fi parser with fallback.
- [x] **Full-Screen SaaS Dashboard Layout**:
  - [x] Built persistent sidebar (`AppSidebar.tsx`) across all 9 application navigation sections.
  - [x] Implemented unified toast alert notification system.
- [x] **Throughput Visualisation**:
  - [x] Implemented interactive Recharts time-series chart (`ThroughputChart.tsx`) displaying chronological speed test results.
- [x] **Periodic Background Collector Daemon**:
  - [x] Implemented thread-safe `NetworkCollectorDaemon` (`app/monitoring/collector.py`) with configurable polling intervals.
  - [x] Added automated background collection loop with graceful startup and shutdown in FastAPI lifespan (`app/main.py`).
  - [x] Implemented collector management API endpoints:
    - `GET /api/v1/collector/status`
    - `POST /api/v1/collector/start`
    - `POST /api/v1/collector/stop`
    - `POST /api/v1/collector/config`
    - `POST /api/v1/collector/collect-now`
- [x] **Session-Level Network Tracking & Storage**:
  - [x] Designed `NetworkSession` database model (`app/models/session.py`) and added `session_id` to `NetworkMeasurement`.
  - [x] Created Alembic migration `7a1e2f3d4c5b_add_network_sessions_and_session_id.py`.
  - [x] Implemented `app/services/session_service.py` for session lifecycle, running duration, baseline byte offsets, and real-time latency aggregation.
  - [x] Implemented session API endpoints:
    - `POST /api/v1/sessions/start`
    - `POST /api/v1/sessions/stop`
    - `GET /api/v1/sessions/active`
    - `GET /api/v1/sessions`
    - `GET /api/v1/sessions/{session_id}`
- [x] **Frontend Session & Collector Integration**:
  - [x] Implemented `SessionTrackerCard.tsx` with live active timer, daemon controls, quick-label tags, and metrics overview.
  - [x] Implemented `SessionHistoryTable.tsx` with formatted duration, download/upload splits, and latency benchmarks.
  - [x] Integrated daemon status and session tracking in Overview, Monitor, Usage, and History views.
- [x] **Automated Tests**:
  - [x] Added `tests/test_collector.py` for collector API endpoints and background daemon methods.
  - [x] Added `tests/test_sessions.py` for session lifecycle, metric aggregation, and database queries (10/10 test suite passing).

---

## Phase 3: Operations Dashboard & Time-Series Visualisations (Days 5–6)
- [ ] Build interactive Recharts time-series charts:
  - [ ] Network throughput over time (Mbps).
  - [ ] Latency and packet loss over time (ms, %).
  - [ ] Cumulative sent/received consumption.
- [ ] Add time range filters (1 Hour, 6 Hours, 24 Hours, 7 Days).
- [ ] Implement clean loading skeletons, empty states, and degraded connection indicators.

---

## Phase 4: Data Usage & Cost Analytics (Days 7–8)
- [ ] Implement user-configurable Internet Plans model and API (`internet_plans`).
- [ ] Create billing cycle calculation engine (monthly price, allowance, overage rates).
- [ ] Add deterministic Data Usage page with daily/weekly consumption totals.
- [ ] Implement video quality consumption comparison calculator.
- [ ] Unit-test all billing and overage calculations.

---

## Phase 5: Machine-Learning Network Quality Service (Days 9–10)
- [ ] Feature engineering pipeline (latency, loss, throughput, variability, time-of-day).
- [ ] Establish rule-based baseline model for comparison.
- [ ] Train scikit-learn Random Forest classifier for connection quality.
- [ ] Evaluate model (Precision, Recall, F1, Confusion Matrix) and save model versioning metadata.
- [ ] Expose `POST /api/v1/predictions/quality` with graceful fallback for insufficient training data.

---

## Phase 6: Deterministic Recommendations & Satellite Simulator (Days 11–12)
- [ ] Implement deterministic recommendation engine with traceable evidence and expected benefit.
- [ ] Build isolated Satellite Connectivity Simulator (`POST /api/v1/simulation/run`):
  - [ ] Simplified geometric propagation delay calculation.
  - [ ] Link capacity and user contention estimation.
  - [ ] Clear `SIMULATED` labeling on all outputs.
- [ ] Prepare optional AI Assistant / RAG scaffolding for network documentation query.

---

## Phase 7: Polish, Integration Verification & Pitch Preparation (Days 13–14)
- [ ] Run full end-to-end regression test suite.
- [ ] Verify clean startup on Ubuntu Linux environment.
- [ ] Document pitch walkthrough and hackathon demonstration script.
- [ ] Record backup demo walkthrough.
