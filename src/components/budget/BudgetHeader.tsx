'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface BudgetHeaderProps {
    budgetNumber: string;
    status: string;
    onSave: () => void;
    onDuplicate: () => void;
    onGenerateOrder: () => void;
    onGenerateProposal: () => void;
    onViewProposal?: () => void;
    isSaving?: boolean;
}

export default function BudgetHeader({ 
    budgetNumber, 
    status, 
    onSave, 
    onDuplicate, 
    onGenerateOrder,
    onGenerateProposal,
    onViewProposal,
    isSaving 
}: BudgetHeaderProps) {
    const router = useRouter();

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'EM ABERTO': return 'bg-blue-100 text-blue-700';
            case 'PROPOSTA GERADA':
            case 'PROPOSTA ENVIADA': return 'bg-amber-100 text-amber-700';
            case 'PROPOSTA ACEITA': return 'bg-emerald-100 text-emerald-700';
            case 'PERDIDO': return 'bg-rose-100 text-rose-700';
            default: return 'bg-slate-100 text-slate-700';
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

                <div className="flex bg-amber-50 rounded-md border border-amber-200">
                    {['PROPOSTA GERADA', 'PROPOSTA ENVIADA', 'PROPOSTA ACEITA', 'PEDIDO GERADO'].includes(status) ? (
                        <button 
                            onClick={onViewProposal || onGenerateProposal}
                            className="flex items-center gap-2 px-4 py-2.5 text-amber-700 text-[10px] font-medium uppercase tracking-widest hover:bg-amber-100 transition-all active:scale-95"
                        >
                            <span className="material-icons-outlined text-lg">visibility</span>
                            VER PROPOSTA
                        </button>
                    ) : (
                        <button 
                            onClick={onGenerateProposal}
                            className="flex items-center gap-2 px-4 py-2.5 text-amber-700 text-[10px] font-medium uppercase tracking-widest hover:bg-amber-100 transition-all active:scale-95"
                        >
                            <span className="material-icons-outlined text-lg">description</span>
                            GERAR PROPOSTA
                        </button>
                    )}
                </div>

                <button 
                    onClick={onGenerateOrder}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#0F6CBD] text-white text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all active:scale-95"
                >
                    <span className="material-icons-outlined text-sm">rocket_launch</span>
                    Gerar Pedido
                </button>
            </div>
        </div>
    );
}
