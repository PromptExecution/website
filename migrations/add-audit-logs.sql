-- Migration: Add ledgrrr audit log columns to comics table
ALTER TABLE comics ADD COLUMN audit_log_render JSON;
ALTER TABLE comics ADD COLUMN audit_log_forecast JSON;
