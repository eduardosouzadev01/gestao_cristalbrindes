-- Migration: Add scheduled_payment_date to order_items table
-- This replaces the localStorage-based payment scheduling with a proper database column

-- Add scheduled_payment_date column to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS scheduled_payment_date DATE;

-- Add a margin_pct computed column helper (optional, for reporting)
-- This can be used by BI tools or reports
COMMENT ON COLUMN order_items.scheduled_payment_date IS 'Date when a cost payment is scheduled. Replaces localStorage tracking for payment scheduling in Contas a Pagar.';

-- Create index for efficient querying of scheduled payments
CREATE INDEX IF NOT EXISTS idx_order_items_scheduled_payment ON order_items (scheduled_payment_date) WHERE scheduled_payment_date IS NOT NULL;

-- TODO: Add configurable commission_pct per salesperson
-- The user table needs to be identified first (it's not 'profiles').
-- Once found, add: ALTER TABLE <user_table> ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2) DEFAULT 3.00;
