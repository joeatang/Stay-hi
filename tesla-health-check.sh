#!/bin/bash
# Tesla Health Check Script
echo "🔍 Tesla Health Check - $(date)"
echo "================================"

# Check for Tesla markers in logs
echo "📊 Tesla Activity:"
grep -c "Tesla" logs/*.log 2>/dev/null || echo "No Tesla logs found yet"

# Check database connections
echo "💾 Database Status:"
if [ -n "$SUPABASE_URL" ]; then
    curl -f "$SUPABASE_URL/rest/v1/" >/dev/null 2>&1 && echo "✅ Database accessible" || echo "❌ Database connection failed"
else
    echo "⚠️  Database URL not configured"
fi

# Check file integrity
echo "📁 File Integrity:"
if grep -q "Tesla" public/ui/HiShareSheet/HiShareSheet.js; then
    echo "✅ Tesla HiShareSheet intact"
else
    echo "❌ Tesla HiShareSheet missing"
fi

if grep -q "TESLA ENHANCED" lib/HiDB.js; then
    echo "✅ Tesla HiDB intact"
else
    echo "❌ Tesla HiDB missing"  
fi

echo "🎯 Health check completed"
