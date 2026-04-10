import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useSuperDashboard, daysSince, isOverdue, DashLead, DashBudget, DashProposal, DashOrder } from '../src/hooks/useSuperDashboard';
import { formatDate } from '../src/utils/dateUtils';
import { fixClientName } from '../src/utils/textUtils';

// ─── Constants & Config ───────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Tab = 'overview' | 'kanban' | 'orcamentos' | 'propostas' | 'pedidos';

const KANBAN_COLS = [
  { id: 'ATENDIMENTO',     label: 'Atendimento', color: '#7b68ee', icon: 'support_agent' },
  { id: 'ORCAMENTO',       label: 'Orçamento',   color: '#ff9800', icon: 'description'   },
  { id: 'PROPOSTA_ENVIADA', label: 'Proposta',   color: '#0F6CBD', icon: 'send'           },
  { id: 'PEDIDO_ABERTO',   label: 'Pedido',      color: '#1db954', icon: 'shopping_cart'  },
  { id: 'PEDIDO_ENTREGUE', label: 'Entregue',    color: '#e91e63', icon: 'local_shipping' },
];

const ORDER_STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string; }> = {
  'AGUARDANDO PAGAMENTO ENTRADA': {
    label: 'Aguard. 1ª Parcela',
    bgColor: '#FFF1D6', textColor: '#8A6116', dotColor: '#EAB308',
  },
  'EM PRODUÇÃO': {
    label: 'Em Produção',
    bgColor: '#EFF6FF', textColor: '#1D4ED8', dotColor: '#3B82F6',
  },
  'EM TRANSPORTE': {
    label: 'Em Transporte',
    bgColor: '#F5F3FF', textColor: '#6D28D9', dotColor: '#8B5CF6',
  },
  'EM CONFERÊNCIA': {
    label: 'Em Conferência',
    bgColor: '#EEF2FF', textColor: '#4338CA', dotColor: '#6366F1',
  },
  'AGUARDANDO PAGAMENTO 2 PARCELA': {
    label: 'Aguard. 2ª Parcela',
    bgColor: '#FFF7ED', textColor: '#C2410C', dotColor: '#F97316',
  },
  'ENTREGUE': {
    label: 'Entregue',
    bgColor: '#ECFDF5', textColor: '#065F46', dotColor: '#10B981',
  },
  'AGUARDANDO PAGAMENTO FATURAMENTO': {
    label: 'Aguard. Faturamento',
    bgColor: '#ECFEFF', textColor: '#155E75', dotColor: '#06B6D4',
  },
  'FINALIZADO': {
    label: 'Finalizado',
    bgColor: '#F0FDF4', textColor: '#166534', dotColor: '#22C55E',
  },
};

const BUDGET_STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  'EM ABERTO':         { label: 'EM ABERTO',         bgColor: '#FFF1D6', textColor: '#8A6116' },
  'PROPOSTA ENVIADA':  { label: 'PROPOSTA ENVIADA',  bgColor: '#EBF3FC', textColor: '#0F548C' },
  'PROPOSTA ACEITA':   { label: 'PROPOSTA ACEITA',   bgColor: '#DFF6DD', textColor: '#0E700E' },
  'PROPOSTA RECUSADA': { label: 'PROPOSTA RECUSADA', bgColor: '#FDE7E9', textColor: '#BC2F32' },
  'CANCELADO':         { label: 'CANCELADO',         bgColor: '#F5F5F5', textColor: '#616161' },
};

const PROPOSAL_STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; icon: string }> = {
  'GERADA':  { label: 'GERADA',  bgColor: '#EBF3FC', textColor: '#0F548C', icon: 'draft' },
  'ENVIADA': { label: 'ENVIADA', bgColor: '#FFF1D6', textColor: '#8A6116', icon: 'send'  },
  'ACEITA':  { label: 'ACEITA',  bgColor: '#DFF6DD', textColor: '#0E700E', icon: 'check_circle' },
};

// ─── Components ───────────────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: string | number; icon: string; color: string; alert?: boolean; }> = ({ label, value, icon, color, alert }) => (
  <div className={`bg-white rounded-lg border p-4 flex items-center justify-between transition-colors shadow-none ${
    alert ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200 hover:border-gray-300'
  }`}>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">{label}</p>
      <p className="text-2xl font-black tracking-tighter" style={{ color: alert ? '#BC2F32' : '#242424' }}>
        {value}
      </p>
    </div>
    <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
      <span className="material-icons-outlined text-xl" style={{ color }}>{icon}</span>
    </div>
  </div>
);

const SuperDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const isSeller = !!appUser?.salesperson && !appUser?.permissions?.fullAccess;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filterSeller, setFilterSeller] = useState('Todos');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Restricted by auth profile if salesperson
  const salespersonRestriction = isSeller ? appUser?.salesperson : undefined;
  const { leads, budgets, proposals, orders, loading, error, lastRefresh, refresh } =
    useSuperDashboard(salespersonRestriction);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  // Sellers for filter
  const allSellers = useMemo(() => {
    const set = new Set<string>();
    [...leads, ...budgets, ...proposals, ...orders].forEach(r => {
      if ((r as any).salesperson) set.add((r as any).salesperson);
    });
    return Array.from(set).sort();
  }, [leads, budgets, proposals, orders]);

  // Global filters
  const filtered = useMemo(() => {
    const sp = filterSeller === 'Todos' ? null : filterSeller;
    const term = searchTerm.toLowerCase();

    const apply = <T extends { salesperson: string; client_name?: string; order_number?: string; budget_number?: string; proposal_number?: string }>(arr: T[]) => {
      let result = arr;
      if (sp) result = result.filter(x => x.salesperson === sp);
      if (term) {
        result = result.filter(x =>
          (x.client_name?.toLowerCase().includes(term)) ||
          (x.order_number?.toLowerCase().includes(term)) ||
          (x.budget_number?.toLowerCase().includes(term)) ||
          (x.proposal_number?.toLowerCase().includes(term))
        );
      }
      return result;
    };

    return {
      leads: apply(leads),
      budgets: apply(budgets),
      proposals: apply(proposals),
      orders: apply(orders),
    };
  }, [leads, budgets, proposals, orders, filterSeller, searchTerm]);

  // ─── Alerts Calculation ─────────────────────────────────────────────────────

  const alerts = useMemo(() => {
    const result = [];

    // CRM: Stagnated leads (+3 days)
    const stagnatedLeads = filtered.leads.filter(l =>
      daysSince(l.updated_at || l.created_at) >= 3
    );
    if (stagnatedLeads.length > 0) {
      result.push({
        id: 'stagnated_leads',
        type: 'warning',
        icon: 'warning',
        title: `${stagnatedLeads.length} lead${stagnatedLeads.length > 1 ? 's' : ''} sem atualização há +3 dias`,
        items: stagnatedLeads.map(l => `${fixClientName(l.client_name)} (${l.salesperson})`).slice(0, 3),
        action: () => setActiveTab('kanban'),
        actionLabel: 'Ver no Kanban',
      });
    }

    // Orders: Overdue/Urgent
    const overdueOrders = filtered.orders.filter(o =>
      isOverdue(o.payment_due_date) && !['ENTREGUE', 'FINALIZADO'].includes(o.status)
    );
    if (overdueOrders.length > 0) {
      result.push({
        id: 'overdue_orders',
        type: 'danger',
        icon: 'error',
        title: `${overdueOrders.length} pedido${overdueOrders.length > 1 ? 's' : ''} com entrega atrasada`,
        items: overdueOrders.map(o => `#${o.order_number} — ${fixClientName(o.client_name)}`).slice(0, 3),
        action: () => setActiveTab('pedidos'),
        actionLabel: 'Ver Pedidos',
      });
    }

    // Orders: Awaiting entry payment (+3 days)
    const awaitingPayment = filtered.orders.filter(o =>
      o.status === 'AGUARDANDO PAGAMENTO ENTRADA' && daysSince(o.order_date) >= 3
    );
    if (awaitingPayment.length > 0) {
      result.push({
        id: 'awaiting_payment',
        type: 'warning',
        icon: 'payments',
        title: `${awaitingPayment.length} pedido${awaitingPayment.length > 1 ? 's' : ''} aguardando 1ª parcela há +3 dias`,
        items: awaitingPayment.map(o => `#${o.order_number} — ${fixClientName(o.client_name)}`).slice(0, 3),
        action: () => setActiveTab('pedidos'),
        actionLabel: 'Ver Pedidos',
      });
    }

    return result;
  }, [filtered]);

  // ─── Funnel Calculation ─────────────────────────────────────────────────────

  const sellerFunnel = useMemo(() => {
    const list = isSeller ? [appUser?.salesperson!] : allSellers;
    return list.map(sp => {
      const spLeads    = leads.filter(l => l.salesperson === sp);
      const spBudgets  = budgets.filter(b => b.salesperson === sp);
      const spProposals = proposals.filter(p => p.salesperson === sp);
      const spOrders   = orders.filter(o => o.salesperson === sp);

      return {
        seller: sp,
        leads: spLeads.length,
        leadsValue: spLeads.reduce((s, l) => s + (l.estimated_value || 0), 0),
        budgetsOpen: spBudgets.filter(b => b.status === 'EM ABERTO').length,
        budgetsValue: spBudgets.filter(b => b.status === 'EM ABERTO').reduce((s, b) => s + b.total_amount, 0),
        proposalsSent: spProposals.filter(p => p.status === 'ENVIADA').length,
        proposalsValue: spProposals.filter(p => p.status === 'ENVIADA').reduce((s, p) => s + p.total_amount, 0),
        ordersActive: spOrders.filter(o => !['ENTREGUE','FINALIZADO'].includes(o.status)).length,
        ordersValue: spOrders.reduce((s, o) => s + o.total_amount, 0),
        stagnated: spLeads.filter(l => daysSince(l.updated_at || l.created_at) >= 3).length,
      };
    }).sort((a, b) => b.stagnated - a.stagnated || (b.leadsValue + b.ordersValue) - (a.leadsValue + a.ordersValue));
  }, [allSellers, leads, budgets, proposals, orders, isSeller, appUser]);

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI GRID 1 - Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Leads Ativos"
          value={filtered.leads.length}
          icon="groups"
          color="#7b68ee"
        />
        <KpiCard
          label="Orçamentos em Aberto"
          value={filtered.budgets.filter(b => b.status === 'EM ABERTO').length}
          icon="request_quote"
          color="#ff9800"
        />
        <KpiCard
          label="Propostas Enviadas"
          value={filtered.proposals.filter(p => p.status === 'ENVIADA').length}
          icon="send"
          color="#0F6CBD"
        />
        <KpiCard
          label="Pedidos Ativos"
          value={filtered.orders.filter(o => !['ENTREGUE', 'FINALIZADO'].includes(o.status)).length}
          icon="shopping_cart"
          color="#1db954"
        />
      </div>

      {/* KPI GRID 2 - Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Valor Est. Leads"
          value={formatCurrency(filtered.leads.reduce((s, l) => s + (l.estimated_value || 0), 0))}
          icon="monetization_on"
          color="#7b68ee"
        />
        <KpiCard
          label="Valor em Orçamentos"
          value={formatCurrency(filtered.budgets.filter(b => b.status === 'EM ABERTO').reduce((s, b) => s + b.total_amount, 0))}
          icon="point_of_sale"
          color="#ff9800"
        />
        <KpiCard
          label="Valor em Propostas"
          value={formatCurrency(filtered.proposals.filter(p => p.status === 'ENVIADA').reduce((s, p) => s + p.total_amount, 0))}
          icon="paid"
          color="#0F6CBD"
        />
        <KpiCard
          label="A Receber (Pedidos)"
          value={formatCurrency(filtered.orders.reduce((s, o) => s + (o.remaining_amount || 0), 0))}
          icon="account_balance_wallet"
          color="#BC2F32"
          alert={filtered.orders.some(o => isOverdue(o.payment_due_date))}
        />
      </div>

      {/* ALERTS */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
            <span className="material-icons-outlined text-sm text-orange-400">notification_important</span>
            Alertas de Supervisão
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map(alert => (
              <div key={alert.id} className={`rounded-lg border p-4 flex items-start gap-3 transition-all ${
                alert.type === 'danger' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <span className={`material-icons-outlined text-xl mt-0.5 ${
                  alert.type === 'danger' ? 'text-red-500' : 'text-orange-500'
                }`}>
                  {alert.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black tracking-tight leading-none mb-1 ${
                    alert.type === 'danger' ? 'text-red-700' : 'text-orange-700'
                  }`}>
                    {alert.title}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase leading-snug">
                    {alert.items.join(' · ')}
                    {alert.items.length >= 3 && ' · e outros'}
                  </p>
                </div>
                <button
                  onClick={alert.action}
                  className="p-1 px-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-white/50 rounded flex items-center gap-1"
                >
                  Ver <span className="material-icons-outlined text-sm">chevron_right</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FUNNEL TABLE */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-none overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <span className="material-icons-outlined text-sm text-blue-500">leaderboard</span>
            Performance do Funil por Vendedor
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50/30 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-4 py-2.5 text-left">Vendedor</th>
                <th className="px-4 py-2.5 text-center">Leads</th>
                <th className="px-4 py-2.5 text-center whitespace-nowrap">Orc. Abertos</th>
                <th className="px-4 py-2.5 text-center whitespace-nowrap">Prop. Enviadas</th>
                <th className="px-4 py-2.5 text-center whitespace-nowrap">Pedidos Ativos</th>
                <th className="px-4 py-2.5 text-right">Potencial Total</th>
                <th className="px-4 py-2.5 text-center">Atenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
              {sellerFunnel.map(row => (
                <tr key={row.seller} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-black text-gray-900">{row.seller}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col">
                      <span>{row.leads}</span>
                      <span className="text-[9px] text-gray-400 uppercase">{formatCurrency(row.leadsValue)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col text-orange-600">
                      <span>{row.budgetsOpen}</span>
                      <span className="text-[9px] text-gray-400 uppercase">{formatCurrency(row.budgetsValue)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col text-blue-600">
                      <span>{row.proposalsSent}</span>
                      <span className="text-[9px] text-gray-400 uppercase">{formatCurrency(row.proposalsValue)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col text-green-600">
                      <span>{row.ordersActive}</span>
                      <span className="text-[9px] text-gray-400 uppercase">{formatCurrency(row.ordersValue)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-black">
                      {formatCurrency(row.leadsValue + row.budgetsValue + row.proposalsValue + row.ordersValue)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.stagnated > 0 ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[9px] font-black uppercase flex items-center gap-1 justify-center mx-auto w-fit">
                        <span className="material-icons-outlined text-xs">warning</span>
                        {row.stagnated} PARADOS
                      </span>
                    ) : (
                      <span className="material-icons-outlined text-green-500 text-sm">check_circle</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderKanban = () => {
    // Group leads by seller
    const sellersForKanban = isSeller ? [appUser?.salesperson!] : allSellers;
    
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {sellersForKanban.map(sp => {
          const spLeads = filtered.leads.filter(l => l.salesperson === sp);
          if (spLeads.length === 0 && filterSeller !== 'Todos') return null;
          
          return (
            <div key={sp} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">{sp}</h3>
                  <span className="text-[9px] font-bold text-gray-400 border-l border-gray-200 pl-2 uppercase">
                    {spLeads.length} Atendimentos Ativos · {formatCurrency(spLeads.reduce((s,l) => s + (l.estimated_value || 0), 0))} Estimado
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="flex divide-x divide-gray-100 min-w-[1000px]">
                  {KANBAN_COLS.map(col => {
                    const colLeads = spLeads.filter(l => l.status === col.id);
                    return (
                      <div key={col.id} className="flex-1 p-2 min-h-[120px] bg-gray-50/10">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="material-icons-outlined text-xs" style={{color: col.color}}>{col.icon}</span>
                            {col.label}
                          </span>
                          <span className="text-[10px] font-black text-gray-300">{colLeads.length}</span>
                        </div>
                        <div className="space-y-1.5">
                          {colLeads.map(lead => {
                            const isStagnated = daysSince(lead.updated_at || lead.created_at) >= 3;
                            return (
                              <div
                                key={lead.id}
                                onClick={() => navigate(`/crm?id=${lead.id}`)}
                                className={`p-2 rounded border bg-white cursor-pointer transition-all hover:border-blue-300 group shadow-none ${
                                  isStagnated ? 'border-l-4 border-l-orange-400 border-orange-100 bg-orange-50/20' : 'border-gray-100'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-[10px] font-black text-gray-900 uppercase leading-tight truncate pr-1 group-hover:text-blue-600 transition-colors">
                                    {fixClientName(lead.client_name)}
                                  </span>
                                  {lead.priority === 'ALTA' && (
                                    <span className="material-icons-outlined text-[10px] text-red-500">priority_high</span>
                                  )}
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold uppercase text-gray-400">
                                  <span>{formatCurrency(lead.estimated_value || 0)}</span>
                                  <span className={isStagnated ? 'text-orange-600' : ''}>
                                    {daysSince(lead.updated_at || lead.created_at)}d ocioso
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {colLeads.length === 0 && (
                            <div className="py-8 text-center border border-dashed border-gray-100 rounded">
                              <span className="text-[8px] font-black text-gray-300 uppercase letter-widest tracking-widest">Coluna Vazia</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTableTab = (type: 'budgets' | 'proposals' | 'orders') => {
    const data = filtered[type];
    
    if (loading) return (
      <div className="py-12 py-16 text-center text-gray-400 font-black uppercase text-[10px] tracking-widest">
        <span className="material-icons-outlined animate-spin text-2xl mb-2 block">sync</span>
        Carregando dados...
      </div>
    );

    if (data.length === 0) return (
      <div className="py-16 text-center bg-white rounded-lg border border-dashed border-gray-200">
        <span className="material-icons-outlined text-4xl text-gray-200 mb-2 block">inbox</span>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum registro encontrado</p>
      </div>
    );

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-in slide-in-from-bottom duration-500">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Vendedor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Data</th>
                {type === 'orders' && <th className="px-4 py-3 text-center">Pagamento</th>}
                <th className="px-4 py-3 text-right">Valor Total</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
              {data.map((item: any) => {
                const isOrd = type === 'orders';
                const isBud = type === 'budgets';
                const isProp = type === 'proposals';
                
                const status = isOrd ? ORDER_STATUS_CONFIG[item.status] : 
                               isBud ? BUDGET_STATUS_CONFIG[item.status] : 
                                       PROPOSAL_STATUS_CONFIG[item.status];

                return (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-black tracking-tight">
                        #{item.order_number || item.budget_number || item.proposal_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-black uppercase text-[11px] leading-none mb-1">{fixClientName(item.client_name)}</span>
                        {item.client_doc && <span className="text-[9px] text-gray-400">{item.client_doc}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-[10px] uppercase font-black">{item.salesperson}</td>
                    <td className="px-4 py-3 text-center">
                      {status ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase inline-flex items-center gap-1 shadow-none" style={{ backgroundColor: status.bgColor, color: status.textColor }}>
                          {(status as any).dotColor && <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: (status as any).dotColor}}></span>}
                          {status.label}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase inline-flex items-center gap-1 bg-gray-100 text-gray-500">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 font-bold">
                      {formatDate(item.order_date || item.created_at)}
                    </td>
                    {isOrd && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          {item.remaining_amount > 0 ? (
                            <span className="text-red-600 flex items-center gap-1">
                              <span className="material-icons-outlined text-xs">pending_actions</span>
                              Pendente
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1">
                              <span className="material-icons-outlined text-xs">verified</span>
                              Pago
                            </span>
                          )}
                          <span className="text-[9px] text-gray-300 font-black">ENTREGA: {item.payment_due_date ? formatDate(item.payment_due_date) : '-'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-black text-gray-900">
                      {formatCurrency(item.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => {
                          const path = isOrd ? `/pedido/${item.id}?mode=view` : isBud ? `/orcamento/${item.id}` : `/proposta/${item.id}`;
                          navigate(path);
                        }}
                        className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                      >
                        <span className="material-icons-outlined text-base">visibility</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ERROR MESSAGE */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <span className="material-icons-outlined">error_outline</span>
          <p className="text-xs font-bold uppercase tracking-widest">Erro: {error}</p>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter leading-none">
            <span className="material-icons-outlined text-2xl text-blue-600">monitoring</span>
            Super Painel de Supervisão
          </h1>
          <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest leading-none">
            Visão consolidada em tempo real · {lastRefresh.toLocaleTimeString('pt-BR')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none lg:w-64">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <span className="material-icons-outlined text-gray-400 text-xs">search</span>
            </span>
            <input
              type="text"
              placeholder="Buscar Cliente ou Nº..."
              className="form-input block w-full pl-8 rounded border-gray-300 shadow-none focus:border-blue-500 focus:ring-0 text-[11px] h-9 font-bold"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {!isSeller && (
            <select
              className="form-select text-[11px] h-9 py-0 pr-8 border-gray-300 rounded font-bold shadow-none focus:ring-0 focus:border-blue-500 flex-1 lg:flex-none"
              value={filterSeller}
              onChange={e => setFilterSeller(e.target.value)}
            >
              <option value="Todos">Todos os Vendedores</option>
              {allSellers.map(sp => <option key={sp} value={sp}>{sp}</option>)}
            </select>
          )}

          <div className="flex items-center gap-1 h-9 border border-gray-200 rounded px-1 flex-1 lg:flex-none">
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`p-1.5 rounded transition-all flex items-center gap-1.5 ${
                autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400 hover:text-gray-600'
              }`}
              title={autoRefresh ? 'Auto-refresh Ativo' : 'Auto-refresh Inativo'}
            >
              <span className={`material-icons-outlined text-xs ${autoRefresh ? 'animate-spin' : ''}`}>sync</span>
              <span className="text-[9px] font-black uppercase">{autoRefresh ? 'Em Live' : 'Offline'}</span>
            </button>
            <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1.5 rounded text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30"
              title="Recarregar Agora"
            >
              <span className="material-icons-outlined text-xs">refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto pb-0 px-1">
        {[
          { id: 'overview', label: 'Visão Geral', icon: 'dashboard', count: null },
          { id: 'kanban', label: 'Kanban CRM', icon: 'view_kanban', count: filtered.leads.length },
          { id: 'orcamentos', label: 'Orçamentos', icon: 'request_quote', count: filtered.budgets.length },
          { id: 'propostas', label: 'Propostas', icon: 'picture_as_pdf', count: filtered.proposals.length },
          { id: 'pedidos', label: 'Pedidos', icon: 'list_alt', count: filtered.orders.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 bg-blue-50/20'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
            }`}
          >
            <span className="material-icons-outlined text-sm">{tab.icon}</span>
            {tab.label}
            {tab.count !== null && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {loading && activeTab !== 'overview' && (
        <div className="py-24 text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sincronizando supervisão...</p>
        </div>
      )}

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'kanban' && renderKanban()}
      {activeTab === 'orcamentos' && renderTableTab('budgets')}
      {activeTab === 'propostas' && renderTableTab('proposals')}
      {activeTab === 'pedidos' && renderTableTab('orders')}
    </div>
  );
};

export default SuperDashboardPage;
