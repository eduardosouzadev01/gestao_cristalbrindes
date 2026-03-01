-- Migration to update orders with observations and other missing fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS observations text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS purchase_order text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_departure_date date;

-- Update save_order RPC to include all fields
CREATE OR REPLACE FUNCTION public.save_order(
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
  v_entry_amount := coalesce((p_order->>'entry_amount')::numeric, 0);
  v_remaining_amount := coalesce((p_order->>'remaining_amount')::numeric, 0);
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
      invoice_number = p_order->>'invoice_number',
      total_amount = (p_order->>'total_amount')::numeric,
      entry_amount = v_entry_amount,
      entry_date = (p_order->>'entry_date')::date,
      entry_confirmed = v_entry_confirmed,
      remaining_amount = v_remaining_amount,
      remaining_date = (p_order->>'remaining_date')::date,
      remaining_confirmed = v_remaining_confirmed,
      purchase_order = p_order->>'purchase_order',
      layout_info = p_order->>'layout_info',
      supplier_departure_date = (p_order->>'supplier_departure_date')::date,
      observations = p_order->>'observations',
      updated_at = now()
    WHERE id = v_order_id;
    
    -- Delete existing items to replace (Simple approach)
    DELETE FROM order_items WHERE order_id = v_order_id;
    
  ELSE
    -- INSERT
    INSERT INTO orders (
      order_number, salesperson, status, budget_date, order_date, 
      client_id, issuer, billing_type, payment_method, payment_due_date, 
      invoice_number, total_amount, entry_amount, entry_date, 
      entry_confirmed, remaining_amount, remaining_date, remaining_confirmed,
      purchase_order, layout_info, supplier_departure_date, observations
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
      p_order->>'invoice_number',
      (p_order->>'total_amount')::numeric,
      v_entry_amount,
      (p_order->>'entry_date')::date,
      v_entry_confirmed,
      v_remaining_amount,
      (p_order->>'remaining_date')::date,
      v_remaining_confirmed,
      p_order->>'purchase_order',
      p_order->>'layout_info',
      (p_order->>'supplier_departure_date')::date,
      p_order->>'observations'
    ) RETURNING id INTO v_order_id;
  END IF;

  -- Insere os Itens do Pedido
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_name, supplier_id, quantity, unit_price,
      customization_cost, supplier_transport_cost, client_transport_cost,
      extra_expense, layout_cost, calculation_factor, total_item_value,
      real_unit_price, real_customization_cost, real_supplier_transport_cost, 
      real_client_transport_cost, real_extra_expense, real_layout_cost,
      unit_price_paid, customization_paid, supplier_transport_paid,
      client_transport_paid, extra_expense_paid, layout_paid
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
      coalesce((v_item->>'layout_cost')::numeric, 0),
      (v_item->>'calculation_factor')::numeric,
      (v_item->>'total_item_value')::numeric,
      coalesce((v_item->>'real_unit_price')::numeric, 0),
      coalesce((v_item->>'real_customization_cost')::numeric, 0),
      coalesce((v_item->>'real_supplier_transport_cost')::numeric, 0),
      coalesce((v_item->>'real_client_transport_cost')::numeric, 0),
      coalesce((v_item->>'real_extra_expense')::numeric, 0),
      coalesce((v_item->>'real_layout_cost')::numeric, 0),
      coalesce((v_item->>'unit_price_paid')::boolean, false),
      coalesce((v_item->>'customization_paid')::boolean, false),
      coalesce((v_item->>'supplier_transport_paid')::boolean, false),
      coalesce((v_item->>'client_transport_paid')::boolean, false),
      coalesce((v_item->>'extra_expense_paid')::boolean, false),
      coalesce((v_item->>'layout_paid')::boolean, false)
    );
  END LOOP;

  -- COMMISSION LOGIC
  IF v_entry_confirmed THEN
    IF NOT EXISTS (SELECT 1 FROM commissions WHERE order_id = v_order_id AND type = 'ENTRADA') THEN
      INSERT INTO commissions (order_id, salesperson, amount, type, status, commission_percent)
      values (v_order_id, v_salesperson, v_entry_amount * 0.03, 'ENTRADA', 'PENDING', 3.00);
    END IF;
  END IF;
  
  IF v_remaining_confirmed THEN
    IF NOT EXISTS (SELECT 1 FROM commissions WHERE order_id = v_order_id AND type = 'RESTANTE') THEN
      INSERT INTO commissions (order_id, salesperson, amount, type, status, commission_percent)
      values (v_order_id, v_salesperson, v_remaining_amount * 0.03, 'RESTANTE', 'PENDING', 3.00);
    END IF;
  END IF;

  INSERT INTO order_logs (order_id, user_name, message)
  VALUES (v_order_id, coalesce(v_salesperson, 'Sistema'), 'Pedido salvo/atualizado com sucesso.');

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
