# Oshen Alert System - Troubleshooting Guide

This guide covers common issues and their solutions during setup and operation.

---

## Database Issues

### ❌ Error: "database does not exist"

**Symptom:**
```
Error: P1003: Database oshen_alerts does not exist
```

**Solution:**
The database hasn't been created yet.

**Windows:**
```bash
cd "C:\Program Files\PostgreSQL\14\bin"
createdb -U postgres -h 127.0.0.1 -p 5433 oshen_alerts
```

**macOS/Linux:**
```bash
createdb -U postgres oshen_alerts
```

Then import the backup:
```bash
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts -f database/oshen_alerts_backup.sql
```

---

### ❌ Error: "Connection refused" or "ECONNREFUSED"

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5433
```

**Possible Causes:**

#### 1. PostgreSQL is not running

**Windows:**
- Press `Win + R`, type `services.msc`, press Enter
- Find "postgresql-x64-14" service
- Right-click → Start

**macOS:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

#### 2. Wrong port number

Check which port PostgreSQL is actually running on:

**Windows (Command Prompt):**
```bash
netstat -an | findstr 5432
netstat -an | findstr 5433
```

**macOS/Linux:**
```bash
netstat -an | grep 5432
netstat -an | grep 5433
```

Update `backend/.env` with the correct port:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/oshen_alerts?schema=public"
```
(Change `5433` to `5432` if needed)

#### 3. PostgreSQL listening on wrong interface

Edit PostgreSQL config to listen on localhost:

**Windows:**
```
C:\Program Files\PostgreSQL\14\data\postgresql.conf
```

**macOS/Linux:**
```
/etc/postgresql/14/main/postgresql.conf
```

Find and change:
```
listen_addresses = 'localhost'  # or '*' for all interfaces
```

Restart PostgreSQL after changing.

---

### ❌ Error: "password authentication failed"

**Symptom:**
```
Error: password authentication failed for user "postgres"
```

**Solution 1: Check password in .env**

Open `backend/.env` and verify the password matches your PostgreSQL password:
```env
DATABASE_URL="postgresql://postgres:CORRECT_PASSWORD@127.0.0.1:5433/oshen_alerts?schema=public"
```

**Solution 2: Reset PostgreSQL password**

**Windows:**
1. Open pgAdmin
2. Right-click on "postgres" user → Properties
3. Go to "Definition" tab
4. Enter new password
5. Click "Save"

**macOS/Linux:**
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q
```

**Solution 3: Special characters in password**

If your password contains special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `&` → `%26`
- `=` → `%3D`
- `+` → `%2B`

Example:
```env
# Password: p@ssw0rd#123
DATABASE_URL="postgresql://postgres:p%40ssw0rd%23123@127.0.0.1:5433/oshen_alerts?schema=public"
```

---

### ❌ Error: "Prisma schema not found"

**Symptom:**
```
Error: Could not find Prisma schema file
```

**Solution:**
Make sure you're in the `backend` directory and run:
```bash
npm run build
```

This generates the Prisma client from `prisma/schema.prisma`.

---

### ❌ Error: Database import fails

**Symptom:**
```
psql: error: connection to server failed
ERROR: syntax error at or near "..."
```

**Solution 1: Check file path**

Make sure you're running the command from the **project root directory**, not from `backend/` or `frontend/`.

**Windows:**
```bash
# From c:\Users\alvin\Documents\Projects\oshen-alert-system
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts -f database\oshen_alerts_backup.sql
```

**macOS/Linux:**
```bash
# From /path/to/oshen-alert-system
psql -U postgres -d oshen_alerts -f database/oshen_alerts_backup.sql
```

**Solution 2: File encoding issues**

If the SQL file has encoding issues, try:
```bash
psql -U postgres -d oshen_alerts -f database/oshen_alerts_backup.sql --set client_encoding=UTF8
```

---

## Backend Issues

### ❌ Error: "Port 3000 already in use"

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution 1: Kill the process using port 3000**

**Windows (PowerShell):**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID 12345 /F
```

**macOS/Linux:**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Solution 2: Change the port**

Edit `backend/.env`:
```env
PORT=3001
```

Then update frontend API URL if needed.

---

### ❌ Error: "MODULE_NOT_FOUND"

**Symptom:**
```
Error: Cannot find module 'express'
Error: Cannot find module '@prisma/client'
```

**Solution:**
Dependencies not installed. Run:
```bash
cd backend
npm install
```

If it still fails, try:
```bash
rm -rf node_modules package-lock.json  # macOS/Linux
# or
rmdir /s node_modules & del package-lock.json  # Windows

npm install
```

---

### ❌ Error: "JWT_SECRET is not defined"

**Symptom:**
```
Error: JWT_SECRET is required
```

**Solution:**
The `.env` file is missing or not being loaded.

1. Verify `.env` file exists in `backend/` directory
2. Check it contains:
```env
JWT_SECRET="oshen_jwt_secret_key_change_in_production"
```

3. Restart the backend server

---

### ❌ Error: "Data fetcher not starting"

**Symptom:**
Backend starts but doesn't show "Data fetcher service is ENABLED"

**Solution:**
Check `backend/.env`:
```env
ENABLE_DATA_FETCHER=true
```

Make sure it's `true`, not `false` or `"true"` (no quotes needed).

---

## Frontend Issues

### ❌ Error: "CORS policy blocked"

**Symptom (in browser console):**
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:3001'
has been blocked by CORS policy
```

**Solution:**
Backend CORS configuration needs to include frontend URL.

Check `backend/src/server.js` includes your frontend URL in `allowedOrigins`:
```javascript
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:5173'
];
```

Restart the backend after changing.

---

### ❌ Error: "Network Error" when logging in

**Symptom:**
- Login button doesn't work
- Browser console shows: `Error: Network Error`

**Possible Causes:**

#### 1. Backend is not running

Make sure backend terminal shows:
```
🚀 Server running on port 3000
```

Test backend directly: [http://localhost:3000/api/auth/health](http://localhost:3000/api/auth/health)

Should return: `{"status":"ok"}`

#### 2. Wrong API URL in frontend

Check `frontend/src/config.js` or similar file contains:
```javascript
const API_URL = 'http://localhost:3000';
```

#### 3. Firewall blocking connection

Temporarily disable firewall or add exception for Node.js.

---

### ❌ Error: "Failed to fetch" or "ERR_CONNECTION_REFUSED"

**Symptom:**
Frontend can't connect to backend API.

**Solution:**
1. Verify backend is running: `http://localhost:3000/api/auth/health`
2. Check browser console (F12) for exact error
3. Verify `FRONTEND_URL` in `backend/.env` matches frontend URL
4. Clear browser cache (Ctrl+Shift+Delete)
5. Try incognito/private browsing mode

---

### ❌ Error: "Cannot read property of undefined" on dashboard

**Symptom:**
Login works but dashboard shows errors or blank screen.

**Solution:**
Database may not be properly imported.

Verify database contents:
```bash
cd backend
node check-database-contents.js
```

Should show:
```
Users: 3
Vessels: 7
Alert Rules: 135
Geofences: 8
```

If counts are 0, re-import database:
```bash
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts -f database/oshen_alerts_backup.sql
```

---

### ❌ Error: Port 3001 already in use

**Symptom:**
```
Port 3001 is already in use
```

**Solution:**
Kill the process or change frontend port.

**Windows:**
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
lsof -ti:3001 | xargs kill -9
```

Or change port in `frontend/package.json` or `vite.config.js`:
```javascript
export default {
  server: {
    port: 3002
  }
}
```

---

## Login Issues

### ❌ Error: "Invalid credentials"

**Symptom:**
Can't login with admin/emperorpinguoshen

**Possible Causes:**

#### 1. Database not imported correctly

Verify users exist:
```bash
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts
SELECT username, role FROM users;
\q
```

Should show:
```
 username | role
----------+------------
 admin    | admin
 alex     | supervisor
 harsha   | supervisor
```

If empty, re-import database.

#### 2. Passwords not hashed correctly

If you manually inserted users, passwords must be bcrypt-hashed.

Use the registration endpoint or hash passwords:
```bash
cd backend
node
> const bcrypt = require('bcrypt');
> bcrypt.hash('emperorpinguoshen', 10).then(console.log);
```

#### 3. JWT_SECRET mismatch

If you changed `JWT_SECRET` after creating users, tokens won't validate.

Reset `backend/.env`:
```env
JWT_SECRET="oshen_jwt_secret_key_change_in_production"
```

---

## Data Fetcher Issues

### ❌ Error: "API key invalid"

**Symptom (backend console):**
```
⚠️ Oshen API error: 401 Unauthorized
```

**Solution:**
Update `backend/.env` with valid Oshen API key:
```env
OSHEN_API_KEY="your_valid_api_key_here"
```

Contact Oshen Ltd for a valid key.

**Workaround for testing:**
Set `ENABLE_DATA_FETCHER=false` to use existing database data only.

---

### ❌ Error: "No vessels found" in data fetcher

**Symptom:**
```
📡 Starting data fetch cycle...
⚠️ No vessels found in database
```

**Solution:**
Database import failed or vessels table is empty.

Check vessels:
```bash
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts
SELECT id, name, oshen_id FROM vessels;
\q
```

Should show 7 vessels. If empty, re-import database.

---

## Performance Issues

### ❌ Slow dashboard loading

**Solution:**
1. Check if data fetcher is overloading database
2. Increase `DATA_FETCH_INTERVAL_MINS` in `.env`:
```env
DATA_FETCH_INTERVAL_MINS=10  # Instead of 5
```

3. Add database indexes (already included in schema)

---

### ❌ High CPU usage

**Cause:**
Alert evaluator running on every telemetry insert.

**Solution (if needed for development):**
Temporarily disable data fetcher:
```env
ENABLE_DATA_FETCHER=false
```

For production, this is expected behavior.

---

## npm/Node.js Issues

### ❌ Error: "npm command not found"

**Solution:**
Node.js not installed or not in PATH.

**Windows:**
1. Download installer: [https://nodejs.org](https://nodejs.org)
2. Run installer (restart terminal after)
3. Verify: `node --version`

**macOS:**
```bash
brew install node
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### ❌ Error: "EACCES: permission denied"

**Symptom (macOS/Linux):**
```
Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solution:**
Fix npm permissions:
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

Or use nvm (Node Version Manager) instead.

---

## Still Having Issues?

### Diagnostic Commands

Run these to gather information:

**System info:**
```bash
node --version
npm --version
psql --version
```

**Check running processes:**
```bash
# Windows
netstat -an | findstr "3000 3001 5432 5433"

# macOS/Linux
lsof -i :3000
lsof -i :3001
lsof -i :5432
lsof -i :5433
```

**Check database connection:**
```bash
cd backend
node test-connection.js
```

**Check backend logs:**
Look for errors in the backend terminal window when starting the server.

**Check browser console:**
Press F12 in browser → Console tab → Look for red errors

---

## Clean Reinstall

If all else fails, start fresh:

### 1. Stop all servers
Press `Ctrl+C` in backend and frontend terminals

### 2. Remove dependencies
```bash
cd backend
rm -rf node_modules package-lock.json  # macOS/Linux
# or
rmdir /s node_modules  # Windows
del package-lock.json  # Windows

cd ../frontend
rm -rf node_modules package-lock.json  # macOS/Linux
# or
rmdir /s node_modules  # Windows
del package-lock.json  # Windows
```

### 3. Drop and recreate database
```bash
dropdb -U postgres -h 127.0.0.1 -p 5433 oshen_alerts
createdb -U postgres -h 127.0.0.1 -p 5433 oshen_alerts
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts -f database/oshen_alerts_backup.sql
```

### 4. Reinstall everything
```bash
cd backend
npm install
npm run build
npm start

# In new terminal
cd frontend
npm install
npm start
```

---

## Getting Help

If you still encounter issues:

1. **Check backend terminal** for error messages
2. **Check browser console** (F12 → Console) for frontend errors
3. **Check PostgreSQL logs** for database errors
4. **Verify all prerequisites** are installed and running
5. **Review the error message carefully** - it usually indicates the problem

---

**Last Updated:** January 2025
