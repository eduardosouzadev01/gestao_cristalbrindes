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

  // Gather all valid active images, avoiding duplicates
  const allImages = Array.from(new Set([
    displayImage,
    ...(slot.product?.images || [])
  ])).filter((img): img is string => typeof img === 'string' && img.trim().length > 0);

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
            className="text-[10px] font-medium uppercase tracking-widest transition-colors"
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
        boxShadow: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={containerClass}>
        {/* Image area */}
        <div className={imageClass} style={{ background: '#fff' }}>
          {allImages.length > 0 ? (
            <div className="w-full h-full flex flex-col gap-1 p-2">
              <div className="flex-1 min-h-0 w-full flex items-center justify-center rounded-md overflow-hidden">
                <img
                  src={allImages[0]}
                  alt={displayTitle || 'produto'}
                  className="w-full h-full object-contain"
                  style={{ display: 'block' }}
                />
              </div>
              {allImages.length > 1 && (
                <div className="flex flex-row gap-1 h-[25%] min-h-[40px] max-h-[70px] justify-center items-center">
                  {allImages.slice(1, 4).map((imgUrl, idx) => (
                    <div key={idx} className="h-full flex-1 aspect-square max-w-[80px] bg-white border border-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                      <img src={imgUrl} alt="detalhe" className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              className="text-[9px] font-medium uppercase tracking-widest"
              style={{ color: catalog.secondary_color }}
            >
              REF: {displayCode}
            </span>
          )}
          {displayTitle && (
            <span
              className="text-[11px] font-medium leading-tight line-clamp-2"
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
              className="text-[11px] font-medium mt-1"
              style={{ color: catalog.primary_color }}
            >
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayPrice)}
            </span>
          )}

          {/* Fazer Orçamento Button */}
          <div className="mt-auto pt-2 border-t border-gray-100">
            <a
              href={`https://wa.me/5527997879995?text=${encodeURIComponent(`Olá, desejo saber mais sobre ${displayTitle} - ${displayCode || 'sem referência'}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => {
                if (!isPreview) e.preventDefault(); // Prevent navigating away when in editor
              }}
              className="group w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] font-medium uppercase tracking-widest text-[#25D366] bg-transparent border border-[#25D366]/30 hover:bg-[#25D366]/10 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Orçamento
            </a>
          </div>
        </div>
      </div>

      {/* Hover actions (editor only) */}
      {!isPreview && hovered && (
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          <button
            onClick={e => { e.stopPropagation(); onEditSlot(slot); }}
            className="w-6 h-6 rounded-full bg-white/90 shadow-none flex items-center justify-center hover:bg-blue-50 transition-all"
            title="Editar slot"
          >
            <span className="material-icons-outlined text-[12px] text-blue-600">edit</span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClearSlot(slot.id); }}
            className="w-6 h-6 rounded-full bg-white/90 shadow-none flex items-center justify-center hover:bg-red-50 transition-all"
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
