'use client';

import React from 'react';

interface OrderHeaderProps {
    orderNumber: string;
    status: string;
    isSaving: boolean;
    onSave: () => void;
    onStatusUpdate: (status: string) => void;
    onBack: () => void;
    onPrint?: () => void;
}

export default function OrderHeader({ 
    orderNumber, 
    status, 
    isSaving, 
    onSave, 
    onStatusUpdate,
    onBack,
    onPrint
}: OrderHeaderProps) {
    const statusOptions = [
        'AGUARDANDO PAGAMENTO ENTRADA', 'EM PRODUÇÃO', 'EM TRANSPORTE', 'EM CONFERÊNCIA',
        'AGUARDANDO PAGAMENTO 2 PARCELA', 'ENTREGUE', 'AGUARDANDO PAGAMENTO FATURAMENTO', 'FINALIZADO', 'CANCELADO'
    ];

    return (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#E3E3E4] px-4 sm:px-8 py-4">
            <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center rounded-md bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100"
                    >
                        <span className="material-icons-outlined text-xl">arrow_back</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-medium text-[#111827] tracking-tight">Pedido #{orderNumber || 'Novo'}</h1>
                            <div className="relative group">
                                <select
                                    value={status}
                                    onChange={(e) => onStatusUpdate(e.target.value)}
                                    className={`text-[10px] font-medium px-3 py-1 rounded-full uppercase tracking-widest appearance-none outline-none border-none cursor-pointer transition-all ${
                                        status === 'ENTREGUE' || status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-700' :
                                        status === 'CANCELADO' ? 'bg-rose-100 text-rose-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}
                                >
                                    {statusOptions.map(opt => (
                                        <option key={opt} value={opt} className="bg-white text-slate-700">{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {onPrint && (
                        <button
                            onClick={onPrint}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#E3E3E4] text-[#707070] text-[10px] font-medium uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 bg-white"
                        >
                            <span className="material-icons-outlined text-lg">print</span>
                            Imprimir
                        </button>
                    )}
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#0F6CBD] text-white rounded-md text-xs font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-none shadow-none-[#0F6CBD]/20"
                    >
                        {isSaving ? (
                            <span className="material-icons-outlined animate-spin text-sm">sync</span>
                        ) : (
                            <span className="material-icons-outlined text-sm">save</span>
                        )}
                        Salvar Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}
