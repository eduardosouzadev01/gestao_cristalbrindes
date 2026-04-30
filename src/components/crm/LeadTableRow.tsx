'use client';
import React, { useState, useCallback } from 'react';
import { Lead } from '../../hooks/useCRM';
import { CRM_STATUS_CONFIG, getStatusStyle, getSubStatusStyle, SUB_STATUS_CONFIG } from '../../constants/crm';
import { formatDate } from '../../utils/dateUtils';
import { fixClientName } from '../../utils/textUtils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUpdateLead } from '@/hooks/useCRM';

interface LeadTableRowProps {
    lead: Lead;
    onTogglePriority: (lead: Lead) => void;
    onUpdateStatus: (lead: Lead, status: string, subStatus?: string | null) => void;
    onEdit: (lead: Lead) => void;
    onTransfer: (lead: Lead) => void;
    onConvertToBudget: (lead: Lead) => void;
    onFinalize: (lead: Lead) => void;
    onMarkAsLost: (lead: Lead) => void;
    openStatusMenuId: string | null;
    setOpenStatusMenuId: (id: string | null) => void;
    index: number;
}

const getSalespersonInitials = (name?: string) => {
    if (!name) return 'V';
    if (name.toUpperCase().startsWith('VENDAS ')) return 'V' + name.toUpperCase().replace('VENDAS ', '');
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Staleness config: [mediumThresholdMs, farThresholdMs]
const STALENESS_CONFIG: Record<string, [number, number]> = {
    'ATENDIMENTO':     [3 * 60 * 60 * 1000,  5 * 60 * 60 * 1000],  // 3h / 5h
    'PROPOSTA_ENVIADA': [12 * 60 * 60 * 1000, 24 * 60 * 60 * 1000], // 12h / 24h
};

function getStaleness(lead: Lead): 'recent' | 'medium' | 'far' | null {
    const status = lead.atendimento_status || 'ATENDIMENTO';
    const thresholds = STALENESS_CONFIG[status];
    if (!thresholds) return null;

    const lastUpdate = new Date(lead.updated_at || lead.created_at).getTime();
    const elapsed = Date.now() - lastUpdate;

    if (elapsed >= thresholds[1]) return 'far';
    if (elapsed >= thresholds[0]) return 'medium';
    return 'recent';
}

function formatElapsed(lead: Lead): string {
    const lastUpdate = new Date(lead.updated_at || lead.created_at).getTime();
    const elapsed = Date.now() - lastUpdate;
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
}

const STALENESS_STYLE = {
    recent: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Recente' },
    medium: { dot: 'bg-yellow-500 animate-pulse', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Médio' },
    far:    { dot: 'bg-red-500 animate-pulse', badge: 'bg-red-50 text-red-700 border-red-200', label: 'Longe' },
};

const LeadTableRowComponent: React.FC<LeadTableRowProps> = ({
    lead: l,
    onTogglePriority,
    onUpdateStatus,
    onEdit,
    onTransfer,
    onConvertToBudget,
    onFinalize,
    onMarkAsLost,
    openStatusMenuId,
    setOpenStatusMenuId,
    index
}) => {
    const router = useRouter();
    const updateLead = useUpdateLead();
    const [refreshing, setRefreshing] = useState(false);

    const currentStatus = l.atendimento_status || 'ATENDIMENTO';
    const currentSubStatus = l.sub_status || '';
    const statusCfg = getStatusStyle(currentStatus);
    const subStatusCfg = getSubStatusStyle(currentStatus, currentSubStatus);
    const subStatusOptions = SUB_STATUS_CONFIG[currentStatus]?.options || [];

    const staleness = getStaleness(l);
    const stalenessStyle = staleness ? STALENESS_STYLE[staleness] : null;

    const handleRefreshUpdate = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await updateLead.mutateAsync({
                id: l.id,
                updates: { updated_at: new Date().toISOString() } as any
            });
            toast.success('Atualizado agora');
        } catch {
            toast.error('Erro ao atualizar');
        } finally {
            setRefreshing(false);
        }
    }, [l.id, refreshing, updateLead]);

    return (
        <tr
            className={`border-b border-[#E3E3E4] transition-all ${
                index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'
            }`}
        >
            {/* Status Dropdown */}
            <td className="px-4 py-2">
                <div className="relative status-dropdown-container">
                    <button
                        onClick={() => setOpenStatusMenuId(openStatusMenuId === `${l.id}-atend` ? null : `${l.id}-atend`)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-none transition-all hover:brightness-95 active:scale-95 ${statusCfg.colorClass}`}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0"></div>
                        <span className="truncate whitespace-nowrap font-medium uppercase text-[9px] tracking-[0.1em]">{statusCfg.label}</span>
                        <span className="material-icons-outlined text-[13px] opacity-40">expand_more</span>
                    </button>

                    {openStatusMenuId === `${l.id}-atend` && (
                        <div className="absolute z-[200] mt-1 w-60 bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden left-0">
                            <div className="p-2 bg-gray-50 border-b border-gray-100">
                                <span className="text-[9px] font-medium text-gray-400 uppercase tracking-widest pl-1">Alterar Status</span>
                            </div>
                            <div className="p-1.5 space-y-0.5">
                                {Object.entries(CRM_STATUS_CONFIG).map(([id, cfg]) => (
                                    <button
                                        key={id}
                                        onClick={() => { onUpdateStatus(l, id); setOpenStatusMenuId(null); }}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-md hover:bg-gray-50 ${currentStatus === id ? 'bg-gray-50 ring-1 ring-inset ring-gray-200' : ''}`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2.5 h-2.5 rounded-full bg-current ${cfg.colorClass.split(' ')[1]}`}></div>
                                            <span className={`font-medium text-[10px] uppercase tracking-wider ${cfg.colorClass.split(' ')[1]}`}>{cfg.label}</span>
                                        </div>
                                        {currentStatus === id && <span className="material-icons-outlined text-xs text-blue-600">check_circle</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </td>

            {/* Sub Status Dropdown */}
            <td className="px-4 py-2">
                <div className="relative status-dropdown-container">
                    {subStatusOptions.length > 0 ? (
                        <>
                            <button
                                onClick={() => setOpenStatusMenuId(openStatusMenuId === `${l.id}-sub` ? null : `${l.id}-sub`)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all hover:brightness-95 active:scale-95 ${subStatusCfg.colorClass}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${'dotColor' in subStatusCfg ? subStatusCfg.dotColor : 'bg-current opacity-60'}`}></div>
                                <span className="truncate whitespace-nowrap font-medium text-[9px] tracking-[0.05em] max-w-[110px]">{subStatusCfg.label}</span>
                                <span className="material-icons-outlined text-[12px] opacity-60">expand_more</span>
                            </button>

                            {openStatusMenuId === `${l.id}-sub` && (
                                <div className="absolute z-[200] mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden left-0">
                                    <div className="p-2 bg-gray-50 border-b border-gray-100">
                                        <span className="text-[9px] font-medium text-gray-400 uppercase tracking-widest pl-1">Sub Status</span>
                                    </div>
                                    <div className="p-1.5 space-y-0.5">
                                        <button
                                            onClick={() => { onUpdateStatus(l, currentStatus, null); setOpenStatusMenuId(null); }}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-gray-50 ${!currentSubStatus ? 'bg-gray-50 ring-1 ring-inset ring-gray-200' : ''}`}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></div>
                                            <span className="font-medium text-[10px] text-gray-500">Limpar</span>
                                        </button>
                                        {subStatusOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => { onUpdateStatus(l, currentStatus, opt.value); setOpenStatusMenuId(null); }}
                                                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-md hover:bg-gray-50 ${currentSubStatus === opt.value ? 'bg-gray-50 ring-1 ring-inset ring-gray-200' : ''}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`}></div>
                                                    <span className={`font-medium text-[10px] tracking-wide ${opt.colorClass.split(' ')[1]}`}>{opt.label}</span>
                                                </div>
                                                {currentSubStatus === opt.value && <span className="material-icons-outlined text-xs text-blue-600">check_circle</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="text-[10px] text-gray-300 px-2">—</span>
                    )}
                </div>
            </td>

            {/* Última Atualização */}
            <td className="px-4 py-2">
                {stalenessStyle ? (
                    <button
                        onClick={handleRefreshUpdate}
                        title="Clique para marcar como atualizado agora"
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all hover:brightness-90 active:scale-95 ${stalenessStyle.badge}`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${stalenessStyle.dot}`}></div>
                        <span className="font-medium text-[9px] tracking-wide whitespace-nowrap">
                            {refreshing ? '...' : formatElapsed(l)}
                        </span>
                    </button>
                ) : (
                    <span className="text-[10px] text-gray-300 px-2">—</span>
                )}
            </td>

            {/* Priority */}
            <td className="px-4 py-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onTogglePriority(l); }}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-widest transition-all active:scale-95 ${
                        l.priority === 'URGENTE' ? 'bg-red-600 text-white border border-red-700' :
                        l.priority === 'ALTA' ? 'bg-red-50 text-red-600 border border-red-100' :
                        l.priority === 'VIP' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                    title="Clique para alterar prioridade"
                >
                    {l.priority || 'NORMAL'}
                </button>
            </td>

            {/* Date */}
            <td className="px-4 py-4 font-medium text-[#4B5563] tabular-nums text-[13px]">
                {formatDate(l.created_at)}
            </td>

            {/* Client */}
            <td className="px-4 py-2">
                <div className="font-medium text-[#111827] text-[13px] leading-tight uppercase tracking-tight">
                    {fixClientName(l.client_name)}
                    {l.client_contact_name && (
                        <span className="text-[#717171] font-medium ml-1">- {l.client_contact_name}</span>
                    )}
                </div>
            </td>

            {/* Item / Project */}
            <td className="px-4 py-2">
                {l.closing_metadata?.quoted_item ? (
                    <div className="flex items-center gap-1.5">
                        <span className="material-icons-outlined text-[14px] text-blue-500">inventory_2</span>
                        <span className="font-medium text-blue-700 uppercase text-[10px] tracking-tighter truncate max-w-[120px]">
                            {l.closing_metadata.quoted_item}
                        </span>
                    </div>
                ) : (
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">Nenhum item</span>
                )}
            </td>

            {/* Nº Orç. */}
            <td className="px-4 py-2">
                <input
                    type="text"
                    className="w-[80px] bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 text-[11px] font-medium text-gray-700 uppercase p-0 m-0"
                    defaultValue={l.budget_number || ''}
                    placeholder="-"
                    onBlur={async (e) => {
                        if (e.target.value !== (l.budget_number || '')) {
                            const { error } = await supabase.from('crm_leads').update({ budget_number: e.target.value }).eq('id', l.id);
                            if (error) toast.error('Erro ao salvar Nº Orçamento');
                            else toast.success('Nº Orçamento salvo!');
                        }
                    }}
                />
            </td>

            {/* Data Orç. */}
            <td className="px-4 py-2">
                <input
                    type="date"
                    className="w-[110px] bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 text-[11px] font-medium text-gray-700 uppercase p-0 m-0"
                    defaultValue={l.budget_date ? l.budget_date.split('T')[0] : ''}
                    onBlur={async (e) => {
                        const newDate = e.target.value || null;
                        const oldDate = l.budget_date ? l.budget_date.split('T')[0] : null;
                        if (newDate !== oldDate) {
                            const { error } = await supabase.from('crm_leads').update({ budget_date: newDate }).eq('id', l.id);
                            if (error) toast.error('Erro ao salvar Data Orçamento');
                            else toast.success('Data Orçamento salva!');
                        }
                    }}
                />
            </td>

            {/* Salesperson */}
            <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium text-[9px] border border-gray-200">
                        {getSalespersonInitials(l.salesperson)}
                    </div>
                    <span className="font-medium text-gray-800 text-xs truncate max-w-[100px]">{l.salesperson}</span>
                </div>
            </td>

            {/* Quick Actions */}
            <td className="px-4 py-4 text-right">
                <div className="relative group/actions inline-block text-left">
                    <button className="p-1.5 text-gray-400 hover:text-[#0F6CBD] hover:bg-blue-50 rounded-md transition-all opacity-60 group-hover:opacity-100" title="Ações">
                        <span className="material-icons-outlined text-xl">more_vert</span>
                    </button>
                    <div className="absolute right-0 top-full mt-0 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-[100] flex flex-col py-1">
                        <Link
                            href={'/pedidos?clientName=' + encodeURIComponent(l.client_name)}
                            className="w-full px-4 py-2.5 text-left text-[10px] font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2.5 uppercase tracking-widest"
                        >
                            <span className="material-icons-outlined text-[16px]">shopping_bag</span>
                            Ver Pedidos
                        </Link>
                        <Link
                            href={'/orcamentos?clientName=' + encodeURIComponent(l.client_name)}
                            className="w-full px-4 py-2.5 text-left text-[10px] font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-2.5 uppercase tracking-widest"
                        >
                            <span className="material-icons-outlined text-[16px]">request_quote</span>
                            Ver Orçamentos
                        </Link>
                        <div className="h-px w-full bg-gray-100 my-1" />
                        <button
                            onClick={() => onEdit(l)}
                            className="w-full px-4 py-2.5 text-left text-[10px] font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2.5 uppercase tracking-widest"
                        >
                            <span className="material-icons-outlined text-[16px]">edit</span>
                            Editar Detalhes
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onTransfer(l); }}
                            className="w-full px-4 py-2.5 text-left text-[10px] font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2.5 uppercase tracking-widest"
                        >
                            <span className="material-icons-outlined text-[16px]">swap_horiz</span>
                            Transferir Lead
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onConvertToBudget(l); }}
                            className="w-full px-4 py-2.5 text-left text-[10px] font-medium text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-colors flex items-center gap-2.5 uppercase tracking-widest"
                        >
                            <span className="material-icons-outlined text-[16px]">add</span>
                            Novo Orçamento
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );
};

export const LeadTableRow = React.memo(LeadTableRowComponent);
