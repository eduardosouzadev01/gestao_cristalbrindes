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
    admin: {
        label: 'Administrador',
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
        },
    },
    financeiro: {
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
        },
    },
    vendas: {
        label: 'Vendas',
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
        role: 'vendas',
        salesperson_id: '',
        active: true,
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
        if (permissions.fullAccess) return 'admin';
        if (permissions.financeiro?.contasReceber || permissions.financeiro?.contasPagar) return 'financeiro';
        return 'vendas';
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setForm({ name: '', email: '', role: 'vendas', salesperson_id: '', active: true });
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
            salesperson_id: form.role === 'vendas' ? form.salesperson_id : null,
            permissions: roleTemplate.permissions,
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
                const { error } = await supabase
                    .from('user_profiles')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Perfil de usuário criado! Lembre-se de criar o login no painel Supabase Auth.');
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
        const template = ROLE_TEMPLATES[role] || ROLE_TEMPLATES.vendas;
        return (
            <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium"
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
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-3xl" style={{ color: '#0F6CBD' }}>manage_accounts</span>
                        Controle de Acessos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os usuários e permissões do sistema.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-blue-700 flex items-center gap-2 transition-all"
                >
                    <span className="material-icons-outlined">person_add</span>
                    Novo Usuário
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Total de Usuários</p>
                        <p className="text-3xl font-black text-gray-900 mt-1">{users.length}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#EBF3FC' }}>
                        <span className="material-icons-outlined text-2xl" style={{ color: '#0F6CBD' }}>group</span>
                    </div>
                </div>
                {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
                    <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">{tmpl.label}</p>
                            <p className="text-3xl font-black text-gray-900 mt-1">
                                {users.filter(u => (u.role || detectRole(u.permissions)) === key).length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: `${tmpl.color}15` }}>
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Usuário</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">E-mail</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Perfil</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Vendedor</th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                                style={{ backgroundColor: ROLE_TEMPLATES[user.role || detectRole(user.permissions)]?.color || '#0F6CBD' }}
                                            >
                                                {getInitials(user.name)}
                                            </div>
                                            <span className="font-bold text-gray-800 text-sm">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {user.salesperson_id || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${user.active !== false
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
                                                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                title="Editar"
                                            >
                                                <span className="material-icons-outlined text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => toggleUserActive(user)}
                                                className={`p-2 rounded-lg transition-colors ${user.active !== false
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
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
            <div className="mt-6 p-4 rounded-xl border border-blue-200" style={{ backgroundColor: '#EBF3FC' }}>
                <div className="flex items-start gap-3">
                    <span className="material-icons-outlined text-lg mt-0.5" style={{ color: '#0F6CBD' }}>info</span>
                    <div>
                        <p className="text-sm font-medium" style={{ color: '#0F548C' }}>
                            Para criar o login de acesso (e-mail + senha), acesse o <strong>Painel Supabase → Authentication → Users → Add User</strong>.
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#0F548C', opacity: 0.8 }}>
                            O perfil aqui define apenas nome, permissões e vendedor vinculado. O login (credenciais) é gerenciado pelo Supabase Auth.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsModalOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl w-full max-w-lg border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-outlined text-lg" style={{ color: '#0F6CBD' }}>
                                        {editingUser ? 'edit' : 'person_add'}
                                    </span>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                    </h2>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
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
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setForm({ ...form, role: key })}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${form.role === key
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
                                                <span className={`text-xs font-bold ${form.role === key ? 'text-blue-700' : 'text-gray-500'}`}>
                                                    {tmpl.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Permission Description */}
                                    <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Permissões do perfil:</p>
                                        <div className="text-xs text-gray-600 space-y-0.5">
                                            {form.role === 'admin' && (
                                                <p>✅ Acesso total ao sistema — Todas as funcionalidades</p>
                                            )}
                                            {form.role === 'financeiro' && (
                                                <>
                                                    <p>✅ Contas a Receber e a Pagar</p>
                                                    <p>✅ Comissões e Relatórios</p>
                                                    <p>✅ Visualizar todos os pedidos</p>
                                                    <p>❌ CRM Performance, Fatores, Excluir registros</p>
                                                </>
                                            )}
                                            {form.role === 'vendas' && (
                                                <>
                                                    <p>✅ Ver e criar seus próprios pedidos</p>
                                                    <p>✅ Cadastros de clientes (vinculados)</p>
                                                    <p>✅ Catálogo de produtos</p>
                                                    <p>❌ Financeiro, Relatórios, Excluir registros</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Vendedor (only for sales) */}
                                {form.role === 'vendas' && (
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
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
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
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2"
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
