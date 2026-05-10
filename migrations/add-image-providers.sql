-- Migration: Add image provider model tracking
ALTER TABLE comics ADD COLUMN model_provider_a TEXT;
ALTER TABLE comics ADD COLUMN model_provider_b TEXT;
