
-- Add salesperson to partners to track ownership
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS salesperson TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS email TEXT; -- Ensure email exists if not
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS phone TEXT; -- Ensure phone exists if not
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS doc TEXT; -- Ensure doc exists if not

-- Index for faster search
CREATE INDEX IF NOT EXISTS idx_partners_search ON public.partners USING gin(to_tsvector('portuguese', name || ' ' || coalesce(email,'') || ' ' || coalesce(doc,'')));
