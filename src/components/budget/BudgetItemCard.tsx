'use client';

import React from 'react';
import { calculateItemTotal, calculateItemRealTotal } from '@/utils/formulas';
import { formatCurrency, parseCurrencyToNumber } from '@/utils/formatCurrency';
import RichTextEditor from '@/components/common/RichTextEditor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CustomSelect from './CustomSelect';

interface BudgetItemCardProps {
    index: number;
    item: any;
    suppliersList: any[];
    productsList: any[];
    factors: any[];
    onUpdate: (field: string, value: any) => void;
    onRemove: () => void;
    onDuplicate: () => void;
    onSearch?: (term: string) => void;
    isLocked?: boolean;
    isInvalid?: boolean;
    onAddSupplier?: () => void;
}

export default function BudgetItemCard({
    index,
    item,
    suppliersList,
    productsList,
    factors,
    onUpdate,
    onRemove,
    onDuplicate,
    onSearch,
    isLocked = false,
    isInvalid = false,
    onAddSupplier
}: BudgetItemCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    const totalVenda = calculateItemTotal(item);
    const unitVenda = totalVenda / (item.quantity || 1);

    const handleMarginClick = (m: number) => {
        onUpdate('isManualMargin', false);
        onUpdate('mockMargin', m);
        const multiplier = 1 + ((item.mockNF ?? 14) + m + (item.mockPayment ?? 0)) / 100;
        onUpdate('fator', multiplier);
    };

    const handleNFToggle = (nfValue: number) => {
        onUpdate('mockNF', nfValue);
        const multiplier = 1 + (nfValue + (item.mockMargin ?? 15) + (item.mockPayment ?? 0)) / 100;
        onUpdate('fator', multiplier);
    };

    const handlePaymentChange = (val: number) => {
        onUpdate('mockPayment', val);
        const multiplier = 1 + ((item.mockNF ?? 14) + (item.mockMargin ?? 15) + val) / 100;
        onUpdate('fator', multiplier);
    };

    const paymentOptions = [
        { val: 0, label: '50% + 50% ( - sem acréscimo )' },
        { val: 0, label: 'À Vista ( - Sem acréscimo )' },
        { val: 4, label: '1x no cartão de Crédito ( 4% de Acréscimo )' },
        { val: 4, label: '7 à 15 dias Faturados ( 4% de Acréscimo )' },
        { val: 8, label: '21 à 30 dias Faturados ( 8% de Acréscimo )' }
    ];

    // Alternating zebra background (same gray as CRM: #F9FAFB)
    const zebraBg = index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white';

    return (
        <div 
            id={`budget-item-${item.id}`}
            ref={setNodeRef}
            style={style}
            className={`font-sans border rounded-md mb-4 transition-all shadow-none ${
                isInvalid
                    ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-200 animate-pulse-subtle'
                    : item.isApproved 
                        ? 'bg-[#ebfbf0] border-[#86efac] ring-1 ring-[#bbf7d0]' 
                        : `${zebraBg} border-slate-300`
            } relative group ${isDragging ? 'scale-[1.02] rotate-1 shadow-xl border-emerald-500 ring-2 ring-emerald-100' : ''}`}>
            
            {/* CARD HEADER: Item ID and Product Search */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${
                item.isApproved ? 'bg-[#dcfce7] border-[#86efac]' : 'bg-transparent border-[#E3E3E4]'
            }`}>
                <div className="flex items-center gap-4 flex-1">
                    <div 
                        {...attributes}
                        {...listeners}
                        className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md border text-[14px] font-medium shadow-none cursor-grab active:cursor-grabbing transition-colors ${
                            item.isApproved ? 'bg-[#bbf7d0] border-[#86efac] text-[#166534]' : 'bg-white border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-600'
                        }`}
                    >
                        {index + 1}
                    </div>
                    
                    <div className="flex-1 max-w-xl">
                        <CustomSelect
                            options={productsList}
                            onSelect={async (p: any) => {
                                // Logic from legacy system for images and variations
                                const getFirstValid = (prod: any) => {
                                    if (prod.image_url && prod.image_url.trim()) return prod.image_url;
                                    if (prod.images && Array.isArray(prod.images)) {
                                        const valid = prod.images.find((img: any) => typeof img === 'string' && img.trim());
                                        if (valid) return valid;
                                    }
                                    if (prod.image && typeof prod.image === 'string' && prod.image.trim()) return prod.image;
                                    return null;
                                };

                                const mainImage = getFirstValid(p);
                                const allImages = new Set<string>();
                                const addIfValid = (img: any) => {
                                    if (typeof img === 'string' && img.trim()) allImages.add(img);
                                };

                                addIfValid(mainImage);
                                addIfValid(p.image_url);
                                if (p.images && Array.isArray(p.images)) p.images.forEach(addIfValid);

                                // Auto-fill Supplier based on source
                                if (p.source) {
                                    const sourceMapping: any = {
                                        'XBZ': '9511c038-6c46-45e5-82e1-83ce5b4b1d37',
                                        'Asia': '45fa9d97-6c8b-4a8c-8bbf-ffc3c72df037',
                                        'Spot': 'fc7b0f21-f17e-45c6-b851-2e933b9504a3'
                                    };
                                    const mappedId = sourceMapping[p.source];
                                    if (mappedId) {
                                        onUpdate('supplier_id', mappedId);
                                    }
                                }

                                onUpdate('product_id', p.id);
                                onUpdate('productName', p.name || p.nome);
                                onUpdate('productCode', p.code);
                                onUpdate('productImage', mainImage);
                                onUpdate('coverImage', mainImage); // Cache of original main image
                                onUpdate('productDescription', p.description);
                                onUpdate('priceUnit', p.unit_price || p.price || 0);

                                // ASIA/XBZ Sibling check (Variation logic)
                                try {
                                    const { supabase } = await import('@/lib/supabase');
                                    const rawName = p.name || p.nome || '';
                                    const baseName = rawName.split(' - ')[0].split(' (')[0].trim();
                                    
                                    if (baseName) {
                                        const codeBase = p.code?.replace(/[A-Z]$/i, '') || p.code || '';
                                        const { data: vData } = await supabase.from('products')
                                            .select('color, stock, image_url, code, images')
                                            .or(`name.ilike.%${baseName}%,code.ilike.${codeBase}%`)
                                            .limit(50);
                                        
                                        if (vData && vData.length > 0) {
                                    vData.forEach(v => {
                                        addIfValid(v.image_url);
                                        if (v.images && Array.isArray(v.images)) v.images.forEach(addIfValid);
                                    });

                                    const vars = vData.map((v: any) => ({
                                        color: v.color,
                                        stock: v.stock,
                                        image: getFirstValid(v),
                                        code: v.code
                                    }));

                                    onUpdate('variations', vars);
                                    onUpdate('availableImages', Array.from(allImages));
                                    
                                    if (!mainImage) {
                                        const firstSiblingImg = vars.find(v => v.image)?.image;
                                        if (firstSiblingImg) {
                                            onUpdate('productImage', firstSiblingImg);
                                            onUpdate('coverImage', firstSiblingImg);
                                        }
                                    }
                                } else {
                                    onUpdate('variations', p.variations || []);
                                    onUpdate('availableImages', Array.from(allImages));
                                }
                            } else {
                                onUpdate('variations', p.variations || []);
                                onUpdate('availableImages', Array.from(allImages));
                            }
                        } catch (err) {
                            console.error("Variation check error:", err);
                            onUpdate('variations', p.variations || []);
                            onUpdate('availableImages', Array.from(allImages));
                        }
                            }}
                            placeholder="Buscar produto no catálogo..."
                            value={item.productName}
                            onSearch={onSearch}
                            disabled={isLocked}
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-6 ml-6">
                    {/* APPROVAL TOGGLE AT TOP */}
                    <div className={`flex items-center gap-3 px-3.5 py-2 rounded-md border transition-all ${item.isApproved ? 'bg-[#C6F6D5] border-[#9AE6B4] shadow-none' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <span className={`text-[10px] font-medium uppercase tracking-wider ${item.isApproved ? 'text-[#22543D]' : 'text-slate-400'}`}>
                            {item.isApproved ? 'Aprovado' : 'Aprovar?'}
                        </span>
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                            checked={item.isApproved || false}
                            onChange={e => onUpdate('isApproved', e.target.checked)}
                            disabled={isLocked}
                        />
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-medium text-[#707070] tracking-widest">Total do Item</span>
                        <span className={`text-lg font-medium tabular-nums leading-none mt-1 ${item.isApproved ? 'text-[#166534]' : 'text-[#111827]'}`}>
                            {formatCurrency(totalVenda)}
                        </span>
                    </div>
                    
                    {!isLocked && (
                        <div className="flex gap-1 ml-4">
                            <button onClick={onDuplicate} className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-none" title="Duplicar item">
                                <span className="material-icons-outlined text-[18px]">content_copy</span>
                            </button>
                            <button onClick={onRemove} className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-none" title="Remover item">
                                <span className="material-icons-outlined text-[18px]">delete</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* CARD BODY */}
            <div className="p-5">
                <div className="grid grid-cols-12 gap-5">
                    {/* Column 1: Core Fields (Quantity, Unit cost, Supplier, etc) */}
                    <div className="col-span-12 lg:col-span-3 space-y-4">
                        <div className="aspect-square bg-white rounded-md border border-slate-300 flex items-center justify-center overflow-hidden shadow-none relative group/img">
                            {item.productImage ? (
                                <img 
                                    src={item.productImage} 
                                    alt={item.productName} 
                                    className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-105"
                                />
                            ) : (
                                <div className="flex flex-col items-center text-slate-300">
                                    <span className="material-icons-outlined text-5xl">inventory_2</span>
                                    <span className="text-[10px] uppercase mt-2 font-medium tracking-widest">Sem Imagem</span>
                                </div>
                            )}
                        </div>

                        {/* PRODUCT THUMBNAILS GALLERY */}
                        {(() => {
                            const getValidImages = (imgs: any[]) => (imgs || []).filter(img => typeof img === 'string' && img.trim().length > 0);
                            const variationsImages = (item.variations || []).map((v: any) => v.image);
                            const derivedImages = Array.from(new Set(getValidImages([
                                item.coverImage,
                                ...(item.availableImages || []),
                                ...variationsImages,
                                item.productImage
                            ])));

                            if (derivedImages.length <= 1) return null;

                            return (
                                <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
                                    {derivedImages.map((img, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => onUpdate('productImage', img)}
                                            className={`flex-shrink-0 w-10 h-10 rounded-md border-2 overflow-hidden transition-all ${
                                                item.productImage === img 
                                                    ? 'border-blue-600 ring-4 ring-blue-50' 
                                                    : 'border-slate-100 opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={img as string} alt="Thumb" className="w-full h-full object-contain bg-white p-0.5" />
                                        </button>
                                    ))}
                                </div>
                            );
                        })()}


                        <div className="bg-[#F9FAFB] rounded-md p-3 border border-slate-300 shadow-none">
                            <label className="block text-[9px] uppercase font-medium text-slate-400 mb-1 tracking-widest">Referência / Código</label>
                            <input
                                className="w-full bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:ring-0"
                                value={item.productCode || ''}
                                onChange={e => onUpdate('productCode', e.target.value.toUpperCase())}
                                placeholder="Ref..."
                                disabled={isLocked}
                            />
                        </div>
                    </div>

                    {/* Specifications Section */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-slate-500 tracking-widest ml-1">Qtd.</label>
                                <input 
                                    type="number"
                                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm font-medium focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                                    value={item.quantity || ''}
                                    onChange={e => onUpdate('quantity', Number(e.target.value))}
                                    disabled={isLocked}
                                />
                            </div>
                            <div className="col-span-4 space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-slate-500 tracking-widest ml-1">Val. Unit. (Fornecedor)</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                                        value={formatCurrency(item.priceUnit || 0)}
                                        onChange={e => onUpdate('priceUnit', parseCurrencyToNumber(e.target.value))}
                                        disabled={isLocked}
                                    />
                                    {!isLocked && <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons-outlined text-xs text-slate-300">edit</span>}
                                </div>
                            </div>
                            <div className="col-span-5 space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-blue-600 tracking-widest ml-1">Custo Parcial Produ.</label>
                                <div className="w-full h-[38px] bg-blue-50/50 border border-blue-100 rounded-md px-3 flex items-center">
                                    <span className="text-[13px] font-bold text-blue-700 tabular-nums">
                                        {formatCurrency((item.priceUnit || 0) * (item.quantity || 0))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-slate-500 tracking-widest ml-1">Cor do Produto</label>
                                {item.variations && item.variations.length > 0 ? (
                                    <select
                                        className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm font-medium uppercase focus:ring-4 focus:ring-blue-50 cursor-pointer"
                                        value={item.productColor || ''}
                                        onChange={e => {
                                            const selectedVar = item.variations.find((v: any) => v.color === e.target.value);
                                            onUpdate('productColor', e.target.value);
                                            if (selectedVar) {
                                                if (selectedVar.image) onUpdate('productImage', selectedVar.image);
                                                if (selectedVar.code) onUpdate('productCode', selectedVar.code);
                                            }
                                        }}
                                    >
                                        <option value="">Selecione...</option>
                                        {item.variations.map((v: any, vidx: number) => (
                                            <option key={`${v.color}-${vidx}`} value={v.color}>
                                                {v.color} {v.stock ? `(${v.stock} em estoque)` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        type="text"
                                        className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm font-medium uppercase focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="Ex: Azul"
                                        value={item.productColor || ''}
                                        onChange={e => onUpdate('productColor', e.target.value)}
                                        disabled={isLocked}
                                    />
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-slate-500 tracking-widest ml-1">Fornecedor</label>
                                <CustomSelect
                                    options={suppliersList}
                                    value={suppliersList.find(s => s.id === item.supplier_id)?.name}
                                    onSelect={opt => onUpdate('supplier_id', opt ? opt.id : null)}
                                    onAdd={onAddSupplier}
                                    placeholder="Selecione..."
                                    disabled={isLocked}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="block text-[10px] uppercase font-medium text-slate-500 tracking-widest ml-1 border-b border-slate-100 pb-1">Descrição Comercial</label>
                            <RichTextEditor
                                className="text-sm min-h-[140px] bg-white border border-slate-300 rounded-md overflow-hidden"
                                value={item.productDescription || ''}
                                onChange={val => onUpdate('productDescription', val)}
                                placeholder="Detalhes que o cliente verá na proposta..."
                                readOnly={isLocked}
                            />
                        </div>
                    </div>

                    {/* Logistics & Financial Section */}
                    <div className="col-span-12 lg:col-span-5 space-y-6">
                        {/* LOGISTICS TABLE */}
                        <div className="bg-white border border-slate-300 rounded-md">
                            <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200">
                                <h5 className="text-[10px] font-medium text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-icons-outlined text-sm">local_shipping</span>
                                    Logística e Serviços
                                </h5>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[
                                    { label: 'Personalização', key: 'custoPersonalizacao', suppKey: 'customization_supplier_id' },
                                    { label: 'Layout / Clichê', key: 'layoutCost', suppKey: 'layout_supplier_id' },
                                    { label: 'Frete Fatura', key: 'transpFornecedor', suppKey: 'transport_supplier_id' },
                                    { label: 'Frete Terceiro', key: 'transpCliente', suppKey: 'client_transport_supplier_id' }
                                ].map(row => (
                                    <div key={row.key} className="grid grid-cols-12 gap-3 p-3 items-center hover:bg-slate-50/30 transition-colors">
                                        <div className="col-span-4 text-[11px] font-medium text-slate-600 truncate">{row.label}</div>
                                        <div className="col-span-5">
                                            <CustomSelect
                                                options={suppliersList}
                                                value={suppliersList.find(s => s.id === item[row.suppKey])?.name}
                                                onSelect={opt => onUpdate(row.suppKey, opt ? opt.id : null)}
                                                onAdd={onAddSupplier}
                                                placeholder="Fornecedor..."
                                                compact
                                                disabled={isLocked}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                className="w-full text-right bg-transparent border-none p-0 focus:ring-0 font-medium text-xs text-slate-800 disabled:text-slate-400"
                                                value={formatCurrency(item[row.key] || 0)}
                                                onChange={e => onUpdate(row.key, parseCurrencyToNumber(e.target.value))}
                                                disabled={isLocked}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PRICING CONTROL PANEL */}
                        <div className="bg-slate-50/50 rounded-md p-5 border border-slate-300 space-y-5">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[9px] uppercase font-medium text-slate-400 tracking-widest ml-1">Impostos (NF)</label>
                                    <div className="flex bg-white border border-slate-300 rounded-md p-1 shadow-none">
                                        {[14, 0].map(val => (
                                            <button 
                                                key={val}
                                                onClick={() => !isLocked && handleNFToggle(val)} 
                                                className={`flex-1 py-1 rounded-md text-[10px] font-medium uppercase transition-all ${
                                                    (item.mockNF ?? 14) === val ? 'bg-blue-600 text-white shadow-none' : 'text-slate-400 hover:text-slate-600'
                                                } ${isLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                                            >
                                                {val}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-[2] space-y-2">
                                    <label className="text-[9px] uppercase font-medium text-slate-400 tracking-widest ml-1">Margem de Lucro</label>
                                    <div className="flex gap-2 items-center">
                                        {[10, 15, 20].map(m => (
                                            <button 
                                                key={m} 
                                                onClick={() => !isLocked && handleMarginClick(m)} 
                                                className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all border ${
                                                    !item.isManualMargin && (item.mockMargin ?? 15) === m 
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-none' 
                                                        : 'bg-white border-slate-300 text-slate-400 hover:border-blue-400'
                                                } ${isLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                                            >
                                                {m}%
                                            </button>
                                        ))}
                                        <div className="relative w-16">
                                            <input 
                                                type="number"
                                                className={`w-full rounded-md border px-1 py-1.5 text-[10px] font-medium text-center focus:ring-0 transition-all ${
                                                    item.isManualMargin ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-400'
                                                } ${isLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                                                value={item.isManualMargin ? (item.mockMargin ?? '') : ''}
                                                placeholder="..."
                                                onChange={e => {
                                                    const val = Number(e.target.value);
                                                    onUpdate('isManualMargin', true);
                                                    onUpdate('mockMargin', val);
                                                    const multiplier = 1 + ((item.mockNF ?? 14) + val + (item.mockPayment ?? 0)) / 100;
                                                    onUpdate('fator', multiplier);
                                                }}
                                                disabled={isLocked}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[9px] uppercase font-medium text-slate-400 tracking-widest ml-1">BV (%)</label>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-[10px] font-medium text-center focus:ring-4 focus:ring-blue-50/50 disabled:bg-slate-50 disabled:text-slate-400"
                                            value={item.bvPct || ''}
                                            placeholder="0"
                                            onChange={e => onUpdate('bvPct', Number(e.target.value))}
                                            disabled={isLocked}
                                        />
                                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-medium text-slate-300">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-medium text-slate-400 tracking-widest ml-1">Forma de Faturamento (Acréscimo)</label>
                                <select
                                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-[11px] font-medium text-slate-700 focus:ring-4 focus:ring-blue-50/50 outline-none cursor-pointer"
                                    value={paymentOptions.find(opt => opt.val === (item.mockPayment || 0))?.label || paymentOptions[0].label}
                                    onChange={e => {
                                        const selected = paymentOptions.find(opt => opt.label === e.target.value);
                                        if (selected) handlePaymentChange(selected.val);
                                    }}
                                    disabled={isLocked}
                                >
                                    {paymentOptions.map((opt, i) => (
                                        <option key={i} value={opt.label}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* FINANCIAL SUMMARY TABLE */}
                            <div className="pt-4 border-t border-slate-200 space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-medium uppercase tracking-widest">
                                    <div className="flex justify-between items-center bg-slate-100/50 px-2 py-1.5 rounded-md border border-slate-100">
                                        <span className="text-slate-400">Custo Parcial</span>
                                        <span className="text-slate-700">
                                            {formatCurrency(
                                                ((item.quantity || 0) * (item.priceUnit || 0)) + 
                                                (item.custoPersonalizacao || 0) + 
                                                (item.layoutCost || 0) + 
                                                (item.transpFornecedor || 0) + 
                                                (item.transpCliente || 0)
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-blue-50/30 px-2 py-1.5 rounded-md border border-blue-50">
                                        <span className="text-blue-400">Imposto</span>
                                        <span className="text-blue-600">{formatCurrency(totalVenda * ((item.mockNF ?? 14) / 100))}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-orange-50/30 px-2 py-1.5 rounded-md border border-orange-50">
                                        <span className="text-orange-400">BV Agência</span>
                                        <span className="text-orange-600">{formatCurrency(totalVenda * ((item.bvPct || 0) / 100))}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-100">
                                        <span className="text-emerald-500">Lucro Est.</span>
                                        <span className="text-emerald-700">{formatCurrency(totalVenda - calculateItemRealTotal(item))}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-medium text-slate-400 tracking-widest">Venda Unit.</span>
                                        <span className="text-[16px] font-medium text-slate-800">{formatCurrency(unitVenda)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] uppercase font-medium text-slate-400 tracking-widest">Total Líquido</span>
                                        <span className="text-[20px] font-medium text-blue-600">{formatCurrency(totalVenda)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
