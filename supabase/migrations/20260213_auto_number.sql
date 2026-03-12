
-- 1. Create sequence for budget numbers (Sincronizado com global_budget_seq existente)
CREATE SEQUENCE IF NOT EXISTS global_budget_seq START 3500;

-- 2. Function to get next budget number (Formatado como 0000)
CREATE OR REPLACE FUNCTION get_next_budget_number() RETURNS TEXT AS $$
BEGIN
  RETURN to_char(nextval('global_budget_seq'), 'FM0000');
END;
$$ LANGUAGE plpgsql;

-- 3. Update existing 'MÉDIA' priority to 'NORMAL'
UPDATE crm_leads SET priority = 'NORMAL' WHERE priority = 'MÉDIA';
UPDATE crm_leads SET priority = 'NORMAL' WHERE priority IS NULL;
