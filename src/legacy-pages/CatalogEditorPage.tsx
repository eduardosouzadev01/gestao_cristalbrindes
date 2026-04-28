import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCatalog } from '../src/hooks/useCatalog';
import { useCatalogPages } from '../src/hooks/useCatalogPages';
import { useCatalogSlots } from '../src/hooks/useCatalogSlots';
import EditorSidebar from '../src/components/catalog/EditorSidebar';
import PageCanvas from '../src/components/catalog/PageCanvas';
import PageThumbnailList from '../src/components/catalog/PageThumbnailList';
import ProductSearchDrawer from '../src/components/catalog/ProductSearchDrawer';
import LayoutPicker from '../src/components/catalog/LayoutPicker';
import SlotEditorModal from '../src/components/catalog/SlotEditorModal';
import { supabase } from '../lib/supabase';
import type { CatalogSlot, UpdateCatalogInput, SlotProduct, PageLayout } from '../src/types/catalog';
import { AVAILABLE_FONTS } from '../src/types/catalog';

// Inject Google Fonts dynamically
const injectFonts = () => {
  const families = AVAILABLE_FONTS.map(f => f.value.replace(/ /g, '+')).join('&family=');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${families}:wght@400;600;700;900&display=swap`;
  if (!document.head.querySelector('[data-catalog-fonts]')) {
    link.setAttribute('data-catalog-fonts', 'true');
    document.head.appendChild(link);
  }
};

const CatalogEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { catalog, updateCatalog, loading: catalogLoading } = useCatalog(id);
  const { pages, loading: pagesLoading, fetchPages, addPage, deletePage, updatePageLayout } = useCatalogPages(id);
  const { assignProduct, clearSlot, updateSlot } = useCatalogSlots();

  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<CatalogSlot | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<UpdateCatalogInput>({});
  const [saving, setSaving] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inject Google Fonts on mount
  useEffect(() => { injectFonts(); }, []);

  // Set first page as current when pages load
  useEffect(() => {
    if (pages.length > 0 && !currentPageId) {
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId]);

  // Fetch pages when id changes
  useEffect(() => {
    if (id) fetchPages();
  }, [id, fetchPages]);

  // Auto-save catalog changes with debounce
  const scheduleSave = useCallback((updates: UpdateCatalogInput) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      if (!id || Object.keys(updates).length === 0) return;
      await updateCatalog(id, updates);
      setPendingChanges({});
    }, 1500);
  }, [id, updateCatalog]);

  const handleCatalogChange = (updates: UpdateCatalogInput) => {
    const merged = { ...pendingChanges, ...updates };
    setPendingChanges(merged);
    scheduleSave(merged);
  };

  const handleManualSave = async () => {
    if (!id) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    setSaving(true);
    if (Object.keys(pendingChanges).length > 0) {
      await updateCatalog(id, pendingChanges);
      setPendingChanges({});
    }
    setSaving(false);
    toast.success('Catálogo salvo!');
  };

  const handleAddProduct = (slotId: string) => {
    setActiveSlotId(slotId);
    setSearchDrawerOpen(true);
  };

  const handleProductSelect = async (slotId: string, product: SlotProduct) => {
    const ok = await assignProduct(slotId, product);
    if (ok) {
      await fetchPages();
      toast.success(`"${product.name}" adicionado ao slot`);
    } else {
      toast.error('Erro ao adicionar produto');
    }
  };

  const handleClearSlot = async (slotId: string) => {
    const ok = await clearSlot(slotId);
    if (ok) await fetchPages();
  };

  const handleSlotSave = async (slotId: string, updates: Partial<CatalogSlot>) => {
    await updateSlot(slotId, updates as any);
    await fetchPages();
  };

  const handleAddPage = async () => {
    setAddingPage(true);
    const newPage = await addPage();
    if (newPage) {
      await fetchPages();
      setCurrentPageId(newPage.id);
      toast.success('Nova página adicionada!');
    }
    setAddingPage(false);
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Excluir esta página? Todos os produtos da página serão removidos.')) return;
    const ok = await deletePage(pageId);
    if (ok) {
      if (currentPageId === pageId) {
        setCurrentPageId(pages.find(p => p.id !== pageId)?.id || null);
      }
    }
  };

  const handleLogoUpload = async (file: File): Promise<string | null> => {
    if (!id) return null;
    const ext = file.name.split('.').pop();
    const path = `logo-images/${id}.${ext}`;
    const { error } = await supabase.storage.from('catalog-assets').upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('catalog-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const currentPage = pages.find(p => p.id === currentPageId) || null;
  const displayCatalog = catalog ? { ...catalog, ...pendingChanges } : null;

  if (catalogLoading || !displayCatalog) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-52px)]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-icons-outlined text-gray-300 text-4xl animate-spin">sync</span>
          <p className="text-[10px] font-medium text-gray-300 uppercase tracking-widest">Carregando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-52px)] overflow-hidden" style={{ fontFamily: displayCatalog.font_family }}>
      {/* Left: EditorSidebar */}
      <EditorSidebar
        catalog={displayCatalog as any}
        onChange={handleCatalogChange}
        onLogoUpload={handleLogoUpload}
        currentPageId={currentPageId || undefined}
      />

      {/* Middle: Page Thumbnails */}
      <PageThumbnailList
        pages={pages}
        currentPageId={currentPageId}
        onSelect={setCurrentPageId}
        onAdd={handleAddPage}
        onDelete={handleDeletePage}
        isAdding={addingPage}
        catalogCoverImage={displayCatalog.cover_image}
      />

      {/* Center: Canvas + Toolbar */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#e8ecf0' }}>
        {/* Top toolbar */}
        <div
          className="flex items-center justify-between px-5 py-2.5 border-b z-10"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderColor: '#e5e7eb' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/catalogos')}
              className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest hover:text-gray-700 transition-colors"
            >
              <span className="material-icons-outlined text-sm">arrow_back</span>
              Catálogos
            </button>
            <span className="text-gray-200">·</span>
            <span className="text-[11px] font-medium text-gray-800 truncate max-w-[200px]">
              {displayCatalog.title}
            </span>
            {Object.keys(pendingChanges).length > 0 && (
              <span className="text-[9px] font-medium text-amber-400 uppercase tracking-widest">● Não salvo</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Layout picker — only shown for content pages */}
            {currentPageId && currentPageId !== 'cover' && currentPageId !== 'back_cover' && currentPage && (
              <LayoutPicker
                currentLayout={currentPage.page_layout || 'grid-2x2'}
                onSelect={async (layout) => {
                  await updatePageLayout(currentPageId, layout);
                }}
              />
            )}

            <button
              onClick={() => navigate(`/catalogo/${id}/preview`)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md text-[10px] font-medium uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all"
            >
              <span className="material-icons-outlined text-sm">visibility</span>
              Preview
            </button>

            <button
              onClick={handleManualSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-60 shadow-none"
              style={{ background: '#1e3a5f' }}
            >
              <span className="material-icons-outlined text-sm">{saving ? 'sync' : 'save'}</span>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-8">
          {pagesLoading ? (
            <div className="flex items-center justify-center h-40">
              <span className="material-icons-outlined animate-spin text-gray-300 text-3xl">sync</span>
            </div>
          ) : currentPageId === 'cover' ? (
            <div 
              style={{ transform: 'scale(0.78)', transformOrigin: 'top center' }}
              className="relative shadow-none bg-white overflow-hidden"
            >
              <div style={{ width: 794, minHeight: 1123 }} className="relative flex items-center justify-center bg-gray-900">
                {displayCatalog.cover_image ? (
                  <img
                    src={displayCatalog.cover_image}
                    alt="Capa do Catálogo"
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-white opacity-50 z-10">
                    <span className="material-icons-outlined text-gray-400" style={{ fontSize: 56 }}>photo_camera</span>
                    <p className="text-sm tracking-widest font-medium uppercase">Nenhuma imagem de capa selecionada</p>
                    <p className="text-xs text-gray-400">Vá na guia "Capa" ao lado para enviar a imagem.</p>
                  </div>
                )}
              </div>
            </div>
          ) : currentPageId === 'back_cover' ? (
            <div 
              style={{ transform: 'scale(0.78)', transformOrigin: 'top center' }}
              className="relative shadow-none flex flex-col items-center justify-center p-16 text-center"
            >
              <div 
                style={{ 
                  width: 794, 
                  minHeight: 1123, 
                  background: displayCatalog.back_cover_color || '#ffffff',
                  fontFamily: displayCatalog.font_family 
                }} 
                className="flex flex-col items-center justify-center p-16 w-full h-full text-center"
              >
                <div className="flex flex-col items-center w-full max-w-2xl space-y-16">
                  {displayCatalog.back_cover_logo_url ? (
                    <img src={displayCatalog.back_cover_logo_url} alt="Logo Final" className="max-h-48 object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <span className="material-icons-outlined text-gray-400 text-5xl">logo_dev</span>
                      <p className="text-sm font-medium uppercase tracking-widest text-gray-500">Logo não definido</p>
                    </div>
                  )}
                  
                  {displayCatalog.back_cover_message && (
                    <p className="text-3xl font-medium leading-relaxed" style={{ color: displayCatalog.primary_color }}>
                      {displayCatalog.back_cover_message}
                    </p>
                  )}

                  <div className="flex flex-col items-center space-y-6 pt-12 border-t w-full" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                    {displayCatalog.back_cover_website && (
                      <div className="flex items-center gap-4 text-2xl" style={{ color: displayCatalog.secondary_color }}>
                        <span className="material-icons-outlined text-4xl">language</span>
                        {displayCatalog.back_cover_website}
                      </div>
                    )}
                    
                    {displayCatalog.back_cover_instagram && (
                      <div className="flex items-center gap-4 text-2xl" style={{ color: displayCatalog.secondary_color }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                        {displayCatalog.back_cover_instagram}
                      </div>
                    )}
                    
                    {displayCatalog.back_cover_phone && (
                      <div className="flex items-center gap-4 text-2xl" style={{ color: displayCatalog.secondary_color }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp: {displayCatalog.back_cover_phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : currentPage ? (
            <div style={{ transform: 'scale(0.78)', transformOrigin: 'top center' }}>
              <PageCanvas
                page={currentPage}
                catalog={displayCatalog as any}
                onAddProduct={handleAddProduct}
                onEditSlot={setEditingSlot}
                onClearSlot={handleClearSlot}
                scale={1} // The wrapper applies the scale
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 opacity-50">
              <span className="material-icons-outlined text-gray-300 text-5xl">insert_drive_file</span>
              <p className="text-[10px] text-gray-300 uppercase tracking-widest">Selecione ou adicione uma página</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Search Drawer */}
      <ProductSearchDrawer
        isOpen={searchDrawerOpen}
        slotId={activeSlotId}
        onClose={() => { setSearchDrawerOpen(false); setActiveSlotId(null); }}
        onSelect={handleProductSelect}
      />

      {/* Slot Editor Modal */}
      {editingSlot && (
        <SlotEditorModal
          slot={editingSlot}
          onClose={() => setEditingSlot(null)}
          onSave={handleSlotSave}
        />
      )}
    </div>
  );
};

export default CatalogEditorPage;
