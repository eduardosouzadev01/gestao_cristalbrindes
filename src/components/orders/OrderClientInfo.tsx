'use client';

import React from 'react';
import { fixClientName } from '@/utils/textUtils';
import { SELLERS } from '@/constants/crm';


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
    emitente: string;
    setEmitente: (e: string) => void;
    clientsList: any[];
    isSeller: boolean;
    supplierDepartureDate: string;
    setSupplierDepartureDate: (d: string) => void;
    orderNumber: string;
}

export default function OrderClientInfo({
    clientData,
    setClientData,
    vendedor,
    setVendedor,
    dataPedido,
    setDataPedido,
    emitente,
    setEmitente,
    clientsList,
    isSeller,
    supplierDepartureDate,
    setSupplierDepartureDate,
    orderNumber
}: OrderClientInfoProps) {
    
    const getIssuerCNPJ = (name: string) => {
        const n = name.toUpperCase();
        if (n.includes('CRISTAL')) return '00.000.000/0001-00'; // Exemplo, ajuste se necessário
        if (n.includes('ESPIRITO')) return '11.111.111/0001-11';
        if (n.includes('NATUREZA')) return '22.222.222/0001-22';
        return '---';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* INFORMAÇÕES GERAIS */}
            <div className="bg-white rounded-md border border-[#E3E3E4] p-6 space-y-6 relative overflow-hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#F0F7FF] text-[#0F6CBD] flex items-center justify-center shadow-sm">
                        <span className="material-icons-outlined text-xl">assignment</span>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-[#111827] uppercase tracking-tight">Informações Gerais</h3>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Dados do faturamento e controle</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendedor</label>
                        <select
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none disabled:opacity-60"
                            value={vendedor}
                            onChange={(e) => setVendedor(e.target.value)}
                            disabled={isSeller}
                        >
                            {SELLERS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emitente</label>
                        <select
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none"
                            value={emitente}
                            onChange={(e) => setEmitente(e.target.value)}
                        >
                            <option value="CRISTAL BRINDES">CRISTAL BRINDES</option>
                            <option value="ESPIRITO BRINDES">ESPIRITO BRINDES</option>
                            <option value="NATUREZA BRINDES">NATUREZA BRINDES</option>
                            <option value="SEM NF">SEM NF</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Número do Pedido</label>
                        <div className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-500 flex items-center">
                            #{orderNumber || '---'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data do Pedido</label>
                        <input
                            type="date"
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none"
                            value={dataPedido}
                            onChange={(e) => setDataPedido(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Saída Fornecedor</label>
                        <input
                            type="date"
                            className="w-full h-10 px-3 bg-blue-50 border border-blue-100 rounded-md text-[11px] font-bold text-[#0F6CBD] focus:ring-2 focus:ring-[#0F6CBD]/10 transition-all outline-none"
                            value={supplierDepartureDate || ''}
                            onChange={(e) => setSupplierDepartureDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">CNPJ Emitente</label>
                        <div className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-500 flex items-center">
                            {getIssuerCNPJ(emitente)}
                        </div>
                    </div>
                </div>
            </div>

            {/* DADOS DO CLIENTE */}
            <div className="bg-white rounded-md border border-[#E3E3E4] p-6 space-y-6 relative overflow-hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center shadow-sm">
                        <span className="material-icons-outlined text-xl">person</span>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-[#111827] uppercase tracking-tight">Dados do Cliente</h3>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Informações de contato e faturamento</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Empresa / Nome</label>
                        <select
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all outline-none"
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

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                        <div className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 flex items-center gap-2 overflow-hidden">
                            <span className="material-icons-outlined text-sm text-emerald-500 flex-shrink-0">whatsapp</span>
                            <span className="truncate">{clientData.phone || '---'}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">CNPJ / CPF Cliente</label>
                        <div className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 flex items-center">
                            {clientData.doc || '---'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail Principal</label>
                        <div className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-[#0F6CBD] flex items-center overflow-hidden">
                            <span className="truncate">{clientData.email || '---'}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail Financeiro</label>
                        <div className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-[#0F6CBD] flex items-center overflow-hidden">
                            <span className="truncate">{clientData.emailFin || '---'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
