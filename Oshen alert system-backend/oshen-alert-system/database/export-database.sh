#!/bin/bash
# Database Export Script for macOS/Linux
# Exports the oshen_alerts PostgreSQL database to a backup file

echo "========================================"
echo "Oshen Alert System - Database Export"
echo "========================================"
echo ""

# Get current timestamp for filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Set output filename
OUTPUT_FILE="oshen_alerts_backup.sql"
TIMESTAMPED_FILE="oshen_alerts_backup_${TIMESTAMP}.sql"

# Database connection settings
DB_USER="postgres"
DB_HOST="127.0.0.1"
DB_PORT="5433"
DB_NAME="oshen_alerts"

echo "Exporting database: $DB_NAME"
echo "Output file: $OUTPUT_FILE"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump command not found"
    echo ""
    echo "Please install PostgreSQL or add it to PATH:"
    echo "  macOS: brew install postgresql"
    echo "  Linux: sudo apt-get install postgresql-client"
    exit 1
fi

# Export database
pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" --clean --if-exists "$DB_NAME" > "$OUTPUT_FILE"

# Check if export was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✓ Database exported successfully!"
    echo "========================================"
    echo "File: $OUTPUT_FILE"

    # Show file size
    if [ -f "$OUTPUT_FILE" ]; then
        FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
        echo "Size: $FILE_SIZE"
    fi

    # Create timestamped backup
    echo ""
    echo "Creating timestamped backup..."
    cp "$OUTPUT_FILE" "$TIMESTAMPED_FILE"
    echo "Timestamped backup: $TIMESTAMPED_FILE"

    # Verify contents
    echo ""
    echo "Verifying export..."
    if grep -q "CREATE TABLE" "$OUTPUT_FILE" && grep -q "INSERT INTO" "$OUTPUT_FILE"; then
        echo "✓ Export contains tables and data"
    else
        echo "⚠ Warning: Export may be incomplete"
    fi

else
    echo ""
    echo "========================================"
    echo "✗ Export failed!"
    echo "========================================"
    echo ""
    echo "Common issues:"
    echo "1. PostgreSQL is not running"
    echo "   Check: brew services list (macOS)"
    echo "   Check: sudo systemctl status postgresql (Linux)"
    echo ""
    echo "2. Wrong password"
    echo "   Solution: Set PGPASSWORD environment variable"
    echo "   export PGPASSWORD='your_password'"
    echo ""
    echo "3. Wrong port (change 5433 to 5432 if needed)"
    echo "   Edit this script and change DB_PORT variable"
    echo ""
    echo "4. Database doesn't exist"
    echo "   Check: psql -U postgres -l"
    exit 1
fi

echo ""
echo "Export complete!"
