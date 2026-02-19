-- Add columns to orders and order_items
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supplier_departure_date date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_order text; -- NEW COLUMN

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS bv_pct numeric(5,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_pct numeric(5,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unforeseen_pct numeric(5,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS margin_pct numeric(5,2) DEFAULT 0;

-- Add columns to company_expenses
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2);
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS issuer text;

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_number text NOT NULL UNIQUE,
  salesperson text NOT NULL,
  status text DEFAULT 'EM NEGOCIAÇÃO',
  client_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  issuer text,
  total_amount numeric(10,2) DEFAULT 0,
  observation text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create budget_items table
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id uuid REFERENCES budgets(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  supplier_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  customization_cost numeric(10,2) DEFAULT 0,
  supplier_transport_cost numeric(10,2) DEFAULT 0,
  client_transport_cost numeric(10,2) DEFAULT 0,
  extra_expense numeric(10,2) DEFAULT 0,
  layout_cost numeric(10,2) DEFAULT 0,
  calculation_factor numeric(5,2) DEFAULT 1.35,
  bv_pct numeric(5,2) DEFAULT 0,
  total_item_value numeric(10,2) DEFAULT 0,
  is_approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Update save_order function to include new columns
CREATE OR REPLACE FUNCTION save_order(
  p_order jsonb,
  p_items jsonb
) RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_client_id uuid;
  v_item jsonb;
  v_entry_confirmed boolean;
  v_remaining_confirmed boolean;
  v_entry_amount numeric;
  v_remaining_amount numeric;
  v_salesperson text;
  v_status text;
BEGIN
  -- Extract variables
  v_client_id := (p_order->>'client_id')::uuid;
  v_entry_confirmed := (p_order->>'entry_confirmed')::boolean;
  v_remaining_confirmed := (p_order->>'remaining_confirmed')::boolean;
  v_entry_amount := COALESCE((p_order->>'entry_amount')::numeric, 0);
  v_remaining_amount := COALESCE((p_order->>'remaining_amount')::numeric, 0);
  v_salesperson := p_order->>'salesperson';
  v_status := p_order->>'status';
  
  -- Check if ID exists in payload for Update
  IF (p_order->>'id') IS NOT NULL AND (p_order->>'id') != '' THEN
    v_order_id := (p_order->>'id')::uuid;
    
    -- UPDATE
    UPDATE orders SET
      salesperson = v_salesperson,
      status = v_status::order_status,
      budget_date = (p_order->>'budget_date')::date,
      order_date = (p_order->>'order_date')::date,
      client_id = v_client_id,
      issuer = p_order->>'issuer',
      billing_type = p_order->>'billing_type',
      payment_method = p_order->>'payment_method',
      payment_due_date = (p_order->>'payment_due_date')::date,
      supplier_departure_date = (p_order->>'supplier_departure_date')::date,
      purchase_order = p_order->>'purchase_order',
      invoice_number = p_order->>'invoice_number',
      total_amount = (p_order->>'total_amount')::numeric,
      entry_amount = v_entry_amount,
      entry_date = (p_order->>'entry_date')::date,
      entry_confirmed = v_entry_confirmed,
      remaining_amount = v_remaining_amount,
      remaining_date = (p_order->>'remaining_date')::date,
      remaining_confirmed = v_remaining_confirmed,
      updated_at = now()
    WHERE id = v_order_id;
    
    -- Delete existing items to replace (Simple approach)
    DELETE FROM order_items WHERE order_id = v_order_id;
    
  ELSE
    -- INSERT
    INSERT INTO orders (
      order_number, salesperson, status, budget_date, order_date, 
      client_id, issuer, billing_type, payment_method, payment_due_date, supplier_departure_date, purchase_order, 
      invoice_number, total_amount, entry_amount, entry_date, 
      entry_confirmed, remaining_amount, remaining_date, remaining_confirmed
    ) VALUES (
      p_order->>'order_number',
      v_salesperson,
      v_status::order_status,
      (p_order->>'budget_date')::date,
      (p_order->>'order_date')::date,
      v_client_id,
      p_order->>'issuer',
      p_order->>'billing_type',
      p_order->>'payment_method',
      (p_order->>'payment_due_date')::date,
      (p_order->>'supplier_departure_date')::date,
      p_order->>'purchase_order',
      p_order->>'invoice_number',
      (p_order->>'total_amount')::numeric,
      v_entry_amount,
      (p_order->>'entry_date')::date,
      v_entry_confirmed,
      v_remaining_amount,
      (p_order->>'remaining_date')::date,
      v_remaining_confirmed
    ) RETURNING id INTO v_order_id;
  END IF;

  -- Insere os Itens do Pedido
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_name, supplier_id, quantity, unit_price,
      customization_cost, supplier_transport_cost, client_transport_cost,
      extra_expense, layout_cost,
      calculation_factor, bv_pct, total_item_value,
      
      -- Real Costs
      real_unit_price, real_customization_cost, real_supplier_transport_cost,
      real_client_transport_cost, real_extra_expense, real_layout_cost,
      
      -- Paid Flags
      unit_price_paid, customization_paid, supplier_transport_paid,
      client_transport_paid, extra_expense_paid, layout_paid,

      -- Projection Columns
      tax_pct, unforeseen_pct, margin_pct
    ) VALUES (
      v_order_id,
      v_item->>'product_name',
      (v_item->>'supplier_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'customization_cost')::numeric,
      (v_item->>'supplier_transport_cost')::numeric,
      (v_item->>'client_transport_cost')::numeric,
      (v_item->>'extra_expense')::numeric,
      (v_item->>'layout_cost')::numeric,
      (v_item->>'calculation_factor')::numeric,
      COALESCE((v_item->>'bv_pct')::numeric, 0),
      (v_item->>'total_item_value')::numeric,
      
      COALESCE((v_item->>'real_unit_price')::numeric, 0),
      COALESCE((v_item->>'real_customization_cost')::numeric, 0),
      COALESCE((v_item->>'real_supplier_transport_cost')::numeric, 0),
      COALESCE((v_item->>'real_client_transport_cost')::numeric, 0),
      COALESCE((v_item->>'real_extra_expense')::numeric, 0),
      COALESCE((v_item->>'real_layout_cost')::numeric, 0),
      
      COALESCE((v_item->>'unit_price_paid')::boolean, false),
      COALESCE((v_item->>'customization_paid')::boolean, false),
      COALESCE((v_item->>'supplier_transport_paid')::boolean, false),
      COALESCE((v_item->>'client_transport_paid')::boolean, false),
      COALESCE((v_item->>'extra_expense_paid')::boolean, false),
      COALESCE((v_item->>'layout_paid')::boolean, false),

      COALESCE((v_item->>'tax_pct')::numeric, 0),
      COALESCE((v_item->>'unforeseen_pct')::numeric, 0),
      COALESCE((v_item->>'margin_pct')::numeric, 0)
    );
  END LOOP;

  -- COMMISSION LOGIC (Reapply logic as it was)
  IF v_entry_confirmed THEN
    IF NOT EXISTS (SELECT 1 FROM commissions WHERE order_id = v_order_id AND type = 'ENTRADA') THEN
      INSERT INTO commissions (order_id, salesperson, amount, type, status, commission_percent)
      VALUES (v_order_id, v_salesperson, v_entry_amount * 0.01, 'ENTRADA', 'PENDING', 1.00);
    END IF;
  END IF;
  
  IF v_remaining_confirmed THEN
    IF NOT EXISTS (SELECT 1 FROM commissions WHERE order_id = v_order_id AND type = 'RESTANTE') THEN
      INSERT INTO commissions (order_id, salesperson, amount, type, status, commission_percent)
      VALUES (v_order_id, v_salesperson, v_remaining_amount * 0.01, 'RESTANTE', 'PENDING', 1.00);
    END IF;
  END IF;

  -- Registra Log
  INSERT INTO order_logs (order_id, user_name, message)
  VALUES (v_order_id, COALESCE(v_salesperson, 'Sistema'), 'Pedido salvo/atualizado com sucesso.');

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
