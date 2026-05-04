-- FIX IMEDIATO: Corrige erro "delivery_date_expected is of type date but expression is of type text"
-- Execute este SQL no Supabase SQL Editor

-- Converte a coluna de DATE para TEXT (compatível com os valores enviados pelo frontend)
ALTER TABLE orders 
  ALTER COLUMN delivery_date_expected TYPE TEXT 
  USING delivery_date_expected::TEXT;
