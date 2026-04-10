import React, { useState, useEffect, useRef } from 'react';
import type { CatalogSlot } from '../../types/catalog';

interface ProductSlotProps {
  slot: CatalogSlot;
  catalog: { font_family: string; primary_color: string; secondary_color: string; bg_value: string };
  onAddProduct: (slotId: string) => void;
  onEditSlot: (slot: CatalogSlot) => void;
  onClearSlot: (slotId: string) => void;
  isPreview?: boolean;
}

const ProductSlot: React.FC<ProductSlotProps> = ({
  slot, catalog, onAddProduct, onEditSlot, onClearSlot, isPreview = false
}) => {
  const [hovered, setHovered] = useState(false);
  const isVertical = slot.orientation === 'vertical';
  const hasProduct = !!(slot.product_id || slot.custom_title);

  const displayImage = slot.custom_image || slot.product?.image_url || null;
  const displayTitle = slot.custom_title || slot.product?.name || null;
  const displayCode = slot.product?.code || null;
  const displayDesc = slot.custom_desc || slot.product?.description || null;
  const displayPrice = slot.product?.unit_price || null;

  const containerClass = isVertical
    ? 'flex flex-col h-full'
    : 'flex flex-row h-full';

  const imageClass = isVertical
    ? 'w-full flex-1 overflow-hidden rounded-t-lg'
    : 'h-full w-2/5 overflow-hidden rounded-l-lg flex-shrink-0';

  const infoClass = isVertical
    ? 'px-3 py-2.5 flex flex-col gap-0.5'
    : 'flex-1 px-4 py-3 flex flex-col justify-center gap-1';

  if (!hasProduct && !isPreview) {
    return (
      <div
        className="h-full w-full relative group cursor-pointer"
        style={{ border: '2px dashed #d1d5db', borderRadius: 12, background: '#fafafa' }}
        onClick={() => onAddProduct(slot.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{
              background: hovered ? catalog.primary_color : '#e5e7eb',
              transform: hovered ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <span className="material-icons-outlined text-lg" style={{ color: hovered ? '#fff' : '#9ca3af' }}>add</span>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-widest transition-colors"
            style={{ color: hovered ? catalog.primary_color : '#9ca3af' }}
          >
            Adicionar Produto
          </span>
          <span className="text-[9px] text-gray-300 uppercase tracking-widest">
            {isVertical ? 'Vertical' : 'Horizontal'}
          </span>
        </div>
      </div>
    );
  }

  if (!hasProduct && isPreview) {
    return (
      <div
        className="h-full w-full flex items-center justify-center"
        style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#f9fafb' }}
      >
        <span className="material-icons-outlined text-gray-200 text-3xl">image</span>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full relative group overflow-hidden"
      style={{
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: '#fff',
        fontFamily: catalog.font_family,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={containerClass}>
        {/* Image area */}
        <div className={imageClass} style={{ background: '#f3f4f6' }}>
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayTitle || 'produto'}
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-icons-outlined text-gray-300 text-4xl">image</span>
            </div>
          )}
        </div>

        {/* Info area */}
        <div className={infoClass}>
          {slot.show_code && displayCode && (
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: catalog.secondary_color }}
            >
              REF: {displayCode}
            </span>
          )}
          {displayTitle && (
            <span
              className="text-[11px] font-bold leading-tight line-clamp-2"
              style={{ color: catalog.primary_color, fontFamily: catalog.font_family }}
            >
              {displayTitle}
            </span>
          )}
          {displayDesc && (
            <span
              className="text-[9px] leading-tight line-clamp-2 mt-0.5"
              style={{ color: catalog.secondary_color }}
            >
              {displayDesc}
            </span>
          )}
          {slot.show_price && displayPrice && (
            <span
              className="text-[11px] font-black mt-1"
              style={{ color: catalog.primary_color }}
            >
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayPrice)}
            </span>
          )}
        </div>
      </div>

      {/* Hover actions (editor only) */}
      {!isPreview && hovered && (
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          <button
            onClick={e => { e.stopPropagation(); onEditSlot(slot); }}
            className="w-6 h-6 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-blue-50 transition-all"
            title="Editar slot"
          >
            <span className="material-icons-outlined text-[12px] text-blue-600">edit</span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClearSlot(slot.id); }}
            className="w-6 h-6 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-red-50 transition-all"
            title="Remover produto"
          >
            <span className="material-icons-outlined text-[12px] text-red-400">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductSlot;
