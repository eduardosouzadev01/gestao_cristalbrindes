
-- Add new columns to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS client_doc TEXT;

-- Enhance the table to support more robust data
COMMENT ON COLUMN public.crm_leads.client_doc IS 'CPF or CNPJ';
