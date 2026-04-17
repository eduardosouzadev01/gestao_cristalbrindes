import React, { useState } from 'react';
import { Lead } from '../../hooks/useCRM';
import { CRM_STATUS_CONFIG, getStatusStyle } from '../../../pages/ManagementPage';
import { formatDate } from '../../utils/dateUtils';
import { fixClientName } from '../../utils/textUtils';
import { useNavigate } from 'react-router-dom';

interface LeadTableRowProps {
    lead: Lead;
    onTogglePriority: (lead: Lead) => void;
    onUpdateStatus: (lead: Lead, status: string) => void;
    onEdit: (lead: Lead) => void;
    onTransfer: (lead: Lead) => void;
    onConvertToBudget: (lead: Lead) => void;
    openStatusMenuId: string | null;
    setOpenStatusMenuId: (id: string | null) => void;
    supabase: any;
}

const LeadTableRowComponent: React.FC<LeadTableRowProps> = ({
    lead: l,
    onTogglePriority,
    onUpdateStatus,
    onEdit,
    onTransfer,
    onConvertToBudget,
    openStatusMenuId,
    setOpenStatusMenuId,
    supabase
}) => {
    const navigate = useNavigate();

    const getSalespersonInitials = (name?: string) => {
        if (!name) return 'V';
        if (name.toUpperCase().startsWith('VENDAS ')) return 'V' + name.toUpperCase().replace('VENDAS ', '');
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <tr className="hover:bg-blue-50/30 transition-colors group">
            <td className="px-6 py-4">
                <div className="relative status-dropdown-container">
                    <button 
                        onClick={() => setOpenStatusMenuId(openStatusMenuId === `${l.id}-atend` ? null : `${l.id}-atend`)}
                        className={`flex items-center justify-between w-full min-w-[150px] text-[11px] font-black uppercase tracking-tighter rounded-md py-2 px-3 outline-none transition-all shadow-md border ${
                            getStatusStyle(l.atendimento_status || 'ATENDIMENTO').colorClass
                        }`}
                    >
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="material-icons-outlined text-[14px] opacity-70">{getStatusStyle(l.atendimento_status || 'ATENDIMENTO').icon}</span>
                            <span className="truncate">{getStatusStyle(l.atendimento_status || 'ATENDIMENTO').label}</span>
                        </div>
                        <span className="material-icons-outlined text-[14px] opacity-50 ml-1">expand_more</span>
                    </button>

                    {openStatusMenuId === `${l.id}-atend` && (
                        <div className="absolute z-[100] mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 left-0">
                            <div className="p-2 bg-gray-50 border-b border-gray-100">
                                <span className="text-[9px] font-black pointer-events-none text-gray-400 uppercase tracking-widest pl-1">Alterar Atendimento</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                                {Object.entries(CRM_STATUS_CONFIG).map(([id, cfg]) => (
                                    <button 
                                        key={id} 
                                        onClick={() => {
                                            onUpdateStatus(l, id);
                                            setOpenStatusMenuId(null);
                                        }}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left rounded-lg transition-all hover:scale-[1.02] active:scale-95 ${cfg.colorClass} border border-transparent hover:border-current/20`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/50 shadow-inner">
                                                <span className="material-icons-outlined text-[16px]">{cfg.icon}</span>
                                            </div>
                                            <span className="font-black text-[11px] uppercase tracking-wider">{cfg.label}</span>
                                        </div>
                                        {(l.atendimento_status || 'ATENDIMENTO') === id && <span className="material-icons-outlined text-sm opacity-50">check</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                <button 
                    onClick={(e) => { e.stopPropagation(); onTogglePriority(l); }}
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                        l.priority === 'URGENTE' ? 'bg-red-600 text-white border border-red-700 shadow-sm' :
                        l.priority === 'ALTA' ? 'bg-red-50 text-red-600 border border-red-100' :
                        l.priority === 'VIP' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                    title="Clique para alterar prioridade"
                >
                    {l.priority || 'NORMAL'}
                </button>
            </td>
            <td className="px-6 py-4 font-bold text-gray-600 tabular-nums">
                {formatDate(l.created_at)}
            </td>
            <td className="px-6 py-4">
                <div className="font-black text-gray-950 text-base line-clamp-1">{fixClientName(l.client_name)}</div>
                <div className="text-xs font-bold text-gray-500">{l.client_contact_name || l.client_phone}</div>
            </td>
            <td className="px-6 py-4">
                {l.closing_metadata?.quoted_item ? (
                    <div className="flex items-center gap-1.5">
                        <span className="material-icons-outlined text-[14px] text-blue-500">inventory_2</span>
                        <span className="font-black text-blue-700 uppercase text-[10px] tracking-tighter truncate max-w-[120px]">{l.closing_metadata.quoted_item}</span>
                    </div>
                ) : (
                    <span className="text-gray-300 italic text-[11px]">Não informado</span>
                )}
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-black text-[9px] border border-gray-200">
                        {getSalespersonInitials(l.salesperson)}
                    </div>
                    <span className="font-black text-gray-800 text-xs truncate max-w-[100px]">{l.salesperson}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/pedidos', { state: { clientName: l.client_name } }); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Ver Pedidos do Cliente"
                    >
                        <span className="material-icons-outlined text-lg">shopping_bag</span>
                    </button>
                    <button 
                        onClick={async (e) => { 
                            e.stopPropagation(); 
                            let clientId = ''; 
                            const conditions = []; 
                            if (l.client_doc) conditions.push(`doc.eq."${l.client_doc.replace(/"/g, '""')}"`); 
                            if (l.client_email) conditions.push(`email.eq."${l.client_email.replace(/"/g, '""')}"`); 
                            if (l.client_phone) conditions.push(`phone.eq."${l.client_phone.replace(/"/g, '""')}"`); 
                            const safeClientName = l.client_name.replace(/"/g, '""');
                            if (conditions.length === 0) conditions.push(`name.ilike."%${safeClientName}%"`);
                            const { data } = await supabase.from('partners').select('id').or(conditions.join(',')).eq('type', 'CLIENTE').limit(1);
                            if (data && data.length > 0) clientId = data[0].id;
                            navigate('/orcamentos', { state: { clientName: l.client_name, clientId: clientId } });
                        }}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Ver Orçamentos do Cliente"
                    >
                        <span className="material-icons-outlined text-lg">request_quote</span>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                    <button 
                        onClick={() => onEdit(l)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar Detalhes"
                    >
                        <span className="material-icons-outlined text-lg">edit</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTransfer(l); }}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        title="Transferir Atendimento"
                    >
                        <span className="material-icons-outlined text-lg">swap_horiz</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onConvertToBudget(l); }}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        title="Gerar Novo Orçamento"
                    >
                        <span className="material-icons-outlined text-lg">add</span>
                    </button>
                </div>
            </td>
        </tr>
    );
};

export const LeadTableRow = React.memo(LeadTableRowComponent);
