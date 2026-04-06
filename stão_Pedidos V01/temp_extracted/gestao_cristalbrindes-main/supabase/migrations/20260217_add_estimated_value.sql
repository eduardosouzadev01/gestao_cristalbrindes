-- Add estimated_value to crm_leads
-- Fixes error: column "estimated_value" of relation "crm_leads" does not exist

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS estimated_value numeric(10,2) DEFAULT 0;
