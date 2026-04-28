'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { calculateItemTotal, calculateItemRealTotal } from '@/utils/formulas';

interface OrderItemCardProps {
    item: any;
    index: number;
    updateItem: (id: string | number, field: string, value: any) => void;
    removeItem: (id: string | number) => void;
    duplicateItem: (item: any) => void;
    suppliersList: any[];
    productsList: any[];
    factorsList: any[];
}

export default function OrderItemCard({
    item,
    index,
    updateItem,
    removeItem,
    duplicateItem,
    suppliersList,
    productsList,
    factorsList
}: OrderItemCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const totalVenda = calculateItemTotal(item);
    const totalCusto = calculateItemRealTotal(item);
    const margem = totalVenda - totalCusto;

    return (
        <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden transition-all hover:shadow-none hover:shadow-none-slate-200/50">
            {/* Header: Click to collapse/expand */}
            <div 
                className={`p-4 flex items-center justify-between cursor-pointer border-b border-transparent transition-all ${isExpanded ? 'bg-slate-50 border-slate-100' : 'bg-white'}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-400">
                        {index + 1}
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-[#111827] uppercase tracking-tight">
                            {item.productName || 'Escolha um Produto...'}
                        </h4>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] font-medium text-slate-400">{item.quantity} un × {formatCurrency(item.priceUnit * item.fator)}</span>
                            <span className="text-slate-200">|</span>
                            <span className="text-[10px] font-medium text-[#0F6CBD] uppercase">{totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); duplicateItem(item); }}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-[#0F6CBD] transition-all"
                    >
                        <span className="material-icons-outlined text-sm">content_copy</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                    >
                        <span className="material-icons-outlined text-sm">delete</span>
                    </button>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-md text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <span className="material-icons-outlined text-sm">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Section: Product & Sales Info */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-[#242424]">
                                <span className="material-icons-outlined text-[#0F6CBD] text-sm">sell</span>
                                <h5 className="text-[10px] font-medium uppercase tracking-tight">Venda e Especificações</h5>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Produto</label>
                                    <input 
                                        className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] outline-none transition-all uppercase"
                                        value={item.productName}
                                        onChange={e => updateItem(item.id, 'productName', e.target.value)}
                                        placeholder="Nome do produto"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Quantidade</label>
                                    <input 
                                        type="number"
                                        className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                                        value={item.quantity}
                                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Preço Unit. (Custo)</label>
                                    <input 
                                        type="number" step="0.01"
                                        className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                                        value={item.priceUnit}
                                        onChange={e => updateItem(item.id, 'priceUnit', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Fator</label>
                                    <input 
                                        type="number" step="0.01"
                                        className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                                        value={item.fator}
                                        onChange={e => updateItem(item.id, 'fator', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">P. Venda Final</label>
                                    <div className="w-full h-10 px-3 bg-white border border-[#E3E3E4] rounded-md flex items-center text-xs font-medium text-[#0F6CBD]">
                                        {formatCurrency(item.priceUnit * item.fator)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Costs & Margins (Financial) */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-[#242424]">
                                <span className="material-icons-outlined text-[#16A34A] text-sm">payments</span>
                                <h5 className="text-[10px] font-medium uppercase tracking-tight">Custos Reais e Margem</h5>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Fornecedor Principal</label>
                                    <select
                                        className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 outline-none"
                                        value={item.supplier_id}
                                        onChange={e => updateItem(item.id, 'supplier_id', e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-slate-400 uppercase ml-1">Custo Real Unitário</label>
                                    <input 
                                        type="number" step="0.01"
                                        className="w-full h-10 px-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-md text-xs font-medium text-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/5 outline-none"
                                        value={item.realPriceUnit || item.priceUnit}
                                        onChange={e => updateItem(item.id, 'realPriceUnit', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="p-4 bg-slate-50 rounded-md border border-slate-100 flex justify-between items-center">
                                    <span className="text-[9px] font-medium text-slate-400 uppercase">Total Pedido</span>
                                    <span className="text-sm font-medium text-slate-700">{totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="p-4 bg-[#F0FDF4] rounded-md border border-[#DCFCE7] flex justify-between items-center">
                                    <span className="text-[9px] font-medium text-[#15803D] uppercase">Margem (Saldo)</span>
                                    <span className={`text-sm font-medium ${margem >= 0 ? 'text-[#16A34A]' : 'text-rose-600'}`}>
                                        {margem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Action: Detailed Costs */}
                    <div className="pt-4 border-t border-slate-50">
                        <p className="text-[10px] font-medium text-slate-400 italic">Mais detalhes de custos (frete, personalização, etc) disponíveis no modo de edição avançado.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
