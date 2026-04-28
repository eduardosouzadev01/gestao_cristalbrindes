import React, { useState } from 'react';
import type { PageLayout } from '../../types/catalog';

interface LayoutPickerProps {
  currentLayout: PageLayout;
  onSelect: (layout: PageLayout) => void;
}

const LAYOUTS: {
  id: PageLayout;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: 'grid-2x2',
    label: '2×2',
    description: '4 produtos em grade simétrica',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'spotlight',
    label: 'Destaque',
    description: '1 produto em destaque total',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="2" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'duo-wide',
    label: 'Duplo',
    description: '2 produtos em tiras horizontais',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="12" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="2" y="18" width="28" height="12" rx="2" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'mosaic',
    label: 'Mosaico',
    description: '1 destaque + 2 menores',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="12" height="28" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'full-image',
    label: 'Imagem',
    description: '1 imagem para página inteira',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="2" fill="currentColor" opacity="0.7"/>
        <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
      </svg>
    ),
  },
];

const LayoutPicker: React.FC<LayoutPickerProps> = ({ currentLayout, onSelect }) => {
  const [open, setOpen] = useState(false);
  const current = LAYOUTS.find(l => l.id === currentLayout) || LAYOUTS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md text-[10px] font-medium uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all"
        title="Alterar layout da página"
      >
        <span className="material-icons-outlined text-sm">dashboard</span>
        Layout: {current.label}
        <span className="material-icons-outlined text-xs text-gray-400">{open ? 'expand_less' : 'expand_more'}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          
          {/* Dropdown */}
          <div
            className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-100 rounded-md shadow-none p-3"
            style={{ width: 280 }}
          >
            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mb-3 px-1">
              Layout da Página
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map(layout => {
                const active = currentLayout === layout.id;
                return (
                  <button
                    key={layout.id}
                    onClick={() => { onSelect(layout.id); setOpen(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all"
                    style={{
                      borderColor: active ? '#1e3a5f' : '#e5e7eb',
                      background: active ? '#f0f4f8' : '#fafafa',
                      color: active ? '#1e3a5f' : '#6b7280',
                    }}
                  >
                    {layout.icon}
                    <div className="text-center">
                      <div className="text-[10px] font-medium uppercase tracking-widest">{layout.label}</div>
                      <div className="text-[9px] text-gray-400 leading-tight mt-0.5">{layout.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LayoutPicker;
