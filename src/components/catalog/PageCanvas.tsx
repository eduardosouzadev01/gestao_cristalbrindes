import React from 'react';
import ProductSlot from './ProductSlot';
import type { CatalogPageWithSlots, CatalogSlot, Catalog } from '../../types/catalog';

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
  // Resolve background style
  const getBgStyle = (): React.CSSProperties => {
    const bgValue = page.bg_override || catalog.bg_value;
    const bgType = page.bg_override ? 'image-or-solid' : catalog.bg_type;

    if (catalog.bg_type === 'gradient' && !page.bg_override) {
      return { background: bgValue };
    }
    if (bgValue?.startsWith('http') || bgValue?.startsWith('data:')) {
      return { backgroundImage: `url(${bgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: bgValue || '#ffffff' };
  };

  const slots = [...(page.slots || [])].sort((a, b) => a.slot_position - b.slot_position);

  // Fill missing slots up to 4
  const fillSlots = (arr: CatalogSlot[], count: number): CatalogSlot[] => {
    const filled = [...arr];
    for (let i = 0; i < count; i++) {
        if (!filled.find(s => s.slot_position === i)) {
            filled.push({
                id: `placeholder-vertical-${i}`,
                page_id: page.id,
                slot_position: i,
                orientation: 'vertical',
                product_id: null,
                custom_image: null,
                custom_title: null,
                custom_desc: null,
                show_price: false,
                show_code: true,
                created_at: '',
            });
        }
    }
    return filled.sort((a, b) => a.slot_position - b.slot_position).slice(0, count);
  };

  // We want 4 vertical slots per page
  // Ignore the saved orientation and force them to 'vertical' for rendering
  const allSlots = fillSlots(slots, 4).map(s => ({ ...s, orientation: 'vertical' as const }));

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
      {/* Inner padding container */}
      <div
        style={{
          position: 'absolute',
          inset: 24 * scale,
          display: 'grid',
          gridTemplateRows: '1fr 1fr',
          gridTemplateColumns: '1fr 1fr',
          gap: 12 * scale,
        }}
      >
        {allSlots.map(slot => (
          <ProductSlot
            key={slot.id}
            slot={slot}
            catalog={catalog}
            onAddProduct={onAddProduct}
            onEditSlot={onEditSlot}
            onClearSlot={onClearSlot}
            isPreview={isPreview || slot.id.startsWith('placeholder')}
          />
        ))}
      </div>

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
