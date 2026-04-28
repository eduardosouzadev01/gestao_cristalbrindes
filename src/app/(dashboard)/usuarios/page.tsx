'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SELLER' | 'PRODUCTION' | 'FINANCIAL';
    permissions: string[];
    created_at: string;
}

const ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'SELLER', label: 'Vendedor' },
    { value: 'PRODUCTION', label: 'Produção / Logística' },
    { value: 'FINANCIAL', label: 'Financeiro' },
];

const PERMISSION_OPTIONS = [
    { id: 'canManageUsers', label: 'Gerenciar Usuários' },
    { id: 'canManageProducts', label: 'Gerenciar Catálogo' },
    { id: 'canViewBudgets', label: 'Ver Orçamentos' },
    { id: 'canEditBudgets', label: 'Editar Orçamentos' },
    { id: 'canDeleteBudgets', label: 'Excluir Orçamentos' },
    { id: 'canViewOrders', label: 'Ver Pedidos' },
    { id: 'canEditOrders', label: 'Editar Pedidos' },
    { id: 'canViewFinancial', label: 'Ver Financeiro' },
    { id: 'canManageFinancial', label: 'Gerenciar Financeiro' },
    { id: 'canViewTasks', label: 'Ver Tarefas Internas' },
    { id: 'canManageTasks', label: 'Gerenciar Tarefas' },
];

const ROLE_TEMPLATES: Record<string, string[]> = {
    ADMIN: PERMISSION_OPTIONS.map(p => p.id),
    SELLER: ['canViewBudgets', 'canEditBudgets', 'canViewOrders', 'canViewTasks'],
    PRODUCTION: ['canViewOrders', 'canEditOrders', 'canViewTasks', 'canManageTasks', 'canManageProducts'],
    FINANCIAL: ['canViewOrders', 'canViewFinancial', 'canManageFinancial', 'canViewTasks'],
};

export default function UserManagementPage() {
    const { hasPermission, appUser } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('name');

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            toast.error('Erro ao buscar usuários: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (user: UserProfile) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    role: user.role,
                    permissions: user.permissions,
                    name: user.name
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Usuário atualizado com sucesso!');
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            toast.error('Erro ao atualizar: ' + error.message);
        }
    };

    const handleRoleChange = (role: string) => {
        if (!editingUser) return;
        const permissions = ROLE_TEMPLATES[role] || [];
        setEditingUser({ ...editingUser, role: role as any, permissions });
    };

    const togglePermission = (permId: string) => {
        if (!editingUser) return;
        const permissions = editingUser.permissions.includes(permId)
            ? editingUser.permissions.filter(p => p !== permId)
            : [...editingUser.permissions, permId];
        setEditingUser({ ...editingUser, permissions });
    };

    if (!hasPermission('canManageUsers')) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-gray-500 font-medium uppercase text-xs tracking-widest text-[#6B7280]">
                Acesso negado. Você não tem permissão para gerenciar usuários.
            </div>
        );
    }

    return (
        <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">manage_accounts</span>
                        Controle de Acessos
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Gestão de perfis e permissões da equipe</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-none">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#E3E3E4] bg-[#F9FAFB]">
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Nome / Email</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-center">Perfil</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Permissões</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3E4]">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-[#6B7280] font-medium uppercase text-xs animate-pulse tracking-widest">
                                    Sincronizando usuários...
                                </td>
                            </tr>
                        ) : users.map((user, idx) => (
                            <tr key={user.id} className={`hover:bg-[#F5F5F8]/50 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-medium text-[#111827] uppercase group-hover:text-[#0F6CBD] transition-colors">{user.name || 'Sem Nome'}</span>
                                        <span className="text-[11px] font-medium text-[#6B7280]">{user.email}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase border shadow-none ${
                                        user.role === 'ADMIN' ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]' :
                                        user.role === 'SELLER' ? 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]' :
                                        user.role === 'PRODUCTION' ? 'bg-[#F5F3FF] text-[#7C3AED] border-[#EDE9FE]' :
                                        'bg-[#F9FAFB] text-[#6B7280] border-[#F3F4F6]'
                                    }`}>
                                        {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1 max-w-lg">
                                        {user.permissions?.slice(0, 3).map(p => (
                                            <span key={p} className="text-[8px] font-medium text-[#6B7280] uppercase bg-[#F3F4F6] px-1.5 py-0.5 rounded-md border border-[#E5E7EB] italic">
                                                {PERMISSION_OPTIONS.find(opt => opt.id === p)?.label || p}
                                            </span>
                                        ))}
                                        {user.permissions?.length > 3 && (
                                            <span className="text-[8px] font-medium text-[#0F6CBD] uppercase">+ {user.permissions.length - 3} mais</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => {
                                            setEditingUser(user);
                                            setIsEditModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E3E3E4] text-[#424242] rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#F5F5F8] hover:border-gray-300 transition-all active:scale-95 shadow-none"
                                    >
                                        <span className="material-icons-outlined text-[16px]">edit</span>
                                        Gerenciar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111827]/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-md w-full max-w-2xl shadow-none overflow-hidden border border-[#E3E3E4] animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-4 flex justify-between items-center border-b border-[#F3F4F6]">
                            <h2 className="text-xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                                <span className="material-icons-outlined text-[#0F6CBD]">person_add</span>
                                Gerenciamento de Perfil
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 rounded-full bg-[#F9FAFB] text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#DC2626] transition-all flex items-center justify-center">
                                <span className="material-icons-outlined text-lg">close</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                                        <input
                                            className="w-full px-4 h-11 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] outline-none focus:ring-2 focus:ring-[#0F6CBD]/20 transition-all"
                                            value={editingUser.name || ''}
                                            onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Email (Visualização)</label>
                                        <input
                                            className="w-full px-4 h-11 bg-[#F3F4F6] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#6B7280] outline-none"
                                            value={editingUser.email}
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Perfil de Acesso</label>
                                        <select
                                            className="w-full px-4 h-11 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] outline-none focus:ring-2 focus:ring-[#0F6CBD]/20 transition-all font-jakarta uppercase"
                                            value={editingUser.role}
                                            onChange={e => handleRoleChange(e.target.value)}
                                        >
                                            {ROLE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Permissões Detalhadas</label>
                                    <div className="bg-[#F9FAFB] p-4 rounded-md border border-[#E3E3E4] space-y-2 max-h-[300px] overflow-y-auto">
                                        {PERMISSION_OPTIONS.map(opt => (
                                            <label key={opt.id} className="flex items-center gap-3 p-2 bg-white rounded-md border border-transparent hover:border-[#0F6CBD]/20 cursor-pointer group transition-all">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded-md border-[#E3E3E4] text-[#0F6CBD] focus:ring-0"
                                                    checked={editingUser.permissions.includes(opt.id)}
                                                    onChange={() => togglePermission(opt.id)}
                                                />
                                                <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-tight group-hover:text-[#0F6CBD] transition-colors">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-[#F9FAFB] border-t flex justify-end gap-3 font-jakarta">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-6 py-3 bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-gray-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleUpdateUser(editingUser)}
                                className="px-8 py-3 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all shadow-none shadow-none-[#0F6CBD]/20 active:scale-95"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
