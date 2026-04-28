'use client';

import React from 'react';
import { formatDate } from '@/utils/dateUtils';

interface TransferTableProps {
    requests: any[];
    loading: boolean;
    onRespond: (requestId: string, approved: boolean) => void;
}

const TransferTable: React.FC<TransferTableProps> = ({ requests, loading, onRespond }) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#0F6CBD] rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest animate-pulse">Carregando solicitações...</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-md border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <span className="material-icons-outlined text-3xl text-slate-300">swap_horiz</span>
                </div>
                <h3 className="text-slate-900 font-medium text-lg">Nenhuma solicitação de troca</h3>
                <p className="text-slate-500 text-sm">Não há pedidos de transferência pendentes no momento.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-white rounded-md shadow-none-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E0E0E0]">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E0E0E0]">
                        <th className="px-6 py-4 text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em]">Data Solicitação</th>
                        <th className="px-6 py-4 text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em]">Cliente</th>
                        <th className="px-6 py-4 text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em]">De (Solicitante)</th>
                        <th className="px-6 py-4 text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em]">Para (Destino)</th>
                        <th className="px-6 py-4 text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em]">Motivo</th>
                        <th className="px-6 py-4 text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                    {requests.map((req) => (
                        <tr key={req.id} className="hover:bg-[#F9FAFB] transition-all">
                            <td className="px-6 py-5 text-[13px] font-medium text-[#616161]">
                                {formatDate(req.created_at)}
                            </td>
                            <td className="px-6 py-5">
                                <span className="font-medium text-[#242424] text-[13px] uppercase">
                                    {req.lead?.client_name || 'N/A'}
                                </span>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-medium text-slate-500">
                                        {req.requester?.name?.[0] || 'S'}
                                    </div>
                                    <span className="text-[12px] font-medium text-[#424242]">{req.requester?.name || 'Solicitante'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#EBF3FC] flex items-center justify-center text-[10px] font-medium text-[#0F6CBD]">
                                        {req.target?.name?.[0] || 'D'}
                                    </div>
                                    <span className="text-[12px] font-medium text-[#0F6CBD] font-jakarta">{req.target?.name || 'Destino'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 max-w-xs">
                                <p className="text-[12px] text-[#707070] italic truncate">"{req.reason || 'Sem motivo informado'}"</p>
                            </td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => onRespond(req.id, true)}
                                        className="flex items-center gap-2 bg-[#F0F7FF] hover:bg-[#D1E9FF] text-[#0F6CBD] px-4 py-2 rounded-md font-medium text-[10px] transition-all uppercase tracking-wider border border-[#D1E9FF]"
                                    >
                                        <span className="material-icons-outlined text-sm">check</span>
                                        Aprovar
                                    </button>
                                    <button 
                                        onClick={() => onRespond(req.id, false)}
                                        className="flex items-center gap-2 bg-[#FFF1F2] hover:bg-[#FECDD3] text-[#BC2F32] px-4 py-2 rounded-md font-medium text-[10px] transition-all uppercase tracking-wider border border-[#F6A2A5]"
                                    >
                                        <span className="material-icons-outlined text-sm">close</span>
                                        Rejeitar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TransferTable;
