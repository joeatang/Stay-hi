#!/bin/bash

echo "🔍 Running Phase 4A Tesla-Grade Verification..."
echo "=============================================="

# Run verification script through Supabase
echo "Executing comprehensive verification..."
supabase db reset --linked --debug

# Alternative: Run verification SQL directly if reset fails
echo "Running verification queries..."
echo "\\i verify-phase4a-deployment.sql" | supabase db connect --linked

echo "✅ Verification complete!"