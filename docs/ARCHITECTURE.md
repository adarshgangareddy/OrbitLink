# OrbitLink Architecture Specification

## 1. System Vision & Overview

**OrbitLink** is an AI-powered network intelligence, usage analytics, and connectivity optimisation platform. The initial release is designed as an edge-capable network intelligence tool that monitors real device-level connectivity, measures latency and throughput, tracks bandwidth consumption, and provides diagnostic recommendations.

```
                      +------------------------------------+
                      |   OrbitLink Dashboard (React/TS)   |
                      |   Vite + Tailwind CSS + Lucide     |
                      +-----------------+------------------+
                                        | HTTP / JSON REST
                                        v
                      +-----------------+------------------+
                      |     OrbitLink FastAPI Backend      |
                      |  (Modular Monolith Architecture)   |
                      +---+--------------------+-------+---+
                          |                    |       |
            +-------------+                    |       +-------------+
            v                                  v                     v
+-----------------------+          +-------------------+   +--------------------+
| Local Network Prober  |          | SQLAlchemy 2.x    |   | Deterministic Rules|
|  - psutil IO counters |          | Session / ORM     |   | Engine & Analytics |
|  - ICMP / HTTP probe  |          +---------+---------+   +--------------------+
|  - Linux /proc/net/dev|                    |
+-----------------------+                    v
                                   +-------------------+
                                   | PostgreSQL (Prod) |
                                   | SQLite (Dev-fall) |
                                   +-------------------+
```

---

## 2. Layered Architecture

The application adopts a modular monolith structure designed for maintainability, testability, and zero unnecessary infrastructure overhead:

### 2.1 API & Presentation Layer (`app/api/`)
- **FastAPI** provides fast, asynchronous RESTful endpoints with automatic OpenAPI documentation (`/docs`).
- **Pydantic v2** enforces strict request/response data contracts and validation (`app/schemas/`).
- **Dependencies** (`app/api/dependencies.py`) inject scoped database sessions per request.

### 2.2 Core & Business Services (`app/services/`)
- `measurement_service.py`: Orchestrates persistence, delta calculations, unit conversions, and historical queries.
- `usage_service.py` *(Phase 2)*: Aggregates daily/weekly/session usage and applies billing plan formulas.
- `recommendation_service.py` *(Phase 3)*: Applies deterministic network advice based on verified observations.

### 2.3 Monitoring & Hardware Probes (`app/monitoring/`)
- `counters.py`:
  - Inspects active interfaces via `psutil.net_io_counters(pernic=True)`.
  - Supports `/proc/net/dev` on Linux.
  - Prevents negative counter deltas upon system reboot or interface reset.
  - Distinguishes decimal GB ($10^9$ bytes) from binary GiB ($2^{30}$ bytes).
- `probes.py`:
  - Primary: Low-overhead ICMP ping probe (`ping -c 1` on Linux, `ping -n 1` on Windows).
  - Fallback: Non-blocking HTTP HEAD probe (`/cdn-cgi/trace`) for environments where firewalls or college Wi-Fi restrict ICMP.
- `agent.py`:
  - Collects atomic snapshots of host connectivity.
  - Explicitly marks all live measurements with `is_simulated = False`.

### 2.4 Persistence Layer (`app/database/`, `app/models/`, `alembic/`)
- **SQLAlchemy 2.0**: Declarative ORM mapping with explicit typing.
- **Connection Strategy**:
  - Connects to PostgreSQL using `postgresql+psycopg://...`.
  - Configurable fallback to SQLite (`sqlite:///./orbitlink.db`) during development if local PostgreSQL is not yet configured, preventing local environment failures while retaining PostgreSQL compatibility.
- **Alembic**: Manages database migrations (`alembic upgrade head`).

---

## 3. Database Schema

### Table: `network_measurements`
Captures point-in-time network snapshots collected from the host device.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | Integer (PK) | No | Auto-incrementing measurement ID |
| `device_id` | String(100) | No | Unique identifier for host (hostname) |
| `interface_name` | String(50) | No | Interface name (e.g., `wlan0`, `eth0`, `Wi-Fi`) |
| `bytes_sent` | BigInteger | No | Cumulative bytes sent counter |
| `bytes_recv` | BigInteger | No | Cumulative bytes received counter |
| `bytes_sent_delta` | BigInteger | Yes | Delta bytes sent since previous sample |
| `bytes_recv_delta` | BigInteger | Yes | Delta bytes received since previous sample |
| `latency_ms` | Float | Yes | Roundtrip latency in milliseconds |
| `packet_loss_pct` | Float | Yes | Measured packet loss percentage (0-100) |
| `download_speed_mbps` | Float | Yes | Controlled download test throughput |
| `upload_speed_mbps` | Float | Yes | Controlled upload test throughput |
| `wifi_ssid` | String(100) | Yes | Wi-Fi network SSID (when permitted) |
| `wifi_signal_pct` | Float | Yes | Wi-Fi signal percentage |
| `measurement_method` | String(100) | No | Probing methodology used (e.g. `psutil_counters + icmp_ping`) |
| `status` | String(30) | No | Connection health: `connected`, `degraded`, `disconnected` |
| `is_simulated` | Boolean | No | Explicit flag indicating real vs simulated data (default `False`) |
| `notes` | Text | Yes | Diagnostic notes (e.g. firewall fallback notices) |
| `created_at` | DateTime (TZ) | No | Indexed timestamp of measurement |

---

## 4. API Endpoints (Phase 1 Baseline)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service identification and links |
| `GET` | `/api/v1/health` | Health status, dialect, database state |
| `POST` | `/api/v1/measurements/collect` | Triggers live device probe and persists record |
| `POST` | `/api/v1/measurements/ingest` | Ingests pre-collected measurement payload |
| `GET` | `/api/v1/measurements/latest` | Returns most recent measurement |
| `GET` | `/api/v1/measurements/history` | Returns paginated list of measurements |

---

## 5. Security & Network Ethics
1. **Device-Level Only**: Only the host device's own network interface counters are collected.
2. **Zero Packet Sniffing**: No packet payloads, SSL traffic, passwords, or peer packets are inspected or logged.
3. **Opt-in Active Testing**: Heavy bandwidth throughput tests are never run automatically in high-frequency loops.
4. **Transparent Provenance**: Simulated records are explicitly isolated and marked `is_simulated = True`.
