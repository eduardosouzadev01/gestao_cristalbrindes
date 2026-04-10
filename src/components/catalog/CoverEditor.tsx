import React, { useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Catalog, UpdateCatalogInput } from '../../types/catalog';

interface CoverEditorProps {
  catalog: Catalog;
  onChange: (updates: UpdateCatalogInput) => void;
  onClose: () => void;
}

const CoverEditor: React.FC<CoverEditorProps> = ({ catalog, onChange, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `cover-images/${catalog.id}.${ext}`;

    const { error } = await supabase.storage
      .from('catalog-assets')
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data } = supabase.storage.from('catalog-assets').getPublicUrl(path);
      onChange({ cover_image: data.publicUrl });
    }
    setUploading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 680, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Editor de Capa</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Personalize a primeira página do catálogo</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <span className="material-icons-outlined text-gray-400">close</span>
          </button>
        </div>

        <div className="flex gap-0 overflow-hidden" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Preview */}
          <div
            className="flex-1 relative overflow-hidden flex items-center justify-center"
            style={{ background: '#f0f4f8', minHeight: 400 }}
          >
            {catalog.cover_image ? (
              <img
                src={catalog.cover_image}
                alt="Capa"
                className="w-full h-full object-cover absolute inset-0"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="material-icons-outlined text-gray-200" style={{ fontSize: 56 }}>broken_image</span>
                <p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">Sem imagem de capa</p>
              </div>
            )}

            {/* Overlay with title */}
            <div
              className="absolute inset-0 flex flex-col justify-end p-6"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)' }}
            >
              {catalog.logo_url && (
                <img src={catalog.logo_url} alt="Logo" className="h-10 w-auto object-contain mb-4 self-start" style={{ filter: 'brightness(0) invert(1)' }} />
              )}
              <h1
                className="text-2xl font-black text-white leading-tight"
                style={{ fontFamily: catalog.font_family, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              >
                {catalog.title || 'Título do Catálogo'}
              </h1>
              {catalog.subtitle && (
                <p className="text-sm text-white/80 mt-1" style={{ fontFamily: catalog.font_family }}>
                  {catalog.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="w-64 border-l border-gray-100 p-5 overflow-y-auto space-y-5" style={{ flexShrink: 0 }}>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Imagem de Capa</label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
              >
                <span className="material-icons-outlined text-sm">{uploading ? 'sync' : 'upload'}</span>
                {uploading ? 'Enviando...' : catalog.cover_image ? 'Trocar imagem' : 'Enviar imagem'}
              </button>
              {catalog.cover_image && (
                <button
                  onClick={() => onChange({ cover_image: null })}
                  className="w-full mt-2 py-1.5 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                >
                  Remover imagem
                </button>
              )}
            </div>

            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Título</label>
              <input
                type="text"
                value={catalog.title}
                onChange={e => onChange({ title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subtítulo</label>
              <input
                type="text"
                value={catalog.subtitle || ''}
                onChange={e => onChange({ subtitle: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="Opcional..."
              />
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
              style={{ background: '#1e3a5f' }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverEditor;
