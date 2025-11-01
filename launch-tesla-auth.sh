#!/bin/bash

# TESLA-GRADE AUTH SYSTEM LAUNCHER
# One command to rule them all

echo "🚀 TESLA-GRADE AUTHENTICATION SYSTEM"
echo "======================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3."
    exit 1
fi

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found in PATH"
    echo "   Make sure your database is running"
    echo ""
fi

# Install required Python packages
echo "📦 Installing required packages..."
pip3 install psycopg2-binary

echo ""
echo "🗄️  Database Setup:"
echo "   1. Make sure your PostgreSQL is running"
echo "   2. Run: psql -d your_database -f tesla-auth-setup.sql"
echo ""

# Set environment variables (customize these)
export DB_HOST=${DB_HOST:-"localhost"}
export DB_NAME=${DB_NAME:-"postgres"}
export DB_USER=${DB_USER:-"postgres"}
export DB_PASSWORD=${DB_PASSWORD:-""}
export DB_PORT=${DB_PORT:-"5432"}

# SMTP settings (optional - will mock emails if not set)
export SMTP_HOST=${SMTP_HOST:-""}
export SMTP_PORT=${SMTP_PORT:-"587"}
export SMTP_USER=${SMTP_USER:-""}
export SMTP_PASS=${SMTP_PASS:-""}

echo "🔧 Environment configured:"
echo "   Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "   SMTP: ${SMTP_HOST:-"(mock mode)"}"
echo ""

echo "⚡ Starting Tesla-Grade Authentication Server..."
echo "   UI will be available at: http://localhost:8082/auth"
echo ""

# Start the server
python3 tesla-auth-server.py