'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface InternalTask {
    id: string;
    title: string;
    description: string;
    status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
    priority: 'BAIXA' | 'NORMAL' | 'ALTA';
    category: string;
    due_date: string | null;
    is_recurring: boolean;
    recurrence_period: string | null;
    created_by_email: string;
    assigned_to: string;
    created_at: string;
}

export default function InternalTasksPage() {
    const { appUser } = useAuth();
    const [tasks, setTasks] = useState<InternalTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<InternalTask | null>(null);
    const [taskForm, setTaskForm] = useState<Partial<InternalTask>>({
        status: 'PENDENTE',
        priority: 'NORMAL',
        category: 'GERAL',
        is_recurring: false,
        recurrence_period: 'MONTHLY'
    });

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('internal_tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTasks(data || []);
        } catch (e: any) {
            toast.error('Erro ao carregar tarefas: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTask = async () => {
        if (!taskForm.title) {
            toast.error('O título é obrigatório.');
            return;
        }

        const payload = {
            ...taskForm,
            created_by_email: appUser?.email || 'sistema',
            updated_at: new Date().toISOString()
        };

        try {
            if (editingTask) {
                const { error } = await supabase.from('internal_tasks').update(payload).eq('id', editingTask.id);
                if (error) throw error;
                toast.success('Tarefa atualizada!');
            } else {
                const { error } = await supabase.from('internal_tasks').insert([payload]);
                if (error) throw error;
                toast.success('Tarefa criada!');
            }
            setIsModalOpen(false);
            fetchTasks();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleStatusChange = async (task: InternalTask, newStatus: InternalTask['status']) => {
        try {
            const { error } = await supabase.from('internal_tasks').update({ status: newStatus }).eq('id', task.id);
            if (error) throw error;
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'ALTA': return 'text-[#F43F5E] bg-[#FFF1F2] border-[#FECDD3]';
            case 'NORMAL': return 'text-[#0F6CBD] bg-[#EFF6FF] border-[#DBEAFE]';
            case 'BAIXA': return 'text-[#6B7280] bg-[#F9FAFB] border-[#E3E3E4]';
            default: return 'text-[#6B7280] bg-[#F9FAFB] border-[#E3E3E4]';
        }
    };

    return (
        <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">assignment</span>
                        Processos Internos
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Gestão de demandas administrativas e automações</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTask(null);
                        setTaskForm({ status: 'PENDENTE', priority: 'NORMAL', category: 'GERAL' });
                        setIsModalOpen(true);
                    }}
                    className="h-12 px-8 bg-[#0F6CBD] text-white rounded-md text-[11px] font-medium uppercase tracking-widest hover:bg-[#115EA3] flex items-center gap-2 active:scale-95"
                >
                    <span className="material-icons-outlined text-[20px]">add</span>
                    Nova Demanda
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-md border border-[#E3E3E4]">
                    <div className="w-10 h-10 border-4 border-[#F3F4F6] border-t-[#6366F1] rounded-full animate-spin"></div>
                    <p className="mt-4 text-[10px] font-medium text-[#9CA3AF] uppercase tracking-widest">Sincronizando tarefas...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-md border border-[#E3E3E4]">
                    <span className="material-icons-outlined text-[#E5E7EB] text-6xl">inventory_2</span>
                    <p className="mt-4 text-[11px] font-medium text-[#9CA3AF] uppercase tracking-widest italic">Nenhuma tarefa localizada</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tasks.map(task => (
                        <div key={task.id} className={`group bg-white rounded-md border border-[#E3E3E4] p-6 shadow-none hover:shadow-none hover:-translate-y-1 transition-all duration-300 relative flex flex-col ${task.status === 'CONCLUIDO' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-medium uppercase tracking-widest border ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                </span>
                                <span className="text-[9px] font-medium text-[#A5B4FC] uppercase tracking-widest">{task.category}</span>
                            </div>

                            <h3 className={`text-base font-medium text-[#111827] leading-tight mb-2 ${task.status === 'CONCLUIDO' ? 'line-through' : ''}`}>{task.title}</h3>
                            <p className="text-[12px] font-medium text-[#6B7280] line-clamp-2 mb-6">{task.description}</p>

                            <div className="mt-auto pt-4 border-t border-[#F3F4F6] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-outlined text-[#9CA3AF] text-sm">schedule</span>
                                    <span className="text-[10px] font-medium text-[#9CA3AF]">{formatDate(task.created_at)}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleStatusChange(task, task.status === 'CONCLUIDO' ? 'PENDENTE' : 'CONCLUIDO')}
                                        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${task.status === 'CONCLUIDO' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#F9FAFB] text-[#9CA3AF] hover:bg-[#ECFDF5] hover:text-[#10B981]'}`}
                                    >
                                        <span className="material-icons-outlined text-[18px]">{task.status === 'CONCLUIDO' ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    </button>
                                    <button
                                        onClick={() => { setEditingTask(task); setTaskForm(task); setIsModalOpen(true); }}
                                        className="w-8 h-8 rounded-md bg-[#F9FAFB] text-[#9CA3AF] hover:bg-[#EFF6FF] hover:text-[#0F6CBD] flex items-center justify-center transition-all"
                                    >
                                        <span className="material-icons-outlined text-[18px]">edit</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-md w-full max-w-md shadow-none border border-white/20 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-8 pb-4 flex justify-between items-center">
                            <h2 className="text-xl font-medium text-[#111827] uppercase tracking-tighter">{editingTask ? 'Editar Demanda' : 'Nova Demanda'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-[#F9FAFB] text-[#9CA3AF] hover:text-[#F43F5E] flex items-center justify-center transition-all">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="block text-[9px] font-medium text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Título</label>
                                <input
                                    className="w-full h-12 px-5 bg-[#F9FAFB] border-0 rounded-md text-[13px] font-medium text-[#111827] outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                                    placeholder="Ex: Atualizar planilhas"
                                    value={taskForm.title || ''}
                                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-medium text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Descrição</label>
                                <textarea
                                    className="w-full h-24 px-5 py-4 bg-[#F9FAFB] border-0 rounded-md text-[13px] font-medium text-[#111827] outline-none focus:ring-2 focus:ring-[#6366F1]/20 resize-none"
                                    placeholder="Detalhes da demanda..."
                                    value={taskForm.description || ''}
                                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-medium text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Prioridade</label>
                                    <select
                                        className="w-full h-12 px-5 bg-[#F9FAFB] border-0 rounded-md text-[12px] font-medium text-[#111827] outline-none"
                                        value={taskForm.priority}
                                        onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                                    >
                                        <option value="BAIXA">BAIXA</option>
                                        <option value="NORMAL">NORMAL</option>
                                        <option value="ALTA">ALTA</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Categoria</label>
                                    <input
                                        className="w-full h-12 px-5 bg-[#F9FAFB] border-0 rounded-md text-[12px] font-medium text-[#111827] outline-none"
                                        value={taskForm.category || ''}
                                        onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSaveTask}
                                className="w-full h-14 bg-[#6366F1] text-white rounded-md text-[11px] font-medium uppercase tracking-widest shadow-none shadow-none-[#6366F1]/20 hover:bg-[#4F46E5] active:scale-95 transition-all mt-4"
                            >
                                Salvar Registro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
