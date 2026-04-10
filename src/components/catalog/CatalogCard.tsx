import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Catalog } from '../../types/catalog';

interface CatalogCardProps {
  catalog: Catalog;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const CatalogCard: React.FC<CatalogCardProps> = ({ catalog, onDuplicate, onDelete }) => {
  const navigate = useNavigate();

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
    >
      {/* Cover Image */}
      <div
        className="relative overflow-hidden"
        style={{ height: 160, background: catalog.bg_type === 'gradient' ? catalog.bg_value : (catalog.bg_value || '#f0f4f8') }}
      >
        {catalog.cover_image ? (
          <img
            src={catalog.cover_image}
            alt={catalog.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-icons-outlined text-5xl" style={{ color: catalog.primary_color, opacity: 0.15 }}>auto_stories</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}
        />

        {/* Logo */}
        {catalog.logo_url && (
          <div className="absolute top-3 left-3">
            <img src={catalog.logo_url} alt="logo" className="h-7 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
        )}

        {/* Action buttons on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onDuplicate(catalog.id); }}
            className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center shadow hover:bg-white transition-all"
            title="Duplicar catálogo"
          >
            <span className="material-icons-outlined text-[13px] text-gray-600">content_copy</span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(catalog.id); }}
            className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center shadow hover:bg-red-50 transition-all"
            title="Excluir catálogo"
          >
            <span className="material-icons-outlined text-[13px] text-red-400">delete_outline</span>
          </button>
        </div>

        {/* Font preview badge */}
        <div className="absolute bottom-2 left-3">
          <span
            className="text-white text-base font-black leading-tight line-clamp-1 max-w-[180px]"
            style={{ fontFamily: catalog.font_family, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
          >
            {catalog.title}
          </span>
          {catalog.subtitle && (
            <p className="text-white/70 text-[10px] mt-0.5 line-clamp-1" style={{ fontFamily: catalog.font_family }}>
              {catalog.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: catalog.primary_color }} />
            <div className="w-3 h-3 rounded-sm" style={{ background: catalog.secondary_color }} />
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{catalog.font_family}</span>
          </div>
          <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest">
            {formatDate(catalog.updated_at)}
          </p>
        </div>

        <button
          onClick={() => navigate(`/catalogo/${catalog.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: catalog.primary_color }}
        >
          <span className="material-icons-outlined text-[13px]">edit</span>
          Editar
        </button>
      </div>
    </div>
  );
};

export default CatalogCard;
