'use client';

import React from 'react';
import { fixClientName } from '@/utils/textUtils';

interface OrderClientInfoProps {
    clientData: { 
        id: string; 
        name: string; 
        doc: string; 
        phone: string; 
        email: string; 
        emailFin?: string; 
    };
    setClientData: (data: any) => void;
    vendedor: string;
    setVendedor: (v: string) => void;
    dataPedido: string;
    setDataPedido: (d: string) => void;
    dataOrcamento: string;
    setDataOrcamento: (d: string) => void;
    emitente: string;
    setEmitente: (e: string) => void;
    clientsList: any[];
    isSeller: boolean;
    supplierDepartureDate: string;
    setSupplierDepartureDate: (d: string) => void;
}

export default function OrderClientInfo({
    clientData,
    setClientData,
    vendedor,
    setVendedor,
    dataPedido,
    setDataPedido,
    dataOrcamento,
    setDataOrcamento,
    emitente,
    setEmitente,
    clientsList,
    isSeller,
    supplierDepartureDate,
    setSupplierDepartureDate
}: OrderClientInfoProps) {
    const sellers = ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05', 'VENDAS 06'];
    const issuers = ['CRISTAL', 'EDUARDO'];

    return (
        <div className="bg-white rounded-md border border-[#E3E3E4] p-8 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#F0F7FF] text-[#0F6CBD] flex items-center justify-center">
                        <span className="material-icons-outlined">business_center</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-[#111827] uppercase tracking-tight">Informações Gerais</h3>
                        <p className="text-[10px] font-medium text-slate-400">Dados do cliente e faturamento</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Client Selection */}
                <div className="space-y-2">
                    <label className="text-[10px] font-medium text-[#717171] uppercase tracking-tight ml-1">Cliente</label>
                    <select
                        className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none"
                        value={clientData.id}
                        onChange={(e) => {
                            const client = clientsList.find(c => c.id === e.target.value);
                            if (client) setClientData({
                                id: client.id,
                                name: client.name,
                                doc: client.doc,
                                phone: client.phone,
                                email: client.email,
                                emailFin: client.financial_email
                            });
                        }}
                    >
                        <option value="">Selecione um cliente...</option>
                        {clientsList.map(c => (
                            <option key={c.id} value={c.id}>{fixClientName(c.name)}</option>
                        ))}
                    </select>
                </div>

                {/* Salesperson */}
                <div className="space-y-2">
                    <label className="text-[10px] font-medium text-[#717171] uppercase tracking-tight ml-1">Vendedor</label>
                    <select
                        className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none disabled:opacity-60"
                        value={vendedor}
                        onChange={(e) => setVendedor(e.target.value)}
                        disabled={isSeller}
                    >
                        {sellers.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Issuer */}
                <div className="space-y-2">
                    <label className="text-[10px] font-medium text-[#717171] uppercase tracking-tight ml-1">Emitente</label>
                    <select
                        className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none"
                        value={emitente}
                        onChange={(e) => setEmitente(e.target.value)}
                    >
                        {issuers.map(i => (
                            <option key={i} value={i}>{i}</option>
                        ))}
                    </select>
                </div>

                {/* Order Date */}
                <div className="space-y-2">
                    <label className="text-[10px] font-medium text-[#717171] uppercase tracking-tight ml-1">Data do Pedido</label>
                    <input
                        type="date"
                        className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none"
                        value={dataPedido}
                        onChange={(e) => setDataPedido(e.target.value)}
                    />
                </div>

                {/* Budget Date */}
                <div className="space-y-2">
                    <label className="text-[10px] font-medium text-[#717171] uppercase tracking-tight ml-1">Data do Orçamento</label>
                    <input
                        type="date"
                        className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none"
                        value={dataOrcamento}
                        onChange={(e) => setDataOrcamento(e.target.value)}
                    />
                </div>

                {/* Supplier Departure Date */}
                <div className="space-y-2">
                    <label className="text-[10px] font-medium text-[#717171] uppercase tracking-tight ml-1">Saída Fornecedor</label>
                    <input
                        type="date"
                        className="w-full h-12 px-4 bg-[#F0F7FF] border border-[#0F6CBD]/20 rounded-md text-xs font-medium text-[#0F6CBD] focus:ring-4 focus:ring-[#0F6CBD]/10 transition-all outline-none"
                        value={supplierDepartureDate || ''}
                        onChange={(e) => setSupplierDepartureDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Client Quick Details */}
            {clientData.id && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-md border border-slate-100">
                    <div>
                        <p className="text-[8px] font-medium text-slate-400 uppercase">Documento</p>
                        <p className="text-[11px] font-medium text-slate-700">{clientData.doc || '---'}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-medium text-slate-400 uppercase">WhatsApp</p>
                        <p className="text-[11px] font-medium text-slate-700">{clientData.phone || '---'}</p>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-[8px] font-medium text-slate-400 uppercase">E-mail</p>
                        <p className="text-[11px] font-medium text-[#0F6CBD]">{clientData.email || '---'}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
