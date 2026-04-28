import React, { useState, useRef, useEffect } from 'react';

// --- Custom Select Wrapper ---
interface CustomSelectProps {
    label?: string;
    options: any[];
    onSelect: (opt: any) => void;
    onAdd?: () => void;
    placeholder?: string;
    value?: string;
    error?: boolean;
    disabled?: boolean;
    onSearch?: (term: string) => void;
    className?: string;
    compact?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
    label, 
    options, 
    onSelect, 
    onAdd, 
    placeholder, 
    value, 
    error, 
    disabled, 
    onSearch,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    // Sync search display with value when closed
    useEffect(() => {
        if (!isOpen) setSearch('');
    }, [isOpen]);

    useEffect(() => {
        if (onSearch && isOpen && search) {
            const timer = setTimeout(() => {
                onSearch(search);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [search, isOpen]);

    useEffect(() => {
        const click = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', click);
        return () => document.removeEventListener('mousedown', click);
    }, []);

    const filtered = options.filter(o => {
        const name = String(o.name || o.nome || '').toLowerCase();
        const code = String(o.code || '').toLowerCase();
        const term = search.toLowerCase().trim();
        if (!term) return true;
        return name.includes(term) || code.includes(term);
    });

    return (
        <div className={`relative ${className || ''}`} ref={ref}>
            {label && <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{label}</label>}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`form-input w-full rounded-md border-gray-300 flex justify-between items-center cursor-pointer bg-white py-0.5 px-2 transition-all hover:border-blue-400 ${error ? 'ring-1 ring-red-500 border-red-500' : ''} ${disabled ? 'bg-gray-100 select-none' : 'hover:shadow-none'}`}
            >
                <div className="flex-1 truncate min-w-0 mr-1">
                    <span className={`text-[11px] font-medium ${!value ? 'text-gray-400' : 'text-gray-900 group-hover:text-blue-600'}`}>
                        {value || placeholder || "Selecione..."}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`material-icons-outlined text-sm flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}>expand_more</span>
                </div>
            </div>
            {isOpen && !disabled && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-none overflow-hidden animate-in fade-in zoom-in duration-150">
                    <div className="p-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <span className="material-icons-outlined text-gray-400 text-sm">search</span>
                        <input 
                            autoFocus 
                            className="w-full text-sm border-0 focus:ring-0 p-1 bg-transparent placeholder-gray-400" 
                            placeholder="Digite para pesquisar..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-200 rounded-full text-gray-400">
                                <span className="material-icons-outlined text-xs">close</span>
                            </button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {/* Clear Selection Option */}
                        {value && (
                            <div 
                                className="px-3 py-2 text-[10px] font-medium text-red-500 hover:bg-red-50 cursor-pointer flex items-center gap-2 border-b border-red-50 transition-colors uppercase" 
                                onClick={() => { onSelect(null); setIsOpen(false); }}
                            >
                                <span className="material-icons-outlined text-sm">block</span> Remover Seleção
                            </div>
                        )}

                        {(() => {
                            const hasCategories = filtered.some(o => o.supplier_category);
                            if (hasCategories && filtered.length > 0) {
                                const categories = Array.from(new Set(filtered.map(o => o.supplier_category).filter(Boolean)));
                                const renderedItems = categories.map(cat => (
                                    <div key={cat as string}>
                                        <div className="px-3 py-1.5 text-[9px] font-medium text-blue-600 bg-blue-50/50 uppercase tracking-widest border-y border-blue-50">{cat === 'GRAVACOES' ? 'PERSONALIZAÇÃO' : (cat as string)}</div>
                                        {filtered.filter(o => o.supplier_category === cat).map(opt => (
                                            <div key={opt.id} className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between group transition-colors" onClick={() => { onSelect(opt); setSearch(opt.name || opt.nome); setIsOpen(false); }}>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-700 font-medium group-hover:text-blue-600">{opt.name || opt.nome}</span>
                                                    {opt.doc && <span className="text-[10px] text-gray-400">{opt.doc}</span>}
                                                </div>
                                                {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500 self-center">{opt.code}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ));

                                // Add section for items without category
                                const noCategory = filtered.filter(o => !o.supplier_category);
                                if (noCategory.length > 0) {
                                    renderedItems.push(
                                        <div key="no-category">
                                            <div className="px-3 py-1.5 text-[9px] font-medium text-gray-400 bg-gray-50 uppercase tracking-widest border-y border-gray-100">OUTROS</div>
                                            {noCategory.map(opt => (
                                                <div key={opt.id} className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between group transition-colors" onClick={() => { onSelect(opt); setSearch(opt.name || opt.nome); setIsOpen(false); }}>
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-700 font-medium group-hover:text-blue-600">{opt.name || opt.nome}</span>
                                                        {opt.doc && <span className="text-[10px] text-gray-400">{opt.doc}</span>}
                                                    </div>
                                                    {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500 self-center">{opt.code}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return renderedItems;
                            }
                            return filtered.map(opt => (
                                <div key={opt.id} className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between group transition-colors" onClick={() => { onSelect(opt); setSearch(opt.name || opt.nome); setIsOpen(false); }}>
                                    <div className="flex flex-col">
                                        <span className="text-gray-700 font-medium group-hover:text-blue-600">{opt.name || opt.nome}</span>
                                        {opt.doc && <span className="text-[10px] text-gray-400">{opt.doc}</span>}
                                    </div>
                                    {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500 self-center">{opt.code}</span>}
                                </div>
                            ));
                        })()}
                        {filtered.length === 0 && search && (
                            <div className="px-4 py-6 text-center">
                                <span className="material-icons-outlined text-gray-200 text-4xl mb-2 block">search_off</span>
                                <div className="text-xs text-gray-400 italic">
                                    {(label || '').includes('Fornecedor') ? 'Nenhum fornecedor encontrado.' : 'Nenhum item encontrado.'}
                                </div>
                            </div>
                        )}
                        {onAdd && (
                            <div className="px-4 py-2.5 text-[11px] text-blue-600 font-medium hover:bg-blue-50 cursor-pointer border-t flex items-center gap-2 transition-colors uppercase tracking-tight" onClick={() => { onAdd(); setIsOpen(false); }}>
                                <span className="material-icons-outlined text-sm">add_circle</span> Cadastrar Novo
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
