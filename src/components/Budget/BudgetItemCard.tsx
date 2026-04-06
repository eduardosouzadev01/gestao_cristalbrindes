import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { formatCurrency, parseCurrencyToNumber } from '../../utils/formatCurrency';
import { calculateItemTotal } from '../../utils/formulas';
import RichTextEditor from '../common/RichTextEditor';

interface BudgetItemCardProps {
    it: any;
    idx: number;
    status: string;
    updateItem: (id: string | number, field: string, value: any) => void;
    removeItem: (id: string | number) => void;
    duplicateItem: (it: any) => void;
    productsList: any[];
    suppliersList: any[];
    searchProducts: (term: string) => void;
    CustomSelect: any; 
}

const BudgetItemCard: React.FC<BudgetItemCardProps> = ({
    it,
    idx,
    status,
    updateItem,
    removeItem,
    duplicateItem,
    productsList,
    suppliersList,
    searchProducts,
    CustomSelect
}) => {
    const isLocked = status === 'PROPOSTA ACEITA';

    const handleMarginClick = (m: number) => {
        if (isLocked) return;
        updateItem(it.id, 'isManualMargin', false);
        updateItem(it.id, 'mockMargin', m);
        updateItem(it.id, 'fator', 1 + ((it.mockNF ?? 14) + m + (it.mockPayment ?? 0)) / 100);
    };

    const handleNFToggle = (nfValue: number) => {
        if (isLocked) return;
        updateItem(it.id, 'mockNF', nfValue);
        updateItem(it.id, 'fator', 1 + (nfValue + (it.mockMargin ?? 15) + (it.mockPayment ?? 0)) / 100);
    };

    const handlePaymentChange = (val: number) => {
        if (isLocked) return;
        updateItem(it.id, 'mockPayment', val);
        updateItem(it.id, 'fator', 1 + ((it.mockNF ?? 14) + (it.mockMargin ?? 15) + val) / 100);
    };

    const totalVenda = calculateItemTotal(it);
    const unitVenda = totalVenda / (it.quantity || 1);

    const paymentOptions = [
        { val: 0, label: '50% + 50% ( - sem acréscimo )' },
        { val: 0, label: 'À Vista ( - Sem acréscimo )' },
        { val: 4, label: '1x no cartão de Crédito ( 4% de Acréscimo )' },
        { val: 4, label: '7 à 15 dias Faturados ( 4% de Acréscimo )' },
        { val: 8, label: '21 à 30 dias Faturados ( 8% de Acréscimo )' }
    ];

    return (
        <Draggable draggableId={String(it.id)} index={idx} isDragDisabled={isLocked}>
            {(dragProvided, snapshot) => (
                <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className={`font-sans-budget border border-[#D0D3D6] rounded-[var(--radius-lg-budget)] mb-6 transition-all bg-[var(--bg-surface-budget)] relative ${
                        it.isApproved 
                            ? 'border-green-300 ring-1 ring-green-100 shadow-sm' 
                            : 'shadow-sm hover:shadow-md'
                    } ${
                        snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-[var(--color-accent-budget)]/20 shadow-slate-300' : ''
                    }`}
                >
                    {/* CARD HEADER: Item ID and Product Search */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b ${it.isApproved ? 'bg-green-50/50 border-green-200' : 'bg-[var(--bg-muted-budget)]/50 border-[var(--border-subtle-budget)]'}`}>
                        <div className="flex items-center gap-4 flex-1">
                            <div 
                                {...dragProvided.dragHandleProps}
                                className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg border text-[14px] font-[800] shadow-sm cursor-grab active:cursor-grabbing transition-colors ${
                                    it.isApproved ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-[var(--border-medium-budget)] text-[var(--color-accent-budget)] hover:border-[var(--color-accent-budget)]'
                                }`}
                            >
                                {idx + 1}
                            </div>
                            <div className="flex-1 max-w-xl">
                                <CustomSelect
                                    options={productsList}
                                    onSelect={(p: any) => {
                                        updateItem(it.id, 'product_id', p.id);
                                        updateItem(it.id, 'productName', p.name);
                                        updateItem(it.id, 'productCode', p.code);
                                        updateItem(it.id, 'productImage', p.image_url);
                                        updateItem(it.id, 'productDescription', p.description);
                                    }}
                                    placeholder="Buscar produto no catálogo..."
                                    value={it.productName}
                                    onSearch={searchProducts}
                                    disabled={isLocked}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6 ml-6">
                            {/* APPROVAL TOGGLE AT TOP */}
                            <div className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all ${it.isApproved ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-[#D0D3D6] hover:border-slate-300'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${it.isApproved ? 'text-green-600' : 'text-slate-400'}`}>
                                    {it.isApproved ? 'Aprovado' : 'Aprovar?'}
                                </span>
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                    checked={it.isApproved || false}
                                    onChange={e => updateItem(it.id, 'isApproved', e.target.checked)}
                                    disabled={isLocked}
                                />
                            </div>

                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase font-[600] text-[var(--text-tertiary-budget)] tracking-[0.06em]">Total do Item</span>
                                <span className={`text-[18px] font-[700] font-mono-budget leading-none mt-1 ${it.isApproved ? 'text-green-700' : 'text-[var(--color-accent-budget)]'}`}>
                                    {formatCurrency(totalVenda)}
                                </span>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                                <button onClick={() => duplicateItem(it)} disabled={isLocked} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-[var(--border-medium-budget)] text-[var(--text-secondary-budget)] hover:bg-[var(--bg-muted-budget)] hover:text-[var(--color-accent-budget)] transition-all shadow-sm" title="Duplicar item" type="button">
                                    <span className="material-icons-outlined text-[20px]">content_copy</span>
                                </button>
                                <button onClick={() => removeItem(it.id)} disabled={isLocked} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-[var(--border-medium-budget)] text-[var(--text-secondary-budget)] hover:bg-[#FCEBEB] hover:text-[#A32D2D] transition-all shadow-sm" title="Remover item" type="button">
                                    <span className="material-icons-outlined text-[20px]">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* CARD BODY: Flat Layout */}
                    <div className="p-6">
                        <div className="grid grid-cols-12 gap-8">
                            
                            {/* COL 1: LARGE IMAGE */}
                            <div className="col-span-12 lg:col-span-3 space-y-4">
                                <div className="aspect-square bg-white rounded-[var(--radius-lg-budget)] border border-[#D0D3D6] flex items-center justify-center overflow-hidden shadow-sm relative group/img">
                                    {it.productImage ? (
                                        <img 
                                            src={it.productImage} 
                                            alt={it.productName} 
                                            className="w-full h-full object-contain p-4 hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center text-[var(--text-tertiary-budget)]">
                                            <span className="material-icons-outlined text-6xl">inventory_2</span>
                                            <span className="text-[11px] uppercase mt-3 font-[600] tracking-wider">Sem Imagem</span>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-[var(--bg-muted-budget)]/40 rounded-[var(--radius-md-budget)] p-3 border border-[#D0D3D6] shadow-inner">
                                    <label className="block text-[10px] uppercase font-[700] text-slate-400 mb-1 italic">REF</label>
                                    <input
                                        className="w-full bg-transparent border-none p-0 text-[13px] font-[700] text-[var(--text-primary-budget)] font-mono-budget focus:ring-0"
                                        value={it.productCode || ''}
                                        onChange={e => updateItem(it.id, 'productCode', e.target.value.toUpperCase())}
                                        placeholder="Referência..."
                                        disabled={isLocked}
                                    />
                                </div>
                            </div>

                            {/* COL 2: SPECS + DESCRIPTION */}
                            <div className="col-span-12 lg:col-span-4 space-y-6">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 lg:col-span-5 space-y-1">
                                        <label className="block text-[11px] uppercase font-[700] text-[var(--text-secondary-budget)] tracking-[0.06em]">Quantidade</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-[var(--bg-surface-budget)] border border-[#D0D3D6] rounded-[var(--radius-md-budget)] px-3 py-2 text-[14px] font-[600] font-mono-budget focus:ring-[var(--color-accent-budget)] focus:border-[var(--color-accent-budget)]"
                                            value={it.quantity || ''}
                                            onChange={e => updateItem(it.id, 'quantity', Number(e.target.value))}
                                            disabled={isLocked}
                                        />
                                    </div>
                                    <div className="col-span-12 lg:col-span-7 space-y-1">
                                        <label className="block text-[11px] uppercase font-[700] text-[var(--text-secondary-budget)] tracking-[0.06em]">Valor Unit. (Custo p/ Fornecedor)</label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                className="w-full bg-white border border-[#D0D3D6] rounded-[var(--radius-md-budget)] px-3 py-2 text-[14px] font-[700] font-mono-budget text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formatCurrency(it.priceUnit || 0)}
                                                onChange={e => updateItem(it.id, 'priceUnit', parseCurrencyToNumber(e.target.value))}
                                                disabled={isLocked}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons-outlined text-xs text-slate-300">edit</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] uppercase font-[700] text-slate-500 tracking-wider">Cor do Produto</label>
                                        <input 
                                            type="text"
                                            className="w-full bg-white border border-[#D0D3D6] rounded-[var(--radius-md-budget)] px-3 py-2 text-[14px] font-[600] uppercase focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 transition-all"
                                            placeholder="Ex: Azul"
                                            value={it.productColor || ''}
                                            onChange={e => updateItem(it.id, 'productColor', e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] uppercase font-[700] text-slate-500 tracking-wider">Fornecedor Produto</label>
                                        <select
                                            className="w-full bg-white border border-[#D0D3D6] rounded-[var(--radius-md-budget)] px-3 py-2 text-[14px] font-[600] focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 transition-all cursor-pointer"
                                            value={it.supplier_id || ''}
                                            onChange={e => updateItem(it.id, 'supplier_id', e.target.value)}
                                            disabled={isLocked}
                                        >
                                            <option value="">Selecione...</option>
                                            {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <label className="block text-[11px] uppercase font-[700] text-[var(--text-secondary-budget)] tracking-[0.06em] border-b border-[var(--border-subtle-budget)] pb-1">Descrição Comercial (Proposta)</label>
                                    <RichTextEditor
                                        className="text-[13px] text-[var(--text-primary-budget)] min-h-[140px] bg-white border border-[#D0D3D6] rounded-[var(--radius-md-budget)]"
                                        value={it.productDescription || ''}
                                        onChange={val => updateItem(it.id, 'productDescription', val)}
                                        placeholder="Detalhes que o cliente verá..."
                                        disabled={isLocked}
                                    />
                                </div>
                            </div>

                            {/* COL 3: LOGISTICS + FINANCIALS */}
                            <div className="col-span-12 lg:col-span-5 space-y-6">
                                {/* LOGISTICS TABLE */}
                                <div className="bg-white border border-[#D0D3D6] rounded-[var(--radius-lg-budget)] overflow-hidden">
                                    <div className="bg-[var(--bg-muted-budget)]/50 px-4 py-2 border-b border-[#D0D3D6]">
                                        <h5 className="text-[11px] font-[700] text-[var(--text-secondary-budget)] uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-icons-outlined text-sm">local_shipping</span>
                                            Custos de Logística e Serviços
                                        </h5>
                                    </div>
                                    <div className="divide-y divide-[#D0D3D6]">
                                        {[
                                            { label: 'Personalização', key: 'custoPersonalizacao', suppKey: 'customization_supplier_id' },
                                            { label: 'Layout / Clichê', key: 'layoutCost', suppKey: 'layout_supplier_id' },
                                            { label: 'Frete Fatura / Fornec.', key: 'transpFornecedor', suppKey: 'transport_supplier_id' },
                                            { label: 'Frete Terceiro / Cliente', key: 'transpCliente', suppKey: 'client_transport_supplier_id' }
                                        ].map(row => (
                                            <div key={row.key} className="grid grid-cols-12 gap-3 p-3 items-center hover:bg-[var(--bg-muted-budget)]/20 transition-colors">
                                                <div className="col-span-4 text-[12px] font-[600] text-[var(--text-secondary-budget)] truncate">{row.label}</div>
                                                <div className="col-span-5">
                                                    <select
                                                        className="w-full text-[12px] bg-transparent border-none p-0 focus:ring-0 text-[var(--text-primary-budget)] font-semibold"
                                                        value={it[row.suppKey] || ''}
                                                        onChange={e => updateItem(it.id, row.suppKey, e.target.value)}
                                                        disabled={isLocked}
                                                    >
                                                        <option value="">Fornecedor...</option>
                                                        {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        className="w-full text-right bg-transparent border-none p-0 focus:ring-0 font-mono-budget text-[13px] font-[700] text-[var(--text-primary-budget)]"
                                                        value={formatCurrency(it[row.key] || 0)}
                                                        onChange={e => updateItem(it.id, row.key, parseCurrencyToNumber(e.target.value))}
                                                        disabled={isLocked}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* PRICING CONTROL PANEL */}
                                <div className="bg-[var(--bg-muted-budget)] rounded-[var(--radius-lg-budget)] p-5 border border-[#D0D3D6] space-y-5">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] uppercase font-[700] text-[var(--text-tertiary-budget)] tracking-[0.06em]">Impostos (NF)</label>
                                            <div className="flex bg-[var(--bg-surface-budget)] border border-[#D0D3D6] rounded-[var(--radius-md-budget)] p-1">
                                                <button onClick={() => handleNFToggle(14)} className={`flex-1 py-1 rounded-[var(--radius-sm-budget)] text-[10px] font-[700] uppercase transition-all ${(it.mockNF ?? 14) === 14 ? 'bg-[var(--color-info-budget)] text-white shadow-sm' : 'text-[var(--text-tertiary-budget)] hover:text-[var(--text-secondary-budget)]'}`} type="button">14%</button>
                                                <button onClick={() => handleNFToggle(0)} className={`flex-1 py-1 rounded-[var(--radius-sm-budget)] text-[10px] font-[700] uppercase transition-all ${(it.mockNF ?? 14) === 0 ? 'bg-[var(--color-info-budget)] text-white shadow-sm' : 'text-[var(--text-tertiary-budget)] hover:text-[var(--text-secondary-budget)]'}`} type="button">0%</button>
                                            </div>
                                        </div>
                                        <div className="flex-[2] space-y-2">
                                            <label className="text-[10px] uppercase font-[700] text-[var(--text-tertiary-budget)] tracking-[0.06em]">Margem de Lucro</label>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {[10, 15, 20, 30].map(m => {
                                                    const isActive = !it.isManualMargin && (it.mockMargin ?? 15) === m;
                                                    return (
                                                        <button key={m} onClick={() => handleMarginClick(m)} className={`px-2.5 py-1.5 rounded-[var(--radius-md-budget)] text-[11px] font-[700] font-mono-budget transition-all border ${isActive ? 'bg-[var(--color-accent-budget)] border-[var(--color-accent-budget)] text-white' : 'bg-white border border-[var(--border-subtle-budget)] text-[var(--text-secondary-budget)] hover:border-[var(--color-accent-budget)]'}`} type="button">
                                                            {m}%
                                                        </button>
                                                    );
                                                })}
                                                <input 
                                                    type="number"
                                                    className={`w-12 rounded-[var(--radius-md-budget)] border border-[#D0D3D6] text-[11px] font-mono-budget text-center focus:ring-0 ${it.isManualMargin ? 'bg-[var(--color-accent-budget)] text-white border-[var(--color-accent-budget)]' : 'bg-white text-[var(--text-secondary-budget)]'}`}
                                                    value={it.mockMargin ?? ''}
                                                    onChange={e => {
                                                        const val = Number(e.target.value);
                                                        updateItem(it.id, 'isManualMargin', true);
                                                        updateItem(it.id, 'mockMargin', val);
                                                        updateItem(it.id, 'fator', 1 + ((it.mockNF ?? 14) + val + (it.mockPayment ?? 0)) / 100);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* BILLING TERMS (FATURAMENTO) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-[700] text-[var(--text-tertiary-budget)] tracking-[0.06em]">Forma de Faturamento (Acréscimo)</label>
                                        <select
                                            className="w-full bg-white border border-[#D0D3D6] rounded-[var(--radius-md-budget)] px-3 py-2 text-[12px] font-[600] text-[var(--text-primary-budget)] focus:ring-[var(--color-accent-budget)] focus:border-[var(--color-accent-budget)]"
                                            value={it.mockPayment || 0}
                                            onChange={e => handlePaymentChange(Number(e.target.value))}
                                            disabled={isLocked}
                                        >
                                            {paymentOptions.map((opt, i) => (
                                                <option key={i} value={opt.val}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* PRICING SUMARY DISCLOSURE */}
                                    <div className="pt-4 border-t border-[#D0D3D6] space-y-3">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <div className="flex justify-between items-center bg-white/50 px-2 py-1 rounded">
                                                <span>Imposto</span>
                                                <span className="text-slate-600 font-mono-budget">{formatCurrency(totalVenda * ((it.mockNF ?? 14) / 100))}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white/50 px-2 py-1 rounded">
                                                <span>Custo Total</span>
                                                <span className="text-slate-600 font-mono-budget">{formatCurrency(((it.quantity || 0) * (it.priceUnit || 0)) + (it.custoPersonalizacao || 0) + (it.layoutCost || 0) + (it.transpFornecedor || 0) + (it.transpCliente || 0))}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-emerald-50/50 px-2 py-1 rounded">
                                                <span className="text-emerald-500">Lucro Estimado</span>
                                                <span className="text-emerald-700 font-mono-budget">
                                                    {formatCurrency(totalVenda - (((it.quantity || 0) * (it.priceUnit || 0)) + (it.custoPersonalizacao || 0) + (it.layoutCost || 0) + (it.transpFornecedor || 0) + (it.transpCliente || 0)) - (totalVenda * ((it.mockNF ?? 14) / 100)))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-100/50 px-2 py-1 rounded">
                                                <span className="text-slate-500">Fator Aplicado</span>
                                                <span className="text-slate-600 font-mono-budget">{it.fator?.toFixed(4) || '1.3500'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Valor Venda Unit.</span>
                                                <span className="text-[16px] font-black text-slate-700 font-mono-budget">{formatCurrency(unitVenda)}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Valor Venda Total</span>
                                                <span className="text-[20px] font-black text-blue-600 font-mono-budget">{formatCurrency(totalVenda)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

export default BudgetItemCard;
