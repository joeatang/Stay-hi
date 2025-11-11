#!/bin/bash
# TESLA ROLLBACK SCRIPT - Generated 20251110_221254
echo "🔄 Rolling back Tesla deployment..."

# Restore original files
cp "backups/pre-tesla-20251110_221254/HiShareSheet-original/"* public/ui/HiShareSheet/
cp "backups/pre-tesla-20251110_221254/HiDB-original.js" lib/HiDB.js
cp "backups/pre-tesla-20251110_221254/hi-dashboard-original.html" public/ 2>/dev/null || true
cp "backups/pre-tesla-20251110_221254/hi-muscle-original.html" public/ 2>/dev/null || true  
cp "backups/pre-tesla-20251110_221254/hi-island-original.html" public/hi-island-NEW.html 2>/dev/null || true

echo "✅ Tesla rollback completed"
echo "⚠️  You may need to manually rollback database changes"
