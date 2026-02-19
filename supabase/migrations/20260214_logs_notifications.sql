-- Migration: Order Logs and Notifications
-- Created: 2026-02-14

-- 1. Table for Order Change Logs
CREATE TABLE IF NOT EXISTS order_change_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table for Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL, -- Target user
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, ALERT
    read BOOLEAN DEFAULT FALSE,
    link TEXT, -- Optional link to the order/budget
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 4. Trigger to notify salesperson when budget status changes to 'APROVADO'
CREATE OR REPLACE FUNCTION notify_budget_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'APROVADO' AND OLD.status != 'APROVADO') THEN
        INSERT INTO notifications (user_email, title, message, type, link)
        VALUES (
            NEW.salesperson, -- Assuming salesperson email is stored or can be mapped
            'Orçamento Aprovado!',
            'O orçamento #' || NEW.budget_number || ' foi aprovado pelo financeiro.',
            'SUCCESS',
            '/orcamento/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_budget_approval ON budgets;
CREATE TRIGGER tr_notify_budget_approval
AFTER UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION notify_budget_approval();
