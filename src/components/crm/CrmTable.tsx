'use client';

import React from 'react';
import { Lead } from '@/hooks/useCRM';
import { LeadTableRow } from './LeadTableRow';
import { CRM_STATUS_CONFIG } from '@/constants/crm';
import { supabase } from '@/lib/supabase';

interface CrmTableProps {
    leads: Lead[];
    loading: boolean;
    onTogglePriority: (lead: Lead) => void;
    onUpdateStatus: (lead: Lead, status: string) => void;
    onEdit: (lead: Lead) => void;
    onTransfer: (lead: Lead) => void;
    onConvertToBudget: (lead: Lead) => void;
    onFinalize: (lead: Lead) => void;
    onMarkAsLost: (lead: Lead) => void;
    openStatusMenuId: string | null;
    setOpenStatusMenuId: (id: string | null) => void;
    // Filter props
    searchTerm: string;
    onSearchChange: (v: string) => void;
    sellerFilter: string;
    setSellerFilter: (v: string) => void;
    periodFilter: string;
    setPeriodFilter: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
    startDate: string;
    setStartDate: (v: string) => void;
    endDate: string;
    setEndDate: (v: string) => void;
    onRefresh: () => void;
    onExport: () => void;
    sellers: string[];
}

const CrmTable: React.FC<CrmTableProps> = ({
    leads,
    loading,
    onTogglePriority,
    onUpdateStatus,
    onEdit,
    onTransfer,
    onConvertToBudget,
    onFinalize,
    onMarkAsLost,
    openStatusMenuId,
    setOpenStatusMenuId,
    searchTerm,
    onSearchChange,
    sellerFilter,
    setSellerFilter,
    periodFilter,
    setPeriodFilter,
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    onRefresh,
    onExport,
    sellers,
}) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 50;

    // Reset pagination when filters or leads change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [leads.length, searchTerm, sellerFilter, statusFilter, periodFilter]);

    const totalPages = Math.ceil(leads.length / pageSize);
    const paginatedLeads = leads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="space-y-6">
            {/* Clean Filters Bar - Separated from Table */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-md border border-[#E3E3E4]">
                {/* Search - Left Side */}
                <div className="relative min-w-[350px] flex-1 max-w-lg group">
                    <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-[#0F6CBD] transition-colors">search</span>
                    <input
                        type="text"
                        placeholder="Buscar atendimentos..."
                        className="w-full h-11 !pl-14 pr-4 bg-white border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] outline-none hover:border-gray-300 focus:border-[#0F6CBD] focus:ring-4 focus:ring-[#0F6CBD]/10 transition-all font-jakarta placeholder:text-gray-400 shadow-none hover:shadow-none focus:shadow-none"
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Filters - Right Side */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Seller filter */}
                    <select
                        className="bg-white border border-gray-200 text-xs font-medium text-gray-500 py-2 px-3 rounded-md outline-none cursor-pointer font-jakarta hover:border-gray-300 transition-all"
                        value={sellerFilter}
                        onChange={e => setSellerFilter(e.target.value)}
                    >
                        {sellers.length > 1 && <option value="Todos">Vendedor: Todos</option>}

                        {sellers.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {/* Pedidos Toggle Button */}
                    <button
                        onClick={() => setStatusFilter(statusFilter === 'PEDIDO_ABERTO' ? 'Todos' : 'PEDIDO_ABERTO')}
                        className={`h-9 px-4 rounded-md text-[11px] font-medium uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border ${
                            statusFilter === 'PEDIDO_ABERTO'
                                ? 'bg-[#0F6CBD] text-white border-[#0F6CBD]'
                                : 'bg-white text-[#424242] border-[#E3E3E4] hover:bg-[#F5F5F5]'
                        }`}
                    >
                        <span className="material-icons-outlined text-[16px]">local_shipping</span>
                        Pedidos
                    </button>

                    {/* Status filter */}
                    <select
                        className="bg-white border border-gray-200 text-xs font-medium text-gray-500 py-2 px-3 rounded-md outline-none cursor-pointer font-jakarta hover:border-gray-300 transition-all"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="Todos">Status: Todos</option>
                        {Object.entries(CRM_STATUS_CONFIG).map(([id, cfg]) => (
                            <option key={id} value={id}>{cfg.label}</option>
                        ))}
                    </select>

                    {/* Period filter */}
                    <select
                        className="bg-white border border-gray-200 text-xs font-medium text-gray-500 py-2 px-3 rounded-md outline-none cursor-pointer font-jakarta hover:border-gray-300 transition-all"
                        value={periodFilter}
                        onChange={e => setPeriodFilter(e.target.value)}
                    >
                        <option value="Todos">Período: Todos</option>
                        <option value="Hoje">Hoje</option>
                        <option value="7d">Últimos 7 dias</option>
                        <option value="30d">Últimos 30 dias</option>
                        <option value="Personalizado">Personalizado</option>
                    </select>

                </div>
            </div>

            {/* Custom Date Inputs - only visible when Personalizado is selected */}
            {periodFilter === 'Personalizado' && (
                <div className="flex items-center gap-3 px-6 py-3 bg-white border border-[#E3E3E4] rounded-md animate-in slide-in-from-top-1 duration-200">
                    <span className="text-[10px] font-medium text-[#707070] uppercase">Período Personalizado:</span>
                    <div className="flex items-center gap-2 bg-[#F9FAFB] px-3 py-1.5 rounded-md border border-gray-100">
                        <span className="text-[9px] font-medium text-gray-400">DE:</span>
                        <input
                            type="date"
                            className="bg-transparent border-0 p-0 text-[10px] font-medium text-gray-600 outline-none font-jakarta"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-[#F9FAFB] px-3 py-1.5 rounded-md border border-gray-100">
                        <span className="text-[9px] font-medium text-gray-400">ATÉ:</span>
                        <input
                            type="date"
                            className="bg-transparent border-0 p-0 text-[10px] font-medium text-gray-600 outline-none font-jakarta"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <div className="bg-white rounded-md border border-[#E3E3E4] shadow-none min-h-[600px] flex flex-col">
                <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="border-b border-[#E3E3E4]">
                             <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Status</th>
                             <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Sub Status</th>
                             <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Última Atualiz.</th>
                            <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Prioridade</th>
                            <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Data</th>
                            <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Cliente / Contato</th>
                             <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Item / Projeto</th>
                             <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Acompanhamento</th>
                             <th className="px-4 py-4 text-left text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Vendedor</th>
                            <th className="px-4 py-4 text-right text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-10 text-center text-gray-400 font-medium uppercase text-xs animate-pulse tracking-widest">
                                    Carregando dados da nuvem...
                                </td>
                            </tr>
                        ) : paginatedLeads.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-10 text-center text-gray-400 font-medium uppercase text-xs tracking-widest">
                                    Nenhum atendimento encontrado.
                                </td>
                            </tr>
                        ) : (
                            paginatedLeads.map((lead, index) => (
                                <LeadTableRow
                                    key={lead.id}
                                    index={(currentPage - 1) * pageSize + index}
                                    lead={lead}
                                    onTogglePriority={onTogglePriority}
                                    onUpdateStatus={onUpdateStatus}
                                    onEdit={onEdit}
                                    onTransfer={onTransfer}
                                    onConvertToBudget={onConvertToBudget}
                                    onFinalize={onFinalize}
                                    onMarkAsLost={onMarkAsLost}
                                    openStatusMenuId={openStatusMenuId}
                                    setOpenStatusMenuId={setOpenStatusMenuId}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-[#E3E3E4] flex items-center justify-between bg-gray-50 shrink-0">
                    <span className="text-xs text-gray-500 font-medium">
                        Mostrando <span className="font-bold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> a <span className="font-bold text-gray-900">{Math.min(currentPage * pageSize, leads.length)}</span> de <span className="font-bold text-gray-900">{leads.length}</span> atendimentos
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="material-icons-outlined text-[16px]">chevron_left</span>
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                // Simple sliding window logic for pagination buttons
                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                                                currentPage === page
                                                    ? 'bg-[#0F6CBD] text-white border border-[#0F6CBD]'
                                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                }
                                if (page === currentPage - 2 || page === currentPage + 2) {
                                    return <span key={page} className="text-gray-400 text-xs px-1">...</span>;
                                }
                                return null;
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="material-icons-outlined text-[16px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
);
};

export default CrmTable;
