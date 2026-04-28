import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth, UserPermissions } from '../lib/auth';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: string;
    salesperson_id: string | null;
    permissions: UserPermissions;
    active: boolean;
    created_at: string;
}

const ROLE_TEMPLATES: Record<string, { label: string; color: string; icon: string; permissions: UserPermissions }> = {
    GESTAO: {
        label: 'Gestão',
        color: '#0F6CBD',
        icon: 'admin_panel_settings',
        permissions: {
            fullAccess: true,
            viewAllOrders: true,
            viewOwnOrdersOnly: false,
            cadastros: true,
            produtos: true,
            canDelete: true,
            crmPerformance: true,
            crmFinanceiro: true,
            financeiro: { contasReceber: true, contasPagar: true },
            comissoes: true,
            relatorios: true,
            fatores: true,
            canViewMargins: true,
            canEditCatalog: true,
            canDeleteCRM: true,
        },
    },
    FINANCEIRO: {
        label: 'Financeiro',
        color: '#0E700E',
        icon: 'account_balance',
        permissions: {
            fullAccess: false,
            viewAllOrders: true,
            viewOwnOrdersOnly: false,
            cadastros: true,
            produtos: false,
            canDelete: false,
            crmPerformance: false,
            crmFinanceiro: true,
            financeiro: { contasReceber: true, contasPagar: true },
            comissoes: true,
            relatorios: true,
            fatores: false,
            canViewMargins: false,
            canEditCatalog: false,
            canDeleteCRM: false,
        },
    },
    VENDEDOR: {
        label: 'Vendedor',
        color: '#8A6116',
        icon: 'storefront',
        permissions: {
            fullAccess: false,
            viewAllOrders: false,
            viewOwnOrdersOnly: true,
            cadastros: true,
            produtos: true,
            canDelete: false,
            crmPerformance: false,
            crmFinanceiro: false,
            financeiro: { contasReceber: false, contasPagar: false },
            comissoes: false,
            relatorios: false,
            fatores: false,
            canViewMargins: false,
            canEditCatalog: false,
            canDeleteCRM: false,
        },
    },
    SUPERVISOR: {
        label: 'Supervisor',
        color: '#6200EE',
        icon: 'supervised_user_circle',
        permissions: {
            fullAccess: false,
            viewAllOrders: true,
            viewOwnOrdersOnly: false,
            cadastros: true,
            produtos: true,
            canDelete: true,
            crmPerformance: true,
            crmFinanceiro: false,
            financeiro: { contasReceber: false, contasPagar: false },
            comissoes: false,
            relatorios: true,
            fatores: false,
            canViewMargins: true,
            canEditCatalog: true,
            canDeleteCRM: true,
        },
    },
};

const SALESPERSON_OPTIONS = [
    'VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05',
    'VENDAS 06', 'VENDAS 07', 'VENDAS 08', 'VENDAS 09', 'VENDAS 10',
];

const UserManagementPage: React.FC = () => {
    const { appUser } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        name: '',
        email: '',
        role: 'VENDEDOR',
        salesperson_id: '',
        active: true,
        customPermissions: null as UserPermissions | null,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (err: any) {
            toast.error('Erro ao carregar usuários: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const detectRole = (permissions: UserPermissions): string => {
        if (permissions.fullAccess) return 'GESTAO';
        if (permissions.financeiro?.contasReceber || permissions.financeiro?.contasPagar) return 'FINANCEIRO';
        return 'VENDEDOR';
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setForm({ name: '', email: '', role: 'VENDEDOR', salesperson_id: '', active: true, customPermissions: null });
        setIsModalOpen(true);
    };

    const openEditModal = (user: UserProfile) => {
        setEditingUser(user);
        setForm({
            name: user.name,
            email: user.email,
            role: user.role || detectRole(user.permissions),
            salesperson_id: user.salesperson_id || '',
            active: user.active !== false,
            customPermissions: user.permissions,
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('O nome é obrigatório.');
            return;
        }
        if (!form.email.trim() || !form.email.includes('@')) {
            toast.error('E-mail inválido.');
            return;
        }

        const roleTemplate = ROLE_TEMPLATES[form.role];
        if (!roleTemplate) {
            toast.error('Perfil inválido.');
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.toLowerCase().trim(),
            role: form.role,
            salesperson_id: form.role === 'VENDEDOR' ? form.salesperson_id : null,
            permissions: form.customPermissions || roleTemplate.permissions,
            active: form.active,
        };

        try {
            if (editingUser) {
                const { error } = await supabase
                    .from('user_profiles')
                    .update(payload)
                    .eq('id', editingUser.id);
                if (error) throw error;
                toast.success('Usuário atualizado com sucesso!');
            } else {
                const { data, error } = await supabase.rpc('create_new_user', {
                    new_email: payload.email,
                    new_name: payload.name,
                    new_role: payload.role,
                    new_salesperson_id: payload.salesperson_id,
                    new_permissions: payload.permissions
                });
                if (error) throw error;
                if (data && data.success === false) {
                    throw new Error(data.error || 'Erro desconhecido ao criar usuário.');
                }
                toast.success('Perfil de usuário criado com sucesso! Senha padrão: Mudar@123');
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message);
        }
    };

    const toggleUserActive = async (user: UserProfile) => {
        const newActive = user.active === false ? true : false;
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ active: newActive })
                .eq('id', user.id);
            if (error) throw error;
            toast.success(newActive ? 'Usuário ativado.' : 'Usuário desativado.');
            fetchUsers();
        } catch (err: any) {
            toast.error('Erro: ' + err.message);
        }
    };

    const deleteUser = async (user: UserProfile) => {
        if (user.email === appUser?.email) {
            toast.error('Você não pode excluir seu próprio perfil.');
            return;
        }
        if (!window.confirm(`Tem certeza que deseja excluir o perfil de "${user.name}"? Esta ação não pode ser desfeita.`)) return;

        try {
            const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', user.id);
            if (error) throw error;
            toast.success('Perfil excluído.');
            fetchUsers();
        } catch (err: any) {
            toast.error('Erro ao excluir: ' + err.message);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.salesperson_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadge = (user: UserProfile) => {
        const role = user.role || detectRole(user.permissions);
        const template = ROLE_TEMPLATES[role] || ROLE_TEMPLATES.VENDEDOR;
        return (
            <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium"
                style={{ backgroundColor: `${template.color}15`, color: template.color, border: `1px solid ${template.color}30` }}
            >
                <span className="material-icons-outlined text-[13px]">{template.icon}</span>
                {template.label}
            </span>
        );
    };

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-3xl" style={{ color: '#0F6CBD' }}>manage_accounts</span>
                        Controle de Acessos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os usuários e permissões do sistema.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium uppercase text-xs hover:bg-blue-700 flex items-center gap-2 transition-all"
                >
                    <span className="material-icons-outlined">person_add</span>
                    Novo Usuário
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-md border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">Total de Usuários</p>
                        <p className="text-3xl font-medium text-gray-900 mt-1">{users.length}</p>
                    </div>
                    <div className="p-3 rounded-md" style={{ backgroundColor: '#EBF3FC' }}>
                        <span className="material-icons-outlined text-2xl" style={{ color: '#0F6CBD' }}>group</span>
                    </div>
                </div>
                {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
                    <div key={key} className="bg-white rounded-md border border-gray-200 p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase">{tmpl.label}</p>
                            <p className="text-3xl font-medium text-gray-900 mt-1">
                                {users.filter(u => (u.role || detectRole(u.permissions)) === key).length}
                            </p>
                        </div>
                        <div className="p-3 rounded-md" style={{ backgroundColor: `${tmpl.color}15` }}>
                            <span className="material-icons-outlined text-2xl" style={{ color: tmpl.color }}>{tmpl.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <span className="material-icons-outlined text-lg" style={{ color: '#BDBDBD' }}>search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por nome, e-mail ou vendedor..."
                        className="form-input w-full !pl-10 pr-4 py-2.5 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-16 text-center">
                        <svg className="animate-spin h-8 w-8 mx-auto mb-4" style={{ color: '#0F6CBD' }} viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-gray-400 text-sm">Carregando usuários...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-16 text-center">
                        <span className="material-icons-outlined text-5xl text-gray-300 mb-3 block">person_off</span>
                        <p className="text-gray-400">Nenhum usuário encontrado.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-medium text-gray-400 uppercase">Usuário</th>
                                <th className="px-6 py-3 text-left text-[10px] font-medium text-gray-400 uppercase">E-mail</th>
                                <th className="px-6 py-3 text-left text-[10px] font-medium text-gray-400 uppercase">Perfil</th>
                                <th className="px-6 py-3 text-left text-[10px] font-medium text-gray-400 uppercase">Vendedor</th>
                                <th className="px-6 py-3 text-center text-[10px] font-medium text-gray-400 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-[10px] font-medium text-gray-400 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                                                style={{ backgroundColor: ROLE_TEMPLATES[user.role || detectRole(user.permissions)]?.color || '#0F6CBD' }}
                                            >
                                                {getInitials(user.name)}
                                            </div>
                                            <span className="font-medium text-gray-800 text-sm">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {user.salesperson_id || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${user.active !== false
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-red-50 text-red-600 border border-red-200'
                                            }`}
                                        >
                                            <span className="material-icons-outlined text-[10px]">
                                                {user.active !== false ? 'check_circle' : 'cancel'}
                                            </span>
                                            {user.active !== false ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                title="Editar"
                                            >
                                                <span className="material-icons-outlined text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => toggleUserActive(user)}
                                                className={`p-2 rounded-md transition-colors ${user.active !== false
                                                    ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                                }`}
                                                title={user.active !== false ? 'Desativar' : 'Ativar'}
                                            >
                                                <span className="material-icons-outlined text-lg">
                                                    {user.active !== false ? 'person_off' : 'person'}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user)}
                                                className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title="Excluir"
                                            >
                                                <span className="material-icons-outlined text-lg">delete_outline</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Info Banner */}
            <div className="mt-6 p-4 rounded-md border border-green-200" style={{ backgroundColor: '#F0FDF4' }}>
                <div className="flex items-start gap-3">
                    <span className="material-icons-outlined text-lg mt-0.5" style={{ color: '#166534' }}>info</span>
                    <div>
                        <p className="text-sm font-medium" style={{ color: '#166534' }}>
                            A criação de novos usuários agora é totalmente automática.
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#166534', opacity: 0.8 }}>
                            Ao criar um perfil aqui, o usuário já terá acesso ao sistema com a senha padrão <strong>Mudar@123</strong>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsModalOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-md w-full max-w-lg border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-outlined text-lg" style={{ color: '#0F6CBD' }}>
                                        {editingUser ? 'edit' : 'person_add'}
                                    </span>
                                    <h2 className="text-lg font-medium text-gray-900">
                                        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                    </h2>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-5">
                                {/* Nome */}
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#424242' }}>
                                        Nome Completo *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input w-full py-2.5 text-sm"
                                        placeholder="Ex: Maria Silva"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#424242' }}>
                                        E-mail *
                                    </label>
                                    <input
                                        type="email"
                                        className="form-input w-full py-2.5 text-sm"
                                        placeholder="usuario@cristalbrindes.com.br"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        disabled={!!editingUser}
                                    />
                                    {editingUser && (
                                        <p className="text-[10px] text-gray-400 mt-1">O e-mail não pode ser alterado após a criação.</p>
                                    )}
                                </div>

                                {/* Perfil */}
                                <div>
                                    <label className="block text-xs font-medium mb-2" style={{ color: '#424242' }}>
                                        Perfil de Acesso *
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setForm({ ...form, role: key })}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-all ${form.role === key
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }`}
                                            >
                                                <span
                                                    className="material-icons-outlined text-2xl"
                                                    style={{ color: form.role === key ? '#0F6CBD' : '#9CA3AF' }}
                                                >
                                                    {tmpl.icon}
                                                </span>
                                                <span className={`text-xs font-medium ${form.role === key ? 'text-blue-700' : 'text-gray-500'}`}>
                                                    {tmpl.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Permission Description */}
                                    {(() => {
                                        const activeTemplate = ROLE_TEMPLATES[form.role] || ROLE_TEMPLATES.VENDEDOR;
                                        return (
                                            <div className="mt-3 p-3 rounded-md bg-gray-50 border border-gray-100">
                                                <p className="text-[10px] font-medium text-gray-400 uppercase mb-2">Ajustes Finos de Permissão:</p>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                    {[
                                                        { label: 'Ver Margens', key: 'canViewMargins' },
                                                        { label: 'Editar Catálogo', key: 'canEditCatalog' },
                                                        { label: 'Excluir CRM', key: 'canDeleteCRM' },
                                                        { label: 'Ver Tudo', key: 'viewAllOrders' },
                                                    ].map(p => (
                                                        <label key={p.key} className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded-md text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                                                checked={!!(form.customPermissions || activeTemplate.permissions)[p.key as keyof UserPermissions]}
                                                                onChange={e => {
                                                                    const current = form.customPermissions || { ...activeTemplate.permissions };
                                                                    setForm({
                                                                        ...form,
                                                                        customPermissions: { ...current, [p.key]: e.target.checked }
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-[11px] font-medium text-gray-600 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{p.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Vendedor (only for sales) */}
                                {form.role === 'VENDEDOR' && (
                                    <div>
                                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#424242' }}>
                                            Vendedor Vinculado *
                                        </label>
                                        <select
                                            className="form-select w-full py-2.5 text-sm"
                                            value={form.salesperson_id}
                                            onChange={e => setForm({ ...form, salesperson_id: e.target.value })}
                                        >
                                            <option value="">Selecione o vendedor...</option>
                                            {SALESPERSON_OPTIONS.map(sp => (
                                                <option key={sp} value={sp}>{sp}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Status */}
                                {editingUser && (
                                    <div className="flex items-center justify-between p-3 rounded-md bg-gray-50 border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons-outlined text-sm text-gray-400">toggle_on</span>
                                            <span className="text-xs font-medium text-gray-600">Usuário ativo</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, active: !form.active })}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <span
                                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? 'left-5' : 'left-0.5'}`}
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 text-sm font-medium text-white rounded-md transition-colors flex items-center gap-2"
                                    style={{ backgroundColor: '#0F6CBD' }}
                                    onMouseOver={e => (e.currentTarget.style.backgroundColor = '#115EA3')}
                                    onMouseOut={e => (e.currentTarget.style.backgroundColor = '#0F6CBD')}
                                >
                                    <span className="material-icons-outlined text-sm">save</span>
                                    {editingUser ? 'Salvar Alterações' : 'Criar Perfil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UserManagementPage;
