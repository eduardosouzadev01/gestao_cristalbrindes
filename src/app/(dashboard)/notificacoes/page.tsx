'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateUtils';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    link?: string;
    created_at: string;
}

export default function NotificationsPage() {
    const { appUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (appUser?.email) {
            fetchNotifications();
        }
    }, [appUser?.email]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_email', appUser?.email)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error: any) {
            toast.error('Erro ao buscar notificações: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);

            if (error) throw error;
            setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error: any) {
            toast.error('Erro ao marcar como lida: ' + error.message);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setNotifications(notifications.filter(n => n.id !== id));
            toast.success('Notificação excluída');
        } catch (error: any) {
            toast.error('Erro ao excluir: ' + error.message);
        }
    };

    const clearAll = async () => {
        if (!confirm('Deseja limpar todas as notificações permanentemente?')) return;
        
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_email', appUser?.email);

            if (error) throw error;
            setNotifications([]);
            toast.success('Todas as notificações foram limpas');
        } catch (error: any) {
            toast.error('Erro ao limpar notificações: ' + error.message);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F5F8] pb-20">
            <header className="w-full bg-[#F5F5F8] px-8 py-8 border-b border-[#E3E3E4]">
                <div className="max-w-4xl mx-auto flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                            <span className="material-icons-outlined text-[#0F6CBD] text-3xl">notifications</span>
                            Centro de Notificações
                        </h1>
                        <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Histórico completo de alertas e solicitações</p>
                    </div>
                    {notifications.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="h-10 px-4 bg-white border border-red-200 text-red-500 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <span className="material-icons-outlined text-sm">delete_sweep</span>
                            Limpar Tudo
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-4xl w-full mx-auto px-8 mt-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-8 h-8 border-4 border-[#0F6CBD] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Carregando notificações...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-[#E3E3E4] border-dashed">
                        <span className="material-icons-outlined text-gray-200 text-6xl mb-4">notifications_off</span>
                        <h2 className="text-[14px] font-medium text-gray-900 uppercase">Tudo limpo por aqui!</h2>
                        <p className="text-xs text-gray-500 mt-1">Você não possui notificações no momento.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map(n => (
                            <div 
                                key={n.id}
                                className={`group bg-white p-6 rounded-lg border transition-all hover:shadow-sm flex items-start gap-5 ${!n.read ? 'border-[#0F6CBD]/30 ring-1 ring-[#0F6CBD]/5' : 'border-[#E3E3E4]'}`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                    n.type === 'danger' ? 'bg-red-100 text-red-600' :
                                    n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                    n.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                    'bg-blue-100 text-[#0F6CBD]'
                                }`}>
                                    <span className="material-icons-outlined">
                                        {n.type === 'danger' ? 'error_outline' :
                                         n.type === 'warning' ? 'priority_high' :
                                         n.type === 'success' ? 'check_circle' :
                                         'info'}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`text-[13px] font-bold uppercase tracking-tight leading-tight ${!n.read ? 'text-[#0F6CBD]' : 'text-[#111827]'}`}>
                                            {n.title}
                                        </h3>
                                        <span className="text-[10px] font-medium text-gray-400 tabular-nums uppercase whitespace-nowrap">
                                            {formatDate(n.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-gray-600 mt-1.5 leading-relaxed uppercase tracking-tight">
                                        {n.message}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 mt-4">
                                        {n.link && (
                                            <a 
                                                href={n.link}
                                                className="text-[10px] font-bold text-[#0F6CBD] uppercase tracking-widest flex items-center gap-1 hover:underline"
                                            >
                                                Ver Detalhes
                                                <span className="material-icons text-sm">arrow_forward</span>
                                            </a>
                                        )}
                                        {!n.read && (
                                            <button 
                                                onClick={() => markAsRead(n.id)}
                                                className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-[#0F6CBD]"
                                            >
                                                Marcar como lida
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => deleteNotification(n.id)}
                                            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
