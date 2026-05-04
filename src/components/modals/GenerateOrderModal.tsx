import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { calculateItemTotal } from '@/utils/formulas';
import { EditableSelect } from '../common/EditableSelect';

interface CommercialData {
    payment_term: string;
    shipping_mode: string;
    issuer: string;
    supplier_deadline: string;
    shipping_deadline: string; // Keep for backward compat if needed, but we use client_limit_dates now
    invoice_number: string;
    purchase_order: string;
    layout_info: string;
    entry_forecast_date: string;
    remaining_forecast_date: string;
    supplier_payment_dates: Record<string, string>;
    supplier_departure_dates: Record<string, string>;
    client_limit_dates: Record<string, string>;
}

interface GenerateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    commercialData: CommercialData;
    setCommercialData: (data: CommercialData) => void;
    onConfirm: () => void;
    loading: boolean;
    approvedItems?: any[];
    suppliersList?: any[];
}

export default function GenerateOrderModal({
    isOpen,
    onClose,
    commercialData,
    setCommercialData,
    onConfirm,
    loading,
    approvedItems = [],
    suppliersList = []
}: GenerateOrderModalProps) {
    if (!isOpen) return null;

    const [autoFilledKeys, setAutoFilledKeys] = React.useState<Set<string>>(new Set());

    const updateDate = (key: string, date: string, type: 'payment' | 'departure' | 'limit') => {
        let field: keyof CommercialData;
        switch(type) {
            case 'payment': field = 'supplier_payment_dates'; break;
            case 'departure': field = 'supplier_departure_dates'; break;
            case 'limit': field = 'client_limit_dates'; break;
        }
        
        if (type === 'payment') {
            const newAutoFilled = new Set(autoFilledKeys);
            newAutoFilled.delete(key);
            setAutoFilledKeys(newAutoFilled);
        }

        setCommercialData({
            ...commercialData,
            [field]: {
                ...(commercialData[field] || {}),
                [key]: date
            }
        });
    };

    const getIntelligentPaymentDate = (supplierName: string) => {
        const today = new Date();
        const name = (supplierName || '').toUpperCase();
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        
        if (name.includes('SPOT')) {
            return fmt(today);
        }

        if (name.includes('ÁGUIA BRANCA')) {
            const date = new Date();
            date.setDate(today.getDate() + 8);
            return fmt(date);
        }

        if (name.includes('M2K') || name.includes('CAROL')) {
            const date = new Date(today.getFullYear(), today.getMonth() + 1, 28);
            return fmt(date);
        }

        if (name.includes('IMPRESSÃO EXPRESS') || name.includes('CLYETON')) {
            const day = today.getDate();
            if (day >= 28) {
                return fmt(new Date(today.getFullYear(), today.getMonth() + 1, 15));
            }
            if (day <= 12) {
                return fmt(new Date(today.getFullYear(), today.getMonth(), 15));
            }
            if (day >= 13 && day <= 27) {
                return fmt(new Date(today.getFullYear(), today.getMonth(), 30));
            }
        }

        return '';
    };

    React.useEffect(() => {
        if (!isOpen) return;
        
        const newPaymentDates = { ...commercialData.supplier_payment_dates };
        const newAutoFilled = new Set(autoFilledKeys);
        let changed = false;

        approvedItems.forEach(item => {
            const costs = [
                { type: 'core', suppId: item.supplier_id },
                { type: 'custom', suppId: item.customization_supplier_id },
                { type: 'layout', suppId: item.layout_supplier_id },
                { type: 'transpFornecedor', suppId: item.transport_supplier_id },
                { type: 'transpCliente', suppId: item.client_transport_supplier_id },
                { type: 'extra', suppId: null }
            ];

            costs.forEach(c => {
                const key = `${item.id}-${c.type}`;
                if (!newPaymentDates[key]) {
                    const suggested = c.suppId ? getIntelligentPaymentDate(getSupplierName(c.suppId)) : '';
                    newPaymentDates[key] = suggested;
                    if (suggested) newAutoFilled.add(key);
                    changed = true;
                }
            });
        });

        if (changed) {
            setAutoFilledKeys(newAutoFilled);
            setCommercialData({
                ...commercialData,
                supplier_payment_dates: newPaymentDates
            });
        }
    }, [isOpen]);

    const getSupplierName = (id: string) => suppliersList.find(s => s.id === id)?.name || 'N/A';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-md shadow-none w-full max-w-7xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md bg-[#005A9E] flex items-center justify-center text-white shadow-none">
                            <span className="material-icons-outlined text-2xl">assignment_turned_in</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-medium text-slate-800 tracking-tight">Gerar Pedido</h3>
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.2em]">Confirmação de Prazos e Valores por Item</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-full transition-all text-slate-400">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto flex-1 custom-scrollbar">
                    {/* LEFT COLUMN: GERAL & CRONOGRAMA CLIENTE (4 cols) */}
                    <div className="lg:col-span-4 space-y-8">
                        <section className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
                                <span className="material-icons-outlined text-sm">tune</span> Dados de Faturamento
                            </h4>
                            <div className="bg-slate-50/40 border border-slate-100 rounded-md p-6 space-y-5">
                                <div>
                                    <EditableSelect
                                        label="Condição de Pagamento (Faturamento)"
                                        required
                                        value={commercialData.payment_term}
                                        onChange={(val) => setCommercialData({ ...commercialData, payment_term: val })}
                                        placeholder="Defina a condição de faturamento..."
                                        options={[
                                            '50% no pedido e 50% no pedido pronto.',
                                            '50% no pedido + 50% 30 Dias (Acrescimo 5%)',
                                            '1 vez no cartão de crédito.',
                                            '7 dias faturamento',
                                            '10 dias faturamento',
                                            '14 dias faturamento',
                                            '21 dias faturamento',
                                            '30 dias faturamento'
                                        ]}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <EditableSelect
                                        label="Emitente"
                                        required
                                        value={commercialData.issuer}
                                        onChange={(val) => setCommercialData({ ...commercialData, issuer: val })}
                                        options={[
                                            'CRISTAL BRINDES',
                                            'ESPIRITO BRINDES',
                                            'NATUREZA BRINDES',
                                            'SEM NF'
                                        ]}
                                    />
                                    <EditableSelect
                                        label="Modalidade de Frete"
                                        required
                                        value={commercialData.shipping_mode}
                                        onChange={(val) => setCommercialData({ ...commercialData, shipping_mode: val })}
                                        options={[
                                            'CIF - POR NOSSA CONTA',
                                            'FOB - POR CONTA DO CLIENTE'
                                        ]}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-500 uppercase mb-2 ml-1">Nº Nota Fiscal</label>
                                        <input 
                                            className="w-full rounded-md border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#005A9E] outline-none transition-all" 
                                            placeholder="Ex: 1234..." 
                                            value={commercialData.invoice_number} 
                                            onChange={(e) => setCommercialData({ ...commercialData, invoice_number: e.target.value })} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-500 uppercase mb-2 ml-1">Ordem de Compra</label>
                                        <input 
                                            className="w-full rounded-md border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#005A9E] outline-none transition-all" 
                                            placeholder="Ex: OC-001..." 
                                            value={commercialData.purchase_order} 
                                            onChange={(e) => setCommercialData({ ...commercialData, purchase_order: e.target.value })} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
                                <span className="material-icons-outlined text-sm">schedule</span> Cronograma de Pagamento Cliente
                            </h4>
                            <div className="bg-blue-50/30 border border-blue-100 rounded-md p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-medium text-blue-600/70 uppercase mb-2 ml-1">Prev. Pag. Entrada <span className="text-red-500">*</span></label>
                                        <input type="date" className="w-full rounded-md border-blue-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none outline-none" value={commercialData.entry_forecast_date} onChange={(e) => setCommercialData({ ...commercialData, entry_forecast_date: e.target.value })} />
                                        {commercialData.payment_term.includes('50%') && (
                                            <span className="text-[9px] font-bold text-emerald-600 mt-1 block">Valor: {formatCurrency(approvedItems.reduce((acc, it) => acc + calculateItemTotal(it), 0) / 2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-blue-600/70 uppercase mb-2 ml-1">Prev. Pag. 2ª Parcela</label>
                                        <input type="date" className="w-full rounded-md border-blue-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none outline-none" value={commercialData.remaining_forecast_date} onChange={(e) => setCommercialData({ ...commercialData, remaining_forecast_date: e.target.value })} />
                                        {commercialData.payment_term.includes('50%') && (
                                            <span className="text-[9px] font-bold text-slate-400 mt-1 block">Valor: {formatCurrency(approvedItems.reduce((acc, it) => acc + calculateItemTotal(it), 0) / 2)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <section className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
                                <span className="material-icons-outlined text-sm">draw</span> Observações
                            </h4>
                            <div className="bg-slate-50/40 border border-slate-100 rounded-md p-5">
                                <textarea 
                                    rows={4} 
                                    className="w-full rounded-md border-slate-200 bg-white p-4 text-xs font-medium text-slate-600 shadow-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#005A9E] outline-none resize-none transition-all" 
                                    placeholder="Observações adicionais..." 
                                    value={commercialData.layout_info} 
                                    onChange={(e) => setCommercialData({ ...commercialData, layout_info: e.target.value })} 
                                />
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: ITEMS BREAKDOWN (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
                            <span className="material-icons-outlined text-sm">inventory_2</span> Detalhamento de Itens e Fornecedores
                        </h4>
                        
                        <div className="space-y-4">
                            {approvedItems.map((item, idx) => {
                                const costs = [
                                    { type: 'core', label: 'Produto', suppId: item.supplier_id, value: (item.quantity || 0) * (item.priceUnit || 0) },
                                    { type: 'custom', label: 'Personalização', suppId: item.customization_supplier_id, value: item.custoPersonalizacao },
                                    { type: 'layout', label: 'Layout', suppId: item.layout_supplier_id, value: item.layoutCost },
                                    { type: 'transpFornecedor', label: 'Frete Fatura', suppId: item.transport_supplier_id, value: item.transpFornecedor },
                                    { type: 'transpCliente', label: 'Frete Terceiro', suppId: item.client_transport_supplier_id, value: item.transpCliente }
                                ].filter(c => c.suppId && Number(c.value) > 0);

                                return (
                                    <div key={item.id} className="bg-white border border-slate-200 rounded-md overflow-hidden">
                                        <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded bg-[#005A9E] text-white text-[10px] font-bold flex items-center justify-center">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-700 uppercase truncate max-w-2xl">
                                                    {item.productName}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-0 divide-y divide-slate-100">
                                            {costs.map(cost => {
                                                const dateKey = `${item.id}-${cost.type}`;
                                                return (
                                                    <div key={cost.type} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50/30 transition-colors">
                                                        <div className="col-span-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{cost.label}</span>
                                                                <span className="text-[11px] font-bold text-slate-700 uppercase truncate">
                                                                    {getSupplierName(cost.suppId)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-3 text-right">
                                                            <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                                                                {formatCurrency(cost.value)}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-5">
                                                            <div className="flex flex-col">
                                                                <label className={`block text-[8px] font-bold uppercase mb-1 tracking-widest ${
                                                                    commercialData.supplier_payment_dates[dateKey] ? 'text-emerald-600' : 'text-red-500'
                                                                }`}>Pagamento Fornecedor</label>
                                                                <input 
                                                                    type="date"
                                                                    className={`w-full h-8 px-2 rounded border text-[10px] font-bold outline-none transition-all ${
                                                                        commercialData.supplier_payment_dates?.[dateKey] 
                                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                                                        : 'bg-white border-slate-200 text-slate-700 focus:border-red-400'
                                                                    }`}
                                                                    value={commercialData.supplier_payment_dates?.[dateKey] || ''}
                                                                    onChange={e => updateDate(dateKey, e.target.value, 'payment')}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Departure & Limit Dates (Side by Side) */}
                                        <div className="bg-blue-50/20 p-4 border-t border-blue-100/50">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={`block text-[10px] font-bold uppercase mb-1.5 tracking-widest flex items-center gap-2 ${
                                                        commercialData.supplier_departure_dates[`${item.id}-item-departure`] ? 'text-emerald-600' : 'text-blue-600'
                                                    }`}>
                                                        <span className="material-icons-outlined text-sm">local_shipping</span>
                                                        Saída Fornecedor <span className="text-red-500">*</span>
                                                    </label>
                                                    <input 
                                                        type="date"
                                                        required
                                                        className={`w-full h-10 px-3 rounded-md border text-xs font-bold outline-none transition-all shadow-none ${
                                                            !commercialData.supplier_departure_dates[`${item.id}-item-departure`] 
                                                            ? 'border-red-200 bg-red-50/30 focus:border-red-400' 
                                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        }`}
                                                        value={commercialData.supplier_departure_dates[`${item.id}-item-departure`] || ''}
                                                        onChange={e => updateDate(`${item.id}-item-departure`, e.target.value, 'departure')}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-[10px] font-bold uppercase mb-1.5 tracking-widest flex items-center gap-2 ${
                                                        commercialData.client_limit_dates?.[`${item.id}-limit`] ? 'text-emerald-600' : 'text-[#005A9E]'
                                                    }`}>
                                                        <span className="material-icons-outlined text-sm">event_available</span>
                                                        Limite Cliente <span className="text-red-500">*</span>
                                                    </label>
                                                    <input 
                                                        type="date"
                                                        required
                                                        className={`w-full h-10 px-3 rounded-md border text-xs font-bold outline-none transition-all shadow-none ${
                                                            !commercialData.client_limit_dates?.[`${item.id}-limit`] 
                                                            ? 'border-red-200 bg-red-50/30 focus:border-red-400' 
                                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        }`}
                                                        value={commercialData.client_limit_dates?.[`${item.id}-limit`] || ''}
                                                        onChange={e => updateDate(`${item.id}-limit`, e.target.value, 'limit')}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="px-10 py-6 bg-slate-50/30 flex justify-between items-center border-t border-slate-100 flex-shrink-0">
                    <p className="text-[10px] font-medium text-slate-400 uppercase">* Campos obrigatórios</p>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-slate-50 font-medium text-[11px] uppercase tracking-widest transition-all">Cancelar</button>
                        <button 
                            onClick={onConfirm} 
                            disabled={
                                loading || 
                                !commercialData.payment_term || 
                                approvedItems.some(item => (
                                    !commercialData.supplier_departure_dates[`${item.id}-item-departure`] ||
                                    !commercialData.client_limit_dates[`${item.id}-limit`]
                                ))
                            } 
                            className="px-10 py-3 bg-[#005A9E] text-white rounded-md hover:bg-[#004a82] font-medium text-[11px] uppercase tracking-widest transition-all shadow-none disabled:opacity-50 active:scale-95"
                        >
                            {loading ? 'Processando...' : 'Confirmar e Gerar Pedido'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
