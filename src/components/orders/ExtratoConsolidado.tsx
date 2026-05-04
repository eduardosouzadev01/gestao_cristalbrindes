'use client';

import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';

interface ExtratoConsolidadoProps {
    items: any[];
    totalPedido: number;
}

export default function ExtratoConsolidado({ items, totalPedido }: ExtratoConsolidadoProps) {
    return (
        <div className="bg-white rounded-md border border-[#E3E3E4] p-8 space-y-8 relative overflow-hidden">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-[#F0F7FF] text-[#0F6CBD] flex items-center justify-center">
                    <span className="material-icons-outlined text-xl">receipt_long</span>
                </div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Extrato Consolidado</h3>
            </div>

            <div className="space-y-4">
                {items.map((item, i) => (
                    <div key={`extrato-${item.id || 'new'}-${i}`} className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-300">{i + 1}</span>
                                <p className="text-[11px] font-bold text-slate-700 uppercase truncate max-w-[180px]">{item.productName || 'Produto sem nome'}</p>
                            </div>
                            <p className="text-[9px] font-medium text-slate-400 ml-4">{item.quantity} UN @ {formatCurrency(item.priceUnit * (item.fator || 1.29))}</p>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700">{formatCurrency(item.quantity * item.priceUnit * (item.fator || 1.29))}</p>
                    </div>
                ))}

                <div className="pt-6 space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Pedido</p>
                    <p className="text-4xl font-bold text-[#3B82F6]">{totalPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>
        </div>
    );
}
