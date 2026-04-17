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

  const renderLayout = () => {
    switch (layout) {
      case 'spotlight': return renderSpotlight();
      case 'duo-wide':  return renderDuoWide();
      case 'mosaic':    return renderMosaic();
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
        boxShadow: '0 4px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
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
