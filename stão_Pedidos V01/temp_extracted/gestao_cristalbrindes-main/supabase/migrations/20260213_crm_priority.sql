
-- Add priority to leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MÉDIA';

-- Optional: Add order index for manual sorting if needed later
-- ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS order_index SERIAL;
