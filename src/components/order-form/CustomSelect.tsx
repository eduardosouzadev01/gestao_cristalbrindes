import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
    label: string;
    options: any[];
    onSelect: (opt: any) => void;
    onAdd: () => void;
    placeholder?: string;
    value?: string;
    error?: boolean;
    disabled?: boolean;
    onSearch?: (term: string) => void;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    options = [],
    onSelect,
    onAdd,
    placeholder,
    value,
    error,
    disabled,
    onSearch
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(value || '');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSearch(value || '');
    }, [value]);

    useEffect(() => {
        if (onSearch && isOpen) {
            const timer = setTimeout(() => {
                onSearch(search);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [search, isOpen]);

    const filtered = options.filter(o => {
        const name = (o.name || '').toLowerCase();
        const code = (o.code || '').toLowerCase();
        const searchTerm = (search || '').toLowerCase();
        return name.includes(searchTerm) || code.includes(searchTerm);
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</label>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`form-input w-full rounded-lg flex justify-between items-center cursor-pointer bg-white py-2 ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
                <span className={`truncate flex-1 min-w-0 ${(search || value) ? "text-gray-900" : "text-gray-400"}`}>{search || value || placeholder || "Selecione..."}</span>
                <span className="material-icons-outlined text-gray-400 flex-shrink-0 ml-1">expand_more</span>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-[110] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            autoFocus
                            className="w-full text-sm border-0 focus:ring-0 p-1"
                            placeholder="Pesquisar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {(() => {
                            const hasCategories = filtered.some(o => o.supplier_category);
                            if (hasCategories && filtered.length > 0) {
                                const categories = Array.from(new Set(filtered.map(o => o.supplier_category).filter(Boolean)));
                                const renderedItems = categories.map(cat => (
                                    <div key={cat as string}>
                                        <div className="px-4 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 uppercase tracking-widest border-y border-blue-100">{cat === 'GRAVACOES' ? 'PERSONALIZAÇÃO' : (cat as string)}</div>
                                        {filtered.filter(o => o.supplier_category === cat).map(opt => (
                                            <div key={opt.id} className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer text-gray-700 flex justify-between group" onClick={() => { onSelect(opt); setSearch(opt.name); setIsOpen(false); }}>
                                                <span>{opt.name}</span>
                                                {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500">{opt.code}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ));

                                // Add section for items without category
                                const noCategory = filtered.filter(o => !o.supplier_category);
                                if (noCategory.length > 0) {
                                    renderedItems.push(
                                        <div key="no-category">
                                            <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 uppercase tracking-widest border-y border-gray-100">OUTROS</div>
                                            {noCategory.map(opt => (
                                                <div key={opt.id} className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer text-gray-700 flex justify-between group" onClick={() => { onSelect(opt); setSearch(opt.name); setIsOpen(false); }}>
                                                    <span>{opt.name}</span>
                                                    {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500">{opt.code}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return renderedItems as any;
                            }
                            return filtered.map(opt => (
                                <div key={opt.id} className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer text-gray-700 flex justify-between group" onClick={() => { onSelect(opt); setSearch(opt.name); setIsOpen(false); }}>
                                    <span>{opt.name}</span>
                                    {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500">{opt.code}</span>}
                                </div>
                            ));
                        })()}
                        {filtered.length === 0 && (
                            <div className="px-4 py-2 text-xs text-gray-400 italic">{label.includes('Fornecedor') ? 'Nenhum fornecedor encontrado.' : 'Nenhum item encontrado.'}</div>
                        )}
                        <div
                            className="px-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 cursor-pointer border-t border-gray-100 flex items-center gap-2"
                            onClick={() => { onAdd(); setIsOpen(false); }}
                        >
                            <span className="material-icons-outlined text-sm">add</span> Adicionar Novo
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
