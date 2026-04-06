ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_order TEXT;

-- Create leads table
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    description TEXT,
    status TEXT DEFAULT 'NOVO', -- NOVO, EM_ANDAMENTO, AGUARDANDO, FINALIZADO
    salesperson TEXT,
    history JSONB[] DEFAULT '{}',
    next_action_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy (optional but good practice)
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON crm_leads FOR ALL USING (auth.role() = 'authenticated');
