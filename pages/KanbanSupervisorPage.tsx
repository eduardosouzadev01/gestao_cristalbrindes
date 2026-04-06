import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';

const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const daysSince = (dateStr: string): number => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

interface Lead {
    id: string;
    client_name: string;
    client_phone?: string;
    status: string;
    salesperson: string;
    estimated_value?: number;
    priority?: string;
    created_at: string;
    updated_at?: string;
}

interface SellerStats {
    salesperson: string;
    leads: Lead[];
    totalActive: number;
    totalValue: number;
    stagnatedCount: number;
    atendimento: Lead[];
    orcamento: Lead[];
    proposta: Lead[];
    aberto: Lead[];
    entregue: Lead[];
}

const KANBAN_COLS = [
    { id: 'ATENDIMENTO', label: 'Atendimento', color: '#7b68ee', icon: 'support_agent' },
    { id: 'ORCAMENTO', label: 'Orçamento', color: '#ff9800', icon: 'description' },
    { id: 'PROPOSTA_ENVIADA', label: 'Proposta', color: '#1db954', icon: 'send' },
    { id: 'PEDIDO_ABERTO', label: 'Pedido', color: '#00bcd4', icon: 'shopping_cart' },
    { id: 'PEDIDO_ENTREGUE', label: 'Entregue', color: '#e91e63', icon: 'local_shipping' },
];

const STAGNATION_THRESHOLD_DAYS = 3;

const KanbanSupervisorPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const [allLeads, setAllLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSeller, setExpandedSeller] = useState<string | null>(null);
    const [expandedCol, setExpandedCol] = useState<{ seller: string; col: string } | null>(null);
    const [filterSeller, setFilterSeller] = useState('Todos');
    const [filterPriority, setFilterPriority] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchLeads = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('crm_leads')
                .select('id, client_name, client_phone, status, salesperson, estimated_value, priority, created_at, updated_at')
                .in('status', ['ATENDIMENTO', 'ORCAMENTO', 'PROPOSTA_ENVIADA', 'PEDIDO_ABERTO', 'PEDIDO_ENTREGUE'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllLeads(data || []);
            setLastRefresh(new Date());
        } catch (err: any) {
            toast.error('Erro ao carregar dados: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchLeads, 60000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLeads]);

    const getSellerStats = (): SellerStats[] => {
        let leads = allLeads;
        if (filterPriority !== 'Todos') {
            leads = leads.filter(l => l.priority === filterPriority);
        }
        
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            leads = leads.filter(l => 
                l.client_name?.toLowerCase().includes(term) || 
                l.client_phone?.toLowerCase().includes(term)
            );
        }

        const sellers = Array.from(new Set<string>(leads.map(l => l.salesperson || 'N/A'))).sort();

        const filtered = filterSeller !== 'Todos' ? sellers.filter(s => s === filterSeller) : sellers;

        return filtered.map(sp => {
            const spLeads = leads.filter(l => l.salesperson === sp);
            const activeLeads = spLeads;
            const stagnated = activeLeads.filter(l => {
                const checkDate = l.updated_at || l.created_at;
                return daysSince(checkDate) >= STAGNATION_THRESHOLD_DAYS;
            });

            return {
                salesperson: sp,
                leads: spLeads,
                totalActive: activeLeads.length,
                totalValue: activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0),
                stagnatedCount: stagnated.length,
                atendimento: spLeads.filter(l => l.status === 'ATENDIMENTO'),
                orcamento: spLeads.filter(l => l.status === 'ORCAMENTO'),
                proposta: spLeads.filter(l => l.status === 'PROPOSTA_ENVIADA'),
                aberto: spLeads.filter(l => l.status === 'PEDIDO_ABERTO'),
                entregue: spLeads.filter(l => l.status === 'PEDIDO_ENTREGUE'),
            };
        });
    };

    const sellerStats = getSellerStats();
    const allSellers = Array.from(new Set(allLeads.map(l => l.salesperson || 'N/A'))).sort();

    const globalKPIs = {
        totalLeads: allLeads.length,
        totalValue: allLeads.reduce((s, l) => s + (l.estimated_value || 0), 0),
        stagnated: allLeads.filter(l => {
            const d = l.updated_at || l.created_at;
            return daysSince(d) >= STAGNATION_THRESHOLD_DAYS;
        }).length,
        highPriority: allLeads.filter(l => l.priority === 'ALTA').length,
    };

    const getColLeads = (stats: SellerStats, colId: string): Lead[] => {
        switch (colId) {
            case 'ATENDIMENTO': return stats.atendimento;
            case 'ORCAMENTO': return stats.orcamento;
            case 'PROPOSTA_ENVIADA': return stats.proposta;
            case 'PEDIDO_ABERTO': return stats.aberto;
            case 'PEDIDO_ENTREGUE': return stats.entregue;
            default: return [];
        }
    };

    const getPriorityDot = (priority?: string) => {
        if (priority === 'ALTA') return 'bg-red-500';
        if (priority === 'BAIXA') return 'bg-gray-400';
        return 'bg-blue-400';
    };

    const getSellerInitials = (name: string) => {
        if (name.toUpperCase().startsWith('VENDAS ')) return 'V' + name.replace(/\D/g, '');
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-3xl" style={{ color: '#0F6CBD' }}>dashboard_customize</span>
                        Supervisão Kanban
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Visão panorâmica de todos os atendimentos por vendedor.
                        <span className="ml-2 text-gray-400">
                            Atualizado: {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoRefresh(v => !v)}
                        className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border ${autoRefresh
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                        title="Auto-atualizar a cada 60 segundos"
                    >
                        <span className={`material-icons-outlined text-sm ${autoRefresh ? 'animate-spin' : ''}`}>refresh</span>
                        {autoRefresh ? 'Auto-refresh ON' : 'Auto OFF'}
                    </button>
                    <button
                        onClick={fetchLeads}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-50"
                    >
                        <span className="material-icons-outlined text-sm">sync</span>
                        Atualizar
                    </button>
                </div>
            </div>

            {/* ── Global KPI Bar ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="bg-transparent border-b border-gray-200 pb-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Leads Ativos</p>
                        <p className="text-2xl font-light text-gray-900 mt-1">{globalKPIs.totalLeads}</p>
                    </div>
                </div>

                <div className={`border-b pb-3 flex items-center justify-between ${globalKPIs.highPriority > 0 ? 'border-red-200' : 'border-gray-200'}`}>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alta Prioridade</p>
                        <p className={`text-2xl font-light mt-1 ${globalKPIs.highPriority > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                            {globalKPIs.highPriority}
                        </p>
                    </div>
                </div>
                <div className={`border-b pb-3 flex items-center justify-between ${globalKPIs.stagnated > 0 ? 'border-orange-200' : 'border-gray-200'}`}>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parados +{STAGNATION_THRESHOLD_DAYS}d</p>
                        <p className={`text-2xl font-light mt-1 ${globalKPIs.stagnated > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
                            {globalKPIs.stagnated}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="bg-transparent mb-8 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[240px] relative">
                    <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou telefone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-full text-sm focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 transition-all outline-none text-gray-700 shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-full px-4 py-2 shadow-sm transition-all focus-within:border-blue-300">
                    <span className="material-icons-outlined text-[16px] text-gray-400">person</span>
                    <select
                        className="bg-transparent border-none text-sm py-0.5 pr-6 focus:ring-0 text-gray-600 cursor-pointer outline-none appearance-none"
                        value={filterSeller}
                        onChange={e => setFilterSeller(e.target.value)}
                    >
                        <option value="Todos">Todos os Vendedores</option>
                        {allSellers.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-full px-4 py-2 shadow-sm transition-all focus-within:border-blue-300">
                    <span className="material-icons-outlined text-[16px] text-gray-400">flag</span>
                    <select
                        className="bg-transparent border-none text-sm py-0.5 pr-6 focus:ring-0 text-gray-600 cursor-pointer outline-none appearance-none"
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                    >
                        <option value="Todos">Prioridade</option>
                        <option value="ALTA">Alta</option>
                        <option value="NORMAL">Normal</option>
                        <option value="BAIXA">Baixa</option>
                    </select>
                </div>
                <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                        Parado +{STAGNATION_THRESHOLD_DAYS}d
                    </span>
                    <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                        Alta prioridade
                    </span>
                </div>
            </div>

            {/* ── Legend / Column Headers ── */}
            <div className="hidden md:grid mb-2" style={{ gridTemplateColumns: '200px repeat(5, 1fr)' }}>
                <div />
                {KANBAN_COLS.map(col => (
                    <div key={col.id} className="flex items-center justify-center gap-1 pb-2 border-b-2" style={{ borderColor: col.color }}>
                        <span className="material-icons-outlined text-sm" style={{ color: col.color }}>{col.icon}</span>
                        <span className="text-[11px] font-bold uppercase" style={{ color: col.color }}>{col.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className="py-20 text-center">
                    <svg className="animate-spin h-8 w-8 mx-auto mb-4" style={{ color: '#0F6CBD' }} viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Carregando dados do kanban...</p>
                </div>
            )}

            {/* ── Seller Rows ── */}
            {!loading && sellerStats.length === 0 && (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-200">
                    <span className="material-icons-outlined text-5xl text-gray-300 mb-3 block">inbox</span>
                    <p className="text-gray-400">Nenhum atendimento ativo encontrado.</p>
                </div>
            )}

            <div className="space-y-3">
                {sellerStats.map(stats => {
                    const isExpanded = expandedSeller === stats.salesperson;
                    const hasStagnated = stats.stagnatedCount > 0;
                    const hasHighPriority = stats.leads.some(l => l.priority === 'ALTA');

                    return (
                        <div
                            key={stats.salesperson}
                            className={`bg-white/60 backdrop-blur-md rounded-2xl border transition-all ${hasStagnated ? 'border-orange-100 shadow-[0_0_15px_-3px_rgba(255,165,0,0.1)]' : hasHighPriority ? 'border-red-50 shadow-[0_0_15px_-3px_rgba(255,0,0,0.05)]' : 'border-gray-100'}`}
                        >
                            {/* ── Seller Summary Row ── */}
                            <div
                                className="grid items-center gap-2 p-3 cursor-pointer hover:bg-white rounded-2xl transition-all duration-300"
                                style={{ gridTemplateColumns: '200px repeat(5, 1fr)' }}
                                onClick={() => setExpandedSeller(isExpanded ? null : stats.salesperson)}
                            >
                                {/* Seller Info */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                        style={{ backgroundColor: '#0F6CBD' }}
                                    >
                                        {getSellerInitials(stats.salesperson)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-800 uppercase truncate">{stats.salesperson}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-gray-400 font-medium">{stats.totalActive} ativos</span>
                                            {hasStagnated && (
                                                <span className="text-[10px] font-bold text-orange-600 flex items-center gap-0.5">
                                                    <span className="material-icons-outlined text-[10px]">warning</span>
                                                    {stats.stagnatedCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className={`material-icons-outlined text-sm text-gray-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    >
                                        expand_more
                                    </span>
                                </div>

                                {/* Column Cells */}
                                {KANBAN_COLS.map(col => {
                                    const colLeads = getColLeads(stats, col.id);
                                    const count = colLeads.length;
                                    const value = colLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
                                    const stagnatedInCol = colLeads.filter(l => daysSince(l.updated_at || l.created_at) >= STAGNATION_THRESHOLD_DAYS).length;
                                    const isColExpanded = expandedCol?.seller === stats.salesperson && expandedCol?.col === col.id;

                                    return (
                                        <div
                                            key={col.id}
                                            onClick={e => {
                                                e.stopPropagation();
                                                if (count === 0) return;
                                                setExpandedCol(isColExpanded ? null : { seller: stats.salesperson, col: col.id });
                                                setExpandedSeller(stats.salesperson);
                                            }}
                                            className={`mx-1 p-2 rounded-lg transition-all ${count > 0 ? 'cursor-pointer hover:opacity-80' : 'opacity-40'} ${isColExpanded ? 'ring-2' : ''}`}
                                            style={{
                                                backgroundColor: count > 0 ? `${col.color}12` : '#f9fafb',
                                                borderWidth: 1,
                                                borderStyle: 'solid',
                                                borderColor: count > 0 ? `${col.color}40` : '#e5e7eb',
                                                ringColor: col.color,
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span
                                                    className="text-lg font-black"
                                                    style={{ color: count > 0 ? col.color : '#d1d5db' }}
                                                >
                                                    {count}
                                                </span>
                                                {stagnatedInCol > 0 && (
                                                    <span className="text-[9px] font-bold text-orange-500 flex items-center gap-0.5">
                                                        <span className="material-icons-outlined text-[9px]">warning</span>
                                                        {stagnatedInCol}
                                                    </span>
                                                )}
                                            </div>
                                            {value > 0 && (
                                                <p className="text-[9px] text-gray-500 font-medium truncate">
                                                    {formatCurrency(value)}
                                                </p>
                                            )}
                                            {count > 0 && (
                                                <div className="mt-1.5 h-1 rounded-full w-full overflow-hidden" style={{ backgroundColor: `${col.color}20` }}>
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.min(100, (count / Math.max(1, stats.totalActive)) * 100 * 2)}%`,
                                                            backgroundColor: col.color,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Expanded: Mini Cards by column ── */}
                            {isExpanded && (
                                <div className="border-t border-gray-100 p-4">
                                    {expandedCol?.seller === stats.salesperson ? (
                                        // Show leads of selected column
                                        (() => {
                                            const col = KANBAN_COLS.find(c => c.id === expandedCol.col)!;
                                            const leads = getColLeads(stats, expandedCol.col);
                                            return (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="material-icons-outlined text-sm" style={{ color: col.color }}>{col.icon}</span>
                                                        <span className="text-xs font-bold uppercase" style={{ color: col.color }}>{col.label}</span>
                                                        <span className="text-xs text-gray-400 ml-1">— {leads.length} leads</span>
                                                        <button
                                                            onClick={() => setExpandedCol(null)}
                                                            className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">close</span>
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                                                        {leads.map(lead => {
                                                            const checkDate = lead.updated_at || lead.created_at;
                                                            const days = daysSince(checkDate);
                                                            const isStagnated = days >= STAGNATION_THRESHOLD_DAYS;
                                                            return (
                                                                <div
                                                                    key={lead.id}
                                                                    className={`p-3 rounded-lg border text-left ${isStagnated ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}
                                                                >
                                                                    <div className="flex items-start gap-1 mb-1">
                                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${getPriorityDot(lead.priority)}`} />
                                                                        <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{lead.client_name}</p>
                                                                    </div>
                                                                    {lead.estimated_value ? (
                                                                        <p className="text-[10px] font-bold text-green-700 mt-1">{formatCurrency(lead.estimated_value)}</p>
                                                                    ) : null}
                                                                    <p className={`text-[9px] font-medium mt-1 flex items-center gap-0.5 ${isStagnated ? 'text-orange-600' : 'text-gray-400'}`}>
                                                                        <span className="material-icons-outlined text-[9px]">{isStagnated ? 'warning' : 'schedule'}</span>
                                                                        {days === 0 ? 'Hoje' : `${days}d atrás`}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        // Show overview of all columns  
                                        <div className="grid grid-cols-5 gap-3">
                                            {KANBAN_COLS.map(col => {
                                                const leads = getColLeads(stats, col.id);
                                                return (
                                                    <div key={col.id}>
                                                        <div className="flex items-center gap-1 mb-2">
                                                            <span className="material-icons-outlined text-[12px]" style={{ color: col.color }}>{col.icon}</span>
                                                            <span className="text-[10px] font-bold uppercase" style={{ color: col.color }}>{col.label}</span>
                                                            <span className="text-[9px] text-gray-400 ml-auto">{leads.length}</span>
                                                        </div>
                                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                            {leads.length === 0 ? (
                                                                <p className="text-[9px] text-gray-300 text-center py-3 border border-dashed border-gray-200 rounded-lg">Vazio</p>
                                                            ) : leads.map(lead => {
                                                                const checkDate = lead.updated_at || lead.created_at;
                                                                const days = daysSince(checkDate);
                                                                const isStagnated = days >= STAGNATION_THRESHOLD_DAYS;
                                                                return (
                                                                    <div
                                                                        key={lead.id}
                                                                        className={`p-2 rounded-lg border text-left ${isStagnated ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}
                                                                    >
                                                                        <div className="flex items-start gap-1">
                                                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${getPriorityDot(lead.priority)}`} />
                                                                            <p className="text-[10px] font-bold text-gray-700 leading-tight line-clamp-1 flex-1">{lead.client_name}</p>
                                                                        </div>
                                                                        <div className="flex items-center justify-between mt-0.5">
                                                                            {lead.estimated_value ? (
                                                                                <span className="text-[9px] font-bold text-green-700">{formatCurrency(lead.estimated_value)}</span>
                                                                            ) : <span />}
                                                                            <span className={`text-[8px] font-medium flex items-center gap-0.5 ${isStagnated ? 'text-orange-500' : 'text-gray-400'}`}>
                                                                                {isStagnated && <span className="material-icons-outlined text-[8px]">warning</span>}
                                                                                {days === 0 ? 'Hoje' : `${days}d`}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Legend Footer ── */}
            {!loading && sellerStats.length > 0 && (
                <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-white">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Como usar</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                            <span className="material-icons-outlined text-sm text-gray-400">touch_app</span>
                            Clique na linha do vendedor para expandir todos os cards
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="material-icons-outlined text-sm text-orange-400">warning</span>
                            Lead estagnado há +{STAGNATION_THRESHOLD_DAYS} dias sem atualização
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="material-icons-outlined text-sm text-gray-400">touch_app</span>
                            Clique em uma célula de coluna para ver os cards daquela etapa
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanbanSupervisorPage;
