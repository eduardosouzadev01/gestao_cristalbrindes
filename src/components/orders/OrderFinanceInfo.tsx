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
    setDataEntrada: (d: string) => void;
    dataRestante: string;
    setDataRestante: (d: string) => void;
    entradaConfirmed: boolean;
    setEntradaConfirmed: (c: boolean) => void;
    restanteConfirmed: boolean;
    setRestanteConfirmed: (c: boolean) => void;
    purchaseOrder: string;
    setPurchaseOrder: (p: string) => void;
    invoiceNumber: string;
    setInvoiceNumber: (i: string) => void;
    totalPedido: number;
    totalCostsReal: number;
}

export default function OrderFinanceInfo({
    modalidade, setModalidade,
    opcaoPagamento, setOpcaoPagamento,
    dataLimite, setDataLimite,
    recebimentoEntrada, setRecebimentoEntrada,
    recebimentoRestante, setRecebimentoRestante,
    dataEntrada, setDataEntrada,
    dataRestante, setDataRestante,
    entradaConfirmed, setEntradaConfirmed,
    restanteConfirmed, setRestanteConfirmed,
    purchaseOrder, setPurchaseOrder,
    invoiceNumber, setInvoiceNumber,
    totalPedido, totalCostsReal
}: OrderFinanceInfoProps) {
    
    const modalidades = ['Pedido Local', 'Faturamento Direto', 'BV / Comissão'];
    const pagamentos = ['Pix / Dinheiro', 'Cartão de Crédito', 'Boleto 7 dias', 'Boleto 14 dias', 'Boleto 21 dias', 'Boleto 28 dias', 'Outros'];

    return (
        <div className="bg-white rounded-md border border-[#E3E3E4] p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <span className="material-icons-outlined">account_balance_wallet</span>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-[#111827] uppercase tracking-tight">Financeiro</h3>
                    <p className="text-[10px] font-medium text-slate-400">Controle de pagamentos e prazos</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Billing Summary */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-md border border-slate-100">
                        <p className="text-[9px] font-medium text-slate-400 uppercase mb-1">Total Pedido</p>
                        <p className="text-sm font-medium text-slate-700">{totalPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-md border border-emerald-100">
                        <p className="text-[9px] font-medium text-emerald-600 uppercase mb-1">Custo Total</p>
                        <p className="text-sm font-medium text-emerald-700">{totalCostsReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Modalidade</label>
                        <select
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                            value={modalidade}
                            onChange={e => setModalidade(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Forma de Pagamento</label>
                        <select
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                            value={opcaoPagamento}
                            onChange={e => setOpcaoPagamento(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {pagamentos.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                {/* Entry Payment Section */}
                <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">Entrada (50%)</h5>
                        <div className="flex items-center gap-2">
                             <input 
                                type="checkbox"
                                checked={entradaConfirmed}
                                onChange={e => setEntradaConfirmed(e.target.checked)}
                                className="w-4 h-4 rounded-md border-slate-300 text-[#0F6CBD] focus:ring-[#0F6CBD]"
                            />
                            <span className="text-[10px] font-medium text-slate-500">Confirmado</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input 
                            className="h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                            value={recebimentoEntrada}
                            onBlur={e => setRecebimentoEntrada(formatCurrency(e.target.value))}
                            onChange={e => setRecebimentoEntrada(e.target.value)}
                        />
                        <input 
                            type="date"
                            className="h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                            value={dataEntrada}
                            onChange={e => setDataEntrada(e.target.value)}
                        />
                    </div>
                </div>

                {/* Remaining Payment Section */}
                <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">Restante</h5>
                         <div className="flex items-center gap-2">
                             <input 
                                type="checkbox"
                                checked={restanteConfirmed}
                                onChange={e => setRestanteConfirmed(e.target.checked)}
                                className="w-4 h-4 rounded-md border-slate-300 text-[#0F6CBD] focus:ring-[#0F6CBD]"
                            />
                            <span className="text-[10px] font-medium text-slate-500">Confirmado</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input 
                            className="h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                            value={recebimentoRestante}
                            onBlur={e => setRecebimentoRestante(formatCurrency(e.target.value))}
                            onChange={e => setRecebimentoRestante(e.target.value)}
                        />
                        <input 
                            type="date"
                            className="h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                            value={dataRestante}
                            onChange={e => setDataRestante(e.target.value)}
                        />
                    </div>
                </div>

                {/* Purchase Order & Invoice */}
                <div className="pt-4 grid grid-cols-2 gap-3 border-t border-slate-50">
                    <div className="space-y-1">
                        <label className="text-[9px] font-medium text-slate-400 uppercase">Ordem de Compra</label>
                        <input
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                            value={purchaseOrder}
                            onChange={e => setPurchaseOrder(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-medium text-slate-400 uppercase">Nota Fiscal</label>
                        <input
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                            value={invoiceNumber}
                            onChange={e => setInvoiceNumber(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
