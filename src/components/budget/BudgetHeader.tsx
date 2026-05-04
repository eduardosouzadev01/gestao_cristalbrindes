'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface BudgetHeaderProps {
    budgetNumber: string;
    status: string;
    onSave: () => void;
    onDuplicate: () => void;
    onGenerateOrder: () => void;
    onGenerateProposal: () => void;
    onViewProposal?: () => void;
    onDeleteProposal?: (id: string) => void;
    onDeleteBudget?: () => void;
    onExportExcel?: () => void;
    isViewOnly?: boolean;
    isSaving?: boolean;
    proposalId?: string | null;
    proposals?: any[];
    orderId?: string | null;
}

export default function BudgetHeader({ 
    budgetNumber, 
    status, 
    onSave, 
    onDuplicate, 
    onGenerateOrder,
    onGenerateProposal,
    onViewProposal,
    onDeleteProposal,
    onDeleteBudget,
    onExportExcel,
    isSaving,
    proposalId,
    proposals = [],
    orderId
}: BudgetHeaderProps) {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const [showProposals, setShowProposals] = React.useState(false);

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'EM ABERTO':
            case 'ORÇAMENTO GERADO':
            case 'PROPOSTA GERADA':
            case 'PROPOSTA ENVIADA': return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
            case 'PROPOSTA ACEITA':
            case 'ORÇAMENTO APROVADO': return 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]';
            case 'PERDIDO': return 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    return (
        <div className="bg-white border-b border-[#E3E3E4] px-6 py-4 flex justify-between items-center transition-all">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center rounded-md bg-[#F9FAFB] text-[#707070] border border-[#E3E3E4] hover:bg-gray-50 transition-all active:scale-90"
                >
                    <span className="material-icons-outlined text-lg">arrow_back</span>
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-medium text-[#111827] uppercase tracking-tight">Orçamento {budgetNumber}</h1>
                        <span className={`text-[10px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-md ${getStatusColor(status)}`}>
                            {status}
                        </span>
                    </div>
                    <p className="text-[10px] font-medium text-[#707070] uppercase tracking-tighter mt-0.5">Gestão de Proposta Comercial</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={onDuplicate}
                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#E3E3E4] text-[#707070] text-[10px] font-medium uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                    <span className="material-icons-outlined text-lg">content_copy</span>
                    Duplicar
                </button>
                
                <button 
                    onClick={() => onSave()}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#111827] text-white text-[10px] font-medium uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                >
                    {isSaving ? (
                        <span className="material-icons-outlined animate-spin text-sm">sync</span>
                    ) : (
                        <span className="material-icons-outlined text-sm">save</span>
                    )}
                    {isSaving ? 'Salvando...' : 'Salvar'}
                </button>

                <button 
                    onClick={onExportExcel}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#E3E3E4] text-[#707070] text-[10px] font-medium uppercase tracking-widest hover:bg-[#F0FDF4] hover:text-[#10B981] hover:border-[#10B981] transition-all active:scale-95 shadow-none"
                >
                    <span className="material-icons-outlined text-sm">table_chart</span>
                    Excel Base
                </button>
                
                {hasPermission('adm') && (
                    <button 
                        onClick={onDeleteBudget}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-red-200 text-red-500 text-[10px] font-medium uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95 shadow-none"
                    >
                        <span className="material-icons-outlined text-sm">delete</span>
                        Excluir
                    </button>
                )}

                <div className="relative">
                    <button 
                        onClick={() => setShowProposals(!showProposals)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-medium uppercase tracking-widest border border-amber-200 rounded-md hover:bg-amber-100 transition-all active:scale-95"
                    >
                        <span className="material-icons-outlined text-lg">description</span>
                        Propostas ({proposals.length})
                        <span className="material-icons-outlined text-sm">{showProposals ? 'expand_less' : 'expand_more'}</span>
                    </button>

                    {showProposals && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowProposals(false)}></div>
                            <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E3E3E4] rounded-md shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-3 bg-[#F9FAFB] border-b border-[#E3E3E4] flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Propostas Geradas</span>
                                    <button 
                                        onClick={onGenerateProposal}
                                        className="text-[9px] font-bold text-[#0F6CBD] uppercase tracking-widest hover:underline"
                                    >
                                        + Gerar Nova
                                    </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {proposals.length === 0 ? (
                                        <div className="p-4 text-center text-[10px] text-slate-400 uppercase">Nenhuma proposta gerada</div>
                                    ) : (
                                        proposals.map((prop: any) => (
                                            <div key={prop.id} className="group p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 flex items-center justify-between gap-3">
                                                <Link 
                                                    href={`/propostas/${prop.id}`}
                                                    className="flex-1 min-w-0"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-semibold text-slate-700">#{prop.proposal_number}</span>
                                                        <span className="text-[9px] text-slate-400">{new Date(prop.created_at).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                    <div className="text-[9px] text-[#0F6CBD] font-medium mt-0.5 truncate">
                                                        Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.total_amount)}
                                                    </div>
                                                </Link>
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onDeleteProposal?.(prop.id);
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <span className="material-icons-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {orderId ? (
                    <Link 
                        href={`/pedidos/${orderId}`}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#10B981] text-white text-[10px] font-medium uppercase tracking-widest hover:bg-[#059669] transition-all active:scale-95"
                    >
                        <span className="material-icons-outlined text-sm">visibility</span>
                        Ver Pedido
                    </Link>
                ) : (
                    <button 
                        onClick={onGenerateOrder}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#0F6CBD] text-white text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all active:scale-95"
                    >
                        <span className="material-icons-outlined text-sm">rocket_launch</span>
                        Gerar Pedido
                    </button>
                )}
            </div>
        </div>
    );
}
