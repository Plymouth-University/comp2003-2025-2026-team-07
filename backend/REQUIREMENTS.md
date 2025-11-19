# Oshen Alert System - Backend Requirements

This document lists all dependencies, frameworks, and system requirements needed to run the Oshen Alert System backend.

---

## System Requirements

### 1. **Node.js** (JavaScript Runtime)
- **Version Required:** v18.x or higher (recommended: v20.x)
- **Purpose:** Runs the Express.js backend server
- **Download:** [https://nodejs.org/](https://nodejs.org/)
- **Verify Installation:** `node --version`

### 2. **npm** (Node Package Manager)
- **Version Required:** v9.x or higher
- **Purpose:** Manages Node.js dependencies
- **Included with:** Node.js installation
- **Verify Installation:** `npm --version`

### 3. **PostgreSQL Database**
- **Version Required:** v14.x or higher (recommended: v15.x or v16.x)
- **Purpose:** Primary relational database for storing vessels, alerts, telemetry, and user data
- **Download:** [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
- **Current Configuration:**
  - Host: `127.0.0.1` (localhost)
  - Port: `5433`
  - Database Name: `oshen_alerts`
  - Schema: `public`
- **Verify Installation:** `psql --version`

### 4. **Python 3** (For Migration Script)
- **Version Required:** v3.8 or higher (recommended: v3.10+)
- **Purpose:** Runs data migration script (migrate_json_to_postgres.py)
- **Download:** [https://www.python.org/downloads/](https://www.python.org/downloads/)
- **Verify Installation:** `python --version` or `python3 --version`

### 5. **pip** (Python Package Manager)
- **Version Required:** Latest
- **Purpose:** Installs Python dependencies for migration script
- **Included with:** Python 3.4+
- **Verify Installation:** `pip --version` or `pip3 --version`

---

## Node.js Dependencies (Production)

These packages are required to run the backend server in production.

| Package | Version | Purpose |
|---------|---------|---------|
| **express** | ^5.1.0 | Web application framework for building REST APIs |
| **@prisma/client** | ^6.19.0 | Auto-generated database client (ORM) for type-safe queries |
| **bcrypt** | ^6.0.0 | Password hashing library for secure authentication |
| **jsonwebtoken** | ^9.0.2 | JWT token generation and verification for auth |
| **cors** | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| **dotenv** | ^17.2.3 | Environment variable loader for configuration |

**Install all production dependencies:**
```bash
npm install
```

---

## Node.js Dependencies (Development)

These packages are used during development only.

| Package | Version | Purpose |
|---------|---------|---------|
| **nodemon** | ^3.1.11 | Auto-restart server on file changes during development |
| **prisma** | ^6.19.0 | Prisma CLI for database migrations and schema management |

**Install all dependencies (production + development):**
```bash
npm install
```

---

## Python Dependencies (Migration Script)

These packages are required ONLY if you need to run the data migration script.

| Package | Version | Purpose |
|---------|---------|---------|
| **psycopg2-binary** | >=2.9.0 | PostgreSQL adapter for Python |
| **python-dotenv** | >=1.0.0 | Environment variable loader (reads .env file) |

**Install Python dependencies:**
```bash
pip install -r requirements.txt
```

Or manually:
```bash
pip install psycopg2-binary>=2.9.0 python-dotenv>=1.0.0
```

---

## Framework & Technology Stack Summary

### **Backend Framework**
- **Express.js (v5.1.0)** - Fast, unopinionated web framework for Node.js
  - REST API design
  - Middleware-based architecture
  - JSON request/response handling

### **Database & ORM**
- **PostgreSQL (v14+)** - Open-source relational database
  - ACID compliance for data integrity
  - Supports JSON/JSONB for flexible telemetry data
  - Advanced indexing (GIN indexes for JSON queries)

- **Prisma ORM (v6.19.0)** - Modern database toolkit
  - Type-safe database queries
  - Automatic migrations
  - Database schema versioning
  - Auto-generated TypeScript types

### **Authentication & Security**
- **bcrypt (v6.0.0)** - Password hashing with salt
- **JSON Web Tokens (JWT v9.0.2)** - Stateless authentication
- **CORS (v2.8.5)** - Secure cross-origin request handling

### **Development Tools**
- **nodemon (v3.1.11)** - Auto-reload server during development
- **dotenv (v17.2.3)** - Manage environment-specific configs

---

## Database Schema Overview

The Prisma schema defines 10 core tables:

1. **users** - User accounts with role-based access (admin, supervisor)
2. **vessels** - Ships/platforms being monitored
3. **telemetry** - Time-series sensor data from vessels
4. **message_types** - Definitions for different telemetry message formats
5. **vessel_message_types** - Maps vessels to their supported message types
6. **geofences** - Geographic boundaries (keep-in/keep-out zones)
7. **alert_rules** - Configurable alert trigger conditions
8. **alert_evaluations** - Records of alert rule evaluations
9. **alert_history** - Alert incident tracking and acknowledgments
10. **system_metadata** - Application configuration and version info

---

## Configuration Requirements

### **Environment Variables (.env file)**

You must create a `.env` file in the backend directory with the following variables:

```env
# Database connection string
DATABASE_URL="postgresql://[username]:[password]@[host]:[port]/[database]?schema=public"

# Example:
DATABASE_URL="postgresql://postgres:yourpassword@127.0.0.1:5433/oshen_alerts?schema=public"

# Server configuration
PORT=3000

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secure-secret-key-here"
```

**Important:**
- Replace `[username]`, `[password]`, `[host]`, `[port]`, and `[database]` with your actual PostgreSQL credentials
- Never commit `.env` file to GitHub (it's already in .gitignore)
- Generate a strong JWT_SECRET for production

---

## Installation Steps

### 1. Install System Requirements
- Install Node.js (v18+)
- Install PostgreSQL (v14+)
- Install Python 3 (v3.8+) - only if running migration script

### 2. Clone the Repository
```bash
git clone <your-repo-url>
cd oshen-alert-system/backend
```

### 3. Install Node.js Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
```bash
# Create .env file
cp .env.example .env  # If example exists, otherwise create manually

# Edit .env and add your PostgreSQL credentials
```

### 5. Set Up Database
```bash
# Create the PostgreSQL database
psql -U postgres
CREATE DATABASE oshen_alerts;
\q

# Run Prisma migrations to create tables
npx prisma migrate dev
```

### 6. (Optional) Run Data Migration
If you need to migrate data from the legacy Flask app:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run migration script
python migrate_json_to_postgres.py
```

### 7. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will run on `http://localhost:3000`

### 8. Test the Connection
```bash
# Visit health check endpoint
curl http://localhost:3000/health

# Or run the test connection script
node test-connection.js
```

---

## Additional Notes

- **Operating System:** Cross-platform (Windows, macOS, Linux)
- **Git:** Recommended for version control
- **Port Availability:** Ensure port 3000 (backend) and 5433 (PostgreSQL) are available
- **Firewall:** May need to allow connections on these ports

---

## Troubleshooting

### PostgreSQL Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check port 5433 is not in use by another service
- Ensure `DATABASE_URL` in `.env` matches your PostgreSQL credentials

### Prisma Migration Errors
- Ensure PostgreSQL database exists before running migrations
- Check database user has CREATE TABLE permissions
- Try: `npx prisma generate` to regenerate Prisma client

### Node.js Module Errors
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Ensure Node.js version is v18 or higher

---

## Support & Documentation

- **Express.js Docs:** [https://expressjs.com/](https://expressjs.com/)
- **Prisma Docs:** [https://www.prisma.io/docs](https://www.prisma.io/docs)
- **PostgreSQL Docs:** [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)
- **Node.js Docs:** [https://nodejs.org/docs/](https://nodejs.org/docs/)

---

**Last Updated:** 2025-01-19