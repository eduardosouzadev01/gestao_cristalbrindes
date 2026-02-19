
import { supabase } from './lib/supabase';

// SQL command to create the table if it doesn't exist
const CREATE_CRM_LEADS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    description TEXT,
    status TEXT DEFAULT 'NOVO',
    salesperson TEXT,
    next_action_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Policy (simplified for now)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'crm_leads' AND policyname = 'Enable all for authenticated users'
    ) THEN
        CREATE POLICY "Enable all for authenticated users" ON public.crm_leads FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;
`;

export const runMigrations = async () => {
    console.log("Attempting to run migrations...");
    try {
        // We can't run raw SQL from the client unless we have a specific RPC function for it.
        // However, we can try to use a little trick or just check if we can insert.

        // 1. Try to select from the table.
        const { error } = await supabase.from('crm_leads').select('count', { count: 'exact', head: true });

        if (error && error.code === '42P01') {
            console.error("Table crm_leads does not exist. Please run the migration SQL in your Supabase Dashboard SQL Editor.");
            console.error(CREATE_CRM_LEADS_TABLE_SQL);
            return false;
        } else if (error) {
            console.error("Error checking table:", error);
            return false;
        }

        console.log("Table crm_leads exists.");
        return true;
    } catch (e) {
        console.error("Migration check failed:", e);
        return false;
    }
};
