# Oshen Alert System - Maritime Vessel Monitoring

**University of Plymouth - COMP2003 Group Project**
**Team 7 - 2024/2025**

A real-time maritime vessel alert monitoring system that integrates with Oshen Maritime Data API to track vessels, evaluate alert rules, and manage geofences.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org))
- **PostgreSQL** 14+ ([Download](https://postgresql.org/download))
- **npm** (comes with Node.js)

### Installation (10 minutes)

#### 1. Setup Database
```bash
# Create database
createdb oshen_alerts

# Import data
psql oshen_alerts < database/oshen_alerts_backup.sql
```

#### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env - Update DATABASE_URL password if needed
npm start
```
✅ Backend runs at: **http://localhost:3000**

#### 3. Setup Frontend
```bash
# In a new terminal
cd frontend
npm install
npm start
```
✅ Frontend opens at: **http://localhost:3001**

#### 4. Login
Navigate to: **http://localhost:3001**

**Test Credentials:**
- Username: `admin`
- Password: `emperorpinguoshen`

**Note for Markers:**
- **No ngrok required** - The system runs entirely on localhost (ports 3000 & 3001)
- **Passwords included** - Login credentials work immediately after database import
- **Database password** - Only update `DATABASE_URL` in `.env` with your PostgreSQL password

---

## 📚 Detailed Documentation

Having trouble? See:
- **[SETUP-GUIDE.md](SETUP-GUIDE.md)** - Step-by-step installation with screenshots
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🎯 Features Implemented

### Core Features
✅ **User Authentication** - JWT-based authentication with role-based access control
✅ **Vessel Management** - Track multiple maritime vessels with real-time data
✅ **Alert Rules Engine** - Automatic evaluation of telemetry against customizable alert rules
✅ **Geofence Editor** - Create and manage geographic boundaries (keep-in, keep-out zones)
✅ **Live Data Integration** - Automatic fetching from Oshen Maritime Data API
✅ **Alert History** - Comprehensive logging of all triggered alerts

### Advanced Features
✅ **Consecutivity Tracking** - Trigger alerts after N consecutive violations
✅ **Time Window Analysis** - Detect X violations within Y minutes
✅ **Multi-user Support** - Admin and Supervisor roles
✅ **Supervisor Assignment** - Primary and secondary supervisors per vessel
✅ **Alert Acknowledgment** - Track who acknowledged/resolved alerts
✅ **Mute Functionality** - Temporarily mute alert rules or geofences

---

## 🗄️ Database Overview

**Database Engine:** PostgreSQL 14+
**ORM:** Prisma

**Sample Data Included:**
- **Users:** 3 (1 Admin, 2 Supervisors)
- **Vessels:** 7 maritime vessels
- **Alert Rules:** 135 configured rules
- **Geofences:** 8 geographic boundaries
- **Telemetry:** 121+ real data points
- **Message Types:** 2 (Format 3, Format 5)

---

## 🏗️ Full Stack Architecture

### Backend (Node.js + Express)
- **Framework:** Node.js 18+ with Express.js 5.1.0
- **Database:** PostgreSQL 14+ with Prisma ORM 6.19.0
- **Authentication:** JWT (JSON Web Tokens) with bcrypt password hashing
- **External API:** Oshen Maritime Data API integration
- **Real-time Services:**
  - **Alert Evaluator** - Automatic rule evaluation on every telemetry update
  - **Data Fetcher** - Background service polling Oshen API every 5 minutes
  - **Geofence Service** - Geographic boundary checking with polygon math

**Backend Dependencies:**
- `express` 5.1.0 - RESTful API server
- `@prisma/client` 6.19.0 - Database ORM
- `jsonwebtoken` 9.0.2 - JWT authentication
- `bcrypt` 6.0.0 - Password hashing
- `axios` 1.13.2 - HTTP client for Oshen API
- `cors` 2.8.5 - Cross-origin resource sharing
- `dotenv` 17.2.3 - Environment configuration

### Frontend (React 19)
- **Framework:** React 19.2.0 (latest stable with modern hooks)
- **Build Tool:** React Scripts 5.0.1 (Create React App)
- **Mapping:** Leaflet 1.9.4 + React-Leaflet 5.0.0
- **State Management:** Component-level state (no Redux/Context needed)
- **API Integration:** Custom ApiService singleton class
- **Styling:** Component-scoped CSS with dark theme

**Frontend Components:**
- **Login** - JWT authentication with token persistence
- **Fleet Dashboard (Cstar)** - Real-time vessel cards with status indicators
- **Interactive Map (Geofences)** - Leaflet map with vessel tracking & geofence polygons
- **User Management** - Role-based user administration (RBAC)
- **Settings** - Vessel registration and alert rule builder
- **Alert Builder** - Create/edit alert rules with validation
- **Vessel Form** - Register new vessels with escalation settings

**Frontend Features:**
- 30-second auto-refresh for vessel data
- Status indicators: Safe (green) / Alert (red) / Offline (gray)
- Emergency alert flags (🚨)
- Interactive map with custom vessel markers
- Copy alert rules between vessels
- Admin-only vessel deletion
- Geofence visualization with drawing mode
- Responsive design (desktop-first)

**Project Structure:**
```
oshen-alert-system/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── routes/            # API endpoint definitions
│   │   ├── services/          # Business logic (alerts, fetcher)
│   │   ├── middleware/        # Auth, error handling
│   │   ├── config/            # Database connection
│   │   └── server.js          # Express app entry point
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── package.json
│
├── frontend/                   # React 19 SPA
│   ├── src/
│   │   ├── services/          # API service layer
│   │   │   ├── api.js        # Singleton API class
│   │   │   └── login.jsx     # Login component
│   │   ├── MainDashboard.jsx  # Navigation shell
│   │   ├── Cstar.jsx         # Fleet dashboard
│   │   ├── Geofences.jsx     # Leaflet map
│   │   ├── UserSupport.jsx   # User management
│   │   ├── Settings.jsx      # Configuration hub
│   │   ├── VesselForm.jsx    # Vessel registration
│   │   ├── AlertBuilder.jsx  # Alert rule editor
│   │   └── index.js          # App entry point
│   └── package.json
│
└── database/
    └── oshen_alerts_backup.sql  # Complete database export
```

---

## 🔑 User Roles

### Admin
- Full system access
- Create/edit/delete users
- Manage all vessels and alert rules
- Configure system settings

### Supervisor
- View vessel dashboard
- Acknowledge/resolve alerts
- Mute alert rules
- View telemetry data

### Default Users

| Username | Password | Role | Pager ID |
|----------|----------|------|----------|
| admin | emperorpinguoshen | Admin | N/A |
| alex | (Contact admin) | Supervisor | AL123 |
| harsha | (Contact admin) | Supervisor | HA456 |

---

## 🖥️ Frontend Pages & Features

### 1. Login Page
- JWT authentication with localStorage token persistence
- Auto-login if valid token exists
- Error handling with user-friendly messages
- Loading states during authentication
- Test credentials: `admin` / `emperorpinguoshen`

### 2. Fleet Dashboard (Cstar)
**Main vessel monitoring interface**
- **Vessel Cards Grid:**
  - Real-time status indicators (Safe/Alert/Offline)
  - Emergency alert flags (🚨)
  - Last check-in timestamps
  - GPS coordinates display
  - Color-coded status (Green/Red/Gray)
- **Auto-refresh:** Updates every 30 seconds
- **Vessel Modal:**
  - View all alert rules for selected vessel
  - Create new alert rules inline
  - Edit existing rules
  - Delete rules (with confirmation)
  - Copy rules to another vessel (bulk operation)
  - Admin-only: Delete vessel permanently

### 3. Interactive Map (Geofences)
**Real-time vessel tracking with Leaflet**
- **Vessel Markers:**
  - Custom colored circle icons
  - Click for vessel details popup
  - Auto-fit bounds to show all vessels
  - Real-time position updates (30s)
- **Geofence Display:**
  - Polygon rendering with blue fill
  - Hover popups with geofence details
  - Keep-in vs keep-out zones
- **Drawing Mode:**
  - Toggle to create new geofences
  - Click map to place polygon points
  - Live preview with yellow overlay
  - Clear points button

### 4. User Management (UserSupport)
**Role-based user administration**
- **User Table:**
  - Username, email, role, pager ID
  - Color-coded role badges (Admin/Supervisor/Viewer)
  - Current user highlighted
  - "Cannot delete self" protection
- **Admin Features:**
  - Create new users via modal form
  - Delete users (except self)
  - Set user roles and permissions
- **Supervisor Features:**
  - View all users (read-only)
  - No delete/create permissions

### 5. Settings Page
**Configuration hub with sidebar navigation**
- **Add Vessel:**
  - Vessel name, IMEI input
  - Escalation threshold configuration
  - Repeat interval (minutes) setting
  - At-sea status toggle
- **Alert Builder:**
  - Create alert rules for any vessel
  - Select field name, operator, threshold
  - Enable/disable rules
  - Standalone mode (select vessel from dropdown)

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create user (Admin)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Change password

### Vessels
- `GET /api/vessels` - List all vessels
- `GET /api/vessels/:id` - Get vessel details
- `POST /api/vessels` - Create vessel (Admin)
- `PUT /api/vessels/:id` - Update vessel (Admin)
- `DELETE /api/vessels/:id` - Delete vessel (Admin)

### Alert Rules
- `GET /api/alerts/rules` - List alert rules
- `POST /api/alerts/rules` - Create rule (Admin)
- `PUT /api/alerts/rules/:id` - Update rule (Admin)
- `DELETE /api/alerts/rules/:id` - Delete rule (Admin)
- `PATCH /api/alerts/rules/:id/mute` - Mute/unmute rule

### Alert History
- `GET /api/alerts/history` - Get alert history
- `GET /api/alerts/active` - Get active alerts
- `POST /api/alerts/:id/acknowledge` - Acknowledge alert
- `POST /api/alerts/:id/resolve` - Resolve alert
- `GET /api/alerts/stats` - Get statistics

### Geofences
- `GET /api/geofences` - List geofences
- `GET /api/geofences/vessel/:id` - Get vessel geofences
- `POST /api/geofences` - Create geofence (Admin)
- `PUT /api/geofences/:id` - Update geofence (Admin)
- `DELETE /api/geofences/:id` - Delete geofence (Admin)
- `POST /api/geofences/evaluate` - Check position

### Telemetry
- `GET /api/telemetry` - List telemetry data
- `GET /api/telemetry/vessel/:id/latest` - Latest vessel data
- `GET /api/telemetry/vessel/:id/stats` - Vessel statistics

### Data Fetcher
- `GET /api/data-fetcher/status` - Service status
- `POST /api/data-fetcher/trigger` - Manual fetch (Admin)
- `POST /api/data-fetcher/start` - Start service (Admin)
- `POST /api/data-fetcher/stop` - Stop service (Admin)

---

## 🔧 Configuration

### Environment Variables

Backend configuration is in `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/oshen_alerts"

# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN="24h"

# Oshen API
OSHEN_API_BASE_URL="https://mission.oshendata.com/papi"
OSHEN_API_KEY="your_api_key"

# Data Fetcher
ENABLE_DATA_FETCHER=true
DATA_FETCH_INTERVAL_MINS=5
```

---

## 🧪 Testing

### Test Alert Evaluation
```bash
cd backend
node test-alert-evaluator-smart.js
```

### Test Database Connection
```bash
cd backend
node test-connection.js
```

### Check Database Contents
```bash
cd backend
node check-database-contents.js
```

---

## 📊 Project Statistics

**Backend:**
- **Lines of Code:** ~8,000+
- **API Endpoints:** 40+ RESTful routes
- **Services:** 3 core services (Alert Evaluator, Data Fetcher, Geofence)
- **Middleware:** 3 (Auth, Error Handling, CORS)
- **Routes:** 7 route modules (auth, vessels, alerts, geofences, telemetry, users, data-fetcher)
- **Database Tables:** 10 (users, vessels, alert_rules, alert_history, alert_evaluations, geofences, telemetry, message_types, vessel_message_types, spatial_ref_sys)

**Frontend:**
- **Lines of Code:** ~7,000+
- **React Components:** 10+ (Login, Dashboard, Fleet, Map, Users, Settings, Forms)
- **Pages:** 4 main views (Fleet Dashboard, Geofences Map, User Management, Settings)
- **API Service Methods:** 25+ (CRUD for all resources)
- **CSS Files:** 8 component-scoped stylesheets
- **Real-time Features:** Auto-refresh every 30 seconds

**Database:**
- **Users:** 2 (1 Admin, 1 Supervisor)
- **Vessels:** 9 maritime vessels with telemetry
- **Alert Rules:** 135 configured rules across all vessels
- **Geofences:** 8 geographic boundaries (keep-in/keep-out zones)
- **Telemetry Records:** 245+ real data points from Oshen API
- **Message Types:** 2 (Format 3, Format 5)

**Total Project:**
- **Lines of Code:** ~15,000+
- **Development Time:** 8 weeks
- **Technologies:** 12+ (Node.js, Express, PostgreSQL, Prisma, React, Leaflet, JWT, bcrypt, axios, cors)
- **Features:** 20+ major features implemented

---

## 🎓 Team

**University of Plymouth - COMP2003**
**Group 7 - 2024/2025**

- Backend Developer 1 (Lead)
- Backend Developer 2
- Frontend Developer 1
- Frontend Developer 2

---

## 📄 License

This project is submitted as part of COMP2003 coursework at the University of Plymouth.

---

## 🆘 Support

**For setup issues, see:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Common Issues:**
- Database connection errors → Check PostgreSQL is running
- Port already in use → Change PORT in `.env`
- CORS errors → Check FRONTEND_URL in `.env`
- Login fails → Verify database was imported correctly

---

## ✅ Verification Checklist

After setup, verify:
- [ ] Backend starts without errors at http://localhost:3000
- [ ] Frontend opens at http://localhost:3001
- [ ] Can login with admin/emperorpinguoshen
- [ ] Can see 7 vessels in dashboard
- [ ] Can view alert rules
- [ ] Backend console shows "Data fetcher service is ENABLED"

---

---

## 🔗 Additional Resources

**For Markers/Evaluators:**
- **[FOR-MARKERS.md](FOR-MARKERS.md)** - Complete guide with frontend/backend testing checklist

**Technical Documentation:**
- **Frontend:** React 19.2.0 + Leaflet 1.9.4 - Component-based architecture
- **Backend:** Node.js 18+ + Express 5.1.0 - RESTful API with Prisma ORM
- **Database:** PostgreSQL 14+ - Normalized schema with 10 tables
- **Authentication:** JWT tokens with bcrypt hashing

---

**Last Updated:** January 2026
**System Status:** ✅ Production Ready
**Team:** University of Plymouth COMP2003 - Group 7
