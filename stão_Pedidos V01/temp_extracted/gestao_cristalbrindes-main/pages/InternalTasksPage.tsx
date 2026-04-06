import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { formatDate } from '../src/utils/dateUtils';

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

const InternalTasksPage: React.FC = () => {
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
        const { data, error } = await supabase
            .from('internal_tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Erro ao carregar tarefas: ' + error.message);
        } else {
            setTasks(data || []);
        }
        setLoading(false);
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
                const { error } = await supabase
                    .from('internal_tasks')
                    .update(payload)
                    .eq('id', editingTask.id);
                if (error) throw error;
                toast.success('Tarefa atualizada!');
            } else {
                const { error } = await supabase
                    .from('internal_tasks')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Tarefa criada!');
            }
            setIsModalOpen(false);
            setEditingTask(null);
            setTaskForm({
                status: 'PENDENTE',
                priority: 'NORMAL',
                category: 'GERAL',
                is_recurring: false,
                recurrence_period: 'MONTHLY'
            });
            fetchTasks();
        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message);
        }
    };

    const handleStatusChange = async (task: InternalTask, newStatus: InternalTask['status']) => {
        try {
            const { error } = await supabase
                .from('internal_tasks')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', task.id);

            if (error) throw error;
            toast.success(`Status atualizado para ${newStatus}`);
            fetchTasks();
        } catch (error: any) {
            toast.error('Erro ao atualizar status: ' + error.message);
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!window.confirm('Excluir esta tarefa permanentemente?')) return;
        try {
            const { error } = await supabase.from('internal_tasks').delete().eq('id', id);
            if (error) throw error;
            toast.success('Tarefa excluída!');
            fetchTasks();
        } catch (error: any) {
            toast.error('Erro ao excluir: ' + error.message);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'ALTA': return 'text-red-600 bg-red-50 border-red-100';
            case 'NORMAL': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'BAIXA': return 'text-gray-500 bg-gray-50 border-gray-100';
            default: return 'text-gray-500 bg-gray-50 border-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDENTE': return 'radio_button_unchecked';
            case 'EM_ANDAMENTO': return 'pending';
            case 'CONCLUIDO': return 'check_circle';
            case 'CANCELADO': return 'cancel';
            default: return 'help_outline';
        }
    };

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-indigo-600 text-4xl">assignment</span>
                        Processos Internos
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium uppercase tracking-widest bg-indigo-50 inline-block px-3 py-1 rounded-full border border-indigo-100">
                        Auxiliar Administrativo & Demandas
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingTask(null);
                        setTaskForm({
                            status: 'PENDENTE',
                            priority: 'NORMAL',
                            category: 'GERAL',
                            is_recurring: false,
                            recurrence_period: 'MONTHLY'
                        });
                        setIsModalOpen(true);
                    }}
                    className="group relative px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-3 active:scale-95"
                >
                    <span className="material-icons-outlined transition-transform group-hover:rotate-180">add</span>
                    Nova Demanda
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Sincronizando processos...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <span className="material-icons-outlined text-gray-200 text-7xl mb-4">inventory</span>
                    <h3 className="text-lg font-bold text-gray-400 uppercase">Nenhuma tarefa encontrada</h3>
                    <p className="text-gray-400 text-sm mt-1">Comece adicionando uma nova demanda administrativa.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            className={`group bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col ${task.status === 'CONCLUIDO' ? 'opacity-75' : ''}`}
                        >
                            {/* Priority Indicator */}
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getPriorityColor(task.priority)} shadow-sm`}>
                                    {task.priority}
                                </span>
                            </div>

                            {/* Category Tag */}
                            <div className="mb-4">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                    {task.category}
                                </span>
                            </div>

                            <h3 className={`text-lg font-bold text-gray-800 leading-tight mb-3 ${task.status === 'CONCLUIDO' ? 'line-through text-gray-400' : ''}`}>
                                {task.title}
                            </h3>

                            {task.description && (
                                <p className="text-gray-500 text-sm mb-6 line-clamp-3 leading-relaxed">
                                    {task.description}
                                </p>
                            )}

                            <div className="mt-auto space-y-4">
                                {/* Recurring Info */}
                                {task.is_recurring && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                                        <span className="material-icons-outlined text-sm">sync</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Recorrente: {task.recurrence_period}</span>
                                    </div>
                                )}

                                {/* Date & Status Row */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400" title={task.created_by_email}>
                                            <span className="material-icons-outlined text-lg">person</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">Criada em</p>
                                            <p className="text-[11px] font-bold text-gray-500">{formatDate(task.created_at)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleStatusChange(task, task.status === 'CONCLUIDO' ? 'PENDENTE' : 'CONCLUIDO')}
                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${task.status === 'CONCLUIDO' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 border border-gray-100'}`}
                                            title={task.status === 'CONCLUIDO' ? 'Reabrir Tarefa' : 'Marcar como Concluído'}
                                        >
                                            <span className="material-icons-outlined">{getStatusIcon(task.status)}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingTask(task);
                                                setTaskForm(task);
                                                setIsModalOpen(true);
                                            }}
                                            className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500 border border-gray-100 flex items-center justify-center transition-all"
                                            title="Editar"
                                        >
                                            <span className="material-icons-outlined">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 border border-gray-100 flex items-center justify-center transition-all"
                                            title="Excluir"
                                        >
                                            <span className="material-icons-outlined">delete_outline</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-4 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                    <span className="material-icons-outlined">{editingTask ? 'edit' : 'add_task'}</span>
                                </div>
                                {editingTask ? 'Editar Demanda' : 'Nova Demanda'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Título da Tarefa</label>
                                    <input
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-gray-800 font-bold focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                                        placeholder="Ex: Recarregar VR"
                                        value={taskForm.title || ''}
                                        onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300 min-h-[100px]"
                                        placeholder="Detalhes sobre o que precisa ser feito..."
                                        value={taskForm.description || ''}
                                        onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Prioridade</label>
                                        <select
                                            className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-gray-800 font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                                            value={taskForm.priority}
                                            onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                                        >
                                            <option value="BAIXA">BAIXA</option>
                                            <option value="NORMAL">NORMAL</option>
                                            <option value="ALTA">ALTA</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                                        <input
                                            className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-gray-800 font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                                            placeholder="Ex: Financeiro"
                                            value={taskForm.category || ''}
                                            onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={taskForm.is_recurring}
                                                onChange={e => setTaskForm({ ...taskForm, is_recurring: e.target.checked })}
                                            />
                                            <div className="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6"></div>
                                        </div>
                                        <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Tarefa Recorrente</span>
                                    </label>

                                    {taskForm.is_recurring && (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Periodicidade</label>
                                            <select
                                                className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-gray-800 font-bold focus:ring-2 focus:ring-indigo-500"
                                                value={taskForm.recurrence_period || 'MONTHLY'}
                                                onChange={e => setTaskForm({ ...taskForm, recurrence_period: e.target.value })}
                                            >
                                                <option value="DAILY">Diário</option>
                                                <option value="WEEKLY">Semanal</option>
                                                <option value="MONTHLY">Mensal</option>
                                                <option value="YEARLY">Anual</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveTask}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95"
                            >
                                <span className="material-icons-outlined">save</span>
                                {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InternalTasksPage;
