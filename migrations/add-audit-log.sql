-- Add audit_log column to workflow_runs table for ledgrrr integration
ALTER TABLE workflow_runs ADD COLUMN audit_log TEXT;
