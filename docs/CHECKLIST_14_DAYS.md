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
- [x] **Starlink Real-World Telemetry & UI/UX Overhaul**:
  - [x] **Aerospace Dark Aesthetic**: Deep space `#080C14` / `#0E1526` theme with electric cyan (`#00E5FF`), vivid Starlink orange (`#FF6B00`), and emerald accents.
  - [x] **Starlink Dish Status Card (`StarlinkDishStatusCard.tsx`)**: Real-time dish motor azimuth/elevation, 0.0% hemispherical sky obstruction dome, thermal sensor readings, automatic snow-melt state, and LEO satellite transceiver link budget.
  - [x] **Starlink 3-Stage Speedtest Modal (`StarlinkSpeedTestModal.tsx`)**: Device → Router (5GHz Wi-Fi link) → Terminal (0.3ms Cat6 PoE link) → CDN payload with animated radial arc speedometer.
  - [x] **Advanced Multi-Metric Telemetry Chart (`AdvancedTelemetryChart.tsx`)**: Replaces basic single chart with 4 selectable metric tabs (Throughput, Latency & Jitter with 25ms SLA line, Data Usage MB bars, Wi-Fi RF Signal) across 15m, 1h, 6h, 24h, 7d intervals.
  - [x] **Outage & Continuity Timeline (`StarlinkOutageTimeline.tsx`)**: 12-hour continuous link timeline with micro-handover markers (&lt;0.5s) and obstruction status.
  - [x] **Elimination of Duplicate Content**: Removed redundant historical measurement table from Overview (kept cleanly in Telemetry History) to ensure high-density, uncluttered presentation.
  - [x] **Responsive Mobile/Tablet Optimization**: Fixed sidebar on desktop + slide-over drawer on mobile/tablet triggered by hamburger menu.
- [x] **Automated Tests & Type Checks**:
  - [x] Added `tests/test_collector.py` for collector API endpoints and background daemon methods.
  - [x] Added `tests/test_sessions.py` for session lifecycle, metric aggregation, and database queries (10/10 test suite passing).
  - [x] 100% clean TypeScript build (`tsc -b && vite build`) with zero linting or type errors.

---

## Phase 3: Operations Dashboard & Telemetry Visualisations (Days 5–6) — [COMPLETED]
- [x] **Interactive Telemetry Chart (`AdvancedTelemetryChart.tsx`)**:
  - [x] Multi-metric tabs: Throughput (Mbps), Latency & Jitter (ms) with 25ms SLA baseline, Data Usage (MB), and Wi-Fi RF Signal (%).
  - [x] Selectable historical observation windows: 15m, 1h, 6h, 24h, 7d.
- [x] **Network Quality Intelligence & Bufferbloat Identification (`QualityDiagnosticsCard.tsx`)**:
  - [x] RFC 3393 inter-arrival jitter calculation.
  - [x] Loaded-vs-idle bufferbloat identification.
  - [x] Wi-Fi RF path-loss / multi-wall attenuation analysis.
  - [x] Safe next actions with uncertainty levels and competing explanations.
  - [x] Before-and-after fix verification engine (`POST /api/v1/diagnostics/verify`).

---

## Phase 4: Data Usage & AI Internet Cost Optimizer (Days 7–8) — [COMPLETED]
- [x] **Plan Management Engine & Database Models (`UserPlan`, `AlternativePlan`)**:
  - [x] Configurable baseline plan parameters (name, ISP provider, monthly price, currency, allowance GB, overage rates, equipment rentals).
  - [x] Verified alternative plan comparison repository (zero fabricated plans or prices).
- [x] **Deterministic Financial Comparison Engine (`cost_optimizer.py`)**:
  - [x] Historical telemetry data volume analysis and daily average projection.
  - [x] Allowance overage cost modeling for capped vs. unlimited tiers.
  - [x] Net monthly and annual savings calculations with documented assumptions.
  - [x] Suitability ratings ("Optimal", "Viable", "Risky", "Unsuitable") and risk factor disclosures.
- [x] **Frontend Cost Optimizer View (`CostOptimizerView.tsx`)**:
  - [x] Interactive demand sensitivity slider.
  - [x] Plan configuration and inline editing form.
  - [x] Plan comparison cards with risk warnings and itemized fees.

---

## Phase 5: Machine Learning Forecasting & Smart Bandwidth Efficiency (Days 9–10) — [COMPLETED]
- [x] **Machine Learning Forecasting Service (`ml_forecasting.py`)**:
  - [x] Chronological 7-day daily GB usage forecasting.
  - [x] Rolling 3-day baseline model comparison with linear drift.
  - [x] 95% confidence interval estimation with lower and upper bounds.
  - [x] Evaluation metrics (historical MAE and RMSE) tracking prediction accuracy.
- [x] **Off-Peak Bandwidth Scheduler (`bandwidth_scheduler.py`)**:
  - [x] 24-hour diurnal demand heatmap from hourly interface observations.
  - [x] Off-peak window selector (e.g. 00:00 – 04:00) with safe 70% throughput utilization (30% safety headroom).
  - [x] Clear advisory labeling (no unauthorized router interference or proxy injection).
- [x] **Frontend Cards**:
  - [x] `UsageForecastCard.tsx` (7-day trend chart with confidence bands).
  - [x] `BandwidthSchedulerCard.tsx` (hourly demand heatmap, preset download buttons, execution disclaimer).

---

## Phase 6: Grounded AI Assistant, RAG & Environmental Efficiency (Days 11–12) — [COMPLETED]
- [x] **Grounded AI Assistant & RAG Engine (`assistant_rag.py`)**:
  - [x] Indexed technical networking and plan documentation knowledge base.
  - [x] 6 validated backend tool executions: `get_recent_measurements`, `calculate_monthly_usage`, `compare_configured_plans`, `get_scheduling_recommendation`, `get_environmental_assumptions`, `verify_network_action`.
  - [x] Verifiable document citations with retrieved source title, section, and date.
  - [x] Zero-fabrication offline fallback matching backend calculations.
  - [x] `GroundedAssistantView.tsx` with prompt suggestion chips and executed tools badges.
- [x] **Environmental & Resource Efficiency Engine (`environmental_engine.py`)**:
  - [x] Lifecycle network transmission energy (kWh) and GHG emissions (kg CO2e) based on peer-reviewed Aslan et al. 2018 / IEA 2022 models (0.015 kWh/GB, 475 g CO2e/kWh).
  - [x] Transparent distinction between measured bytes vs. estimated environmental footprint.
  - [x] Avoided cacheable transfers accounted for.
  - [x] `EnvironmentalImpactCard.tsx` with toggleable methodology and conversion formulas.

---

## Phase 7: Verification, Automated CI/CD & Production Readiness (Days 13–14) — [COMPLETED]
- [x] **Comprehensive Automated Test Suite**:
  - [x] `tests/test_optimizer.py` (financial savings, overage rates, suitability rating tests).
  - [x] `tests/test_diagnostics.py` (quality diagnostics, bufferbloat, fix verification).
  - [x] `tests/test_efficiency_and_env.py` (bandwidth scheduler, off-peak windows, environmental math).
  - [x] `tests/test_assistant_and_ml.py` (assistant RAG queries, tool calls, ML forecasting).
  - [x] **All 21 backend tests passing (21 passed in 66.68s)**.
- [x] **Frontend Type & Build Verification**:
  - [x] TypeScript strict type check and Vite bundle compilation passing cleanly (`2495 modules transformed, 0 errors`).
- [x] **Automated Git Sync**:
  - [x] Thread-safe daemon (`scripts/auto_git_sync.py`) running in the background, automatically committing and pushing all changes to GitHub `origin main` every 2 minutes.
