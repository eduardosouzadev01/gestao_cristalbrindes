'use client';

import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';

interface OrderFinanceInfoProps {
    modalidade: string;
    setModalidade: (m: string) => void;
    opcaoPagamento: string;
    setOpcaoPagamento: (o: string) => void;
    dataLimite: string;
    setDataLimite: (d: string) => void;
    recebimentoEntrada: string;
    setRecebimentoEntrada: (r: string) => void;
    recebimentoRestante: string;
    setRecebimentoRestante: (r: string) => void;
    dataEntrada: string;
    dataRestante: string;
    entryForecastDate: string;
    setEntryForecastDate: (d: string) => void;
    remainingForecastDate: string;
    setRemainingForecastDate: (d: string) => void;
    entradaConfirmed: boolean;
    restanteConfirmed: boolean;
    purchaseOrder: string;
    setPurchaseOrder: (p: string) => void;
    invoiceNumber: string;
    setInvoiceNumber: (i: string) => void;
    totalPedido: number;
    totalCostsReal: number;
    managementApproved: boolean;
    setManagementApproved: (a: boolean) => void;
    deliveryDateExpected: string;
    setDeliveryDateExpected: (d: string) => void;
    deliveryDateActual: string;
    setDeliveryDateActual: (d: string) => void;
    shippingType: string;
    setShippingType: (s: string) => void;
    handleConfirmPayment: (type: 'entrada' | 'restante') => void;
    logs: any[];
    items: any[];
}

export default function OrderFinanceInfo({
    modalidade, setModalidade,
    opcaoPagamento, setOpcaoPagamento,
    dataLimite, setDataLimite,
    recebimentoEntrada, setRecebimentoEntrada,
    recebimentoRestante, setRecebimentoRestante,
    dataEntrada, dataRestante,
    entryForecastDate, setEntryForecastDate,
    remainingForecastDate, setRemainingForecastDate,
    entradaConfirmed,
    restanteConfirmed,
    purchaseOrder, setPurchaseOrder,
    invoiceNumber, setInvoiceNumber,
    totalPedido, totalCostsReal,
    managementApproved, setManagementApproved,
    deliveryDateExpected, setDeliveryDateExpected,
    deliveryDateActual, setDeliveryDateActual,
    shippingType, setShippingType,
    handleConfirmPayment,
    logs,
    items
}: OrderFinanceInfoProps) {
    
    const pagamentos = ['Pix / Dinheiro', 'Cartão de Crédito', 'Boleto 7 dias', 'Boleto 14 dias', 'Boleto 21 dias', 'Boleto 28 dias', 'Outros'];

    return (
        <div className="space-y-6">
            {/* CARD 1: TOTAL GERAL E PARCELAS (Screenshot 1) */}
            <div className="bg-white rounded-md border border-[#E3E3E4] p-8 space-y-8 relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-24 bg-[#0F6CBD]"></div>
                
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-bold text-[#0F6CBD] uppercase tracking-[0.2em]">Total Geral do Pedido</p>
                    <h2 className="text-4xl font-bold text-[#0F6CBD]">{totalPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
                    
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pendente: </span>
                            <span className="text-[9px] font-bold text-[#0F6CBD]">{formatCurrency(totalPedido - (entradaConfirmed ? parseFloat(recebimentoEntrada.replace(/[^\d,]/g, '').replace(',', '.')) : 0) - (restanteConfirmed ? parseFloat(recebimentoRestante.replace(/[^\d,]/g, '').replace(',', '.')) : 0))}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 1ª PARCELA */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="material-icons-outlined text-sm">payments</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest">1ª Parcela</span>
                        </div>
                        <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-6">
                                <input 
                                    className="w-full h-10 px-3 bg-white border border-[#E3E3E4] rounded-md text-xs font-bold text-slate-700 outline-none"
                                    value={recebimentoEntrada}
                                    onBlur={e => setRecebimentoEntrada(formatCurrency(e.target.value))}
                                    onChange={e => setRecebimentoEntrada(e.target.value)}
                                />
                            </div>
                            <div className="col-span-4">
                                <input 
                                    type="date"
                                    className="w-full h-10 px-2 bg-white border border-[#E3E3E4] rounded-md text-[10px] font-bold text-slate-700 outline-none"
                                    value={entryForecastDate}
                                    onChange={e => setEntryForecastDate(e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <button 
                                    onClick={() => handleConfirmPayment('entrada')}
                                    className={`w-full h-10 rounded-md flex items-center justify-center transition-all ${
                                        entradaConfirmed 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                        : 'bg-slate-50 text-slate-300 border border-slate-100 hover:border-emerald-200 hover:text-emerald-500'
                                    }`}
                                >
                                    <span className="material-icons-outlined text-sm">{entradaConfirmed ? 'check_circle' : 'check'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2ª PARCELA */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="material-icons-outlined text-sm">payments</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest">2ª Parcela</span>
                        </div>
                        <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-6">
                                <input 
                                    className="w-full h-10 px-3 bg-white border border-[#E3E3E4] rounded-md text-xs font-bold text-slate-700 outline-none"
                                    value={recebimentoRestante}
                                    onBlur={e => setRecebimentoRestante(formatCurrency(e.target.value))}
                                    onChange={e => setRecebimentoRestante(e.target.value)}
                                />
                            </div>
                            <div className="col-span-4">
                                <input 
                                    type="date"
                                    className="w-full h-10 px-2 bg-white border border-[#E3E3E4] rounded-md text-[10px] font-bold text-slate-700 outline-none"
                                    value={remainingForecastDate}
                                    onChange={e => setRemainingForecastDate(e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <button 
                                    onClick={() => handleConfirmPayment('restante')}
                                    className={`w-full h-10 rounded-md flex items-center justify-center transition-all ${
                                        restanteConfirmed 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                        : 'bg-slate-50 text-slate-300 border border-slate-100 hover:border-emerald-200 hover:text-emerald-500'
                                    }`}
                                >
                                    <span className="material-icons-outlined text-sm">{restanteConfirmed ? 'check_circle' : 'check'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CARD 2: COMERCIAL (Screenshot 3) */}
            <div className="bg-white rounded-md border border-[#E3E3E4] p-8 space-y-8 relative overflow-hidden">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-[#F0F7FF] text-[#0F6CBD] flex items-center justify-center">
                        <span className="material-icons-outlined text-xl">storefront</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Comercial</h3>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Faturamento *</label>
                        <select
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none"
                            value={modalidade}
                            onChange={e => setModalidade(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            <option value="50% 1ª PARCELA">50% 1ª PARCELA</option>
                            <option value="100% ANTECIPADO">100% ANTECIPADO</option>
                            <option value="100% NA ENTREGA">100% NA ENTREGA</option>
                            <option value="BOLETO">BOLETO</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Limite Receb.</label>
                        <input 
                            type="date"
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none"
                            value={dataLimite}
                            onChange={e => setDataLimite(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Nº NF</label>
                        <input 
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none"
                            value={invoiceNumber}
                            onChange={e => setInvoiceNumber(e.target.value)}
                            placeholder="000.000.000"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Req. de Compra</label>
                        <input 
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none"
                            value={purchaseOrder}
                            onChange={e => setPurchaseOrder(e.target.value)}
                            placeholder="Nº da Ordem de C..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Layout</label>
                        <input 
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none"
                            placeholder="Informações de L..."
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
