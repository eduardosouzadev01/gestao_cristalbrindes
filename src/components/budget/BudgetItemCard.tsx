'use client';

import React, { useRef } from 'react';
import { calculateItemTotal, calculateItemRealTotal, calculateFactorForMinProfit } from '@/utils/formulas';
import { formatCurrency, parseCurrencyToNumber } from '@/utils/formatCurrency';
import RichTextEditor from '@/components/common/RichTextEditor';
import { useAuth } from '@/lib/auth';
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
    const [lastProductCode, setLastProductCode] = React.useState(item.productCode);

    // Deep Image Fix: Auto-recovery and normalization
    React.useEffect(() => {
        if (item.productCode !== lastProductCode) {
            setLastProductCode(item.productCode);
            // If the code changed but we have no image, or it's a generic one, try to refresh
            if (!item.productImage && item.variations?.length > 0) {
                const firstVarImg = item.variations.find((v: any) => v.image)?.image;
                if (firstVarImg) onUpdate('productImage', firstVarImg);
            }
        }
    }, [item.productCode, item.productImage, item.variations]);

    const { hasPermission } = useAuth();
    const canViewMargins = hasPermission('margins') || hasPermission('adm');

    // Lock item if approved to guarantee data integrity
    const isLockedByApproval = item.isApproved && !isLocked;
    const effectiveLock = isLocked || isLockedByApproval;

    const totalVenda = calculateItemTotal(item);
    const unitVenda = totalVenda / (item.quantity || 1);

    const lastToastRef = useRef<number>(0);
    const isAdjustingRef = useRef<boolean>(false);
    
    React.useEffect(() => {
        // Only run if not locked, not already adjusting, and we have a product name and quantity
        if (effectiveLock || isAdjustingRef.current || !item.mockMargin || !item.productName || (item.quantity || 0) === 0) return;
        
        const profit = totalVenda - calculateItemRealTotal(item);
        if (profit >= 100) {
            if (item.isMinMargin) {
                onUpdate('isMinMargin', false);
            }
            return;
        }
        
        isAdjustingRef.current = true;
        
        const newFator = calculateFactorForMinProfit(item, 100);
        const estimatedMargin = Math.round((newFator - 1 - ((item.mockNF ?? 14) / 100) - ((item.mockPayment ?? 0) / 100)) * 100);
        
        onUpdate('fator', newFator);
        onUpdate('isMinMargin', true);
        onUpdate('isManualMargin', true);
        onUpdate('mockMargin', estimatedMargin);
        
        // Only show toast if it's been more than 10 seconds since the last one for this item to avoid spam
        const now = Date.now();
        if (now - lastToastRef.current > 10000) {
            import('sonner').then(m => m.toast.warning('Margem mínima de R$ 100 aplicada.', {
                description: `${item.productName}: Margem ajustada para ${estimatedMargin}%`,
                id: `min-margin-${item.id}`
            }));
            lastToastRef.current = now;
        }
        
        // Reset the ref after a short delay
        setTimeout(() => {
            isAdjustingRef.current = false;
        }, 100);
    }, [totalVenda, item.priceUnit, item.quantity, effectiveLock, item.mockMargin, item.productName]);

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

    const handleMarginClick = (m: number) => {
        if (effectiveLock) return;
        onUpdate('isManualMargin', true);
        onUpdate('mockMargin', m);
        const multiplier = 1 + ((item.mockNF ?? 14) + m + (item.mockPayment ?? 0)) / 100;
        onUpdate('fator', multiplier);
    };

    const handleNFToggle = (nfValue: number) => {
        if (effectiveLock) return;
        onUpdate('mockNF', nfValue);
        const multiplier = 1 + (nfValue + (item.mockMargin ?? 15) + (item.mockPayment ?? 0)) / 100;
        onUpdate('fator', multiplier);
    };

    const handlePaymentChange = (val: number, label: string) => {
        onUpdate('mockPayment', val);
        onUpdate('paymentMethodLabel', label);
        const multiplier = 1 + ((item.mockNF ?? 14) + (item.mockMargin ?? 15) + val) / 100;
        onUpdate('fator', multiplier);
    };

    const paymentOptions = [
        { val: 0, label: '50/50' },
        { val: 5, label: '50% Ped. + 50% 30D (+5%)' },
        { val: 5, label: 'Cartão 1x (+5%)' },
        { val: 5, label: 'Boleto 7-15D (+5%)' },
        { val: 8, label: 'Boleto 21-30D (+8%)' }
    ];

    // Alternating zebra background (same gray as CRM: #F9FAFB)
    const zebraBg = index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white';

    // Normalização de URL de imagem para garantir exibição (ex: caminhos relativos da XBZ)
    const normalizeImageUrl = (url: any) => {
        if (!url || typeof url !== 'string') return url;
        const trimmed = url.trim();
        
        // 1. If it's already a full URL (http or https), return as is
        if (trimmed.startsWith('http')) return trimmed;
        
        // 2. If it's a protocol-relative URL
        if (trimmed.startsWith('//')) return `https:${trimmed}`;
        
        // 3. If it already contains the domain but lacks the protocol (e.g. cdn.xbz...)
        if (trimmed.includes('cdn.xbzbrindes.com.br')) {
            return `https://${trimmed.replace(/^https?:\/\//, '')}`;
        }

        // 4. If it starts with a slash, prepend the default domain
        if (trimmed.startsWith('/')) return `https://cdn.xbzbrindes.com.br${trimmed}`;
        
        // 5. If it's a filename with extension, assume it's relative to XBZ img path
        if (trimmed.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
            // Some entries might be "img/produtos/..." without leading slash
            if (trimmed.startsWith('img/')) {
                return `https://cdn.xbzbrindes.com.br/${trimmed}`;
            }
            // Catch raw filenames (e.g. "13877.jpg")
            if (!trimmed.includes('/')) {
                return `https://cdn.xbzbrindes.com.br/img/produtos/3/${trimmed}`;
            }
            return `https://cdn.xbzbrindes.com.br/${trimmed.replace(/^\//, '')}`;
        }
        
        return trimmed;
    };

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
                        className={`w-14 h-8 flex-shrink-0 flex items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-widest shadow-none cursor-grab active:cursor-grabbing transition-colors ${
                            item.isApproved ? 'bg-[#dcfce7] text-[#166534] border border-[#86efac]' : 'bg-[#0F6CBD] text-white border border-[#0F6CBD]'
                        }`}
                    >
                        Item {String(index + 1).padStart(2, '0')}
                    </div>

                    {/* Badge: Manual Margin */}
                    {item.isManualMargin && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-md border border-amber-200 text-[9px] font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                            <span className="material-icons-outlined text-xs">tune</span>
                            Margem Manual
                        </div>
                    )}

                    {/* Badge: Min Margin applied */}
                    {item.isMinMargin && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-md border border-rose-200 text-[9px] font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                            <span className="material-icons-outlined text-xs">warning_amber</span>
                            Mínimo R$ 100
                        </div>
                    )}
                    
                    <div className="flex-1 max-w-xl">
                        <CustomSelect
                            options={productsList}
                            onSelect={async (p: any) => {
                                if (!p) return;
                                // Logic from legacy system for images and variations
                                const getFirstValid = (prod: any) => {
                                    if (!prod) return null;
                                    const candidates = [
                                        prod.image_url,
                                        prod.image,
                                        prod.thumb,
                                        prod.thumbnail,
                                        ...(Array.isArray(prod.images) ? prod.images : []),
                                        ...(Array.isArray(prod.photos) ? prod.photos : []),
                                        ...(prod.metadata?.images || [])
                                    ];
                                    return candidates.find(img => typeof img === 'string' && img.trim().length > 4) || null;
                                };

                                const mainImage = getFirstValid(p);
                                const allImages = new Set<string>();
                                const addIfValid = (img: any) => {
                                    if (typeof img === 'string' && img.trim()) allImages.add(img);
                                };

                                addIfValid(mainImage);
                                addIfValid(p.image_url);
                                if (p.images && Array.isArray(p.images)) p.images.forEach(addIfValid);

                                // Auto-fill Supplier based on source name
                                if (p.source) {
                                    const sourceLower = p.source.toLowerCase();
                                    const matchedSupplier = suppliersList.find((s: any) =>
                                        s.name && s.name.toLowerCase().includes(sourceLower)
                                    );
                                    if (matchedSupplier) {
                                        onUpdate('supplier_id', matchedSupplier.id);
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
                            disabled={effectiveLock}
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
                    
                    {effectiveLock && item.isApproved && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 text-[9px] font-bold uppercase tracking-widest animate-in fade-in zoom-in duration-300">
                            <span className="material-icons-outlined text-xs">lock</span>
                            Item Bloqueado
                        </div>
                    )}
                    
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
                                    src={normalizeImageUrl(item.productImage)} 
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
                                            <img src={normalizeImageUrl(img)} alt="Thumb" className="w-full h-full object-contain bg-white p-0.5" />
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
                                disabled={effectiveLock}
                            />
                        </div>
                    </div>

                    {/* Specifications Section */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-slate-500 tracking-widest ml-1">Qtd.</label>
                                <input 
                                    type="number"
                                    className="w-full h-10 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm font-medium focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                                    value={item.quantity || ''}
                                    onChange={e => onUpdate('quantity', Number(e.target.value))}
                                    disabled={effectiveLock}
                                />
                            </div>
                            <div className="col-span-4 space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-slate-400 tracking-widest ml-1">Valor Previsto (Unit.)</label>
                                <div className="w-full h-10 bg-slate-50 border border-slate-200 rounded-md px-3 flex items-center">
                                    <span className="text-[13px] font-bold text-slate-400 tabular-nums">
                                        {formatCurrency(item.predictedPrice || item.priceUnit || 0)}
                                    </span>
                                </div>
                            </div>
                            <div className="col-span-4 space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-[#0F6CBD] tracking-widest ml-1">Valor Real (Unit.)</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        className="w-full h-10 bg-white border border-[#0F6CBD]/30 rounded-md px-3 py-2 text-sm font-black text-[#0F6CBD] focus:ring-4 focus:ring-blue-50/50 focus:border-[#0F6CBD] transition-all disabled:bg-slate-50 disabled:text-slate-500"
                                        value={formatCurrency(item.priceUnit || 0)}
                                        onChange={e => onUpdate('priceUnit', parseCurrencyToNumber(e.target.value))}
                                        disabled={effectiveLock}
                                    />
                                    {!effectiveLock && <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons-outlined text-xs text-blue-300">edit</span>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {canViewMargins && (
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] uppercase font-medium text-slate-400 tracking-widest ml-1">Custo Parcial Produ. Previsto</label>
                                    <div className="w-full h-10 bg-slate-50 border border-slate-200 rounded-md px-3 flex items-center">
                                        <span className="text-[13px] font-bold text-slate-500 tabular-nums">
                                            {formatCurrency((item.predictedPrice || item.priceUnit || 0) * (item.quantity || 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {canViewMargins && (
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] uppercase font-medium text-blue-600 tracking-widest ml-1">Custo Parcial Produ. Real</label>
                                    <div className="w-full h-10 bg-blue-50/50 border border-blue-100 rounded-md px-3 flex items-center">
                                        <span className="text-[13px] font-bold text-blue-700 tabular-nums">
                                            {formatCurrency((item.priceUnit || 0) * (item.quantity || 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-5 space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-slate-500 tracking-widest ml-1">Cor do Produto</label>
                                {item.variations && item.variations.length > 0 ? (
                                    <select
                                        className="w-full h-10 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm font-medium uppercase focus:ring-4 focus:ring-blue-50 cursor-pointer"
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
                                        className="w-full h-10 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm font-medium uppercase focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="Ex: Azul"
                                        value={item.productColor || ''}
                                        onChange={e => onUpdate('productColor', e.target.value)}
                                        disabled={effectiveLock}
                                    />
                                )}
                            </div>
                            <div className="col-span-7 space-y-1.5">
                                <label className="block text-[10px] uppercase font-medium text-slate-500 tracking-widest ml-1">Fornecedor</label>
                                <CustomSelect
                                    options={suppliersList}
                                    value={suppliersList.find(s => s.id === item.supplier_id)?.name}
                                    onSelect={opt => onUpdate('supplier_id', opt ? opt.id : null)}
                                    onAdd={onAddSupplier}
                                    placeholder="Selecione..."
                                    disabled={effectiveLock}
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
                                readOnly={effectiveLock}
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
                                    { label: 'Frete Terceiro', key: 'transpCliente', suppKey: 'client_transport_supplier_id' },
                                    { label: 'Despesa Extra', key: 'despesaExtra', suppKey: 'extra_expense_supplier_id' }
                                ].map(row => (
                                    <div key={row.key} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50/50 transition-colors group/row">
                                        <div className="col-span-3">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">{row.label}</span>
                                            <span className="text-[11px] font-medium text-slate-600 truncate block">
                                                {suppliersList.find(s => s.id === item[row.suppKey])?.name || 'Não definido'}
                                            </span>
                                        </div>
                                        <div className="col-span-6">
                                            <CustomSelect
                                                options={suppliersList}
                                                value={suppliersList.find(s => s.id === item[row.suppKey])?.name}
                                                onSelect={opt => onUpdate(row.suppKey, opt ? opt.id : null)}
                                                onAdd={onAddSupplier}
                                                placeholder="Trocar fornecedor..."
                                                compact
                                                disabled={effectiveLock}
                                            />
                                        </div>
                                        <div className="col-span-3 text-right">
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block mb-0.5">Valor do Custo</span>
                                            <div className="relative group/input">
                                                <input
                                                    className="w-full text-right bg-transparent border-none p-0 focus:ring-0 font-black text-xs text-slate-700 disabled:text-slate-400 hover:text-blue-600 transition-colors"
                                                    value={formatCurrency(item[row.key] || 0)}
                                                    onChange={e => onUpdate(row.key, parseCurrencyToNumber(e.target.value))}
                                                    disabled={effectiveLock}
                                                />
                                                {!effectiveLock && <div className="absolute -bottom-1 right-0 w-full h-px bg-slate-200 group-hover/input:bg-blue-400 transition-colors"></div>}
                                            </div>
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
                                                onClick={() => !effectiveLock && handleNFToggle(val)} 
                                                className={`flex-1 py-1 rounded-md text-[10px] font-medium uppercase transition-all ${
                                                    (item.mockNF ?? 14) === val ? 'bg-blue-600 text-white shadow-none' : 'text-slate-400 hover:text-slate-600'
                                                } ${effectiveLock ? 'cursor-not-allowed opacity-80' : ''}`}
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
                                                    item.mockMargin === m 
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-none' 
                                                        : 'bg-white border-slate-300 text-slate-400 hover:border-blue-400'
                                                } ${effectiveLock ? 'cursor-not-allowed opacity-80' : ''}`}
                                            >
                                                {m}%
                                            </button>
                                        ))}
                                        <div className="relative w-16">
                                            <input 
                                                type="number"
                                                className={`w-full rounded-md border px-1 py-1.5 text-[10px] font-medium text-center focus:ring-0 transition-all ${
                                                    item.isManualMargin ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-400'
                                                } ${effectiveLock ? 'cursor-not-allowed opacity-80' : ''}`}
                                                value={item.isManualMargin ? (item.mockMargin ?? '') : ''}
                                                placeholder="..."
                                                onChange={e => {
                                                    if (effectiveLock) return;
                                                    const val = Number(e.target.value);
                                                    if (!canViewMargins && val < 10) {
                                                        import('sonner').then(module => module.toast.error('A margem mínima permitida é de 10%. Apenas a gestão pode aplicar margens menores.'));
                                                        return;
                                                    }
                                                    onUpdate('isManualMargin', true);
                                                    onUpdate('mockMargin', val);
                                                    const multiplier = 1 + ((item.mockNF ?? 14) + val + (item.mockPayment ?? 0)) / 100;
                                                    onUpdate('fator', multiplier);
                                                }}
                                                disabled={effectiveLock}
                                            />
                                        </div>
                                    </div>
                                    {item.isMinMargin && (
                                        <div className="mt-2 px-3 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-medium uppercase flex items-center gap-2">
                                            <span className="material-icons-outlined text-[14px]">warning_amber</span>
                                            Margem mínima aplicada ({item.mockMargin}%) — Lucro: {formatCurrency(totalVenda - calculateItemRealTotal(item))}
                                        </div>
                                    )}
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
                                            disabled={effectiveLock}
                                        />
                                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-medium text-slate-300">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-medium text-slate-400 tracking-widest ml-1 flex justify-between">
                                    Forma de Faturamento (Acréscimo %)
                                </label>
                                <div className="relative">
                                    <select 
                                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-[10px] text-slate-600 outline-none focus:border-orange-500 transition-all uppercase font-medium appearance-none cursor-pointer"
                                        value={item.paymentMethodLabel || ''}
                                        onChange={(e) => {
                                            const opt = paymentOptions.find(o => o.label === e.target.value);
                                            if (opt) handlePaymentChange(opt.val, opt.label);
                                            else onUpdate('paymentMethodLabel', e.target.value);
                                        }}
                                        disabled={effectiveLock}
                                    >
                                        <option value="">Selecione uma opção...</option>
                                        {paymentOptions.map(opt => (
                                            <option key={opt.label} value={opt.label}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <span className="material-icons-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">expand_more</span>
                                </div>
                            </div>

                            {/* FINANCIAL SUMMARY TABLE */}
                            <div className="pt-4 border-t border-slate-200 space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-medium uppercase tracking-widest">
                                    {canViewMargins && (
                                        <div className="flex justify-between items-center bg-slate-100/50 px-2 py-1.5 rounded-md border border-slate-100">
                                            <span className="text-slate-400">Custo Parcial</span>
                                            <span className="text-slate-700">
                                                {formatCurrency(
                                                    ((item.quantity || 0) * (item.priceUnit || 0)) + 
                                                    (item.custoPersonalizacao || 0) + 
                                                    (item.layoutCost || 0) + 
                                                    (item.transpFornecedor || 0) + 
                                                    (item.transpCliente || 0) +
                                                    (item.despesaExtra || 0)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center bg-blue-50/30 px-2 py-1.5 rounded-md border border-blue-50">
                                        <span className="text-blue-400">Imposto</span>
                                        <span className="text-blue-600">{formatCurrency(totalVenda * ((item.mockNF ?? 14) / 100))}</span>
                                    </div>
                                    {canViewMargins && item.mockPayment > 0 && (
                                        <div className="flex justify-between items-center bg-orange-50/20 px-2 py-1.5 rounded-md border border-orange-100">
                                            <span className="text-orange-400">Acréscimo ({item.mockPayment}%)</span>
                                            <span className="text-orange-600">{formatCurrency(totalVenda * (item.mockPayment / 100))}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center bg-orange-50/30 px-2 py-1.5 rounded-md border border-orange-50">
                                        <span className="text-orange-400">BV Agência</span>
                                        <span className="text-orange-600">{formatCurrency(totalVenda * ((item.bvPct || 0) / 100))}</span>
                                    </div>
                                    {canViewMargins && (
                                        <div className="flex justify-between items-center bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-100">
                                            <span className="text-emerald-500">Lucro Est.</span>
                                            <span className="text-emerald-700">{formatCurrency(totalVenda - calculateItemRealTotal(item))}</span>
                                        </div>
                                    )}
                                    {item.useModernRounding && (
                                        <div className={`flex justify-between items-center bg-purple-50/50 px-2 py-1.5 rounded-md border border-purple-100 ${!canViewMargins ? 'col-span-1' : 'col-span-2'}`}>
                                            <span className="text-purple-500">Comissão (1%)</span>
                                            <span className="text-purple-700">{formatCurrency(totalVenda * 0.01)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-medium text-slate-400 tracking-widest">Venda Unit.</span>
                                        <span className="text-[16px] font-medium text-slate-800">{formatCurrency(unitVenda)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] uppercase font-medium text-slate-400 tracking-widest">Valor de Venda</span>
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
