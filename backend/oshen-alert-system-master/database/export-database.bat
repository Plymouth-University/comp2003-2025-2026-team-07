@echo off
REM Database Export Script for Windows
REM Exports the oshen_alerts PostgreSQL database to a backup file

echo ========================================
echo Oshen Alert System - Database Export
echo ========================================
echo.

REM Get current date for filename
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

REM Set output filename
set OUTPUT_FILE=oshen_alerts_backup.sql
set TIMESTAMPED_FILE=oshen_alerts_backup_%TIMESTAMP%.sql

echo Exporting database: oshen_alerts
echo Output file: %OUTPUT_FILE%
echo.

REM Export database
pg_dump -U postgres -h 127.0.0.1 -p 5433 --clean --if-exists oshen_alerts > %OUTPUT_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓ Database exported successfully!
    echo ========================================
    echo File: %OUTPUT_FILE%

    REM Show file size
    for %%A in (%OUTPUT_FILE%) do echo Size: %%~zA bytes

    echo.
    echo Creating timestamped backup...
    copy %OUTPUT_FILE% %TIMESTAMPED_FILE% > nul
    echo Timestamped backup: %TIMESTAMPED_FILE%

) else (
    echo.
    echo ========================================
    echo ✗ Export failed!
    echo ========================================
    echo.
    echo Common issues:
    echo 1. PostgreSQL is not running
    echo 2. Wrong password
    echo 3. Wrong port (change 5433 to 5432 if needed)
    echo 4. pg_dump not in PATH
    echo.
    echo Try adding PostgreSQL to PATH:
    echo set PATH=%%PATH%%;C:\Program Files\PostgreSQL\14\bin
)

echo.
pause
