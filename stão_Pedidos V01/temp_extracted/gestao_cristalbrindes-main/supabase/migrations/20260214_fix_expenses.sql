-- Migration: Add issuer to company_expenses and fix potential mismatches
-- Created: 2026-02-14

ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS issuer text DEFAULT 'CRISTAL';
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS paid_date date;

-- Ensure recurrence exists with correct default if needed
ALTER TABLE company_expenses ALTER COLUMN recurrence SET DEFAULT 'UNICO';
