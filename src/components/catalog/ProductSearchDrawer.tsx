import React, { useState, useEffect, useRef } from 'react';
import { useCatalogSlots } from '../../hooks/useCatalogSlots';
import type { SlotProduct } from '../../types/catalog';

interface ProductSearchDrawerProps {
  isOpen: boolean;
  slotId: string | null;
  onClose: () => void;
  onSelect: (slotId: string, product: SlotProduct) => void;
}

const ProductSearchDrawer: React.FC<ProductSearchDrawerProps> = ({ isOpen, slotId, onClose, onSelect }) => {
  const [term, setTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchResults, searching, searchProducts } = useCatalogSlots();

  useEffect(() => {
    if (isOpen) {
      setTerm('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(term), 300);
    return () => clearTimeout(t);
  }, [term, searchProducts]);

  const handleSelect = (product: SlotProduct) => {
    if (!slotId) return;
    onSelect(slotId, product);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: 380,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          boxShadow: 'none',
          borderLeft: '1px solid rgba(226,232,240,0.8)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: '#e2e8f0' }}
        >
          <div>
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-tight">Selecionar Produto</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Busque por nome ou código de referência</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <span className="material-icons-outlined text-gray-400 text-sm">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              ref={inputRef}
              type="text"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="NOME OU REF. DO PRODUTO..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-md text-xs font-medium uppercase placeholder:text-gray-300 tracking-wide bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
            />
            {searching && (
              <span className="material-icons-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm animate-spin">sync</span>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {!term && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <span className="material-icons-outlined text-gray-200 text-4xl">search</span>
              <p className="text-[10px] text-gray-300 uppercase tracking-widest text-center">
                Digite para buscar<br />nos produtos cadastrados
              </p>
            </div>
          )}

          {term && !searching && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <span className="material-icons-outlined text-gray-200 text-4xl">inventory_2</span>
              <p className="text-[10px] text-gray-300 uppercase tracking-widest">Nenhum produto encontrado</p>
            </div>
          )}

          {searchResults.map(product => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-blue-50 transition-all group text-left border border-transparent hover:border-blue-100"
            >
              {/* Thumbnail */}
              <div
                className="w-12 h-12 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: '#f1f5f9' }}
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-icons-outlined text-gray-300 text-lg">image</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-800 uppercase leading-tight truncate group-hover:text-blue-700 transition-colors">
                  {product.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {product.code && (
                    <span className="text-[9px] font-medium text-gray-400 uppercase">REF: {product.code}</span>
                  )}
                  {product.source && (
                    <span
                      className="text-[8px] font-medium uppercase px-1.5 py-0.5 rounded-md"
                      style={{
                        background: product.source === 'XBZ' ? '#fff7ed' : product.source === 'Asia' ? '#fef2f2' : '#eff6ff',
                        color: product.source === 'XBZ' ? '#c2410c' : product.source === 'Asia' ? '#dc2626' : '#1d4ed8',
                      }}
                    >
                      {product.source}
                    </span>
                  )}
                </div>
                {product.unit_price && (
                  <p className="text-[9px] font-medium text-gray-500 mt-0.5">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.unit_price)}
                  </p>
                )}
              </div>

              <span className="material-icons-outlined text-gray-300 group-hover:text-blue-400 transition-colors text-sm flex-shrink-0">
                add_circle
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ProductSearchDrawer;
