-- Migration: Add lost_reason to crm_leads
-- Created: 2026-02-14

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS lost_reason text;
