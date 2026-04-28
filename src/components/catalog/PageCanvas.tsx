import React from 'react';
import ProductSlot from './ProductSlot';
import type { CatalogPageWithSlots, CatalogSlot, Catalog, PageLayout } from '../../types/catalog';

interface PageCanvasProps {
  page: CatalogPageWithSlots;
  catalog: Catalog;
  onAddProduct: (slotId: string) => void;
  onEditSlot: (slot: CatalogSlot) => void;
  onClearSlot: (slotId: string) => void;
  isPreview?: boolean;
  scale?: number;
}

const A4_WIDTH = 794;   // px at 96dpi
const A4_HEIGHT = 1123; // px at 96dpi

const PageCanvas: React.FC<PageCanvasProps> = ({
  page, catalog, onAddProduct, onEditSlot, onClearSlot,
  isPreview = false, scale = 0.75,
}) => {
  const getBgStyle = (): React.CSSProperties => {
    const bgValue = page.bg_override || catalog.bg_value;

    if (catalog.bg_type === 'gradient' && !page.bg_override) {
      return { background: bgValue };
    }
    if (bgValue?.startsWith('http') || bgValue?.startsWith('data:')) {
      return { backgroundImage: `url(${bgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: bgValue || '#ffffff' };
  };

  const slots = [...(page.slots || [])].sort((a, b) => a.slot_position - b.slot_position);

  const makeSlot = (pos: number): CatalogSlot => ({
    id: `placeholder-${pos}`,
    page_id: page.id,
    slot_position: pos,
    orientation: 'vertical',
    product_id: null,
    custom_image: null,
    custom_title: null,
    custom_desc: null,
    show_price: false,
    show_code: true,
    created_at: '',
  });

  const getSlot = (pos: number): CatalogSlot =>
    slots.find(s => s.slot_position === pos) || makeSlot(pos);

  const layout: PageLayout = page.page_layout || 'grid-2x2';
  const pad = 24 * scale;
  const gap = 12 * scale;

  // ── Layout renderers ────────────────────────────────────────────────────────

  const renderGrid2x2 = () => (
    <div
      style={{
        position: 'absolute',
        inset: pad,
        display: 'grid',
        gridTemplateRows: '1fr 1fr',
        gridTemplateColumns: '1fr 1fr',
        gap,
      }}
    >
      {[0, 1, 2, 3].map(pos => (
        <ProductSlot
          key={pos}
          slot={{ ...getSlot(pos), orientation: 'vertical' }}
          catalog={catalog}
          onAddProduct={onAddProduct}
          onEditSlot={onEditSlot}
          onClearSlot={onClearSlot}
          isPreview={isPreview}
        />
      ))}
    </div>
  );

  const renderSpotlight = () => (
    <div
      style={{
        position: 'absolute',
        inset: pad,
        display: 'grid',
        gridTemplateRows: '1fr',
        gridTemplateColumns: '1fr',
        gap,
      }}
    >
      <ProductSlot
        slot={{ ...getSlot(0), orientation: 'vertical' }}
        catalog={catalog}
        onAddProduct={onAddProduct}
        onEditSlot={onEditSlot}
        onClearSlot={onClearSlot}
        isPreview={isPreview}
      />
    </div>
  );

  const renderDuoWide = () => (
    <div
      style={{
        position: 'absolute',
        inset: pad,
        display: 'grid',
        gridTemplateRows: '1fr 1fr',
        gridTemplateColumns: '1fr',
        gap,
      }}
    >
      {[0, 1].map(pos => (
        <ProductSlot
          key={pos}
          slot={{ ...getSlot(pos), orientation: 'horizontal' }}
          catalog={catalog}
          onAddProduct={onAddProduct}
          onEditSlot={onEditSlot}
          onClearSlot={onClearSlot}
          isPreview={isPreview}
        />
      ))}
    </div>
  );

  // Mosaic: left col full-height (pos 0), right col top-half (pos 1) + bottom-quarter x2 (pos 2, 3)
  const renderMosaic = () => (
    <div
      style={{
        position: 'absolute',
        inset: pad,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap,
      }}
    >
      {/* Left: spans 2 rows */}
      <div style={{ gridRow: '1 / 3' }}>
        <ProductSlot
          slot={{ ...getSlot(0), orientation: 'vertical' }}
          catalog={catalog}
          onAddProduct={onAddProduct}
          onEditSlot={onEditSlot}
          onClearSlot={onClearSlot}
          isPreview={isPreview}
        />
      </div>
      {/* Right top */}
      <ProductSlot
        slot={{ ...getSlot(1), orientation: 'vertical' }}
        catalog={catalog}
        onAddProduct={onAddProduct}
        onEditSlot={onEditSlot}
        onClearSlot={onClearSlot}
        isPreview={isPreview}
      />
      {/* Right bottom */}
      <ProductSlot
        slot={{ ...getSlot(2), orientation: 'vertical' }}
        catalog={catalog}
        onAddProduct={onAddProduct}
        onEditSlot={onEditSlot}
        onClearSlot={onClearSlot}
        isPreview={isPreview}
      />
    </div>
  );

  const renderFullImage = () => {
    const slot0 = getSlot(0);
    const hasImage = slot0.custom_image || slot0.product?.image_url;
    
    if (!hasImage && !isPreview) {
      return (
        <div style={{ position: 'absolute', inset: pad }}>
          <ProductSlot
            slot={{ ...slot0, orientation: 'vertical' }}
            catalog={catalog}
            onAddProduct={onAddProduct}
            onEditSlot={onEditSlot}
            onClearSlot={onClearSlot}
            isPreview={isPreview}
          />
        </div>
      );
    }
    
    if (!hasImage && isPreview) {
      return null;
    }

    return (
      <div 
        style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
        className="group relative"
      >
        <img 
          src={hasImage as string} 
          alt="Página inteira" 
          className="w-full h-full object-cover" 
        />
        {!isPreview && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
            <button
              onClick={() => onEditSlot(slot0)}
              className="mr-2 px-4 py-2 bg-white rounded-md text-xs font-medium text-gray-800 shadow-none"
            >
              Trocar Imagem
            </button>
            <button
               onClick={() => onClearSlot(slot0.id)}
               className="px-4 py-2 bg-red-500 rounded-md text-xs font-medium text-white shadow-none"
             >
               Remover
             </button>
          </div>
        )}
      </div>
    );
  };

  const renderLayout = () => {
    switch (layout) {
      case 'spotlight': return renderSpotlight();
      case 'duo-wide':  return renderDuoWide();
      case 'mosaic':    return renderMosaic();
      case 'full-image':return renderFullImage();
      default:          return renderGrid2x2();
    }
  };

  return (
    <div
      style={{
        width: A4_WIDTH * scale,
        height: A4_HEIGHT * scale,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        boxShadow: 'none',
        fontFamily: catalog.font_family,
        ...getBgStyle(),
      }}
      className="select-none"
    >
      {renderLayout()}

      {/* Page number badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 10 * scale,
          right: 16 * scale,
          fontSize: 9 * scale,
          fontFamily: catalog.font_family,
          color: catalog.secondary_color,
          opacity: 0.5,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {page.page_number}
      </div>

      {/* Logo in top-right if available */}
      {catalog.logo_url && (
        <div
          style={{
            position: 'absolute',
            top: 12 * scale,
            right: 16 * scale,
            maxHeight: 28 * scale,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img
            src={catalog.logo_url}
            alt="logo"
            style={{ maxHeight: 28 * scale, width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }}
          />
        </div>
      )}
    </div>
  );
};

export { A4_WIDTH, A4_HEIGHT };
export default PageCanvas;
