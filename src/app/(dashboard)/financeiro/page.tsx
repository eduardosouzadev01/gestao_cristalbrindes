'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/formatCurrency';
import { toast } from 'sonner';
import { calculateItemTotal, calculateItemRealTotal } from '@/utils/formulas';
import { Search, CheckCircle2, Calendar, Filter, Download, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function FinanceiroPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterIssuer, setFilterIssuer] = useState('ALL');
    const [filterSalesperson, setFilterSalesperson] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [confirmingPayment, setConfirmingPayment] = useState<{itemId: string, field: string, dateField: string, label: string, value: number} | null>(null);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('order_items')
                .select(`
                    *,
                    orders (
                        id,
                        order_number,
                        order_date,
                        issuer,
                        salesperson,
                        client_id,
                        client_name:partners (name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (err: any) {
            console.error('Fetch error:', err);
            toast.error('Erro ao carregar dados financeiros');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItem = async (itemId: string, updates: any) => {
        try {
            setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...updates } : it));
            const { error } = await supabase
                .from('order_items')
                .update(updates)
                .eq('id', itemId);
            if (error) {
                fetchItems();
                throw error;
            }
        } catch (err: any) {
            console.error('Update error:', err);
            toast.error('Erro ao atualizar item');
        }
    };

    const filteredItems = useMemo(() => {
        return items.filter(it => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === '' || 
                it.product_name?.toLowerCase().includes(search) ||
                it.orders?.client_name?.name?.toLowerCase().includes(search) ||
                it.orders?.order_number?.toLowerCase().includes(search);
            const matchesIssuer = filterIssuer === 'ALL' || it.orders?.issuer === filterIssuer;
            const matchesSalesperson = filterSalesperson === 'ALL' || it.orders?.salesperson === filterSalesperson;
            const orderDate = it.orders?.order_date ? new Date(it.orders.order_date) : null;
            const matchesStartDate = !startDate || (orderDate && orderDate >= new Date(startDate));
            const matchesEndDate = !endDate || (orderDate && orderDate <= new Date(endDate));
            return matchesSearch && matchesIssuer && matchesSalesperson && matchesStartDate && matchesEndDate;
        });
    }, [items, searchTerm, filterIssuer, filterSalesperson, startDate, endDate]);

    const totals = useMemo(() => {
        return filteredItems.reduce((acc, it) => {
            const totalVenda = calculateItemTotal(it);
            const totalCustoReal = calculateItemRealTotal(it);
            const saldo = totalVenda - totalCustoReal;
            const imposto = totalVenda * ((it.tax_pct || 14) / 100);

            // Calcula valores pagos (somente o que está marcado como paid)
            let pago = 0;
            if (it.unit_price_paid) pago += (it.real_unit_price || it.unit_price || 0) * it.quantity;
            if (it.supplier_transport_paid) pago += (it.real_supplier_transport_cost || it.supplier_transport_cost || 0);
            if (it.client_transport_paid) pago += (it.real_client_transport_cost || it.client_transport_cost || 0);
            if (it.extra_expense_paid) pago += (it.real_extra_expense || it.extra_expense || 0);
            if (it.customization_paid) pago += (it.real_customization_cost || it.customization_cost || 0);

            return {
                venda: acc.venda + totalVenda,
                custo: acc.custo + totalCustoReal,
                saldo: acc.saldo + saldo,
                imposto: acc.imposto + imposto,
                pago: acc.pago + pago,
                recebido: acc.recebido + totalVenda, // Recebido total (venda)
                count: acc.count + 1
            };
        }, { venda: 0, custo: 0, saldo: 0, imposto: 0, pago: 0, recebido: 0, count: 0 });
    }, [filteredItems]);

    const handleConfirmPayment = (itemId: string, paidField: string, dateField: string) => {
        const today = new Date().toISOString().split('T')[0];
        handleUpdateItem(itemId, { [paidField]: true, [dateField]: today });
        setConfirmingPayment(null);
        toast.success('Pagamento confirmado!');
    };

    const salespeople = Array.from(new Set(items.map(it => it.orders?.salesperson).filter(Boolean)));

    const ConfirmPaymentButton = ({ itemId, paidField, dateField, isPaid, paymentDate, value, label }: any) => (
        <div className="flex flex-col items-center">
            {isPaid ? (
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase">
                        <CheckCircle2 size={10} />
                        PAGO
                    </div>
                    {paymentDate && (
                        <span className="text-[8px] text-slate-400 font-bold tabular-nums mt-0.5">
                            {paymentDate.split('-').reverse().join('/')}
                        </span>
                    )}
                    <button 
                        onClick={() => handleUpdateItem(itemId, { [paidField]: false, [dateField]: null })}
                        className="text-[7px] text-slate-300 hover:text-rose-500 font-bold uppercase mt-0.5 transition-colors"
                    >
                        Estornar
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setConfirmingPayment({ itemId, field: paidField, dateField, label: `Confirmar ${label}?`, value })}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white text-slate-400 border border-slate-200 text-[9px] font-bold hover:border-emerald-300 hover:text-emerald-600 transition-all shadow-sm"
                >
                    <CheckCircle2 size={10} />
                    Confirmar
                </button>
            )}
        </div>
    );

    const CurrencyInput = ({ value, onSave }: { value: number, onSave: (val: number) => void }) => {
        const [localValue, setLocalValue] = useState(formatCurrency(value));
        useEffect(() => { setLocalValue(formatCurrency(value)); }, [value]);
        return (
            <input 
                className="w-24 h-8 px-2 text-[10px] font-bold text-slate-700 border border-slate-100 rounded focus:border-[#0F6CBD] outline-none text-right transition-colors"
                value={localValue}
                onChange={e => {
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    const val = parseFloat(raw) / 100 || 0;
                    setLocalValue(formatCurrency(val));
                }}
                onBlur={() => {
                    const raw = localValue.replace(/[^\d]/g, '');
                    const val = parseFloat(raw) / 100 || 0;
                    if (val !== value) onSave(val);
                }}
            />
        );
    };

    const DateInput = ({ value, label, onSave }: { value: string, label?: string, onSave: (val: string) => void }) => (
        <div className="flex flex-col gap-1">
            {label && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>}
            <input 
                type="date"
                className="h-8 px-1 text-[10px] font-bold text-slate-600 border border-slate-100 rounded focus:border-[#0F6CBD] outline-none bg-slate-50/50"
                value={value || ''}
                onChange={e => onSave(e.target.value)}
            />
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 bg-slate-50/30 min-h-screen">
            {/* HEADER AND FILTERS */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Grade Financeira Itemizada</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Fluxo de Caixa e Pagamentos por Item</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={fetchItems}
                            className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-wider"
                        >
                            <Filter size={14} />
                            Filtrar
                        </button>
                        <button className="h-10 px-4 bg-[#0F6CBD] text-white rounded-lg hover:bg-[#084e8a] transition-all shadow-lg shadow-[#0F6CBD]/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                            <Download size={14} />
                            Exportar
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-end">
                    <div className="flex-1 min-w-[300px]">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-1 tracking-widest">Busca Geral</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0F6CBD] transition-colors pointer-events-none">
                                <Search size={16} />
                            </div>
                            <input 
                                type="text"
                                placeholder="Pedido, cliente ou produto..."
                                className="pl-10 pr-4 h-11 w-full bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-[#0F6CBD] focus:ring-4 focus:ring-[#0F6CBD]/5 transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-1 tracking-widest">Empresa</label>
                        <select 
                            className="h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-[#0F6CBD]"
                            value={filterIssuer}
                            onChange={e => setFilterIssuer(e.target.value)}
                        >
                            <option value="ALL">Todas</option>
                            <option value="CRISTAL">Cristal</option>
                            <option value="NATUREZA">Natureza</option>
                            <option value="ESPIRITO">Espirito</option>
                            <option value="SEM NF">Sem NF</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-1 tracking-widest">Vendedor</label>
                        <select 
                            className="h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-[#0F6CBD]"
                            value={filterSalesperson}
                            onChange={e => setFilterSalesperson(e.target.value)}
                        >
                            <option value="ALL">Todos</option>
                            {salespeople.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-1 tracking-widest">Início</label>
                            <input 
                                type="date"
                                className="px-3 h-11 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-[#0F6CBD]"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-1 tracking-widest">Fim</label>
                            <input 
                                type="date"
                                className="px-3 h-11 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-[#0F6CBD]"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[3600px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Data</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Pedido</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Cliente</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Empresa</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Vendedor</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Produto</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Qtd</th>
                            
                            {/* CUSTOS */}
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right bg-slate-100/30">Custo Unit.</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right bg-slate-100/30">Custo Total</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Frete Forn.</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Frete Cli.</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Custo Extra</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Personalização</th>
                            
                            {/* FINANCEIRO */}
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">BV (%)</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Imposto</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Venda Unit.</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Venda Total</th>
                            
                            {/* PARCELAS */}
                            <th className="px-4 py-4 text-[10px] font-black text-[#0F6CBD] uppercase tracking-wider text-right border-l border-slate-200 bg-blue-50/20">1ª Parc. (R$)</th>
                            <th className="px-4 py-4 text-[10px] font-black text-[#0F6CBD] uppercase tracking-wider bg-blue-50/20">Data 1ª Parc.</th>
                            <th className="px-4 py-4 text-[10px] font-black text-[#0F6CBD] uppercase tracking-wider text-right bg-blue-50/20">2ª Parc. (R$)</th>
                            <th className="px-4 py-4 text-[10px] font-black text-[#0F6CBD] uppercase tracking-wider bg-blue-50/20">Data 2ª Parc.</th>
                            
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.map((it) => {
                            const totalVenda = calculateItemTotal(it);
                            const totalCustoReal = calculateItemRealTotal(it);
                            const saldo = totalVenda - totalCustoReal;
                            const totalCustoProd = (it.real_unit_price || it.unit_price || 0) * it.quantity;

                            return (
                                <tr key={it.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                    <td className="px-4 py-4 text-[11px] text-slate-500 font-medium tabular-nums">
                                        {it.orders?.order_date ? new Date(it.orders.order_date).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-black text-[#0F6CBD]">
                                        {it.orders?.order_number || '#AUTO'}
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-bold text-slate-700 truncate max-w-[150px]">
                                        {it.orders?.client_name?.name || '---'}
                                    </td>
                                    <td className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase">
                                        {it.orders?.issuer || 'CRISTAL'}
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-bold text-slate-600 uppercase">
                                        {it.orders?.salesperson || '-'}
                                    </td>
                                    <td className="px-4 py-4 text-[11px] text-slate-600 truncate max-w-[250px]">
                                        {it.product_name}
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-black text-slate-800 text-center">
                                        {it.quantity}
                                    </td>

                                    <td className="px-4 py-4 text-right bg-slate-50/30">
                                        <CurrencyInput 
                                            value={it.real_unit_price || it.unit_price || 0} 
                                            onSave={(val) => handleUpdateItem(it.id, { real_unit_price: val })}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-right bg-slate-50/30 space-y-2">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="flex flex-col items-end">
                                                <div className="text-[11px] font-black text-slate-800 tabular-nums">
                                                    {formatCurrency(totalCustoProd)}
                                                </div>
                                                <DateInput 
                                                    label="Previsto"
                                                    value={it.supplier_payment_date} 
                                                    onSave={(val) => handleUpdateItem(it.id, { supplier_payment_date: val })}
                                                />
                                            </div>
                                            <ConfirmPaymentButton 
                                                itemId={it.id} 
                                                paidField="unit_price_paid" 
                                                dateField="supplier_payment_date"
                                                isPaid={it.unit_price_paid} 
                                                paymentDate={it.supplier_payment_date}
                                                value={totalCustoProd}
                                                label="Custo do Produto"
                                            />
                                        </div>
                                    </td>
                                    
                                    <td className="px-4 py-4 text-right space-y-2">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="flex flex-col items-end gap-1">
                                                <CurrencyInput 
                                                    value={it.real_supplier_transport_cost || it.supplier_transport_cost || 0} 
                                                    onSave={(val) => handleUpdateItem(it.id, { real_supplier_transport_cost: val })}
                                                />
                                                <DateInput 
                                                    label="Previsto"
                                                    value={it.transport_payment_date} 
                                                    onSave={(val) => handleUpdateItem(it.id, { transport_payment_date: val })}
                                                />
                                            </div>
                                            <ConfirmPaymentButton 
                                                itemId={it.id} 
                                                paidField="supplier_transport_paid" 
                                                dateField="transport_payment_date"
                                                isPaid={it.supplier_transport_paid} 
                                                paymentDate={it.transport_payment_date}
                                                value={it.real_supplier_transport_cost || it.supplier_transport_cost || 0}
                                                label="Frete Fornecedor"
                                            />
                                        </div>
                                    </td>

                                    <td className="px-4 py-4 text-right space-y-2">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="flex flex-col items-end gap-1">
                                                <CurrencyInput 
                                                    value={it.real_client_transport_cost || it.client_transport_cost || 0} 
                                                    onSave={(val) => handleUpdateItem(it.id, { real_client_transport_cost: val })}
                                                />
                                                <DateInput 
                                                    label="Previsto"
                                                    value={it.transport_payment_date} 
                                                    onSave={(val) => handleUpdateItem(it.id, { transport_payment_date: val })}
                                                />
                                            </div>
                                            <ConfirmPaymentButton 
                                                itemId={it.id} 
                                                paidField="client_transport_paid" 
                                                dateField="transport_payment_date"
                                                isPaid={it.client_transport_paid} 
                                                paymentDate={it.transport_payment_date}
                                                value={it.real_client_transport_cost || it.client_transport_cost || 0}
                                                label="Frete Cliente"
                                            />
                                        </div>
                                    </td>

                                    <td className="px-4 py-4 text-right space-y-2">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="flex flex-col items-end gap-1">
                                                <CurrencyInput 
                                                    value={it.real_extra_expense || it.extra_expense || 0} 
                                                    onSave={(val) => handleUpdateItem(it.id, { real_extra_expense: val })}
                                                />
                                                <DateInput 
                                                    label="Previsto"
                                                    value={it.extra_payment_date} 
                                                    onSave={(val) => handleUpdateItem(it.id, { extra_payment_date: val })}
                                                />
                                            </div>
                                            <ConfirmPaymentButton 
                                                itemId={it.id} 
                                                paidField="extra_expense_paid" 
                                                dateField="extra_payment_date"
                                                isPaid={it.extra_expense_paid} 
                                                paymentDate={it.extra_payment_date}
                                                value={it.real_extra_expense || it.extra_expense || 0}
                                                label="Custo Extra"
                                            />
                                        </div>
                                    </td>

                                    <td className="px-4 py-4 text-right space-y-2">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="flex flex-col items-end gap-1">
                                                <CurrencyInput 
                                                    value={it.real_customization_cost || it.customization_cost || 0} 
                                                    onSave={(val) => handleUpdateItem(it.id, { real_customization_cost: val })}
                                                />
                                                <DateInput 
                                                    label="Previsto"
                                                    value={it.customization_payment_date} 
                                                    onSave={(val) => handleUpdateItem(it.id, { customization_payment_date: val })}
                                                />
                                            </div>
                                            <ConfirmPaymentButton 
                                                itemId={it.id} 
                                                paidField="customization_paid" 
                                                dateField="customization_payment_date"
                                                isPaid={it.customization_paid} 
                                                paymentDate={it.customization_payment_date}
                                                value={it.real_customization_cost || it.customization_cost || 0}
                                                label="Personalização"
                                            />
                                        </div>
                                    </td>

                                    <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-400">{it.bv_pct || 0}%</td>
                                    <td className="px-4 py-4 text-right text-[11px] font-bold text-rose-500 tabular-nums">{formatCurrency(totalVenda * ((it.tax_pct || 14) / 100))}</td>
                                    <td className="px-4 py-4 text-right text-[11px] font-bold text-slate-500 tabular-nums">{formatCurrency(totalVenda / it.quantity)}</td>
                                    <td className="px-4 py-4 text-right text-[11px] font-black text-slate-900 tabular-nums">{formatCurrency(totalVenda)}</td>

                                    <td className="px-4 py-4 text-right bg-blue-50/10">
                                        <CurrencyInput value={it.entry_amount || 0} onSave={(val) => handleUpdateItem(it.id, { entry_amount: val })} />
                                    </td>
                                    <td className="px-4 py-4 bg-blue-50/10">
                                        <DateInput value={it.entry_forecast_date} onSave={(val) => handleUpdateItem(it.id, { entry_forecast_date: val })} />
                                    </td>
                                    <td className="px-4 py-4 text-right bg-blue-50/10">
                                        <CurrencyInput value={it.remaining_amount || 0} onSave={(val) => handleUpdateItem(it.id, { remaining_amount: val })} />
                                    </td>
                                    <td className="px-4 py-4 bg-blue-50/10">
                                        <DateInput value={it.remaining_forecast_date} onSave={(val) => handleUpdateItem(it.id, { remaining_forecast_date: val })} />
                                    </td>

                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${it.unit_price_paid ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase">{it.unit_price_paid ? 'PAGO' : 'PENDENTE'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className={`text-[12px] font-black tabular-nums ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(saldo)}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-[#0F6CBD] text-white font-bold text-[10px] uppercase">
                        <tr>
                            <td colSpan={7} className="px-4 py-3 tracking-widest opacity-80">RESUMO DA SELEÇÃO ({totals.count} ITENS)</td>
                            <td className="px-4 py-3 text-right">---</td>
                            <td className="px-4 py-3 text-right tabular-nums text-blue-100">{formatCurrency(totals.custo)}</td>
                            <td colSpan={4} className="px-4 py-3 text-right">---</td>
                            <td className="px-4 py-3 text-center opacity-50">---</td>
                            <td className="px-4 py-3 text-right tabular-nums text-rose-200">{formatCurrency(totals.imposto)}</td>
                            <td className="px-4 py-3 text-right">---</td>
                            <td className="px-4 py-3 text-right tabular-nums text-[#4ade80]">{formatCurrency(totals.venda)}</td>
                            
                            {/* NOVAS SOMAS */}
                            <td colSpan={4} className="px-4 py-3 border-l border-white/10 bg-white/5">
                                <div className="flex flex-col gap-1 items-end">
                                    <div className="flex items-center gap-2 text-blue-100">
                                        <ArrowDownCircle size={12} className="text-rose-300" />
                                        Total Pago (Custos): <span className="font-black text-white">{formatCurrency(totals.pago)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-blue-100">
                                        <ArrowUpCircle size={12} className="text-emerald-300" />
                                        Total Recebido (Venda): <span className="font-black text-white">{formatCurrency(totals.recebido)}</span>
                                    </div>
                                </div>
                            </td>
                            
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-right border-l border-white/10">
                                <div className="text-[14px] font-black tabular-nums tracking-tight">
                                    {formatCurrency(totals.saldo)}
                                </div>
                                <div className="text-[8px] opacity-70">Saldo Final</div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* CONFIRMATION OVERLAY */}
            {confirmingPayment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
                                <Wallet size={40} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{confirmingPayment.label}</h3>
                                <div className="mt-2 py-3 px-4 bg-slate-50 rounded-lg inline-block">
                                    <span className="text-2xl font-black text-[#0F6CBD] tabular-nums">
                                        {formatCurrency(confirmingPayment.value)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed px-4">
                                    Ao confirmar, o sistema registrará a data de hoje como a data de pagamento efetivo para este custo específico.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setConfirmingPayment(null)} className="flex-1 h-12 rounded-xl text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all uppercase tracking-widest">Cancelar</button>
                                <button onClick={() => handleConfirmPayment(confirmingPayment.itemId, confirmingPayment.field, confirmingPayment.dateField)} className="flex-1 h-12 rounded-xl text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-200 transition-all uppercase tracking-widest">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
