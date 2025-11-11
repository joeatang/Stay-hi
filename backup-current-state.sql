-- Backup existing hi_members structure before Phase 4A
CREATE TABLE IF NOT EXISTS hi_members_backup_phase4a AS 
SELECT * FROM hi_members;

-- Log deployment start
INSERT INTO deployment_log (phase, status, timestamp, notes) 
VALUES ('4A', 'started', now(), 'Tesla-grade tier system deployment initiated');
