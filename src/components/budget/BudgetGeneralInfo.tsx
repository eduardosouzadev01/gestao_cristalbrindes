'use client';

import React from 'react';

interface BudgetGeneralInfoProps {
    budgetNumber: string;
    salesperson: string;
    setSalesperson: (v: string) => void;
    status: string;
    setStatus: (v: string) => void;
    budgetDate: string;
    setBudgetDate: (v: string) => void;
    issuer: string;
    setIssuer: (v: string) => void;
    isLocked?: boolean;
}

export default function BudgetGeneralInfo({
    budgetNumber,
    salesperson,
    setSalesperson,
    status,
    setStatus,
    budgetDate,
    setBudgetDate,
    issuer,
    setIssuer,
    isLocked
}: BudgetGeneralInfoProps) {
    return (
        <div className="bg-white p-6 rounded-md border border-slate-300 shadow-none font-sans h-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-slate-800 text-lg">info</span>
                    <h3 className="text-[10px] font-medium text-slate-800 uppercase tracking-wider">Geral</h3>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 tracking-wider ml-1">Orçamento Nº</label>
                    <input 
                        type="text"
                        readOnly
                        value={budgetNumber}
                        className="w-full h-11 px-3 bg-white border border-slate-300 rounded-md text-[13px] font-medium text-slate-800 outline-none"
                    />
                </div>
                <div className="col-span-1">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 tracking-wider ml-1">Vendedor</label>
                    <select
                        disabled={true}
                        value={salesperson}
                        onChange={(e) => setSalesperson(e.target.value)}
                        className="w-full h-11 px-3 bg-[#F9FAFB] border border-slate-300 rounded-md text-[12px] font-medium text-slate-500 outline-none cursor-not-allowed"
                    >
                        <option value="">Selecione</option>
                        <option value="EDUARDO SOUZA">EDUARDO SOUZA</option>
                        <option value="VENDAS 01">VENDAS 01</option>
                        <option value="VENDAS 02">VENDAS 02</option>
                        <option value="VENDAS 03">VENDAS 03</option>
                        <option value="VENDAS 04">VENDAS 04</option>
                        <option value="VENDAS 05">VENDAS 05</option>
                    </select>
                </div>

                <div className="col-span-1">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 tracking-wider ml-1">Status</label>
                    <div className="relative">
                        <select
                            disabled={isLocked}
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={`w-full h-11 px-3 border rounded-md text-[12px] font-medium outline-none focus:ring-4 transition-all cursor-pointer appearance-none ${
                                status === 'EM ABERTO' ? 'bg-blue-50 border-blue-100 text-blue-700 focus:ring-blue-100/50' :
                                status === 'EM ANDAMENTO' ? 'bg-[#EFF6FF] border-[#DBEAFE] text-[#1D4ED8] focus:ring-[#DBEAFE]/50' :
                                status === 'PROPOSTA ENVIADA' ? 'bg-amber-50 border-amber-100 text-amber-700 focus:ring-amber-100/50' :
                                status === 'PROPOSTA ACEITA' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 focus:ring-emerald-100/50' :
                                status === 'PEDIDO GERADO' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 focus:ring-emerald-100/50' :
                                status === 'CANCELADO' ? 'bg-rose-50 border-rose-100 text-rose-700 focus:ring-rose-100/50' :
                                'bg-[#F9FAFB] border-[#E3E3E4] text-[#111827] focus:ring-[#0F6CBD]/10'
                            }`}
                        >
                            <option value="EM ABERTO">EM ABERTO</option>
                            <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                            <option value="PROPOSTA ENVIADA">PROPOSTA ENVIADA</option>
                            <option value="PROPOSTA ACEITA">PROPOSTA ACEITA</option>
                            <option value="PEDIDO GERADO">PEDIDO GERADO</option>
                            <option value="CANCELADO">CANCELADO</option>
                            <option value="PERDIDO">PERDIDO</option>
                        </select>
                        <span className="material-icons-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] opacity-40 pointer-events-none">expand_more</span>
                    </div>
                </div>

                <div className="col-span-1">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 tracking-wider ml-1">Data de Criação</label>
                    <div className="relative">
                        <input 
                            type="date"
                            value={budgetDate}
                            onChange={(e) => setBudgetDate(e.target.value)}
                            className="w-full h-11 px-3 bg-white border border-slate-300 rounded-md text-[12px] font-medium text-[#111827] outline-none focus:bg-white transition-all cursor-pointer"
                        />
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1.5 tracking-wider ml-1">CNPJ / Emitente</label>
                    <div className="flex p-1 bg-white border border-slate-300 rounded-md gap-1">
                        {['CRISTAL', 'ESPÍRITO', 'NATUREZA'].map((choice) => (
                            <button
                                key={choice}
                                onClick={() => setIssuer(choice)}
                                className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                                    issuer === choice 
                                    ? 'bg-white text-[#0F6CBD] shadow-none border border-[#E3E3E4]' 
                                    : 'text-[#717171] hover:bg-white/50'
                                }`}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
