
-- 1. Create sequence for budget numbers
CREATE SEQUENCE IF NOT EXISTS budget_number_seq START 3500;

-- 2. Function to get next budget number
CREATE OR REPLACE FUNCTION get_next_budget_number() RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('budget_number_seq');
END;
$$ LANGUAGE plpgsql;

-- 3. Update existing 'MÉDIA' priority to 'NORMAL'
UPDATE crm_leads SET priority = 'NORMAL' WHERE priority = 'MÉDIA';
UPDATE crm_leads SET priority = 'NORMAL' WHERE priority IS NULL;
