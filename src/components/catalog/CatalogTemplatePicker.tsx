import React, { useState } from 'react';
import type { CreateCatalogInput } from '../../types/catalog';

// ── Predefined templates ────────────────────────────────────────────────────
export interface CatalogTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  thumbnail: { bg: string; textColor: string; accentColor: string; image?: string };
  settings: Partial<CreateCatalogInput>;
}

export const CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    id: 'classic-blue',
    name: 'Clássico Azul',
    description: 'Elegante, corporativo e sóbrio. Ideal para B2B.',
    tags: ['Corporativo', 'Sóbrio'],
    thumbnail: { bg: '#1e3a5f', textColor: '#ffffff', accentColor: '#5b9bd5', image: '/images/catalogs/classic-blue.png' },
    settings: {
      font_family: 'Inter',
      primary_color: '#1e3a5f',
      secondary_color: '#5b9bd5',
      bg_type: 'solid',
      bg_value: '#f8fafc',
    },
  },
  {
    id: 'labor-day',
    name: 'Dia do Trabalhador',
    description: 'Design industrial e profissional. Foco em uniformes e EPIs.',
    tags: ['Campanha', 'Industrial'],
    thumbnail: { bg: 'linear-gradient(135deg, #f39c12, #d35400)', textColor: '#ffffff', accentColor: '#2c3e50', image: '/images/catalogs/labor-day.png' },
    settings: {
      font_family: 'Inter',
      primary_color: '#d35400',
      secondary_color: '#2c3e50',
      bg_type: 'solid',
      bg_value: '#ffffff',
    },
  },
  {
    id: 'fathers-day',
    name: 'Dia dos Pais',
    description: 'Elegante e sofisticado. Ideal para presentes e kits executivos.',
    tags: ['Sazonal', 'Masculino'],
    thumbnail: { bg: 'linear-gradient(135deg, #2c3e50, #34495e)', textColor: '#ffffff', accentColor: '#f1c40f', image: '/images/catalogs/fathers-day.png' },
    settings: {
      font_family: 'Montserrat',
      primary_color: '#2c3e50',
      secondary_color: '#f1c40f',
      bg_type: 'gradient',
      bg_value: 'linear-gradient(160deg, #f8f9fa, #e9ecef)',
    },
  },
  {
    id: 'mothers-day',
    name: 'Dia das Mães',
    description: 'Suave, carinhoso e elegante. Perfeito para brindes femininos.',
    tags: ['Sazonal', 'Feminino'],
    thumbnail: { bg: 'linear-gradient(135deg, #ed4264, #ffedbc)', textColor: '#ffffff', accentColor: '#ed4264', image: '/images/catalogs/mothers-day.png' },
    settings: {
      font_family: 'Playfair Display',
      primary_color: '#ed4264',
      secondary_color: '#ffedbc',
      bg_type: 'gradient',
      bg_value: 'linear-gradient(160deg, #fff5f6, #ffedef)',
    },
  },
  {
    id: 'cipa-sipat',
    name: 'CIPA & SIPAT',
    description: 'Focado em segurança e bem-estar no trabalho. Cores vibrantes.',
    tags: ['Evento', 'Segurança'],
    thumbnail: { bg: 'linear-gradient(135deg, #27ae60, #2ecc71)', textColor: '#ffffff', accentColor: '#f1c40f', image: '/images/catalogs/cipa-sipat.png' },
    settings: {
      font_family: 'Inter',
      primary_color: '#27ae60',
      secondary_color: '#f1c40f',
      bg_type: 'solid',
      bg_value: '#f9fbf9',
    },
  },
  {
    id: 'pink-october',
    name: 'Outubro Rosa',
    description: 'Campanha de conscientização. Design focado no rosa institucional.',
    tags: ['Social', 'Conscientização'],
    thumbnail: { bg: 'linear-gradient(135deg, #ff6699, #ff3366)', textColor: '#ffffff', accentColor: '#ffffff', image: '/images/catalogs/pink-october.png' },
    settings: {
      font_family: 'Inter',
      primary_color: '#ff3366',
      secondary_color: '#ff6699',
      bg_type: 'solid',
      bg_value: '#fff5f7',
    },
  },
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    description: 'Sofisticado e exclusivo. Ideal para produtos de alto valor.',
    tags: ['Luxo', 'Escuro'],
    thumbnail: { bg: '#0f0f0f', textColor: '#e5c97a', accentColor: '#e5c97a', image: '/images/catalogs/dark-premium.png' },
    settings: {
      font_family: 'Montserrat',
      primary_color: '#e5c97a',
      secondary_color: '#999999',
      bg_type: 'solid',
      bg_value: '#1a1a1a',
    },
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    description: 'Impactante e agressivo. Design focado em grandes descontos e urgência.',
    tags: ['Campanha', 'Vendas'],
    thumbnail: { bg: '#000000', textColor: '#ffffff', accentColor: '#f1c40f', image: '/images/catalogs/black-friday.png' },
    settings: {
      font_family: 'Roboto',
      primary_color: '#000000',
      secondary_color: '#f1c40f',
      bg_type: 'solid',
      bg_value: '#121212',
    },
  },
  {
    id: 'christmas',
    name: 'Natal & Fim de Ano',
    description: 'Festivo e elegante. Cores tradicionais com toque premium.',
    tags: ['Sazonal', 'Festivo'],
    thumbnail: { bg: 'linear-gradient(135deg, #c0392b, #27ae60)', textColor: '#ffffff', accentColor: '#f1c40f', image: '/images/catalogs/christmas.png' },
    settings: {
      font_family: 'Montserrat',
      primary_color: '#c0392b',
      secondary_color: '#27ae60',
      bg_type: 'gradient',
      bg_value: 'linear-gradient(160deg, #fffcfc, #fff5f5)',
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
        className="bg-white rounded-md shadow-none overflow-hidden flex flex-col"
        style={{ width: 860, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-medium text-gray-900 uppercase tracking-tight">Escolher Template</h2>
            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest">
              Comece com um estilo pré-definido ou em branco
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-gray-100 transition-colors"
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
              className="flex flex-col items-center gap-3 p-4 rounded-md border-2 transition-all text-left"
              style={{
                borderColor: hovered === 'blank' ? '#1e3a5f' : '#e5e7eb',
                background: hovered === 'blank' ? '#f0f4f8' : '#fafafa',
              }}
            >
              {/* Thumbnail */}
              <div
                className="w-full aspect-[3/4] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-2"
                style={{ borderColor: '#d1d5db', background: '#f9fafb' }}
              >
                <span className="material-icons-outlined text-gray-300 text-3xl">add</span>
                <span className="text-[9px] font-medium text-gray-300 uppercase tracking-widest">Em Branco</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 uppercase tracking-tight">Em Branco</p>
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
                className="flex flex-col gap-3 p-4 rounded-md border-2 transition-all text-left"
                style={{
                  borderColor: selected === template.id ? '#1e3a5f' : hovered === template.id ? '#93c5fd' : '#e5e7eb',
                  background: selected === template.id ? '#eef2ff' : hovered === template.id ? '#f8faff' : '#fff',
                  transform: hovered === template.id ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: hovered === template.id ? '0 8px 32px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {/* Thumbnail */}
                <div
                  className="w-full aspect-[3/4] rounded-md relative overflow-hidden flex items-end bg-slate-100"
                >
                  {template.thumbnail.image ? (
                    <img 
                      src={template.thumbnail.image} 
                      alt={template.name} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0" style={{ background: template.thumbnail.bg }}>
                      {/* Simulated page content */}
                      <div className="absolute inset-0 p-3 flex flex-col gap-1.5">
                        {/* top bar */}
                        <div className="h-1.5 rounded-full w-2/3 opacity-60" style={{ background: template.thumbnail.textColor }} />
                        {/* product grid sim */}
                        <div className="flex-1 grid grid-cols-2 gap-1 mt-2">
                          {[0,1,2,3].map(i => (
                            <div
                              key={i}
                              className="rounded-md"
                              style={{ background: 'rgba(255,255,255,0.18)' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Active badge */}
                  {selected === template.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-none z-10">
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
                        className="text-[8px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                        style={{ background: '#f0f4f8', color: '#1e3a5f' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-gray-800 uppercase tracking-tight">{template.name}</p>
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
