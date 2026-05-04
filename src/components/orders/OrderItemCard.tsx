'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';
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
    addLog: (msg: string) => void;
}

export default function OrderItemCard({
    item,
    index,
    updateItem,
    removeItem,
    duplicateItem,
    suppliersList,
    productsList,
    factorsList,
    addLog
}: OrderItemCardProps) {
    const { hasPermission } = useAuth();
    const [isExpanded, setIsExpanded] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{show: boolean, label: string, cost: number, dateField: string, paidField: string, supplierName?: string} | null>(null);
    const [realPriceInput, setRealPriceInput] = useState(formatCurrency(item.realPriceTotal || 0));
    
    React.useEffect(() => {
        setRealPriceInput(formatCurrency(item.realPriceTotal || 0));
    }, [item.realPriceTotal]);

    const totalVenda = calculateItemTotal(item);
    const totalCustoPrevisto = calculateItemRealTotal({ ...item, realPriceUnit: 0, realCustomizationCost: 0, realSupplierTransportCost: 0, realClientTransportCost: 0, realExtraExpense: 0, realLayoutCost: 0 }); 
    const totalCustoReal = calculateItemRealTotal(item);
    
    const saldoPrevisto = totalVenda - totalCustoPrevisto;
    const saldoReal = totalVenda - totalCustoReal;
    const imposto = totalVenda * 0.14;

    const normalizeImageUrl = (url: any) => {
        if (!url || typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (trimmed.startsWith('http')) return trimmed;
        if (trimmed.startsWith('//')) return `https:${trimmed}`;
        if (trimmed.includes('cdn.xbzbrindes.com.br')) return `https://${trimmed.replace(/^https?:\/\//, '')}`;
        if (trimmed.startsWith('/img/') || trimmed.startsWith('img/')) return `https://cdn.xbzbrindes.com.br${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
        if (trimmed.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
            if (!trimmed.includes('/')) return `https://cdn.xbzbrindes.com.br/img/produtos/3/${trimmed}`;
            return `https://cdn.xbzbrindes.com.br/${trimmed.replace(/^\//, '')}`;
        }
        return trimmed;
    };

    const handleConfirmPayment = () => {
        if (!confirmModal) return;
        const { label, dateField, paidField, cost } = confirmModal;
        const today = new Date().toISOString().split('T')[0];
        updateItem(item.id, paidField, true);
        updateItem(item.id, dateField, today);
        addLog(`Pagamento ${label} (Item ${index + 1}) Confirmado - Valor: ${formatCurrency(cost)}`);
        setConfirmModal(null);
    };

    const CostRow = ({ label, budgetCost, realCost, paid, supplierId, dateField, paidField, supplierField, realCostField, isUnitCost, quantity }: any) => {
        const [inputValue, setInputValue] = useState(formatCurrency(isUnitCost ? (realCost / (quantity || 1)) : realCost));
        React.useEffect(() => {
            setInputValue(formatCurrency(isUnitCost ? (realCost / (quantity || 1)) : realCost));
        }, [realCost, isUnitCost, quantity]);

        const supplierName = suppliersList.find(s => s.id === supplierId)?.name || 'N/A';
        const currentDateValue = item[dateField] || '';
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end py-3 border-b border-slate-50 last:border-0">
                <div className="md:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                    <select 
                        className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none focus:border-[#0F6CBD]"
                        value={supplierId || ''}
                        onChange={e => updateItem(item.id, supplierField, e.target.value)}
                    >
                        <option value="">Selecione...</option>
                        {suppliersList.map((s, idx) => <option key={`sup-${s.id}-${idx}`} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                
                <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Previsto</label>
                    <div className="h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md flex items-center justify-end text-[11px] font-bold text-slate-500">
                        {formatCurrency(budgetCost)}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Real</label>
                    <div className="relative">
                        <input 
                            className="w-full h-10 pl-3 pr-8 bg-white border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none focus:border-[#0F6CBD]"
                            value={inputValue}
                            onChange={e => {
                                const raw = e.target.value.replace(/[^\d]/g, '');
                                const val = parseFloat(raw) / 100 || 0;
                                setInputValue(formatCurrency(val));
                                if ((window as any)._updateTimeout) clearTimeout((window as any)._updateTimeout);
                                (window as any)._updateTimeout = setTimeout(() => {
                                    updateItem(item.id, realCostField, isUnitCost ? (val * (quantity || 1)) : val);
                                }, 400);
                            }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons-outlined text-slate-200 text-xs">edit</span>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Data Prevista para Pagamento</label>
                    <input 
                        type="date"
                        className="w-full h-10 px-3 bg-white border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none focus:border-[#0F6CBD]"
                        value={currentDateValue}
                        onChange={e => updateItem(item.id, dateField, e.target.value)}
                    />
                </div>

                <div className="md:col-span-2 flex flex-col items-center gap-1">
                    <button 
                        onClick={() => {
                            if (paid) {
                                updateItem(item.id, paidField, false);
                            } else {
                                const raw = inputValue.replace(/[^\d]/g, '');
                                const val = parseFloat(raw) / 100 || 0;
                                setConfirmModal({ show: true, label, cost: isUnitCost ? (val * (quantity || 1)) : val, dateField, paidField, supplierName });
                            }
                        }}
                        className={`w-full h-10 rounded-md flex items-center justify-center border transition-all ${
                            paid 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-slate-50 text-slate-300 border-slate-100 hover:border-emerald-200 hover:text-emerald-500'
                        }`}
                    >
                        <span className="material-icons-outlined text-xl">{paid ? 'check_circle' : 'check'}</span>
                        <span className="text-[9px] font-bold uppercase ml-2">{paid ? 'Pago' : 'Confirmar'}</span>
                    </button>
                    {paid && <span className="text-[8px] font-bold text-emerald-500 tabular-nums">{currentDateValue.split('-').reverse().join('/')}</span>}
                </div>
            </div>
        );
    };

    const SummaryRow = ({ label, previsto, real }: any) => (
        <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-2.5 rounded border border-slate-100">
                    <span className="text-[8px] text-slate-400 block uppercase">Previsto</span>
                    <span className="text-[12px] font-bold text-slate-500 tabular-nums">{formatCurrency(previsto)}</span>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-100">
                    <span className="text-[8px] text-slate-400 block uppercase">Real</span>
                    <span className="text-[12px] font-black text-slate-800 tabular-nums">{formatCurrency(real)}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden transition-all shadow-sm">
            {/* Header */}
            <div 
                className={`p-4 flex items-center justify-between cursor-pointer border-b border-transparent transition-all ${isExpanded ? 'bg-slate-50 border-slate-100' : 'bg-white'}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {index + 1}
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-[#111827] uppercase tracking-tight">
                            {item.productName || 'Escolha um Produto...'} {item.productCode ? ` - ${item.productCode}` : ''}
                        </h4>
                    </div>
                </div>
                <div className={`w-8 h-8 flex items-center justify-center rounded-md text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <span className="material-icons-outlined text-sm">expand_more</span>
                </div>
            </div>

            {isExpanded && (
                <div className="p-8 space-y-10">
                    <div className="flex flex-col lg:flex-row gap-10">
                        {/* Image */}
                        <div className="w-44 h-44 bg-white rounded-md border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {(item.imageUrl || item.productImage || item.product_image_url) ? (
                                <img 
                                    src={normalizeImageUrl(item.productImage || item.product_image_url || item.imageUrl)} 
                                    alt="Produto" 
                                    className="w-full h-full object-contain p-2" 
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.xbzbrindes.com.br/img/placeholder.png'; }}
                                />
                            ) : (
                                <span className="material-icons-outlined text-slate-100 text-6xl">inventory_2</span>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-icons-outlined text-sm">event_upcoming</span> Saída Fornecedor (Prevista)
                                    </label>
                                    <input 
                                        type="date"
                                        className="w-full h-10 px-3 bg-white border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none focus:border-[#0F6CBD]"
                                        value={item.supplier_departure_date || ''}
                                        onChange={e => updateItem(item.id, 'supplier_departure_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-icons-outlined text-sm">event_available</span> Limite Cliente
                                    </label>
                                    <input 
                                        type="date"
                                        className="w-full h-10 px-3 bg-white border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none focus:border-[#0F6CBD]"
                                        value={item.client_limit_date || ''}
                                        onChange={e => updateItem(item.id, 'client_limit_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Core Production Cost Row */}
                            <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                    <div className="md:col-span-3 space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fornecedor Produto</label>
                                        <select 
                                            className="w-full h-10 px-3 bg-white border border-[#E3E3E4] rounded-md text-[10px] font-bold text-slate-700 outline-none focus:border-[#0F6CBD]"
                                            value={item.supplier_id || ''}
                                            onChange={e => updateItem(item.id, 'supplier_id', e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {suppliersList.map((s, idx) => <option key={`sup-${s.id}-${idx}`} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Qtd.</label>
                                        <div className="h-10 px-3 bg-white border border-[#E3E3E4] rounded-md flex items-center text-[11px] font-bold text-slate-700">{item.quantity}</div>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Custo Unit. Real</label>
                                        <div className="relative">
                                            <input 
                                                className="w-full h-10 pl-3 pr-8 bg-white border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none focus:border-[#0F6CBD]"
                                                value={realPriceInput}
                                                onChange={e => {
                                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                                    const val = parseFloat(raw) / 100 || 0;
                                                    setRealPriceInput(formatCurrency(val));
                                                    if ((window as any)._priceUpdateTimeout) clearTimeout((window as any)._priceUpdateTimeout);
                                                    (window as any)._priceUpdateTimeout = setTimeout(() => { updateItem(item.id, 'realPriceTotal', val); }, 500);
                                                }}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons-outlined text-slate-200 text-xs">edit</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-3 space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Data Prevista Pagamento</label>
                                        <input 
                                            type="date"
                                            className="w-full h-10 px-3 bg-white border border-[#E3E3E4] rounded-md text-[11px] font-bold text-slate-700 outline-none"
                                            value={item.supplier_payment_date || ''}
                                            onChange={e => updateItem(item.id, 'supplier_payment_date', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex flex-col items-center gap-1">
                                        <button 
                                            onClick={() => {
                                                if (item.unit_price_paid) {
                                                    updateItem(item.id, 'unit_price_paid', false);
                                                } else {
                                                    setConfirmModal({ 
                                                        show: true, 
                                                        label: 'Custo do Produto', 
                                                        cost: item.realPriceTotal || 0, 
                                                        dateField: 'supplier_payment_date', 
                                                        paidField: 'unit_price_paid',
                                                        supplierName: suppliersList.find(s => s.id === item.supplier_id)?.name
                                                    });
                                                }
                                            }}
                                            className={`w-full h-10 rounded-md flex items-center justify-center border transition-all ${
                                                item.unit_price_paid 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                                                : 'bg-white text-slate-300 border-slate-200 hover:border-emerald-200 hover:text-emerald-500'
                                            }`}
                                        >
                                            <span className="material-icons-outlined text-xl">{item.unit_price_paid ? 'check_circle' : 'check'}</span>
                                            <span className="text-[9px] font-bold uppercase ml-2">{item.unit_price_paid ? 'Pago' : 'Confirmar'}</span>
                                        </button>
                                        {item.unit_price_paid && <span className="text-[8px] font-bold text-emerald-500 tabular-nums">{(item.supplier_payment_date || '').split('-').reverse().join('/')}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Costs */}
                    <div className="space-y-4 pt-8 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-icons-outlined text-[#0F6CBD] text-sm">local_shipping</span>
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Custos de Terceiros e Logística</h5>
                        </div>
                        <CostRow label="Personalização" budgetCost={item.custoPersonalizacao * item.quantity} realCost={item.realCustomizationCost * item.quantity} paid={item.customization_paid} supplierId={item.customization_supplier_id} dateField="customization_payment_date" paidField="customization_paid" supplierField="customization_supplier_id" realCostField="realCustomizationCost" isUnitCost={true} quantity={item.quantity} />
                        <CostRow label="Pagamento Layout" budgetCost={item.layoutCost} realCost={item.realLayoutCost} paid={item.layout_paid} supplierId={item.layout_supplier_id} dateField="layout_payment_date" paidField="layout_paid" supplierField="layout_supplier_id" realCostField="realLayoutCost" />
                        <CostRow label="Frete Fornecedor" budgetCost={item.transpFornecedor} realCost={item.realSupplierTransportCost} paid={item.supplier_transport_paid} supplierId={item.transport_supplier_id} dateField="transport_payment_date" paidField="supplier_transport_paid" supplierField="transport_supplier_id" realCostField="realSupplierTransportCost" />
                        <CostRow label="Despesa Extra" budgetCost={item.despesaExtra} realCost={item.realExtraExpense} paid={item.extra_expense_paid} supplierId={item.extra_supplier_id} dateField="extra_payment_date" paidField="extra_expense_paid" supplierField="extra_supplier_id" realCostField="realExtraExpense" />
                    </div>

                    {/* Management Financial Summary */}
                    {hasPermission('gestao') && (
                        <div className="bg-[#F8F9FA] rounded-md border border-[#E3E3E4] p-6 mt-8">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-[#005A9E] flex items-center justify-center text-white"><span className="material-icons-outlined">analytics</span></div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 uppercase">Resumo de Custos</h4>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Rentabilidade Real vs Prevista</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 items-center">
                                    <div>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase block">Imposto (14%)</span>
                                        <span className="text-xs font-black text-rose-500 tabular-nums">{formatCurrency(imposto)}</span>
                                    </div>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                    <div>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase block">BV ({(item.bv_pct || item.bv || 0)}%)</span>
                                        <span className="text-xs font-black text-[#0F6CBD] tabular-nums">{formatCurrency(totalVenda * ((item.bv_pct || item.bv || 0) / 100))}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <SummaryRow label="Produto" previsto={(item.priceUnit || 0) * (item.quantity || 0)} real={item.realPriceTotal || (item.realPriceUnit || 0) * (item.quantity || 0)} />
                                    <SummaryRow label="Personalização" previsto={(item.custoPersonalizacao || 0) * (item.quantity || 0)} real={(item.realCustomizationCost || 0) * (item.quantity || 0)} />
                                    <SummaryRow label="Frete Fornecedor" previsto={item.transpFornecedor || 0} real={item.realSupplierTransportCost || 0} />
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-white rounded border border-slate-100">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Saldo Previsto</span>
                                            <span className="text-base font-black text-slate-700 tabular-nums">{formatCurrency(saldoPrevisto)}</span>
                                        </div>
                                        <div className={`p-3 rounded border ${saldoReal >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Saldo Real</span>
                                            <span className={`text-base font-black tabular-nums ${saldoReal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(saldoReal)}</span>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Margem Real (%)</span>
                                            <span className={`text-xs font-black ${saldoReal / totalVenda >= 0.15 ? 'text-emerald-500' : 'text-rose-500'}`}>{((saldoReal / totalVenda) * 100).toFixed(2)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-500 ${saldoReal / totalVenda >= 0.15 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(0, (saldoReal / totalVenda) * 100))}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Item Total Footer */}
                    <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Valor Venda Unitário</span>
                            <span className="text-base font-bold text-slate-700">{formatCurrency(totalVenda / (item.quantity || 1))}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-[#0F6CBD] uppercase tracking-widest block mb-1">Total Geral do Item</span>
                            <span className="text-4xl font-black text-[#0F6CBD] tracking-tighter tabular-nums">{formatCurrency(totalVenda)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION MODAL */}
            {confirmModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Confirmar Pagamento</h3>
                            <button onClick={() => setConfirmModal(null)} className="text-slate-300 hover:text-slate-600 transition-colors"><span className="material-icons-outlined">close</span></button>
                        </div>
                        <div className="p-10 flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shadow-inner"><span className="material-icons-outlined text-4xl">monetization_on</span></div>
                            <div className="space-y-4">
                                <p className="text-[13px] font-medium text-slate-600 leading-relaxed">Confirma o pagamento de <span className="font-bold text-slate-800">{confirmModal.label}</span>?</p>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                                    <div className="flex justify-between text-[11px]"><span className="text-slate-400 uppercase font-bold">Fornecedor:</span><span className="text-slate-700 font-bold">{confirmModal.supplierName}</span></div>
                                    <div className="flex justify-between text-[11px]"><span className="text-slate-400 uppercase font-bold">Valor a Pagar:</span><span className="text-[#0F6CBD] font-black">{formatCurrency(confirmModal.cost)}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex gap-4">
                            <button onClick={() => setConfirmModal(null)} className="flex-1 h-12 bg-white border border-[#E3E3E4] text-[11px] font-bold text-slate-500 uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all active:scale-95">Cancelar</button>
                            <button onClick={handleConfirmPayment} className="flex-1 h-12 bg-[#3B82F6] text-white text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#2563EB] transition-all shadow-md shadow-blue-500/20 active:scale-95">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
