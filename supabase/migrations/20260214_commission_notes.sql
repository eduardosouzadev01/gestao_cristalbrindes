-- Migration: Add description to commissions
-- Created: 2026-02-14

ALTER TABLE commissions ADD COLUMN IF NOT EXISTS description text;
