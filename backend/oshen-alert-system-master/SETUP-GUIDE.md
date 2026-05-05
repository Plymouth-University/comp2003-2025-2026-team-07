# Oshen Alert System - Detailed Setup Guide

**University of Plymouth - COMP2003 Group Project**

This guide provides step-by-step instructions for setting up the Oshen Alert System on your local machine.

---

## Prerequisites

Before you begin, ensure you have the following installed:

### 1. Node.js (v18 or higher)

**Check if installed:**
```bash
node --version
npm --version
```

**If not installed:**
- Download from [https://nodejs.org](https://nodejs.org)
- Choose the LTS (Long Term Support) version
- Run the installer and follow the prompts

### 2. PostgreSQL (v14 or higher)

**Check if installed:**
```bash
psql --version
```

**If not installed:**

**Windows:**
1. Download from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run the installer
3. **IMPORTANT:** Remember the password you set for the `postgres` user
4. Default port is `5432` - note if you change this to `5433`

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## Step 1: Database Setup

### Option A: Using Command Line (Recommended)

#### 1.1 Create the Database

**Windows (Command Prompt or PowerShell):**
```bash
# Navigate to PostgreSQL bin directory (adjust version if needed)
cd "C:\Program Files\PostgreSQL\14\bin"

# Create database
createdb -U postgres -h 127.0.0.1 -p 5433 oshen_alerts
```

**macOS/Linux:**
```bash
createdb -U postgres oshen_alerts
```

You'll be prompted for the PostgreSQL password you set during installation.

#### 1.2 Import the Database Backup

**Windows:**
```bash
# From the project root directory
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts -f database\oshen_alerts_backup.sql
```

**macOS/Linux:**
```bash
# From the project root directory
psql -U postgres -d oshen_alerts -f database/oshen_alerts_backup.sql
```

### Option B: Using pgAdmin (GUI Method)

#### 1.1 Open pgAdmin
- Launch pgAdmin (should be installed with PostgreSQL)
- Connect to your local PostgreSQL server
- Enter your PostgreSQL password

#### 1.2 Create Database
1. Right-click on "Databases" → "Create" → "Database"
2. Database name: `oshen_alerts`
3. Owner: `postgres`
4. Click "Save"

#### 1.3 Import Backup
1. Right-click on `oshen_alerts` database → "Restore"
2. Format: `Custom or tar`
3. Filename: Browse to `database/oshen_alerts_backup.sql`
4. Click "Restore"

### Verify Database Import

```bash
# Connect to database
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts

# Check tables
\dt

# You should see 9 tables:
# - users
# - vessels
# - alert_rules
# - alert_history
# - alert_evaluations
# - geofences
# - telemetry
# - message_types
# - vessel_message_types

# Exit psql
\q
```

---

## Step 2: Backend Setup

### 2.1 Navigate to Backend Directory

```bash
cd backend
```

### 2.2 Install Dependencies

```bash
npm install
```

This will install:
- Express.js (web server)
- Prisma (database ORM)
- JWT authentication
- bcrypt (password hashing)
- axios (API requests)
- CORS middleware

**Expected output:** `added XXX packages` with no errors

### 2.3 Configure Environment Variables

#### Create .env file

**Windows (Command Prompt):**
```bash
copy .env.example .env
```

**macOS/Linux:**
```bash
cp .env.example .env
```

#### Edit .env File

Open `backend/.env` in any text editor and update:

```env
# Database Configuration
# IMPORTANT: Update YOUR_PASSWORD with your PostgreSQL password
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5433/oshen_alerts?schema=public"

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Authentication (keep as-is for testing)
JWT_SECRET="oshen_jwt_secret_key_change_in_production"
JWT_EXPIRES_IN="24h"

# CORS Configuration
FRONTEND_URL="http://localhost:5173"

# Oshen External API Configuration
OSHEN_API_BASE_URL="https://mission.oshendata.com/papi"
OSHEN_API_KEY="your_oshen_api_key_here"

# Data Fetcher Service
ENABLE_DATA_FETCHER=true
DATA_FETCH_INTERVAL_MINS=5

# Admin Credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="emperorpinguoshen"
```

**Key Configuration Notes:**

1. **DATABASE_URL:**
   - If your PostgreSQL is on port `5432` (default), change `5433` to `5432`
   - Replace `YOUR_PASSWORD` with your actual PostgreSQL password
   - Example: `postgresql://postgres:mypassword123@127.0.0.1:5432/oshen_alerts?schema=public`

2. **OSHEN_API_KEY:**
   - Contact Oshen Ltd for a valid API key
   - The system will work without it, but won't fetch live vessel data

3. **ENABLE_DATA_FETCHER:**
   - Set to `true` to fetch live data every 5 minutes
   - Set to `false` to use only existing database data

### 2.4 Generate Prisma Client

```bash
npm run build
```

This generates the Prisma database client based on your schema.

### 2.5 Test Database Connection

```bash
node test-connection.js
```

**Expected output:**
```
✅ Database connected successfully
Testing database contents...
Users: 3
Vessels: 7
Alert Rules: 135
Geofences: 8
```

**If you see errors, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

### 2.6 Start Backend Server

```bash
npm start
```

**Expected output:**
```
✅ Database connected successfully
🚀 Server running on port 3000
🌍 Environment: development
🔐 JWT expires in: 24h
📡 Data fetcher service is ENABLED
   └─ Fetch interval: 5 minutes
```

**Keep this terminal window open!** The backend must keep running.

**Verify backend is working:**
Open browser and go to: [http://localhost:3000/api/auth/health](http://localhost:3000/api/auth/health)

You should see: `{"status":"ok"}`

---

## Step 3: Frontend Setup

### 3.1 Open New Terminal

**IMPORTANT:** Don't close the backend terminal. Open a NEW terminal window.

### 3.2 Navigate to Frontend Directory

```bash
cd frontend
```

### 3.3 Install Dependencies

```bash
npm install
```

This will install:
- React 18
- Vite (build tool)
- React Router (navigation)
- Leaflet (maps)
- Axios (API client)

### 3.4 Start Frontend Development Server

```bash
npm start
```

**Expected output:**
```
VITE v4.x.x  ready in XXX ms

➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

**Your browser should automatically open to http://localhost:3001**

---

## Step 4: Login and Verify

### 4.1 Login Page

You should see the Oshen Alert System login page.

**Test Credentials:**
- **Username:** `admin`
- **Password:** `emperorpinguoshen`

### 4.2 Verify Dashboard

After login, you should see:

1. **Dashboard Page** with 7 vessels listed:
   - PB1 (MicroTransat)
   - PC14 (AlphaBot)
   - PC15 (BetaBot)
   - PC16 (GammaBot)
   - PG1 (EpsilonBot)
   - PM1 (ZetaBot)
   - PS1 (ThetaBot)

2. **Vessel Details** - Click any vessel to see:
   - Latest telemetry data
   - Alert rules
   - Active alerts
   - Geofences

3. **Alert Rules** - Navigate to "Alert Rules" page:
   - Should show 135+ configured rules
   - Can filter by vessel
   - Can mute/unmute rules (if admin)

4. **Geofences** - Navigate to "Geofences" page:
   - Should show 8 geofences
   - Interactive map editor
   - Keep-in/Keep-out zones

### 4.3 Check Live Data Fetching

Look at the **backend terminal window**. Every 5 minutes you should see:

```
📡 Starting data fetch cycle...
✅ Fetched data for vessel PB1: 81 fields
✅ Stored telemetry for PB1 (ID: XXX)
🔔 Evaluating alerts for telemetry ID: XXX
```

This confirms the data fetcher is working and alert evaluation is running.

---

## Verification Checklist

After setup, verify the following:

- [ ] **Backend starts without errors** at http://localhost:3000
- [ ] **Frontend opens** at http://localhost:3001
- [ ] **Can login** with admin/emperorpinguoshen
- [ ] **Can see 7 vessels** in dashboard
- [ ] **Can view alert rules** (135+ rules)
- [ ] **Can view geofences** (8 geofences)
- [ ] **Backend console shows** "Data fetcher service is ENABLED"
- [ ] **No CORS errors** in browser console (F12 → Console tab)

---

## Common Connection String Formats

Your `DATABASE_URL` may vary depending on your PostgreSQL setup:

**Standard local setup (port 5432):**
```
postgresql://postgres:your_password@localhost:5432/oshen_alerts?schema=public
```

**Custom port (e.g., 5433):**
```
postgresql://postgres:your_password@127.0.0.1:5433/oshen_alerts?schema=public
```

**With special characters in password:**
```
postgresql://postgres:p%40ssw0rd@localhost:5432/oshen_alerts?schema=public
```
(Encode special characters: `@` → `%40`, `#` → `%23`, etc.)

**Docker PostgreSQL:**
```
postgresql://postgres:postgres@host.docker.internal:5432/oshen_alerts?schema=public
```

---

## Next Steps

Once setup is complete:

1. **Test Alert Rules:**
   ```bash
   cd backend
   node test-alert-evaluator-smart.js
   ```

2. **Check Database Contents:**
   ```bash
   cd backend
   node check-database-contents.js
   ```

3. **Explore the UI:**
   - Create new alert rules
   - Draw geofences on the map
   - View alert history
   - Acknowledge active alerts

4. **Read API Documentation:**
   - See [README.md](README.md) for all available API endpoints

---

## Troubleshooting

If you encounter any issues during setup, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

**Common issues:**
- Database connection errors → Check PostgreSQL is running
- Port conflicts → Change PORT in `.env`
- CORS errors → Check FRONTEND_URL in `.env`
- Login fails → Verify database was imported correctly

---

## Development Tips

### Running in Development Mode

**Backend (with auto-reload):**
```bash
cd backend
npm run dev
```

**Frontend (already has hot-reload with Vite):**
```bash
cd frontend
npm start
```

### Stopping the Servers

**Backend:** Press `Ctrl+C` in the backend terminal

**Frontend:** Press `Ctrl+C` in the frontend terminal

### Viewing Logs

**Backend logs:** Shown in the backend terminal window

**Frontend logs:** Open browser console (F12 → Console tab)

**Database logs:**
```bash
# View recent PostgreSQL logs
tail -f /var/log/postgresql/postgresql-14-main.log  # Linux
# Windows: Check C:\Program Files\PostgreSQL\14\data\log\
```

---

**Last Updated:** January 2025
**Status:** Production Ready ✅
