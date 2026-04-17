import React, { useState } from 'react';
import { AVAILABLE_FONTS } from '../../types/catalog';
import type { Catalog, UpdateCatalogInput, BgType } from '../../types/catalog';

interface EditorSidebarProps {
  catalog: Catalog;
  onChange: (updates: UpdateCatalogInput) => void;
  onLogoUpload: (file: File) => Promise<string | null>;
  onCoverEdit: () => void; // Keeping for compatibility, but deprecated
  onBackCoverEdit: () => void; // Keeping for compatibility, but deprecated
  currentPageId?: string;
}

type Tab = 'geral' | 'capa' | 'contracapa' | 'fontes' | 'cores' | 'fundo' | 'logo';

const EditorSidebar: React.FC<EditorSidebarProps> = ({ catalog, onChange, onLogoUpload, currentPageId }) => {
  // Try to use currentPageId to drive activeTab if it's cover or back_cover, otherwise default to geral
  // But wait, user might want to edit tabs while on cover. It's better to just keep it independent
  const [activeTab, setActiveTab] = useState<Tab>('geral');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  
  // Update active tab based on current page
  React.useEffect(() => {
    if (currentPageId === 'cover') setActiveTab('capa');
    else if (currentPageId === 'back_cover') setActiveTab('contracapa');
    // We don't reset to geral automatically when leaving, so user can edit global settings
  }, [currentPageId]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'geral', label: 'Geral', icon: 'tune' },
    { id: 'capa', label: 'Capa', icon: 'photo_album' },
    { id: 'contracapa', label: 'Contracapa', icon: 'contact_page' },
    { id: 'fontes', label: 'Fontes', icon: 'text_fields' },
    { id: 'cores', label: 'Cores', icon: 'palette' },
    { id: 'fundo', label: 'Fundo', icon: 'wallpaper' },
    { id: 'logo', label: 'Logo', icon: 'logo_dev' },
  ];

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const url = await onLogoUpload(file);
    if (url) {
      // Depending on active tab, upload either logo or cover/backcover
      if (activeTab === 'capa') onChange({ cover_image: url });
      else if (activeTab === 'contracapa') onChange({ back_cover_logo_url: url });
      else onChange({ logo_url: url });
    }
    setLogoUploading(false);
  };

  return (
    <aside
      style={{
        width: 260,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
      }}
    >
      {/* Tab Navigation */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-0.5 transition-all border-b-2 text-[9px] font-black uppercase tracking-widest min-w-0"
            style={{
              borderBottomColor: activeTab === tab.id ? '#1e3a5f' : 'transparent',
              color: activeTab === tab.id ? '#1e3a5f' : '#9ca3af',
              background: activeTab === tab.id ? '#f0f4f8' : 'transparent',
            }}
          >
            <span className="material-icons-outlined text-[16px]">{tab.icon}</span>
            <span className="truncate w-full text-center">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* GERAL */}
        {activeTab === 'geral' && (
          <>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Título do Catálogo</label>
              <input
                type="text"
                value={catalog.title}
                onChange={e => onChange({ title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
          </>
        )}

        {/* CAPA */}
        {activeTab === 'capa' && (
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Imagem de Capa</label>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
            >
              <span className="material-icons-outlined text-sm">{logoUploading ? 'sync' : 'upload'}</span>
              {logoUploading ? 'Enviando...' : catalog.cover_image ? 'Trocar imagem' : 'Enviar imagem'}
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
        )}

        {/* CONTRACAPA */}
        {activeTab === 'contracapa' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Logo da Contracapa</label>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
              >
                <span className="material-icons-outlined text-sm">{logoUploading ? 'sync' : 'upload'}</span>
                {logoUploading ? 'Enviando...' : catalog.back_cover_logo_url ? 'Trocar logo' : 'Enviar logo'}
              </button>
              {catalog.back_cover_logo_url && (
                <button
                  onClick={() => onChange({ back_cover_logo_url: null })}
                  className="w-full mt-2 py-1.5 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                >
                  Remover logo
                </button>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cor da Contracapa</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catalog.back_cover_color || '#ffffff'}
                  onChange={e => onChange({ back_cover_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={catalog.back_cover_color || '#ffffff'}
                  onChange={e => onChange({ back_cover_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Mensagem Final</label>
              <textarea
                value={catalog.back_cover_message || ''}
                onChange={e => onChange({ back_cover_message: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="Muito obrigado pela preferência!"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Website (URL)</label>
              <input
                type="text"
                value={catalog.back_cover_website || ''}
                onChange={e => onChange({ back_cover_website: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="www.seusite.com.br"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Instagram (@)</label>
              <input
                type="text"
                value={catalog.back_cover_instagram || ''}
                onChange={e => onChange({ back_cover_instagram: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="@seuperfil"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Telefone / WhatsApp</label>
              <input
                type="text"
                value={catalog.back_cover_phone || ''}
                onChange={e => onChange({ back_cover_phone: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
        )}

        {/* FONTES */}
        {activeTab === 'fontes' && (
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Família Tipográfica</label>
            <div className="space-y-1.5">
              {AVAILABLE_FONTS.map(font => (
                <button
                  key={font.value}
                  onClick={() => onChange({ font_family: font.value })}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all"
                  style={{
                    fontFamily: font.value,
                    borderColor: catalog.font_family === font.value ? '#1e3a5f' : '#e5e7eb',
                    background: catalog.font_family === font.value ? '#f0f4f8' : '#fff',
                    color: catalog.font_family === font.value ? '#1e3a5f' : '#374151',
                  }}
                >
                  <span className="text-sm font-semibold">{font.label}</span>
                  {catalog.font_family === font.value && (
                    <span className="material-icons-outlined text-[14px]" style={{ color: '#1e3a5f' }}>check_circle</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-gray-300 mt-3 text-center uppercase tracking-widest">
              Fontes carregadas via Google Fonts
            </p>
          </div>
        )}

        {/* CORES */}
        {activeTab === 'cores' && (
          <>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cor Primária (títulos)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catalog.primary_color}
                  onChange={e => onChange({ primary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={catalog.primary_color}
                  onChange={e => onChange({ primary_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cor Secundária (descrições)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catalog.secondary_color}
                  onChange={e => onChange({ secondary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={catalog.secondary_color}
                  onChange={e => onChange({ secondary_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            {/* Preview */}
            <div
              className="rounded-xl p-4 border"
              style={{ borderColor: '#e5e7eb', background: catalog.bg_value?.startsWith('#') ? catalog.bg_value : '#fff' }}
            >
              <p className="text-xs font-black" style={{ fontFamily: catalog.font_family, color: catalog.primary_color }}>
                Produto de Exemplo
              </p>
              <p className="text-[10px] mt-0.5" style={{ fontFamily: catalog.font_family, color: catalog.secondary_color }}>
                Descrição do produto com todas as especificações técnicas necessárias.
              </p>
            </div>
          </>
        )}

        {/* FUNDO */}
        {activeTab === 'fundo' && (
          <>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Fundo</label>
              <div className="grid grid-cols-3 gap-2">
                {(['solid', 'gradient', 'image'] as BgType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => onChange({ bg_type: t })}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all"
                    style={{
                      borderColor: catalog.bg_type === t ? '#1e3a5f' : '#e5e7eb',
                      background: catalog.bg_type === t ? '#f0f4f8' : '#fff',
                      color: catalog.bg_type === t ? '#1e3a5f' : '#9ca3af',
                    }}
                  >
                    <span className="material-icons-outlined text-[18px]">
                      {t === 'solid' ? 'format_color_fill' : t === 'gradient' ? 'gradient' : 'image'}
                    </span>
                    {t === 'solid' ? 'Sólido' : t === 'gradient' ? 'Gradiente' : 'Imagem'}
                  </button>
                ))}
              </div>
            </div>

            {catalog.bg_type === 'solid' && (
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cor do Fundo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={catalog.bg_value}
                    onChange={e => onChange({ bg_value: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={catalog.bg_value}
                    onChange={e => onChange({ bg_value: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            )}

            {catalog.bg_type === 'gradient' && (
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Linear Gradient</label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Cor 1</label>
                      <input
                        type="color"
                        value={catalog.bg_value?.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g)?.[0] || '#f0f4f8'}
                        onChange={e => {
                          const c1 = e.target.value;
                          const c2 = catalog.bg_value?.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g)?.[1] || '#dce5ef';
                          const angle = catalog.bg_value?.match(/(\d+)deg/)?.[1] || '135';
                          onChange({ bg_value: `linear-gradient(${angle}deg, ${c1}, ${c2})` });
                        }}
                        className="w-full h-8 rounded border border-gray-200 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Cor 2</label>
                      <input
                        type="color"
                        value={catalog.bg_value?.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g)?.[1] || '#dce5ef'}
                        onChange={e => {
                          const c1 = catalog.bg_value?.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g)?.[0] || '#f0f4f8';
                          const c2 = e.target.value;
                          const angle = catalog.bg_value?.match(/(\d+)deg/)?.[1] || '135';
                          onChange({ bg_value: `linear-gradient(${angle}deg, ${c1}, ${c2})` });
                        }}
                        className="w-full h-8 rounded border border-gray-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[8px] font-bold text-gray-400 uppercase">Ângulo</label>
                      <span className="text-[10px] font-mono text-gray-500">{catalog.bg_value?.match(/(\d+)deg/)?.[1] || '135'}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={catalog.bg_value?.match(/(\d+)deg/)?.[1] || '135'}
                      onChange={e => {
                        const c1 = catalog.bg_value?.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g)?.[0] || '#f0f4f8';
                        const c2 = catalog.bg_value?.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g)?.[1] || '#dce5ef';
                        const angle = e.target.value;
                        onChange({ bg_value: `linear-gradient(${angle}deg, ${c1}, ${c2})` });
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                <div
                  className="mt-3 h-12 rounded-lg border border-gray-100 shadow-inner"
                  style={{ background: catalog.bg_value }}
                />
                
                <div className="mt-3 space-y-1">
                  <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">Sugestões:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      'linear-gradient(135deg, #f0f4f8, #dce5ef)',
                      'linear-gradient(160deg, #f8fafc, #e0f2fe)',
                      'linear-gradient(135deg, #fef9f0, #fde9c9)',
                      'linear-gradient(160deg, #f0fdf4, #dcfce7)',
                    ].map(g => (
                      <button
                        key={g}
                        onClick={() => onChange({ bg_value: g })}
                        className="w-full h-8 rounded border border-gray-200 transition-all hover:scale-105"
                        style={{ background: g }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {catalog.bg_type === 'image' && (
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">URL da Imagem de Fundo</label>
                <input
                  type="text"
                  value={catalog.bg_value}
                  onChange={e => onChange({ bg_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="https://..."
                />
              </div>
            )}
          </>
        )}

        {/* LOGO */}
        {activeTab === 'logo' && (
          <>
            {catalog.logo_url && (
              <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <img src={catalog.logo_url} alt="Logo" className="max-h-16 max-w-full object-contain" style={{ mixBlendMode: 'multiply' }} />
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
            >
              <span className="material-icons-outlined text-sm">{logoUploading ? 'sync' : 'upload'}</span>
              {logoUploading ? 'Enviando...' : catalog.logo_url ? 'Trocar Logo' : 'Enviar Logo'}
            </button>
            {catalog.logo_url && (
              <button
                onClick={() => onChange({ logo_url: null })}
                className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
              >
                Remover Logo
              </button>
            )}
            <p className="text-[9px] text-gray-300 text-center uppercase tracking-widest">
              Formatos: PNG, JPG, SVG. Tamanho máx: 2MB.
              <br />O logo aparecerá em todas as páginas.
            </p>
          </>
        )}
      </div>
    </aside>
  );
};

export default EditorSidebar;
