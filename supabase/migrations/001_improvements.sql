-- Migration: Security improvements - RLS, indexes, and integrity
-- Generated from security audit recommendations

-- ============================================================================
-- 1. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Helper: Returns salesperson_id for the authenticated user
CREATE OR REPLACE FUNCTION get_auth_salesperson()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT salesperson_id FROM public.user_profiles WHERE id = auth.uid()
$$;

-- Helper: Checks if auth user has admin/management role
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'GESTAO', 'SUPERVISOR')
  )
$$;

-- 1.1 user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid() OR is_admin_or_manager());

CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can update profiles" ON user_profiles
  FOR UPDATE USING (is_admin_or_manager());

CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (is_admin_or_manager());

-- 1.2 partners (clients & suppliers)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem seus clientes" ON partners
  FOR SELECT USING (
    type = 'CLIENTE' AND (
      salesperson = get_auth_salesperson()
      OR is_admin_or_manager()
    )
  );

CREATE POLICY "Todos veem fornecedores" ON partners
  FOR SELECT USING (type = 'FORNECEDOR');

CREATE POLICY "Autenticados inserem parceiros" ON partners
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Vendedores atualizam seus clientes" ON partners
  FOR UPDATE USING (
    type = 'CLIENTE' AND (
      salesperson = get_auth_salesperson()
      OR is_admin_or_manager()
    )
  );

CREATE POLICY "Autenticados atualizam fornecedores" ON partners
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 1.3 budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem seus orcamentos" ON budgets
  FOR SELECT USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Vendedores criam orcamentos" ON budgets
  FOR INSERT WITH CHECK (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Vendedores atualizam seus orcamentos" ON budgets
  FOR UPDATE USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Admins deletam orcamentos" ON budgets
  FOR DELETE USING (is_admin_or_manager());

-- 1.4 budget_items
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem itens dos seus orcamentos" ON budget_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_items.budget_id
      AND (budgets.salesperson = get_auth_salesperson() OR is_admin_or_manager())
    )
  );

CREATE POLICY "Vendedores inserem itens nos seus orcamentos" ON budget_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_items.budget_id
      AND (budgets.salesperson = get_auth_salesperson() OR is_admin_or_manager())
    )
  );

CREATE POLICY "Vendedores atualizam itens dos seus orcamentos" ON budget_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_items.budget_id
      AND (budgets.salesperson = get_auth_salesperson() OR is_admin_or_manager())
    )
  );

CREATE POLICY "Admins deletam itens de orcamento" ON budget_items
  FOR DELETE USING (is_admin_or_manager());

-- 1.5 proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem suas propostas" ON proposals
  FOR SELECT USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

-- Public proposals: allow read by anyone (for shareable links)
CREATE POLICY "Public can read proposals" ON proposals
  FOR SELECT USING (true);

CREATE POLICY "Vendedores criam propostas" ON proposals
  FOR INSERT WITH CHECK (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Vendedores atualizam suas propostas" ON proposals
  FOR UPDATE USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Admins deletam propostas" ON proposals
  FOR DELETE USING (is_admin_or_manager());

-- 1.6 orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem seus pedidos" ON orders
  FOR SELECT USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Vendedores criam pedidos" ON orders
  FOR INSERT WITH CHECK (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Vendedores atualizam seus pedidos" ON orders
  FOR UPDATE USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

-- 1.7 order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem itens dos seus pedidos" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.salesperson = get_auth_salesperson() OR is_admin_or_manager())
    )
  );

-- 1.8 crm_leads
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem seus leads" ON crm_leads
  FOR SELECT USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Vendedores criam leads" ON crm_leads
  FOR INSERT WITH CHECK (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Vendedores atualizam seus leads" ON crm_leads
  FOR UPDATE USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

CREATE POLICY "Admins deletam leads" ON crm_leads
  FOR DELETE USING (is_admin_or_manager());

-- 1.9 crm_reminders
ALTER TABLE crm_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own reminders" ON crm_reminders
  FOR SELECT USING (user_email = auth.jwt()->>'email' OR is_admin_or_manager());

CREATE POLICY "Users create reminders" ON crm_reminders
  FOR INSERT WITH CHECK (user_email = auth.jwt()->>'email');

CREATE POLICY "Users acknowledge own reminders" ON crm_reminders
  FOR UPDATE USING (user_email = auth.jwt()->>'email' OR is_admin_or_manager());

-- 1.10 products (catalog)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Admins can modify products" ON products
  FOR INSERT WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can update products" ON products
  FOR UPDATE USING (is_admin_or_manager());

CREATE POLICY "Admins can delete products" ON products
  FOR DELETE USING (is_admin_or_manager());

-- 1.11 commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem suas comissoes" ON commissions
  FOR SELECT USING (
    salesperson = get_auth_salesperson()
    OR is_admin_or_manager()
  );

-- 1.12 company_expenses
ALTER TABLE company_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins access expenses" ON company_expenses
  FOR ALL USING (is_admin_or_manager());

-- 1.13 notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (user_email = auth.jwt()->>'email');

CREATE POLICY "System creates notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users mark own notifications read" ON notifications
  FOR UPDATE USING (user_email = auth.jwt()->>'email');

-- 1.14 calculation_factors
ALTER TABLE calculation_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem fatores" ON calculation_factors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins gerenciam fatores" ON calculation_factors
  FOR ALL USING (is_admin_or_manager());

-- 1.15 order_logs and order_change_logs
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem logs" ON order_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados criam logs" ON order_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados veem change logs" ON order_change_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados criam change logs" ON order_change_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 1.16 client_transfer_requests
ALTER TABLE client_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem transferencias" ON client_transfer_requests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados criam transferencias" ON client_transfer_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados atualizam transferencias" ON client_transfer_requests
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================================

-- GIN index on proposals.items JSONB for faster item-level queries
CREATE INDEX IF NOT EXISTS idx_proposals_items_gin ON proposals USING GIN (items jsonb_path_ops);

-- FK from crm_leads to budgets for traceability
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;

-- Index on crm_leads.salesperson
CREATE INDEX IF NOT EXISTS idx_crm_leads_salesperson ON crm_leads(salesperson);

-- Index on budgets.salesperson
CREATE INDEX IF NOT EXISTS idx_budgets_salesperson ON budgets(salesperson);

-- Index on proposals.budget_id
CREATE INDEX IF NOT EXISTS idx_proposals_budget_id ON proposals(budget_id);

-- ============================================================================
-- 3. MISSING COLUMNS (conditional adds)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'tax_pct') THEN
        ALTER TABLE budget_items ADD COLUMN tax_pct NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'margin_pct') THEN
        ALTER TABLE budget_items ADD COLUMN margin_pct NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'payment_tax_pct') THEN
        ALTER TABLE budget_items ADD COLUMN payment_tax_pct NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'extra_pct') THEN
        ALTER TABLE budget_items ADD COLUMN extra_pct NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'product_description') THEN
        ALTER TABLE budget_items ADD COLUMN product_description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'product_color') THEN
        ALTER TABLE budget_items ADD COLUMN product_color TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'product_code') THEN
        ALTER TABLE budget_items ADD COLUMN product_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'product_image_url') THEN
        ALTER TABLE budget_items ADD COLUMN product_image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'payment_method_label') THEN
        ALTER TABLE budget_items ADD COLUMN payment_method_label TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'client_transport_supplier_id') THEN
        ALTER TABLE budget_items ADD COLUMN client_transport_supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'validity') THEN
        ALTER TABLE budgets ADD COLUMN validity TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'shipping') THEN
        ALTER TABLE budgets ADD COLUMN shipping TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'delivery_deadline') THEN
        ALTER TABLE budgets ADD COLUMN delivery_deadline TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'payment_method') THEN
        ALTER TABLE budgets ADD COLUMN payment_method TEXT;
    END IF;
END
$$;

-- ============================================================================
-- 4. AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    user_id UUID REFERENCES user_profiles(id),
    user_email TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins read audit logs" ON audit_logs FOR SELECT USING (is_admin_or_manager());
CREATE POLICY "System inserts audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
