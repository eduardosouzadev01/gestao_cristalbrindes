import React, { useState, useRef } from 'react';
import { useCatalogSlots } from '../../hooks/useCatalogSlots';
import type { CatalogSlot } from '../../types/catalog';

interface SlotEditorModalProps {
  slot: CatalogSlot;
  onClose: () => void;
  onSave: (slotId: string, updates: Partial<CatalogSlot>) => Promise<void>;
}

const SlotEditorModal: React.FC<SlotEditorModalProps> = ({ slot, onClose, onSave }) => {
  const [customTitle, setCustomTitle] = useState(slot.custom_title || '');
  const [customDesc, setCustomDesc] = useState(slot.custom_desc || '');
  const [customImage, setCustomImage] = useState(slot.custom_image || '');
  const [showPrice, setShowPrice] = useState(slot.show_price);
  const [showCode, setShowCode] = useState(slot.show_code);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadSlotImage } = useCatalogSlots();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    const url = await uploadSlotImage(slot.id, file);
    if (url) setCustomImage(url);
    setImageUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(slot.id, {
      custom_title: customTitle || null,
      custom_desc: customDesc || null,
      custom_image: customImage || null,
      show_price: showPrice,
      show_code: showCode,
    });
    setSaving(false);
    onClose();
  };

  const displayImage = customImage || slot.product?.image_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 520, maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Editar Slot</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Produto: {slot.product?.name || 'Sem produto'} · {slot.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <span className="material-icons-outlined text-gray-400">close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {/* Image */}
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Imagem Exclusiva</label>
            <div className="flex gap-3 items-start">
              <div
                className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: '#f0f4f8', border: '1px solid #e5e7eb' }}
              >
                {displayImage ? (
                  <img src={displayImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-icons-outlined text-gray-300 text-2xl">image</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={customImage}
                  onChange={e => setCustomImage(e.target.value)}
                  placeholder="URL da imagem ou faça upload..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <span className="material-icons-outlined text-[13px]">{imageUploading ? 'sync' : 'upload'}</span>
                  {imageUploading ? 'Enviando...' : 'Upload'}
                </button>
                {customImage && customImage !== slot.product?.image_url && (
                  <button onClick={() => setCustomImage('')} className="text-[10px] text-red-400 hover:text-red-600">
                    Remover imagem customizada
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Título Personalizado
              {slot.product?.name && <span className="text-gray-300 font-normal ml-2 normal-case">(padrão: {slot.product.name})</span>}
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder={slot.product?.name || 'Título do produto...'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Descrição Personalizada</label>
            <textarea
              value={customDesc}
              onChange={e => setCustomDesc(e.target.value)}
              placeholder={slot.product?.description || 'Descrição do produto...'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setShowCode(v => !v)}
                className="w-9 h-5 rounded-full transition-all relative cursor-pointer"
                style={{ background: showCode ? '#1e3a5f' : '#e5e7eb' }}
              >
                <div
                  className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-all"
                  style={{ left: showCode ? '17px' : '2px' }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Mostrar código</span>
            </label>

            {slot.product?.unit_price && (
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setShowPrice(v => !v)}
                  className="w-9 h-5 rounded-full transition-all relative cursor-pointer"
                  style={{ background: showPrice ? '#059669' : '#e5e7eb' }}
                >
                  <div
                    className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-all"
                    style={{ left: showPrice ? '17px' : '2px' }}
                  />
                </div>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Mostrar preço</span>
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-60"
            style={{ background: '#1e3a5f' }}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlotEditorModal;
