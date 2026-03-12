
import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../src/utils/dateUtils';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';

const BudgetList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { appUser } = useAuth();

    // State
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [vendedorFilter, setVendedorFilter] = useState('Todos os Vendedores');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (location.state?.clientName) {
            setSearchTerm(location.state.clientName);
        }
    }, [location.state]);

    useEffect(() => {
        if (appUser?.salesperson) {
            setVendedorFilter(appUser.salesperson);
        }
    }, [appUser]);

    useEffect(() => {
        fetchBudgets();
    }, [page, searchTerm, vendedorFilter, statusFilter, startDate, endDate]);

    const fetchBudgets = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('budgets')
                .select('*, partners(name, doc)', { count: 'exact' });

            if (location.state?.clientId) {
                query = query.eq('client_id', location.state.clientId);
            } else if (searchTerm) {
                const { data: matchedPartners } = await supabase
                    .from('partners')
                    .select('id')
                    .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,doc.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

                const pIds = matchedPartners?.map((p: any) => p.id) || [];

                if (pIds.length > 0) {
                    query = query.or(`budget_number.ilike.%${searchTerm}%,client_id.in.(${pIds.join(',')})`);
                } else {
                    query = query.ilike('budget_number', `%${searchTerm}%`);
                }
            }

            // Force sellers to only see their own budgets
            if (appUser?.permissions?.viewOwnOrdersOnly && appUser?.salesperson) {
                query = query.eq('salesperson', appUser.salesperson);
            } else if (vendedorFilter !== 'Todos os Vendedores') {
                query = query.eq('salesperson', vendedorFilter);
            }

            if (statusFilter !== 'Todos') {
                query = query.eq('status', statusFilter);
            }
            if (startDate) {
                query = query.gte('created_at', startDate);
            }
            if (endDate) {
                query = query.lte('created_at', endDate + 'T23:59:59');
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            setBudgets(data || []);
            setTotalCount(count || 0);
        } catch (error: any) {
            toast.error('Erro ao carregar orçamentos.');
        } finally {
            setLoading(false);
        }
    };

    const deleteBudget = async (budget: any) => {
        // Validação de segurança: Não excluir se já tiver proposta ou pedido (exceto Gerência)
        const isLocked = ['PROPOSTA ENVIADA', 'PROPOSTA ACEITA'].includes(budget.status);
        const canBypassLock = appUser?.permissions?.fullAccess || appUser?.permissions?.canDelete;

        if (isLocked && !canBypassLock) {
            toast.error('Este orçamento não pode ser excluído pois já possui proposta ou pedido gerado.');
            return;
        }

        if (!window.confirm(`Excluir orçamento #${budget.budget_number} permanentemente?`)) return;

        try {
            setLoading(true);
            const { error } = await supabase.from('budgets').delete().eq('id', budget.id);
            if (error) throw error;
            toast.success('Orçamento excluído com sucesso.');
            fetchBudgets();
        } catch (e: any) {
            toast.error('Erro ao excluir: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic - This is now handled by the fetchBudgets function (server-side)
    // The filteredBudgets variable is no longer needed for filtering, but for rendering the current page.
    // Renaming it to currentBudgets for clarity, or just using 'budgets' directly.
    // For now, let's just use 'budgets' directly in the table rendering.
    // The previous client-side filtering logic is removed.

    const statusOptions = [
        'Todos',
        'EM ABERTO', 'PROPOSTA ENVIADA', 'PROPOSTA ACEITA',
        'PROPOSTA RECUSADA', 'CANCELADO'
    ];

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-500 text-2xl">quote_marker</span>
                        ORÇAMENTOS (CRM)
                    </h1>
                </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-3">
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Buscar</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <span className="material-icons-outlined text-gray-400 text-sm">search</span>
                            </span>
                            <input
                                type="text"
                                placeholder="Pedido, Cliente, CPF/CNPJ..."
                                className="form-input block w-full pl-8 rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 text-xs h-8"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                            />
                        </div>
                    </div>
                    <div className="w-40">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Vendedor</label>
                        <select
                            disabled={!!appUser?.salesperson}
                            className={`form-select block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 text-xs h-8 font-bold ${appUser?.salesperson ? 'bg-gray-50' : ''}`}
                            value={vendedorFilter}
                            onChange={(e) => { setVendedorFilter(e.target.value); setPage(0); }}
                        >
                            <option>Todos os Vendedores</option>
                            <option>VENDAS 01</option>
                            <option>VENDAS 02</option>
                            <option>VENDAS 03</option>
                            <option>VENDAS 04</option>
                            <option>VENDAS 05</option>
                        </select>
                    </div>
                    <div className="w-40">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Status</label>
                        <select
                            className="form-select block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 text-xs h-8 font-bold"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        >
                            {statusOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Início</label>
                        <input
                            type="date"
                            className="form-input block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 text-xs h-8"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Fim</label>
                        <input
                            type="date"
                            className="form-input block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 text-xs h-8"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                        />
                    </div>
                    <button onClick={() => navigate('/orcamento/novo')} className="h-8 px-4 bg-blue-600 text-white rounded text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-700 ml-auto whitespace-nowrap">
                        + NOVO ORÇAMENTO
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Nº</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Empresa / Cliente</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Vendedor</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-3 py-2 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                            <th className="px-3 py-2 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 text-xs italic">Carregando dados...</td></tr>
                        ) : budgets.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 text-xs italic">Nenhum orçamento encontrado.</td></tr>
                        ) : (
                            budgets.map((b) => (
                                <tr key={b.id} className="hover:bg-blue-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/orcamento/${b.id}`)}>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-xs font-black text-blue-600">#{b.budget_number}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-gray-900 leading-tight">{b.partners?.name || 'Vários'}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] text-gray-400 font-black uppercase leading-none">{b.issuer || 'CRISTAL'} BRINDES</span>
                                                <span className="text-[9px] text-gray-300 font-bold uppercase leading-none">•</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase leading-none">{formatDate(b.created_at)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-600 font-black uppercase">{b.salesperson}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-sm ${b.status === 'PROPOSTA ACEITA' ? 'bg-green-500 text-white' :
                                            b.status === 'PROPOSTA RECUSADA' || b.status === 'CANCELADO' ? 'bg-red-500 text-white' :
                                                'bg-yellow-400 text-gray-900'
                                            }`}>
                                            {b.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-right text-xs font-black text-gray-900">
                                        {b.total_amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-center space-x-1">
                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/orcamento/${b.id}`); }} className="text-gray-400 hover:text-blue-600 transition-colors" title="Editar"><span className="material-icons-outlined text-sm">edit</span></button>
                                        {/* Só permite excluir se for Supervisor OU se o status for inicial/cancelado */}
                                        {(!['PROPOSTA ENVIADA', 'PROPOSTA ACEITA'].includes(b.status)) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteBudget(b); }}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Excluir Orçamento"
                                            >
                                                <span className="material-icons-outlined text-sm">delete</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="bg-gray-50/30 px-3 py-2 flex items-center justify-between border-t border-gray-100">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border border-gray-300 text-[10px] font-bold rounded bg-white disabled:opacity-50">Anterior</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalCount} className="px-3 py-1 border border-gray-300 text-[10px] font-bold rounded bg-white disabled:opacity-50">Próximo</button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">
                                Mostrando <span className="text-gray-900">{page * pageSize + 1}</span> - <span className="text-gray-900">{Math.min((page + 1) * pageSize, totalCount)}</span> de <span className="text-gray-900">{totalCount}</span> (Total)
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
                                <span className="material-icons-outlined text-sm">chevron_left</span>
                            </button>
                            <div className="flex gap-1">
                                {[...Array(Math.ceil(totalCount / pageSize))].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i)}
                                        className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-black transition-all ${page === i ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        {i + 1}
                                    </button>
                                )).slice(Math.max(0, page - 2), Math.min(Math.ceil(totalCount / pageSize), page + 3))}
                            </div>
                            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalCount} className="p-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
                                <span className="material-icons-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetList;
