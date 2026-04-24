ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS budget_number varchar(255),
ADD COLUMN IF NOT EXISTS budget_date date;
