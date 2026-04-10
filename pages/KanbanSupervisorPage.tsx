import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { formatDate } from '../src/utils/dateUtils';
import { fixClientName } from '../src/utils/textUtils';

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
    { id: 'ATENDIMENTO', label: 'Atendimento', color: '#64748B', icon: 'support_agent' },
    { id: 'ORCAMENTO', label: 'Orçamento', color: '#B45309', icon: 'description' },
    { id: 'PROPOSTA_ENVIADA', label: 'Proposta', color: '#047857', icon: 'send' },
    { id: 'PEDIDO_ABERTO', label: 'Pedido', color: '#0369A1', icon: 'shopping_cart' },
    { id: 'PEDIDO_ENTREGUE', label: 'Entregue', color: '#BE123C', icon: 'local_shipping' },
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

            const atendimento = spLeads.filter(l => l.status === 'ATENDIMENTO');
            const orcamento = spLeads.filter(l => l.status === 'ORCAMENTO');

            return {
                salesperson: sp,
                leads: spLeads,
                totalActive: activeLeads.length,
                totalValue: activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0),
                stagnatedCount: stagnated.length,
                atendimento,
                orcamento,
                proposta: spLeads.filter(l => l.status === 'PROPOSTA_ENVIADA'),
                aberto: spLeads.filter(l => l.status === 'PEDIDO_ABERTO'),
                entregue: spLeads.filter(l => l.status === 'PEDIDO_ENTREGUE'),
            };
        });
    };

    const sellerStats = getSellerStats();
    const allSellers = Array.from(new Set(allLeads.map(l => l.salesperson || 'N/A'))).sort();

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
        if (priority === 'ALTA' || priority === 'URGENTE') return 'bg-red-600';
        if (priority === 'VIP') return 'bg-amber-500';
        return 'bg-slate-400';
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-3xl text-slate-700">dashboard</span>
                        Operações Kanban
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Carga de trabalho e distribuição de atendimentos por vendedor.
                        <span className="ml-2 text-slate-400 text-xs">
                            (Atualizado: {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoRefresh(v => !v)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all border ${autoRefresh
                            ? 'bg-slate-100 border-slate-300 text-slate-800'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                        title="Auto-atualizar a cada 60 segundos"
                    >
                        <span className={`material-icons-outlined text-[15px] ${autoRefresh ? 'animate-spin' : ''}`}>sync</span>
                        {autoRefresh ? 'Auto-refresh ON' : 'Auto OFF'}
                    </button>
                    <button
                        onClick={fetchLeads}
                        disabled={loading}
                        className="px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 bg-slate-800 text-white hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                        Atualizar
                    </button>
                </div>
            </div>

            {/* ── Seller Load Bar (KPI) ── */}
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Carga de Atendimento (Ativos + Orçamento)</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                {sellerStats.map(stats => {
                    const workload = stats.atendimento.length + stats.orcamento.length;
                    return (
                        <div key={stats.salesperson} className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 flex-shrink-0 bg-slate-50 rounded flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200">
                                    {getSellerInitials(stats.salesperson)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate">{stats.salesperson}</p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">Em andamento</p>
                                </div>
                            </div>
                            <div className="text-right pl-2">
                                <span className="text-xl font-bold text-slate-900">{workload}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex-1 min-w-[240px] relative">
                    <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou telefone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="bg-white border border-slate-200 text-sm py-1.5 px-3 rounded text-slate-600 cursor-pointer outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        value={filterSeller}
                        onChange={e => setFilterSeller(e.target.value)}
                    >
                        <option value="Todos">Vendedor: Todos</option>
                        {allSellers.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="bg-white border border-slate-200 text-sm py-1.5 px-3 rounded text-slate-600 cursor-pointer outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                    >
                        <option value="Todos">Prioridade: Todas</option>
                        <option value="ALTA">Alta / Urgente</option>
                        <option value="NORMAL">Normal</option>
                        <option value="BAIXA">Baixa</option>
                    </select>
                </div>
            </div>

            {/* ── Legend / Column Headers ── */}
            <div className="hidden md:grid mb-2 border-b border-slate-200 pb-2" style={{ gridTemplateColumns: '220px repeat(5, 1fr)' }}>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-2">Vendedor / Resumo</div>
                {KANBAN_COLS.map(col => (
                    <div key={col.id} className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide" style={{ color: col.color }}>
                            <span className="material-icons-outlined text-[14px]">{col.icon}</span>
                            {col.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className="py-20 text-center">
                    <svg className="animate-spin h-6 w-6 mx-auto mb-4 text-slate-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-slate-500 text-sm">Carregando dados...</p>
                </div>
            )}

            {/* ── Seller Rows ── */}
            {!loading && sellerStats.length === 0 && (
                <div className="py-16 text-center bg-white rounded border border-slate-200">
                    <span className="material-icons-outlined text-4xl text-slate-300 mb-2 block">inbox</span>
                    <p className="text-slate-500 text-sm">Nenhum atendimento ativo encontrado.</p>
                </div>
            )}

            <div className="space-y-2">
                {sellerStats.map(stats => {
                    const isExpanded = expandedSeller === stats.salesperson;
                    const hasStagnated = stats.stagnatedCount > 0;
                    const hasHighPriority = stats.leads.some(l => l.priority === 'ALTA' || l.priority === 'URGENTE');

                    return (
                        <div
                            key={stats.salesperson}
                            className={`bg-white rounded border transition-all ${hasStagnated ? 'border-amber-200' : hasHighPriority ? 'border-red-200' : 'border-slate-200'}`}
                        >
                            {/* ── Seller Summary Row ── */}
                            <div
                                className="grid items-center gap-4 p-2 cursor-pointer hover:bg-slate-50 transition-colors"
                                style={{ gridTemplateColumns: '220px repeat(5, 1fr)' }}
                            >
                                <div
                                    className="flex items-center gap-3 pl-2 min-w-0"
                                    onClick={() => setExpandedSeller(isExpanded ? null : stats.salesperson)}
                                >
                                    <div
                                        className="h-8 w-8 rounded flex items-center justify-center text-slate-600 text-[10px] font-bold flex-shrink-0 bg-slate-100 border border-slate-200"
                                    >
                                        {getSellerInitials(stats.salesperson)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate">{stats.salesperson}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-500 font-medium">Vol: {formatCurrency(stats.totalValue)}</span>
                                            {hasStagnated && (
                                                <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5">
                                                    <span className="material-icons-outlined text-[10px]">warning</span>
                                                    {stats.stagnatedCount} parado(s)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`material-icons-outlined text-sm text-slate-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </div>

                                {/* Column Cells */}
                                {KANBAN_COLS.map(col => {
                                    const colLeads = getColLeads(stats, col.id);
                                    const count = colLeads.length;
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
                                            className={`p-2 transition-all border-l-2 ${count > 0 ? 'cursor-pointer hover:bg-slate-100/50' : 'opacity-40'}`}
                                            style={{
                                                borderLeftColor: count > 0 ? col.color : '#e2e8f0',
                                                backgroundColor: isColExpanded ? '#f8fafc' : 'transparent',
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold" style={{ color: count > 0 ? col.color : '#94a3b8' }}>
                                                    {count}
                                                </span>
                                                {stagnatedInCol > 0 && (
                                                    <span className="text-[9px] font-semibold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1 rounded-sm">
                                                        <span className="material-icons-outlined text-[9px]">warning</span>
                                                        {stagnatedInCol}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Expanded: Mini Cards by column ── */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                                    {expandedCol?.seller === stats.salesperson ? (
                                        // Show leads of selected column
                                        (() => {
                                            const col = KANBAN_COLS.find(c => c.id === expandedCol.col)!;
                                            const leads = getColLeads(stats, expandedCol.col);
                                            return (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="material-icons-outlined text-[16px]" style={{ color: col.color }}>{col.icon}</span>
                                                        <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
                                                        <span className="text-[11px] text-slate-500 ml-1">({leads.length} leads)</span>
                                                        <button
                                                            onClick={() => setExpandedCol(null)}
                                                            className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                                        >
                                                            Voltar
                                                            <span className="material-icons-outlined text-sm">close</span>
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                                        {leads.map(lead => {
                                                            const checkDate = lead.updated_at || lead.created_at;
                                                            const days = daysSince(checkDate);
                                                            const isStagnated = days >= STAGNATION_THRESHOLD_DAYS;
                                                            return (
                                                                <div
                                                                    key={lead.id}
                                                                    className={`p-3 rounded border text-left bg-white ${isStagnated ? 'border-amber-200' : 'border-slate-200'}`}
                                                                >
                                                                    <div className="flex items-start gap-1.5 mb-1.5">
                                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${getPriorityDot(lead.priority)}`} />
                                                                        <p className="text-xs font-medium text-slate-800 leading-tight line-clamp-2">{fixClientName(lead.client_name)}</p>
                                                                    </div>
                                                                    {lead.estimated_value ? (
                                                                        <p className="text-[11px] font-medium text-slate-600 mt-1">{formatCurrency(lead.estimated_value)}</p>
                                                                    ) : null}
                                                                    <p className={`text-[10px] font-medium mt-1.5 flex items-center gap-1 ${isStagnated ? 'text-amber-600' : 'text-slate-500'}`}>
                                                                        <span className="material-icons-outlined text-[10px]">{isStagnated ? 'warning' : 'schedule'}</span>
                                                                        {days === 0 ? 'Atualizado hoje' : `${days}d parado`}
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
                                        <div className="grid grid-cols-5 gap-4">
                                            {KANBAN_COLS.map(col => {
                                                const leads = getColLeads(stats, col.id);
                                                return (
                                                    <div key={col.id} className="min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-slate-200">
                                                            <span className="text-[10px] font-semibold uppercase tracking-wide truncate" style={{ color: col.color }}>{col.label}</span>
                                                            <span className="text-[9px] text-slate-400 ml-auto bg-slate-100 px-1.5 py-0.5 rounded">{leads.length}</span>
                                                        </div>
                                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                                            {leads.length === 0 ? (
                                                                <p className="text-[10px] text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded">Vazio</p>
                                                            ) : leads.map(lead => {
                                                                const checkDate = lead.updated_at || lead.created_at;
                                                                const days = daysSince(checkDate);
                                                                const isStagnated = days >= STAGNATION_THRESHOLD_DAYS;
                                                                return (
                                                                    <div
                                                                        key={lead.id}
                                                                        className={`p-2 rounded border text-left bg-white ${isStagnated ? 'border-amber-200' : 'border-slate-200'}`}
                                                                    >
                                                                        <div className="flex items-start gap-1">
                                                                            <span className={`w-1 h-1 rounded-full flex-shrink-0 mt-1.5 ${getPriorityDot(lead.priority)}`} />
                                                                            <p className="text-[10px] font-medium text-slate-700 leading-tight line-clamp-1 flex-1">{fixClientName(lead.client_name)}</p>
                                                                        </div>
                                                                        <div className="flex items-center justify-between mt-1">
                                                                            {lead.estimated_value ? (
                                                                                <span className="text-[9px] font-medium text-slate-500">{formatCurrency(lead.estimated_value)}</span>
                                                                            ) : <span />}
                                                                            <span className={`text-[9px] font-medium flex items-center gap-0.5 ${isStagnated ? 'text-amber-600' : 'text-slate-400'}`}>
                                                                                {isStagnated && <span className="material-icons-outlined text-[9px]">warning</span>}
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
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default KanbanSupervisorPage;
