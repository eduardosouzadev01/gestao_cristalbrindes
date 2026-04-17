import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { toast } from 'sonner';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    link?: string;
    created_at: string;
}

const NotificationCenter: React.FC = () => {
    const { appUser, hasPermission } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!appUser?.email) return;

        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel('realtime_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_email=eq.${appUser.email}`
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Show toast for new notification
                    toast(newNotif.title, {
                        description: newNotif.message,
                        action: newNotif.link ? {
                            label: 'Ver',
                            onClick: () => window.location.hash = `#${newNotif.link}`
                        } : undefined
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [appUser?.email]);

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_email', appUser?.email)
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) {
            // Combine with payment alerts
            const alerts = await fetchPaymentAlerts();
            const combined = [...alerts, ...data];
            setNotifications(combined);
            setUnreadCount(combined.filter(n => !n.read).length);
        }
    };

    const fetchPaymentAlerts = async (): Promise<Notification[]> => {
        try {
            const today = new Date();
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(today.getDate() + 3);
            const todayStr = today.toISOString().split('T')[0];
            const thresholdStr = threeDaysFromNow.toISOString().split('T')[0];

            // Determine if user should see financial/all data
            const canSeeAllOrders = hasPermission('pedidos.all');
            const canSeeFinance = hasPermission('financeiro.pagar') || hasPermission('crm.financeiro');
            const isSellerOnly = appUser?.permissions.viewOwnOrdersOnly;

            let orderQuery = supabase
                .from('orders')
                .select('id, order_number, salesperson, entry_amount, entry_date, entry_confirmed, remaining_amount, remaining_date, remaining_confirmed, payment_due_date, order_date, partners!orders_client_id_fkey(name)')
                .or('entry_confirmed.eq.false,remaining_confirmed.eq.false');

            if (isSellerOnly && appUser?.salesperson) {
                orderQuery = orderQuery.eq('salesperson', appUser.salesperson);
            }

            const { data: orders } = await orderQuery;

            if (!orders) return [];

            const alerts: Notification[] = [];
            const readAlertIds = JSON.parse(localStorage.getItem('cristal_read_alerts') || '[]');

            orders.forEach((o: any) => {
                // Entry about to expire or overdue
                if (!o.entry_confirmed && o.entry_amount > 0) {
                    const dueDate = o.entry_date || o.order_date;
                    if (dueDate && dueDate <= thresholdStr) {
                        const isOverdue = dueDate < todayStr;
                        const alertId = `payment-alert-entry-${o.id}`;
                        alerts.push({
                            id: alertId,
                            title: isOverdue ? `⚠️ Entrada VENCIDA - #${o.order_number}` : `💰 Entrada próxima - #${o.order_number}`,
                            message: `${o.partners?.name || 'Cliente'} — R$ ${o.entry_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${isOverdue ? 'venceu em' : 'vence em'} ${new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                            type: isOverdue ? 'danger' : 'warning',
                            read: readAlertIds.includes(alertId),
                            link: `/pedido/${o.id}?mode=view`,
                            created_at: new Date().toISOString()
                        });
                    }
                }
                // Remaining about to expire or overdue
                if (!o.remaining_confirmed && o.remaining_amount > 0) {
                    const dueDate = o.remaining_date || o.payment_due_date || o.order_date;
                    if (dueDate && dueDate <= thresholdStr) {
                        const isOverdue = dueDate < todayStr;
                        const alertId = `payment-alert-remaining-${o.id}`;
                        alerts.push({
                            id: alertId,
                            title: isOverdue ? `⚠️ Restante VENCIDO - #${o.order_number}` : `💰 Restante próximo - #${o.order_number}`,
                            message: `${o.partners?.name || 'Cliente'} — R$ ${o.remaining_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${isOverdue ? 'venceu em' : 'vence em'} ${new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                            type: isOverdue ? 'danger' : 'warning',
                            read: readAlertIds.includes(alertId),
                            link: `/pedido/${o.id}?mode=view`,
                            created_at: new Date().toISOString()
                        });
                    }
                }
            });

            // 💳 Company Expenses Alerts - Restricted to Finance/Admin
            if (canSeeFinance) {
                const { data: expenses } = await supabase
                    .from('company_expenses')
                    .select('*')
                    .eq('paid', false)
                    .lte('due_date', thresholdStr);

                if (expenses) {
                    expenses.forEach(e => {
                        const isOverdue = e.due_date < todayStr;
                        const alertId = `expense-alert-${e.id}`;
                        alerts.push({
                            id: alertId,
                            title: isOverdue ? `💳 Despesa VENCIDA - ${e.description}` : `📅 Despesa próxima - ${e.description}`,
                            message: `R$ ${e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${isOverdue ? 'vencida em' : 'vence em'} ${new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                            type: isOverdue ? 'danger' : 'warning',
                            read: readAlertIds.includes(alertId),
                            link: `/payables`,
                            created_at: new Date().toISOString()
                        });
                    });
                }

                // 📦 Supplier Costs Alerts - Restricted to Finance/Admin
                const { data: itemCosts } = await supabase
                    .from('order_items')
                    .select('id, product_name, unit_price, real_unit_price, supplier_payment_date, unit_price_paid, orders(order_number)')
                    .eq('unit_price_paid', false)
                    .not('supplier_payment_date', 'is', null)
                    .lte('supplier_payment_date', thresholdStr);

                if (itemCosts) {
                    itemCosts.forEach((i: any) => {
                        const isOverdue = i.supplier_payment_date < todayStr;
                        const alertId = `cost-alert-${i.id}`;
                        alerts.push({
                            id: alertId,
                            title: isOverdue ? `📦 Custo VENCIDO - #${i.orders?.order_number}` : `🚛 Custo próximo - #${i.orders?.order_number}`,
                            message: `${i.product_name} — R$ ${(i.real_unit_price || i.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${isOverdue ? 'venceu em' : 'vence em'} ${new Date(i.supplier_payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                            type: isOverdue ? 'danger' : 'warning',
                            read: readAlertIds.includes(alertId),
                            link: `/payables`,
                            created_at: new Date().toISOString()
                        });
                    });
                }
            }

            return alerts.sort((a, b) => b.title.includes('VENCID') ? 1 : -1);
        } catch {
            return [];
        }
    };

    const markAsRead = async (id: string) => {
        // Local payment alerts
        if (id.startsWith('payment-alert-')) {
            const readAlerts = JSON.parse(localStorage.getItem('cristal_read_alerts') || '[]');
            if (!readAlerts.includes(id)) {
                readAlerts.push(id);
                localStorage.setItem('cristal_read_alerts', JSON.stringify(readAlerts));
            }
        } else {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);
        }

        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_email', appUser?.email)
            .eq('read', false);

        // Mark all payment alerts as read
        const alertIds = notifications.filter(n => n.id.startsWith('payment-alert-') && !n.read).map(n => n.id);
        if (alertIds.length > 0) {
            const existing = JSON.parse(localStorage.getItem('cristal_read_alerts') || '[]');
            localStorage.setItem('cristal_read_alerts', JSON.stringify([...existing, ...alertIds]));
        }

        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative transition-all"
            >
                <span className="material-icons-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 r-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl py-0 z-20 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Notificações</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-[10px] text-blue-600 hover:underline font-bold uppercase"
                                >
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <span className="material-icons-outlined text-gray-200 text-4xl mb-2">notifications_off</span>
                                    <p className="text-xs text-gray-400">Nenhuma notificação por enquanto.</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer relative ${!n.read ? 'bg-blue-50/30' : ''}`}
                                        onClick={() => {
                                            if (n.link) window.location.hash = `#${n.link}`;
                                            markAsRead(n.id);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        {!n.read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                                        <div className="flex justify-between items-start mb-1">
                                            <p className={`text-xs font-bold ${n.read ? 'text-gray-700' : 'text-blue-900'}`}>{n.title}</p>
                                            <span className="text-[9px] text-gray-400 whitespace-nowrap ml-2">
                                                {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{n.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;
