'use client';

import React from 'react';

interface SummaryBarProps {
    totalRevenue: number;
    totalBV: number;
    totalTaxes: number;
    totalProfit: number;
    itemCount: number;
}

export default function SummaryBar({ totalRevenue, totalBV, totalTaxes, totalProfit, itemCount }: SummaryBarProps) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-[95%] lg:max-w-6xl px-4 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-[#111827] backdrop-blur-xl border border-white/10 rounded-md px-6 py-4 shadow-none flex flex-wrap items-center justify-between text-white gap-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <span className="material-icons-outlined text-blue-400">payments</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Total da Proposta</p>
                        <p className="text-xl font-medium tabular-nums">
                            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>

                <div className="hidden md:block h-10 w-px bg-white/10"></div>

                <div className="flex flex-wrap gap-8">
                    <div>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">BV Acumulado</p>
                        <p className="text-sm font-medium tabular-nums text-orange-400">
                            {totalBV.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Imp. Estimados</p>
                        <p className="text-sm font-medium tabular-nums text-blue-400">
                            {totalTaxes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Lucro do Pedido</p>
                        <p className="text-sm font-medium tabular-nums text-emerald-400">
                            {totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>

                <div className="h-10 w-px bg-white/10"></div>

                <div className="text-right">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Itens</p>
                    <p className="text-xl font-medium tabular-nums text-blue-400">{itemCount}</p>
                </div>
            </div>
        </div>
    );
}
