'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Reminder {
    id: string;
    title: string;
    message: string;
    scheduled_at: string;
    lead_id?: string;
    crm_leads?: {
        client_name: string;
    };
}

export default function ReminderMonitor() {
    const { appUser } = useAuth();
    const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
    const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);

    const fetchReminders = useCallback(async () => {
        if (!appUser?.email) return;

        const { data, error } = await supabase
            .from('crm_reminders')
            .select(`
                *,
                crm_leads (client_name)
            `)
            .eq('user_email', appUser.email)
            .is('acknowledged_at', null)
            .lte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true });

        if (!error && data && data.length > 0) {
            setActiveReminders(data);
            if (!currentReminder) {
                setCurrentReminder(data[0]);
            }
        }
    }, [appUser, currentReminder]);

    useEffect(() => {
        // Initial fetch
        fetchReminders();

        // Poll every minute
        const interval = setInterval(fetchReminders, 60000);

        // Realtime subscription
        const channel = supabase
            .channel('crm_reminders_changes')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'crm_reminders',
                filter: `user_email=eq.${appUser?.email}`
            }, fetchReminders)
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [appUser, fetchReminders]);

    const handleAcknowledge = async (id: string) => {
        try {
            const { error } = await supabase
                .from('crm_reminders')
                .update({ acknowledged_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            toast.success('Lembrete confirmado.');
            
            const remaining = activeReminders.filter(r => r.id !== id);
            setActiveReminders(remaining);
            setCurrentReminder(remaining.length > 0 ? remaining[0] : null);
        } catch (err: any) {
            toast.error('Erro ao confirmar lembrete: ' + err.message);
        }
    };

    if (!currentReminder) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                <div className="bg-[#0F6CBD] p-6 text-white flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                        <span className="material-icons-outlined text-2xl">notifications_active</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold font-jakarta uppercase tracking-tight">Lembrete de Atendimento</h3>
                        <p className="text-white/80 text-xs font-medium uppercase tracking-widest mt-0.5">Ação Agendada</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest block mb-2 font-jakarta">Assunto</label>
                        <p className="text-[#242424] text-lg font-medium font-jakarta leading-tight uppercase">{currentReminder.title}</p>
                    </div>

                    {currentReminder.crm_leads && (
                        <div>
                            <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest block mb-2 font-jakarta">Cliente Relacionado</label>
                            <div className="flex items-center gap-2 bg-[#F5F5F8] p-3 rounded-lg border border-[#E0E0E0]">
                                <span className="material-icons-outlined text-[#0F6CBD] text-sm">person</span>
                                <span className="text-[#242424] text-xs font-bold uppercase tracking-tight">{currentReminder.crm_leads.client_name}</span>
                            </div>
                        </div>
                    )}

                    {currentReminder.message && (
                        <div>
                            <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest block mb-2 font-jakarta">Observações</label>
                            <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#D1D1D1] text-[#424242] text-[13px] leading-relaxed italic font-jakarta whitespace-pre-wrap uppercase">
                                "{currentReminder.message}"
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            onClick={() => handleAcknowledge(currentReminder.id)}
                            className="w-full py-4 bg-[#0F6CBD] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#115EA3] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#0F6CBD]/20"
                        >
                            <span className="material-icons-outlined text-lg">check_circle</span>
                            Confirmar Recebimento
                        </button>
                        
                        <p className="text-center text-[10px] text-[#BDBDBD] font-medium uppercase tracking-widest">
                            {activeReminders.length > 1 ? `Você tem mais ${activeReminders.length - 1} lembretes pendentes` : 'Este é seu único lembrete pendente'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
