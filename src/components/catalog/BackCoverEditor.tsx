import React, { useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Catalog, UpdateCatalogInput } from '../../types/catalog';

interface BackCoverEditorProps {
  catalog: Catalog;
  onChange: (updates: UpdateCatalogInput) => void;
  onClose: () => void;
}

const BackCoverEditor: React.FC<BackCoverEditorProps> = ({ catalog, onChange, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `backcover-logos/${catalog.id}.${ext}`;

    const { error } = await supabase.storage
      .from('catalog-assets')
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data } = supabase.storage.from('catalog-assets').getPublicUrl(path);
      onChange({ back_cover_logo_url: data.publicUrl });
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
        style={{ width: 440, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Editor da Página Final</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Personalize a contracapa do catálogo</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <span className="material-icons-outlined text-gray-400">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Logo da Contracapa</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
            >
              <span className="material-icons-outlined text-sm">{uploading ? 'sync' : 'upload'}</span>
              {uploading ? 'Enviando...' : catalog.back_cover_logo_url ? 'Trocar logo' : 'Enviar logo'}
            </button>
            {catalog.back_cover_logo_url && (
              <div className="mt-2 flex flex-col items-center">
                <img src={catalog.back_cover_logo_url} alt="Logo da Contracapa" className="h-16 object-contain my-2" />
                <button
                  onClick={() => onChange({ back_cover_logo_url: null })}
                  className="w-full py-1.5 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                >
                  Remover logo
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Mensagem Final</label>
            <textarea
              value={catalog.back_cover_message || ''}
              onChange={e => onChange({ back_cover_message: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              placeholder="Ex: Muito obrigado pela preferência!"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Website (URL)</label>
            <input
              type="text"
              value={catalog.back_cover_website || ''}
              onChange={e => onChange({ back_cover_website: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              placeholder="www.seusite.com.br"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Instagram (@)</label>
            <input
              type="text"
              value={catalog.back_cover_instagram || ''}
              onChange={e => onChange({ back_cover_instagram: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              placeholder="@seuperfil"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Telefone / WhatsApp</label>
            <input
              type="text"
              value={catalog.back_cover_phone || ''}
              onChange={e => onChange({ back_cover_phone: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              placeholder="(11) 99999-9999"
            />
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
            style={{ background: '#1e3a5f' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackCoverEditor;
