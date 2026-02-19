
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

            if (searchTerm) {
                query = query.or(`budget_number.ilike.%${searchTerm}%,partners.name.ilike.%${searchTerm}%`);
            }
            if (vendedorFilter !== 'Todos os Vendedores') {
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

    const deleteBudget = async (id: string) => {
        if (!window.confirm('Excluir orçamento permanentemente?')) return;
        try {
            const { error } = await supabase.from('budgets').delete().eq('id', id);
            if (error) throw error;
            toast.success('Excluído.');
            fetchBudgets();
        } catch (e: any) {
            toast.error(e.message);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-500 text-3xl">quote_marker</span>
                        Orçamentos (CRM)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie propostas e acompanhamento comercial</p>
                </div>
                <Link to="/orcamento/novo" className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                    <span className="material-icons-outlined mr-2">add</span> Novo Orçamento
                </Link>
            </div>

            <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-8 p-5">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-grow w-full md:w-auto">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Buscar Orçamento</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-icons-outlined text-gray-400">search</span>
                            </span>
                            <input
                                type="text"
                                placeholder="ID, Cliente, CPF/CNPJ ou Valor"
                                className="form-input block w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Vendedor</label>
                        <select
                            disabled={!!appUser?.salesperson}
                            className={`form-select block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 ${appUser?.salesperson ? 'bg-gray-100' : ''}`}
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
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Status</label>
                        <select
                            className="form-select block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        >
                            {statusOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Date Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="w-full md:w-auto">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Data Início</label>
                        <input
                            type="date"
                            className="form-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Data Fim</label>
                        <input
                            type="date"
                            className="form-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Nr</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Empresa / Cliente</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Vendedor</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Total</th>
                            <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm italic">Carregando...</td></tr>
                        ) : budgets.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm italic">Nenhum orçamento encontrado.</td></tr>
                        ) : (
                            budgets.map((b) => (
                                <tr key={b.id} className="hover:bg-blue-50 transition-colors cursor-pointer odd:bg-white even:bg-gray-50" onClick={() => navigate(`/orcamento/${b.id}`)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">#{b.budget_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900">{b.partners?.name || 'Vários'}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{b.issuer || 'N/A'} BRINDES</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{formatDate(b.created_at)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium uppercase">{b.salesperson}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'PROPOSTA ACEITA' ? 'bg-green-100 text-green-700' :
                                            b.status === 'PROPOSTA RECUSADA' || b.status === 'CANCELADO' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {b.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-gray-900">
                                        {b.total_amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/orcamento/${b.id}`); }} className="text-blue-500 hover:text-blue-700"><span className="material-icons-outlined">edit</span></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteBudget(b.id); }} className="text-red-400 hover:text-red-600"><span className="material-icons-outlined">delete</span></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-xl shadow-sm">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Anterior</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalCount} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Próximo</button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Mostrando <span className="font-medium">{page * pageSize + 1}</span> até <span className="font-medium">{Math.min((page + 1) * pageSize, totalCount)}</span> de <span className="font-medium">{totalCount}</span> resultados
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                                    <span className="material-icons-outlined">chevron_left</span>
                                </button>
                                {[...Array(Math.ceil(totalCount / pageSize))].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i)}
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === i ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        {i + 1}
                                    </button>
                                )).slice(Math.max(0, page - 2), Math.min(Math.ceil(totalCount / pageSize), page + 3))}
                                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalCount} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                                    <span className="material-icons-outlined">chevron_right</span>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetList;
