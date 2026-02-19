-- 012_full_update_fix.sql

-- 1. Create company_expenses if not exists
create table if not exists company_expenses (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  amount numeric not null default 0,
  due_date date not null,
  paid boolean default false,
  paid_date date,
  category text not null,
  recurrence text,
  observation text,
  created_at timestamp with time zone default now()
);

-- Enable RLS for expenses if not enabled
alter table company_expenses enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'company_expenses') then
    create policy "Authenticated users can view expenses" on company_expenses for select to authenticated using (true);
    create policy "Authenticated users can insert expenses" on company_expenses for insert to authenticated with check (true);
    create policy "Authenticated users can update expenses" on company_expenses for update to authenticated using (true);
    create policy "Authenticated users can delete expenses" on company_expenses for delete to authenticated using (true);
    grant all on company_expenses to authenticated;
  end if;
end $$;

-- 2. Add real_* columns to order_items if not exists
do $$
begin
  -- Real Cost Columns
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'real_unit_price') then
    alter table order_items add column real_unit_price numeric(10,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'real_customization_cost') then
    alter table order_items add column real_customization_cost numeric(10,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'real_supplier_transport_cost') then
    alter table order_items add column real_supplier_transport_cost numeric(10,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'real_client_transport_cost') then
    alter table order_items add column real_client_transport_cost numeric(10,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'real_extra_expense') then
    alter table order_items add column real_extra_expense numeric(10,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'real_layout_cost') then
    alter table order_items add column real_layout_cost numeric(10,2) default 0;
  end if;

  -- Paid Status Columns
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'unit_price_paid') then
    alter table order_items add column unit_price_paid boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'customization_paid') then
    alter table order_items add column customization_paid boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'supplier_transport_paid') then
    alter table order_items add column supplier_transport_paid boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'client_transport_paid') then
    alter table order_items add column client_transport_paid boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'extra_expense_paid') then
    alter table order_items add column extra_expense_paid boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'layout_paid') then
    alter table order_items add column layout_paid boolean default false;
  end if;
  
  -- Layout Cost Column
  if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'layout_cost') then
    alter table order_items add column layout_cost numeric(10,2) default 0;
  end if;
end $$;
