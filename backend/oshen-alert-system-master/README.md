# Oshen Alert System - Maritime Vessel Monitoring

**University of Plymouth - COMP2003 Group Project**
**Team 7 - 2024/2025**

A real-time maritime vessel alert monitoring system that integrates with the Oshen Maritime Data API to track vessels, evaluate alert rules, send pager notifications, and manage geofences.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org))
- **PostgreSQL** 14+ ([Download](https://postgresql.org/download))
- **npm** (comes with Node.js)

### Installation

#### 1. Setup Database
```bash
# Create database
createdb oshen_alerts

# Run schema (from project root)
psql oshen_alerts < SourceCode_for_the_front_end_not_meant_to_be_edited/SourceCode/Schema/00_complete_setup.sql
```

> The pre-populated database backup is provided separately in the submission package.

#### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env - fill in DATABASE_URL password and API keys
npm start
```
✅ Backend runs at: **http://localhost:3000**

#### 3. Setup Frontend
```bash
# In a new terminal
cd SourceCode_for_the_front_end_not_meant_to_be_edited/SourceCode
npm install
npm start
```
✅ Frontend opens at: **http://localhost:3001**

#### 4. Login
Navigate to: **http://localhost:3001**

**Test Credentials:**
- Username: `admin`
- Password: `emperorpinguoshen`

---

## 📚 Documentation

- **[FOR-MARKERS.md](FOR-MARKERS.md)** - Complete walkthrough and testing checklist for evaluators
- **[SETUP-GUIDE.md](SETUP-GUIDE.md)** - Step-by-step installation guide
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and fixes
- **[SUBMISSION-CHECKLIST.md](SUBMISSION-CHECKLIST.md)** - Submission verification checklist

---

## 🎯 Features

### Core Features
✅ **User Authentication** - JWT-based login with role-based access control
✅ **Vessel Management** - Track multiple maritime vessels with real-time telemetry
✅ **Alert Rules Engine** - Automatic evaluation of telemetry data against configurable rules
✅ **Geofence Editor** - Create and manage geographic keep-in/keep-out zones
✅ **Live Data Integration** - Background polling from Oshen Maritime Data API every 5 minutes
✅ **Alert History & Logs** - Full log of triggered, acknowledged, and resolved alerts
✅ **Pager Notifications** - Real-time alerts dispatched to supervisors via Pagem API

### Advanced Features
✅ **Compound Alert System** - Multi-condition alerts combining multiple telemetry fields
✅ **Consecutivity Tracking** - Trigger after N consecutive threshold violations
✅ **Time Window Analysis** - Detect X violations within Y minutes
✅ **Multi-user Support** - Admin and Supervisor roles
✅ **Supervisor Assignment** - Primary and secondary supervisors per vessel
✅ **Alert Acknowledgment** - Track who acknowledged and resolved each alert
✅ **Mute Functionality** - Temporarily silence alert rules or geofences

---

## 🗄️ Database

**Engine:** PostgreSQL 14+  
**ORM:** Prisma

**Tables:** users, vessels, alert_rules, alert_history, alert_evaluations, geofences, telemetry, message_types, vessel_message_types, compound_alert_rules

**Sample Data (from backup):**
- **Users:** 3 (1 Admin, 2 Supervisors)
- **Vessels:** 9 maritime vessels
- **Alert Rules:** 135 configured rules
- **Geofences:** 8 geographic boundaries
- **Telemetry:** 245+ real data points

---

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Framework:** Node.js 18+ with Express.js 5.1.0
- **Database:** PostgreSQL 14+ with Prisma ORM
- **Authentication:** JWT + bcrypt
- **External APIs:** Oshen Maritime Data API, Pagem notification API

**Services:**
- `alertEvaluator.js` - Evaluates telemetry against alert rules on every update
- `compoundAlertService.js` - Evaluates multi-condition compound alert rules
- `dataFetcherService.js` - Background polling of Oshen API
- `pagemService.js` - Dispatches pager notifications to supervisors
- `geofenceService.js` - Geographic boundary checking with polygon math

**Routes:** `auth`, `vessels`, `alerts`, `geofences`, `telemetry`, `dataFetcher`, `pagem`

### Frontend (React 19)
- **Framework:** React 19.2.0
- **Mapping:** Leaflet 1.9.4 + React-Leaflet 5.0.0
- **Styling:** Component-scoped CSS with dark theme

**Pages:**
- **Login** - JWT authentication with token persistence
- **Fleet Dashboard (Cstar)** - Real-time vessel cards with status indicators and alert management
- **Interactive Map (Geofences)** - Leaflet map with live vessel positions and geofence polygons
- **User Management (UserSupport)** - Role-based user administration
- **Settings** - Vessel registration and alert rule builder
- **Alert Log (PageLog)** - Full history of pager notifications sent

---

## 📁 Project Structure

```
oshen-alert-system/
├── backend/
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth, error handling
│   │   ├── config/            # Database connection
│   │   └── server.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env.example
│
├── SourceCode_for_the_front_end_not_meant_to_be_edited/
│   └── SourceCode/
│       ├── src/
│       │   ├── services/      # API service layer
│       │   ├── Cstar.jsx      # Fleet dashboard
│       │   ├── Geofences.jsx  # Map view
│       │   ├── UserSupport.jsx
│       │   ├── PageLog.jsx    # Notification log
│       │   ├── AlertBuilder.jsx
│       │   ├── Settings.jsx
│       │   └── MainDashboard.jsx
│       └── Schema/            # SQL schema files
│
└── database/                  # Backup provided in submission package
```

---

## 🔑 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — manage users, vessels, alert rules, geofences |
| **Supervisor** | View dashboard, acknowledge/resolve alerts, mute rules |

**Default Users:**

| Username | Password | Role |
|----------|----------|------|
| admin | emperorpinguoshen | Admin |
| alex | (set on import) | Supervisor |
| harsha | (set on import) | Supervisor |

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Create user (Admin)
- `GET /api/auth/me` - Current user
- `PUT /api/auth/password` - Change password

### Vessels
- `GET /api/vessels` - List all
- `POST /api/vessels` - Create (Admin)
- `PUT /api/vessels/:id` - Update (Admin)
- `DELETE /api/vessels/:id` - Delete (Admin)

### Alerts
- `GET /api/alerts/rules` - List rules
- `POST /api/alerts/rules` - Create rule
- `PUT /api/alerts/rules/:id` - Update rule
- `DELETE /api/alerts/rules/:id` - Delete rule
- `PATCH /api/alerts/rules/:id/mute` - Mute/unmute
- `GET /api/alerts/history` - Alert history
- `GET /api/alerts/active` - Active alerts
- `POST /api/alerts/:id/acknowledge` - Acknowledge
- `POST /api/alerts/:id/resolve` - Resolve

### Geofences
- `GET /api/geofences` - List all
- `POST /api/geofences` - Create (Admin)
- `PUT /api/geofences/:id` - Update (Admin)
- `DELETE /api/geofences/:id` - Delete (Admin)

### Telemetry
- `GET /api/telemetry/vessel/:id/latest` - Latest data
- `GET /api/telemetry/vessel/:id/stats` - Statistics

### Pagem Notifications
- `GET /api/pagem/logs` - Notification history
- `POST /api/pagem/test` - Send test notification (Admin)

### Data Fetcher
- `GET /api/data-fetcher/status` - Service status
- `POST /api/data-fetcher/trigger` - Manual fetch (Admin)

---

## 🔧 Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/oshen_alerts"

# Server
PORT=3000
NODE_ENV=development

# Auth
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN="24h"

# Oshen API
OSHEN_API_BASE_URL="https://mission.oshendata.com/papi"
OSHEN_API_KEY="your_oshen_api_key"

# Pagem Notifications
PAGE_API_URL="https://www.pagem.com/api/v2/page/send"
PAGE_AUTH_TOKEN="your_pagem_auth_token"

# Data Fetcher
ENABLE_DATA_FETCHER=true
DATA_FETCH_INTERVAL_MINS=5
```

---

## 🎓 Team

**University of Plymouth - COMP2003 | Group 7 | 2024/2025**

---

**Last Updated:** April 2026  
**System Status:** ✅ Complete
