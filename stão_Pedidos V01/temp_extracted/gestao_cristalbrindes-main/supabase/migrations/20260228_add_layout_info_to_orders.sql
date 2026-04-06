-- Migration to add layout_info column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS layout_info text;
