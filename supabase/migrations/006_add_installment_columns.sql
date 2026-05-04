-- Add payment installment columns to order_items for easier tracking in the finance grid
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS entry_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS entry_forecast_date DATE,
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS remaining_forecast_date DATE;

-- Update existing items with order values (optional but good for data consistency)
UPDATE public.order_items oi
SET 
    entry_amount = o.entry_amount,
    entry_forecast_date = o.entry_forecast_date,
    remaining_amount = o.remaining_amount,
    remaining_forecast_date = o.remaining_forecast_date
FROM public.orders o
WHERE oi.order_id = o.id;
