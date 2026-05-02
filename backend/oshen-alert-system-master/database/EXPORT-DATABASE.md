# Database Export Instructions

This document explains how to export your PostgreSQL database for backup or submission.

---

## Quick Export Command

From the project root directory, run:

**Windows (Command Prompt):**
```bash
pg_dump -U postgres -h 127.0.0.1 -p 5433 oshen_alerts > database\oshen_alerts_backup.sql
```

**macOS/Linux:**
```bash
pg_dump -U postgres -h 127.0.0.1 -p 5433 oshen_alerts > database/oshen_alerts_backup.sql
```

You'll be prompted for your PostgreSQL password.

---

## Alternative Export Methods

### Method 1: Using pgAdmin (GUI)

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on `oshen_alerts` database
4. Select "Backup..."
5. Settings:
   - Filename: `database/oshen_alerts_backup.sql`
   - Format: `Plain`
   - Encoding: `UTF8`
6. Click "Backup"

### Method 2: Export with compression

For smaller file size:

**Windows:**
```bash
pg_dump -U postgres -h 127.0.0.1 -p 5433 -Fc oshen_alerts > database\oshen_alerts_backup.dump
```

**macOS/Linux:**
```bash
pg_dump -U postgres -h 127.0.0.1 -p 5433 -Fc oshen_alerts > database/oshen_alerts_backup.dump
```

To restore compressed backup:
```bash
pg_restore -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts database/oshen_alerts_backup.dump
```

### Method 3: Export specific tables only

If you only want to export certain tables:

```bash
pg_dump -U postgres -h 127.0.0.1 -p 5433 -t users -t vessels -t alert_rules oshen_alerts > database/partial_backup.sql
```

---

## Export Options Explained

```bash
pg_dump [options] database_name > output_file.sql
```

**Common options:**
- `-U postgres` - Database user (usually postgres)
- `-h 127.0.0.1` - Host (localhost)
- `-p 5433` - Port (change to 5432 if that's your PostgreSQL port)
- `-Fc` - Custom compressed format (smaller file)
- `-Fp` - Plain SQL format (default, human-readable)
- `-t table_name` - Export specific table only
- `--clean` - Add DROP statements before CREATE
- `--if-exists` - Use IF EXISTS in DROP statements
- `--inserts` - Use INSERT statements instead of COPY (slower but more compatible)

---

## Full Export with Options

For submission/backup, use this comprehensive command:

**Windows:**
```bash
pg_dump -U postgres -h 127.0.0.1 -p 5433 --clean --if-exists --inserts oshen_alerts > database\oshen_alerts_backup.sql
```

**macOS/Linux:**
```bash
pg_dump -U postgres -h 127.0.0.1 -p 5433 --clean --if-exists --inserts oshen_alerts > database/oshen_alerts_backup.sql
```

This creates a backup that:
- Drops existing tables before creating (`--clean`)
- Uses `IF EXISTS` to avoid errors (`--if-exists`)
- Uses `INSERT` statements for maximum compatibility (`--inserts`)

---

## Verify Export

After exporting, verify the file:

**Windows:**
```bash
# Check file exists and size
dir database\oshen_alerts_backup.sql

# View first few lines
type database\oshen_alerts_backup.sql | more
```

**macOS/Linux:**
```bash
# Check file exists and size
ls -lh database/oshen_alerts_backup.sql

# View first few lines
head -20 database/oshen_alerts_backup.sql
```

You should see:
- File size > 100KB (depending on data)
- SQL commands like `CREATE TABLE`, `INSERT INTO`, etc.

---

## Export Current Database State

The current database contains:

- **Users:** 3 (1 admin, 2 supervisors)
- **Vessels:** 7 maritime vessels
- **Alert Rules:** 135 configured rules
- **Geofences:** 8 geographic boundaries
- **Telemetry:** 121+ data points
- **Message Types:** 2 (Format 3, Format 5)
- **Alert History:** All triggered alerts
- **Alert Evaluations:** All rule evaluations

To verify before exporting:
```bash
cd backend
node check-database-contents.js
```

---

## Scheduled Backups (Optional)

For automatic daily backups:

### Windows (Task Scheduler)

1. Create `backup-database.bat`:
```batch
@echo off
set PGPASSWORD=your_postgres_password
set BACKUP_FILE=database\backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql
pg_dump -U postgres -h 127.0.0.1 -p 5433 oshen_alerts > %BACKUP_FILE%
```

2. Schedule in Task Scheduler to run daily

### macOS/Linux (cron)

1. Create `backup-database.sh`:
```bash
#!/bin/bash
export PGPASSWORD='your_postgres_password'
BACKUP_FILE="database/backup_$(date +%Y%m%d).sql"
pg_dump -U postgres -h 127.0.0.1 -p 5433 oshen_alerts > "$BACKUP_FILE"
```

2. Make executable: `chmod +x backup-database.sh`

3. Add to crontab: `crontab -e`
```
0 2 * * * /path/to/backup-database.sh
```

---

## Troubleshooting Export

### ❌ "pg_dump: command not found"

**Solution:**
Add PostgreSQL bin directory to PATH.

**Windows:**
```bash
set PATH=%PATH%;C:\Program Files\PostgreSQL\14\bin
```

**macOS/Linux:**
```bash
export PATH="/usr/lib/postgresql/14/bin:$PATH"
```

### ❌ "password authentication failed"

**Solution:**
Verify PostgreSQL password or set PGPASSWORD environment variable:

**Windows (PowerShell):**
```powershell
$env:PGPASSWORD="your_password"
pg_dump -U postgres -h 127.0.0.1 -p 5433 oshen_alerts > database\oshen_alerts_backup.sql
```

**macOS/Linux:**
```bash
PGPASSWORD='your_password' pg_dump -U postgres -h 127.0.0.1 -p 5433 oshen_alerts > database/oshen_alerts_backup.sql
```

### ❌ "server closed the connection unexpectedly"

**Solution:**
PostgreSQL may not be running or connection settings are wrong.

Check PostgreSQL status:
```bash
# Windows (services.msc)
# macOS
brew services list

# Linux
sudo systemctl status postgresql
```

Verify port:
```bash
netstat -an | grep 5433
```

---



Test import:
```bash
# Create test database
createdb -U postgres -h 127.0.0.1 -p 5433 oshen_alerts_test

# Import backup
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts_test -f database/oshen_alerts_backup.sql

# Verify
psql -U postgres -h 127.0.0.1 -p 5433 -d oshen_alerts_test -c "\dt"

# Clean up
dropdb -U postgres -h 127.0.0.1 -p 5433 oshen_alerts_test
```

---

**Last Updated:** January 2026
