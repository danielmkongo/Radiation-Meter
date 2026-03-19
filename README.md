# RadiGuard — Radiation Exposure Monitoring Platform

Regulatory-grade radiation exposure monitoring platform for medical facilities, aligned with **Tanzania Atomic Energy Commission (TAEC)** regulations and **WHO/ICRP** international safety standards.

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run seed      # Create demo database with sample data
npm run dev       # Start API server on http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # Start UI on http://localhost:5173
```

### 3. Open `http://localhost:5173` and login with demo credentials

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@taec.go.tz | Admin123! |
| **Hospital Manager** | manager@muhimbili.go.tz | Manager123! |
| **TAEC Regulator** | regulator@taec.go.tz | Regulator1! |
| **Radiologist** | amina@muhimbili.go.tz | Radiol123! |

---

## IoT Device Ingestion API

### Send Radiation Reading

```http
POST /api/v1/exposure
X-API-Key: rm_dev001apikey12345678901234
Content-Type: application/json

{
  "device_id": "DEV-MNH-001",
  "card_number": "MNH-RAD-001",
  "radiation_value": 0.023,
  "timestamp": "2024-03-15T10:30:00Z"
}
```

**Demo Device API Keys** (from seed data):
- `DEV-MNH-001`: `rm_dev001apikey12345678901234`
- `DEV-MNH-002`: `rm_dev002apikey12345678901234`
- `DEV-MNH-003`: `rm_dev003apikey12345678901234`
- `DEV-AKH-001`: `rm_dev004apikey12345678901234`

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                  IoT Dosimeters                  │
│   HTTP POST with X-API-Key + JSON payload       │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Express REST API                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ API Key  │ │  JWT     │ │  Rate Limiting    │ │
│  │  Auth    │ │  Auth    │ │  (per device/IP)  │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │         Business Logic Services              │ │
│  │  ThresholdService · AnomalyService          │ │
│  │  AlertService · AuditService                │ │
│  └──────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │            SQLite (WAL mode)                 │ │
│  │  users · devices · exposure_logs            │ │
│  │  alerts · audit_logs                        │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              React Frontend (Vite)               │
│  Role-based dashboards · Recharts · TailwindCSS │
└─────────────────────────────────────────────────┘
```

---

## Regulatory Thresholds (WHO/ICRP/TAEC)

| Period | Warning | Limit |
|--------|---------|-------|
| Annual | 15 mSv | 20 mSv/year |
| Monthly | 1.25 mSv | 1.667 mSv |
| Weekly | 0.288 mSv | 0.385 mSv |
| Daily | 0.041 mSv | 0.055 mSv |
| Single Year Max | — | 50 mSv |
| 5-Year Total | — | 100 mSv |

---

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login and get JWT |
| GET | `/api/v1/auth/me` | Current user info |
| POST | `/api/v1/auth/logout` | Logout |

### Exposure (IoT Ingestion)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/exposure` | API Key | Ingest reading from device |
| GET | `/api/v1/exposure` | JWT | Query exposure logs |
| GET | `/api/v1/exposure/summary/:card` | JWT | User dose summary |
| DELETE | `/api/v1/exposure/:id` | JWT (admin) | Soft-delete record |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard` | Role-filtered dashboard data |
| GET | `/api/v1/dashboard/chart` | Time-series chart data |

### Alerts, Devices, Users, Reports, Audit
All documented in `/api/v1/{resource}` — see route files.

---

## Security Features

- **JWT authentication** with 24h expiry
- **Role-based access control** (RBAC) — 4 roles
- **API key authentication** for IoT devices
- **bcrypt** password hashing (rounds configurable)
- **Helmet** security headers
- **CORS** with allowlist
- **Rate limiting** — 20 auth/15min, 500 API/15min, 120 ingestion/min
- **Input validation** on all endpoints
- **SQL injection** protection via parameterized queries
- **Audit logging** of all mutations
- **Soft deletes** with audit trail

---

## Future Scalability

1. **PostgreSQL migration** — Replace SQLite with PostgreSQL for multi-node deployments
2. **TimescaleDB** — Purpose-built time-series extension for large exposure datasets
3. **WebSocket alerts** — Real-time push notifications instead of polling
4. **MQTT broker** — Replace HTTP ingestion with MQTT for lower-overhead IoT communication
5. **Docker deployment** — Containerize backend + frontend + nginx reverse proxy
6. **Redis caching** — Cache dashboard aggregations with TTL
7. **Email/SMS alerts** — Notify supervisors on critical threshold breaches
8. **Multi-tenant isolation** — Row-level security per hospital
9. **FHIR integration** — Export data in HL7 FHIR format for EMR systems

---

## Self-Hosted VPS Deployment

```bash
# 1. Clone and build frontend
cd frontend && npm ci && npm run build

# 2. Set production environment
cp backend/.env.example backend/.env
# Edit: NODE_ENV=production, JWT_SECRET=<64+ random chars>

# 3. Install PM2 (process manager)
npm install -g pm2
cd backend && npm ci
pm2 start src/server.js --name radiaguard-api

# 4. Serve frontend with nginx
# Point /api → localhost:3001
# Point / → frontend/dist
# Enable HTTPS with Let's Encrypt (certbot)
```
