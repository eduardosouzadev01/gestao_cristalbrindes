-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
    proposal_number TEXT NOT NULL,
    client_id UUID REFERENCES public.partners(id),
    salesperson TEXT,
    items JSONB NOT NULL, -- Snapshot of selected items
    status TEXT DEFAULT 'GERADA',
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_proposals_budget_id ON public.proposals(budget_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (simple ones for now, matching budgets)
CREATE POLICY "Allow all for authenticated users" ON public.proposals
    FOR ALL USING (auth.role() = 'authenticated');
