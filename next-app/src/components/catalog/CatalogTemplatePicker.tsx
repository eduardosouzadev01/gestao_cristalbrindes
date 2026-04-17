import React, { useState } from 'react';
import type { CreateCatalogInput } from '../../types/catalog';

// ── Predefined templates ────────────────────────────────────────────────────
export interface CatalogTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  thumbnail: { bg: string; textColor: string; accentColor: string };
  settings: Partial<CreateCatalogInput>;
}

export const CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    id: 'classic-blue',
    name: 'Clássico Azul',
    description: 'Elegante, corporativo e sóbrio. Ideal para B2B.',
    tags: ['Corporativo', 'Sóbrio'],
    thumbnail: { bg: '#1e3a5f', textColor: '#ffffff', accentColor: '#5b9bd5' },
    settings: {
      font_family: 'Inter',
      primary_color: '#1e3a5f',
      secondary_color: '#5b9bd5',
      bg_type: 'solid',
      bg_value: '#f8fafc',
    },
  },
  {
    id: 'warm-sunset',
    name: 'Pôr do Sol',
    description: 'Gradiente vibrante em tons quentes. Para catálogos ousados.',
    tags: ['Vibrante', 'Gradiente'],
    thumbnail: { bg: 'linear-gradient(135deg, #ff6b35, #f7c59f)', textColor: '#ffffff', accentColor: '#ff6b35' },
    settings: {
      font_family: 'Poppins',
      primary_color: '#c0392b',
      secondary_color: '#e67e22',
      bg_type: 'gradient',
      bg_value: 'linear-gradient(160deg, #fff8f0, #ffe8d0)',
    },
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    description: 'Moderno, leve e natural. Ótimo para itens sustentáveis.',
    tags: ['Natural', 'Minimalista'],
    thumbnail: { bg: 'linear-gradient(135deg, #11998e, #56d2be)', textColor: '#ffffff', accentColor: '#11998e' },
    settings: {
      font_family: 'Outfit',
      primary_color: '#0d7377',
      secondary_color: '#32c5c0',
      bg_type: 'gradient',
      bg_value: 'linear-gradient(160deg, #f0fdf8, #ccf5ec)',
    },
  },
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    description: 'Sofisticado e exclusivo. Ideal para produtos de alto valor.',
    tags: ['Luxo', 'Escuro'],
    thumbnail: { bg: '#0f0f0f', textColor: '#e5c97a', accentColor: '#e5c97a' },
    settings: {
      font_family: 'Montserrat',
      primary_color: '#e5c97a',
      secondary_color: '#999999',
      bg_type: 'solid',
      bg_value: '#1a1a1a',
    },
  },
  {
    id: 'clean-rose',
    name: 'Rose Clean',
    description: 'Delicado e feminino. Para moda, beleza ou presentes.',
    tags: ['Feminino', 'Elegante'],
    thumbnail: { bg: 'linear-gradient(135deg, #fbd3e9, #f8b4c8)', textColor: '#a0175c', accentColor: '#e91e8c' },
    settings: {
      font_family: 'Playfair Display',
      primary_color: '#a0175c',
      secondary_color: '#c2557a',
      bg_type: 'gradient',
      bg_value: 'linear-gradient(160deg, #fff5f8, #ffe4ef)',
    },
  },
  {
    id: 'ocean-depth',
    name: 'Ocean Depth',
    description: 'Gradiente profundo do azul ao turquesa. Confiança e frescor.',
    tags: ['Moderno', 'Gradiente'],
    thumbnail: { bg: 'linear-gradient(135deg, #1a6b9a, #0dd3d3)', textColor: '#ffffff', accentColor: '#0dd3d3' },
    settings: {
      font_family: 'Raleway',
      primary_color: '#0d4f7a',
      secondary_color: '#20b2c0',
      bg_type: 'gradient',
      bg_value: 'linear-gradient(160deg, #edf7ff, #d0f0f8)',
    },
  },
];

// ── Component ───────────────────────────────────────────────────────────────
interface CatalogTemplatePickerProps {
  onSelect: (template: CatalogTemplate) => void;
  onBlank: () => void;
  onClose: () => void;
}

const CatalogTemplatePicker: React.FC<CatalogTemplatePickerProps> = ({ onSelect, onBlank, onClose }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: 860, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">Escolher Template</h2>
            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest">
              Comece com um estilo pré-definido ou em branco
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <span className="material-icons-outlined text-gray-400">close</span>
          </button>
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-3 gap-4">
            {/* Blank option */}
            <button
              onClick={onBlank}
              onMouseEnter={() => setHovered('blank')}
              onMouseLeave={() => setHovered(null)}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left"
              style={{
                borderColor: hovered === 'blank' ? '#1e3a5f' : '#e5e7eb',
                background: hovered === 'blank' ? '#f0f4f8' : '#fafafa',
              }}
            >
              {/* Thumbnail */}
              <div
                className="w-full aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2"
                style={{ borderColor: '#d1d5db', background: '#f9fafb' }}
              >
                <span className="material-icons-outlined text-gray-300 text-3xl">add</span>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Em Branco</span>
              </div>
              <div>
                <p className="text-xs font-black text-gray-700 uppercase tracking-tight">Em Branco</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Comece do zero com total liberdade</p>
              </div>
            </button>

            {/* Template cards */}
            {CATALOG_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => { setSelected(template.id); onSelect(template); }}
                onMouseEnter={() => setHovered(template.id)}
                onMouseLeave={() => setHovered(null)}
                className="flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all text-left"
                style={{
                  borderColor: selected === template.id ? '#1e3a5f' : hovered === template.id ? '#93c5fd' : '#e5e7eb',
                  background: selected === template.id ? '#eef2ff' : hovered === template.id ? '#f8faff' : '#fff',
                  transform: hovered === template.id ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: hovered === template.id ? '0 8px 32px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {/* Thumbnail */}
                <div
                  className="w-full aspect-[3/4] rounded-xl relative overflow-hidden flex items-end"
                  style={{ background: template.thumbnail.bg }}
                >
                  {/* Simulated page content */}
                  <div className="absolute inset-0 p-3 flex flex-col gap-1.5">
                    {/* top bar */}
                    <div className="h-1.5 rounded-full w-2/3 opacity-60" style={{ background: template.thumbnail.textColor }} />
                    {/* product grid sim */}
                    <div className="flex-1 grid grid-cols-2 gap-1 mt-2">
                      {[0,1,2,3].map(i => (
                        <div
                          key={i}
                          className="rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.18)' }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Active badge */}
                  {selected === template.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                      <span className="material-icons-outlined text-[14px]" style={{ color: '#1e3a5f' }}>check</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {template.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ background: '#f0f4f8', color: '#1e3a5f' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{template.name}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">{template.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogTemplatePicker;
