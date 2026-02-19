-- Create CRM Leads table (Fix for missing table error)
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    description TEXT,
    status TEXT DEFAULT 'NOVO', -- NOVO, EM_ANDAMENTO, AGUARDANDO, FINALIZADO
    salesperson TEXT,
    next_action_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'crm_leads' AND policyname = 'Enable all for authenticated users'
    ) THEN
        CREATE POLICY "Enable all for authenticated users" ON public.crm_leads FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;
