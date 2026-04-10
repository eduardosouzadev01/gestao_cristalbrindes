import React from 'react';
import type { CatalogPageWithSlots } from '../../types/catalog';

interface PageThumbnailListProps {
  pages: CatalogPageWithSlots[];
  currentPageId: string | null;
  onSelect: (pageId: string) => void;
  onAdd: () => void;
  onDelete: (pageId: string) => void;
  isAdding?: boolean;
}

const PageThumbnailList: React.FC<PageThumbnailListProps> = ({
  pages, currentPageId, onSelect, onAdd, onDelete, isAdding = false,
}) => {
  return (
    <div
      style={{
        width: 100,
        background: '#f8fafc',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
        paddingTop: 12,
        paddingBottom: 12,
      }}
    >
      {pages.map(page => {
        const isActive = page.id === currentPageId;
        const filledSlots = page.slots.filter(s => s.product_id || s.custom_title).length;

        return (
          <div key={page.id} className="relative group px-2 mb-2">
            <button
              onClick={() => onSelect(page.id)}
              className="w-full transition-all"
              title={`Página ${page.page_number}`}
            >
              {/* Thumbnail card */}
              <div
                className="w-full aspect-[3/4] rounded overflow-hidden relative transition-all"
                style={{
                  border: isActive ? '2px solid #1e3a5f' : '2px solid transparent',
                  boxShadow: isActive ? '0 0 0 1px #1e3a5f, 0 2px 8px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.08)',
                  background: '#fff',
                }}
              >
                {/* Mini grid of 4 slots */}
                <div className="absolute inset-1 grid gap-0.5" style={{ gridTemplateRows: '1fr 1fr', gridTemplateColumns: '1fr 1fr' }}>
                  {[0, 1, 2, 3].map(pos => {
                    const slot = page.slots.find(s => s.slot_position === pos);
                    const img = slot?.custom_image || slot?.product?.image_url;
                    return (
                      <div
                        key={pos}
                        className="rounded-sm overflow-hidden flex items-center justify-center"
                        style={{ background: img ? 'transparent' : '#f1f5f9' }}
                      >
                        {img ? (
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-icons-outlined text-gray-200" style={{ fontSize: 8 }}>crop_square</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Page label */}
              <div className="flex items-center justify-between mt-1 px-0.5">
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: isActive ? '#1e3a5f' : '#9ca3af' }}
                >
                  {page.page_number}
                </span>
                <span
                  className="text-[8px] font-bold"
                  style={{ color: filledSlots === 4 ? '#059669' : '#d1d5db' }}
                >
                  {filledSlots}/4
                </span>
              </div>
            </button>

            {/* Delete button */}
            {pages.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(page.id); }}
                className="absolute top-1 right-3 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                title="Excluir página"
              >
                <span className="material-icons-outlined" style={{ fontSize: 9 }}>close</span>
              </button>
            )}
          </div>
        );
      })}

      {/* Add page button */}
      <div className="px-2">
        <button
          onClick={onAdd}
          disabled={isAdding}
          className="w-full flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-dashed transition-all disabled:opacity-50"
          style={{ borderColor: '#d1d5db' }}
          title="Adicionar página"
        >
          <span
            className="material-icons-outlined text-[16px] transition-all"
            style={{ color: '#d1d5db' }}
          >
            {isAdding ? 'sync' : 'add'}
          </span>
          <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#d1d5db' }}>
            {isAdding ? '...' : 'Página'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default PageThumbnailList;
