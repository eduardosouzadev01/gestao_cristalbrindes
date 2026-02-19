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
    const { appUser } = useAuth();
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
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        }
    };

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_email', appUser?.email)
            .eq('read', false);

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
