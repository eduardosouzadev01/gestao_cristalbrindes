'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, UserPermissions } from '@/lib/auth';
import { toast } from 'sonner';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    display_name?: string;
    role: string;
    permissions: UserPermissions;
    is_active: boolean;
    created_at: string;
    salesperson_id?: string;
}

const ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'GESTAO', label: 'Gestão / Supervisor' },
    { value: 'VENDEDOR', label: 'Vendedor' },
    { value: 'PRODUCTION', label: 'Produção / Logística' },
    { value: 'FINANCIAL', label: 'Financeiro' },
];

const PERMISSION_GROUPS = [
    {
        title: 'Acesso Geral',
        permissions: [
            { id: 'fullAccess', label: 'Acesso Total (Super Admin)' },
            { id: 'relatorios', label: 'Ver Relatórios' },
            { id: 'fatores', label: 'Gerenciar Fatores de Cálculo' },
        ]
    },
    {
        title: 'Vendas & CRM',
        permissions: [
            { id: 'viewAllOrders', label: 'Ver Todos os Pedidos' },
            { id: 'viewOwnOrdersOnly', label: 'Ver Apenas Próprios Pedidos' },
            { id: 'crmPerformance', label: 'Ver Performance CRM' },
            { id: 'crmFinanceiro', label: 'Ver Financeiro CRM' },
            { id: 'canDeleteCRM', label: 'Excluir Leads CRM' },
        ]
    },
    {
        title: 'Operacional',
        permissions: [
            { id: 'cadastros', label: 'Gerenciar Cadastros (Parceiros)' },
            { id: 'produtos', label: 'Gerenciar Produtos' },
            { id: 'canEditCatalog', label: 'Editar Catálogo de Site' },
            { id: 'canDelete', label: 'Permissão para Excluir (Geral)' },
        ]
    },
    {
        title: 'Financeiro',
        permissions: [
            { id: 'financeiro.contasReceber', label: 'Contas a Receber' },
            { id: 'financeiro.contasPagar', label: 'Contas a Pagar' },
            { id: 'comissoes', label: 'Gerenciar Comissões' },
            { id: 'canViewMargins', label: 'Visualizar Margens de Lucro' },
        ]
    }
];

export default function UserManagementPage() {
    const { hasPermission } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
                    name: user.name,
                    display_name: user.display_name,
                    is_active: user.is_active,
                    salesperson_id: user.salesperson_id
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

    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            (u.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, searchTerm]);

    const getPermissionValue = (user: UserProfile, id: string): boolean => {
        if (id.includes('.')) {
            const [parent, child] = id.split('.');
            return (user.permissions as any)?.[parent]?.[child] || false;
        }
        return (user.permissions as any)?.[id] || false;
    };

    const togglePermission = (id: string) => {
        if (!editingUser) return;
        const newPermissions = { ...editingUser.permissions } as any;
        
        if (id.includes('.')) {
            const [parent, child] = id.split('.');
            if (!newPermissions[parent]) newPermissions[parent] = {};
            newPermissions[parent][child] = !newPermissions[parent][child];
        } else {
            newPermissions[id] = !newPermissions[id];
        }
        
        setEditingUser({ ...editingUser, permissions: newPermissions });
    };

    if (!hasPermission('adm')) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-gray-500 font-medium uppercase text-xs tracking-widest">
                Acesso negado. Você não tem permissão para gerenciar usuários.
            </div>
        );
    }

    return (
        <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3 font-jakarta">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">manage_accounts</span>
                        Gestão de Equipe & Acessos
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1 ml-11">Configure permissões detalhadas para cada colaborador</p>
                </div>

                <div className="relative w-full md:w-96 group">
                    <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-[#0F6CBD] transition-colors">search</span>
                    <input
                        placeholder="BUSCAR POR NOME OU E-MAIL..."
                        className="w-full h-12 !pl-12 pr-4 bg-white border border-[#E3E3E4] rounded-md text-[11px] font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] outline-none transition-all uppercase tracking-wider"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#E3E3E4] bg-[#F9FAFB]">
                            <th className="px-6 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Colaborador</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest text-center">Perfil</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Resumo de Acesso</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3E4]">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-[#EBF3FC] border-t-[#0F6CBD] rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Sincronizando base de usuários...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <span className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Nenhum usuário encontrado com "{searchTerm}"</span>
                                </td>
                            </tr>
                        ) : filteredUsers.map((user, idx) => (
                            <tr key={user.id} className={`hover:bg-[#F5F5F8]/50 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFB]'}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] border ${
                                            user.is_active ? 'bg-[#EBF3FC] text-[#0F6CBD] border-[#D1E9FF]' : 'bg-gray-100 text-gray-400 border-gray-200'
                                        }`}>
                                            {user.name?.substring(0, 2).toUpperCase() || '??'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-semibold text-[#111827] uppercase tracking-tight group-hover:text-[#0F6CBD] transition-colors">{user.name || 'Sem Nome'}</span>
                                            <span className="text-[11px] font-medium text-[#6B7280] lowercase">{user.email || '-'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border ${
                                        user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                        <div className={`w-1 h-1 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                        {user.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase border shadow-none ${
                                        user.role === 'ADMIN' ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]' :
                                        user.role === 'GESTAO' ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' :
                                        user.role === 'VENDEDOR' ? 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]' :
                                        'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                        {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.permissions?.fullAccess ? (
                                            <span className="text-[9px] font-bold text-red-600 uppercase border border-red-200 bg-red-50 px-2 py-0.5 rounded">Acesso Total</span>
                                        ) : (
                                            <>
                                                {user.permissions?.viewAllOrders && <span className="text-[8px] font-medium text-slate-500 uppercase bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">Global</span>}
                                                {user.permissions?.financeiro?.contasReceber && <span className="text-[8px] font-medium text-emerald-600 uppercase bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Financ.</span>}
                                                {user.permissions?.produtos && <span className="text-[8px] font-medium text-blue-600 uppercase bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Produtos</span>}
                                                {!user.permissions?.fullAccess && !user.permissions?.viewAllOrders && !user.permissions?.financeiro && <span className="text-[8px] font-medium text-gray-400 uppercase italic">Acesso Padrão</span>}
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => {
                                            setEditingUser(user);
                                            setIsEditModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E3E3E4] text-[#424242] rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-[#F5F5F8] hover:border-gray-400 transition-all active:scale-95 shadow-sm"
                                    >
                                        <span className="material-icons-outlined text-[16px]">tune</span>
                                        Configurar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111827]/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-md w-full max-w-4xl shadow-2xl overflow-hidden border border-[#E3E3E4] animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-6 flex justify-between items-center border-b border-[#F3F4F6] shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-[#111827] uppercase tracking-tighter flex items-center gap-3 font-jakarta">
                                    <span className="material-icons-outlined text-[#0F6CBD] text-2xl">admin_panel_settings</span>
                                    Configuração de Acesso
                                </h2>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">{editingUser.email}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 rounded-full bg-[#F9FAFB] text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#DC2626] transition-all flex items-center justify-center border border-[#E3E3E4]">
                                <span className="material-icons-outlined text-lg">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-6 bg-white custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                {/* Left Side: Basic Info */}
                                <div className="lg:col-span-4 space-y-8">
                                    <div className="space-y-6 bg-[#FAFAFB] p-6 rounded-md border border-[#E3E3E4]">
                                        <div>
                                            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Nome no Sistema (Interno)</label>
                                            <input
                                                className="w-full px-4 h-12 bg-white border border-[#E3E3E4] rounded-md text-[13px] font-semibold text-[#111827] outline-none focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all uppercase"
                                                value={editingUser.name || ''}
                                                onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-[#0F6CBD] uppercase tracking-widest mb-2 ml-1">Nome na Proposta (Exibição)</label>
                                            <input
                                                className="w-full px-4 h-12 bg-[#F9FAFB] border border-[#0F6CBD]/30 rounded-md text-[13px] font-semibold text-[#0F6CBD] outline-none focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all uppercase placeholder:text-blue-300"
                                                placeholder="EX: EDUARDO SOUZA"
                                                value={editingUser.display_name || ''}
                                                onChange={e => setEditingUser({ ...editingUser, display_name: e.target.value })}
                                            />
                                            <p className="text-[9px] text-slate-400 mt-1.5 ml-1 uppercase leading-tight italic">Como o nome aparecerá no campo "Representante" da proposta PDF</p>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2 ml-1">Perfil Base</label>
                                            <select
                                                className="w-full px-4 h-12 bg-white border border-[#E3E3E4] rounded-md text-[13px] font-semibold text-[#111827] outline-none focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all font-jakarta uppercase"
                                                value={editingUser.role}
                                                onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                            >
                                                {ROLE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {editingUser.role === 'VENDEDOR' && (
                                            <div>
                                                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2 ml-1">ID Vendedor (Mapeamento)</label>
                                                <input
                                                    className="w-full px-4 h-12 bg-white border border-[#E3E3E4] rounded-md text-[13px] font-semibold text-[#111827] outline-none focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all uppercase"
                                                    placeholder="EX: VENDAS 01"
                                                    value={editingUser.salesperson_id || ''}
                                                    onChange={e => setEditingUser({ ...editingUser, salesperson_id: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-[#E3E3E4]">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer"
                                                        checked={editingUser.is_active}
                                                        onChange={() => setEditingUser({...editingUser, is_active: !editingUser.is_active})}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${editingUser.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    Usuário {editingUser.is_active ? 'Ativo' : 'Suspenso'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 bg-blue-50 rounded-md border border-blue-100 flex gap-4">
                                        <span className="material-icons-outlined text-blue-500">info</span>
                                        <p className="text-[10px] font-medium text-blue-700 leading-relaxed uppercase tracking-tight">
                                            As alterações de permissão surtirão efeito assim que o usuário realizar um novo acesso ou atualizar a página.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Permissions Grid */}
                                <div className="lg:col-span-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {PERMISSION_GROUPS.map((group, gIdx) => (
                                            <div key={gIdx} className="space-y-3">
                                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#0F6CBD]"></div>
                                                    {group.title}
                                                </h3>
                                                <div className="space-y-1.5">
                                                    {group.permissions.map(perm => {
                                                        const isChecked = getPermissionValue(editingUser, perm.id);
                                                        return (
                                                            <label 
                                                                key={perm.id} 
                                                                className={`flex items-center justify-between p-3.5 rounded-md border transition-all cursor-pointer group ${
                                                                    isChecked 
                                                                    ? 'bg-blue-50/50 border-blue-200' 
                                                                    : 'bg-white border-[#E3E3E4] hover:border-blue-300'
                                                                }`}
                                                            >
                                                                <span className={`text-[11px] font-semibold uppercase tracking-tight ${isChecked ? 'text-[#0F6CBD]' : 'text-slate-600'}`}>
                                                                    {perm.label}
                                                                </span>
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-5 h-5 rounded border-[#E3E3E4] text-[#0F6CBD] focus:ring-0 cursor-pointer transition-all"
                                                                        checked={isChecked}
                                                                        onChange={() => togglePermission(perm.id)}
                                                                    />
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-[#FAFAFB] border-t border-[#F3F4F6] flex justify-end gap-4 shrink-0 font-jakarta">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-8 py-3.5 bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleUpdateUser(editingUser)}
                                className="px-12 py-3.5 bg-[#242424] text-white rounded-md text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-2"
                            >
                                <span className="material-icons-outlined text-lg">save</span>
                                Aplicar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
