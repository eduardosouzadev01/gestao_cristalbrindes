'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCatalog } from '@/hooks/useCatalog';
import { useCatalogPages } from '@/hooks/useCatalogPages';
import { useCatalogSlots } from '@/hooks/useCatalogSlots';
import EditorSidebar from '@/components/catalog/EditorSidebar';
import PageCanvas from '@/components/catalog/PageCanvas';
import PageThumbnailList from '@/components/catalog/PageThumbnailList';
import ProductSearchDrawer from '@/components/catalog/ProductSearchDrawer';
import LayoutPicker from '@/components/catalog/LayoutPicker';
import SlotEditorModal from '@/components/catalog/SlotEditorModal';
import { supabase } from '@/lib/supabase';
import type { CatalogSlot, UpdateCatalogInput, SlotProduct } from '@/types/catalog';
import { AVAILABLE_FONTS } from '@/types/catalog';


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

export default function CatalogEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const { catalog, updateCatalog, loading: catalogLoading } = useCatalog(id as string);
  const { pages, loading: pagesLoading, fetchPages, addPage, deletePage, updatePageLayout } = useCatalogPages(id as string);
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
      await updateCatalog(id as string, updates);
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
      await updateCatalog(id as string, pendingChanges);
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
      <div className="flex items-center justify-center h-[calc(100vh-52px)] bg-[#F5F5F8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Carregando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden bg-[#F5F5F8]" style={{ fontFamily: displayCatalog.font_family }}>
        {/* Left: EditorSidebar */}
        <EditorSidebar
          catalog={displayCatalog as any}
          onChange={handleCatalogChange}
          onLogoUpload={handleLogoUpload}
          onCoverEdit={async () => {}}
          onBackCoverEdit={async () => {}}
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
        <div className="flex-1 flex flex-col overflow-hidden bg-[#E8ECF0]">
          {/* Top toolbar */}
          <div className="flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-md border-b border-[#E3E3E4] z-10 transition-all">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/catalogos')}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all border border-slate-100"
              >
                <span className="material-icons-outlined text-sm">arrow_back</span>
              </button>
              <div>
                <span className="text-[11px] font-medium text-slate-800 tracking-tight uppercase">
                  {displayCatalog.title}
                </span>
                {Object.keys(pendingChanges).length > 0 && (
                  <span className="ml-2 text-[8px] font-medium text-amber-500 uppercase tracking-widest">● Alterações pendentes</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentPageId && currentPageId !== 'cover' && currentPageId !== 'back_cover' && currentPage && (
                <LayoutPicker
                  currentLayout={currentPage.page_layout || 'grid-2x2'}
                  onSelect={async (layout) => {
                    await updatePageLayout(currentPageId, layout);
                  }}
                />
              )}

              <button
                onClick={() => router.push(`/public/catalogo/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-md text-[10px] font-medium uppercase tracking-widest border border-[#E3E3E4] hover:bg-slate-50 transition-all"
              >
                <span className="material-icons-outlined text-sm">visibility</span>
                Preview
              </button>

              <button
                onClick={handleManualSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all disabled:opacity-50 shadow-none shadow-none-[#0F6CBD]/10"
              >
                <span className="material-icons-outlined text-sm">{saving ? 'sync' : 'save'}</span>
                {saving ? 'Gravando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-12 scrollbar-thin scrollbar-thumb-slate-200">
            {pagesLoading ? (
              <div className="flex items-center justify-center h-48 opacity-40">
                <span className="material-icons-outlined animate-spin text-[#0F6CBD] text-4xl">sync</span>
              </div>
            ) : currentPageId === 'cover' ? (
              <div 
                style={{ transform: 'scale(0.72)', transformOrigin: 'top center' }}
                className="relative shadow-none bg-white overflow-hidden rounded-md"
              >
                <div style={{ width: 794, minHeight: 1123 }} className="relative flex items-center justify-center bg-[#111827]">
                  {displayCatalog.cover_image ? (
                    <img
                      src={displayCatalog.cover_image}
                      alt="Capa do Catálogo"
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-white/50 z-10 p-12 text-center">
                      <div className="w-16 h-16 rounded-md bg-white/5 flex items-center justify-center mb-4">
                        <span className="material-icons-outlined text-4xl">photo_camera</span>
                      </div>
                      <p className="text-sm font-medium uppercase tracking-widest">Nenhuma imagem de capa selecionada</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest max-w-[200px]">Utilize a guia "Capa" na barra lateral para definir a imagem principal.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : currentPageId === 'back_cover' ? (
              <div 
                style={{ transform: 'scale(0.72)', transformOrigin: 'top center' }}
                className="relative shadow-none bg-white overflow-hidden rounded-md"
              >
                <div 
                  style={{ 
                    width: 794, 
                    minHeight: 1123, 
                    background: displayCatalog.back_cover_color || '#ffffff',
                    fontFamily: displayCatalog.font_family 
                  }} 
                  className="flex flex-col items-center justify-center p-20 w-full h-full text-center"
                >
                  <div className="flex flex-col items-center w-full max-w-2xl space-y-16">
                    {displayCatalog.back_cover_logo_url ? (
                      <img src={displayCatalog.back_cover_logo_url} alt="Logo Final" className="max-h-56 object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-4 opacity-10">
                        <span className="material-icons-outlined text-7xl">logo_dev</span>
                      </div>
                    )}
                    
                    {displayCatalog.back_cover_message && (
                      <p className="text-4xl font-medium leading-tight tracking-tight px-12" style={{ color: displayCatalog.primary_color }}>
                        {displayCatalog.back_cover_message}
                      </p>
                    )}

                    <div className="w-24 h-1 rounded-full opacity-10" style={{ background: displayCatalog.primary_color }}></div>

                    <div className="flex flex-col items-center space-y-4 pt-4 w-full">
                      {displayCatalog.back_cover_website && (
                        <div className="flex items-center gap-4 text-xl font-medium" style={{ color: displayCatalog.secondary_color }}>
                          <span className="material-icons-outlined text-2xl opacity-60">language</span>
                          {displayCatalog.back_cover_website}
                        </div>
                      )}
                      
                      {displayCatalog.back_cover_instagram && (
                        <div className="flex items-center gap-4 text-xl font-medium" style={{ color: displayCatalog.secondary_color }}>
                           <span className="material-icons-outlined text-2xl opacity-60">brand_instagram</span>
                          {displayCatalog.back_cover_instagram}
                        </div>
                      )}
                      
                      {displayCatalog.back_cover_phone && (
                        <div className="flex items-center gap-4 text-xl font-medium" style={{ color: displayCatalog.secondary_color }}>
                          <span className="material-icons-outlined text-2xl opacity-60">whatsapp</span>
                          {displayCatalog.back_cover_phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : currentPage ? (
              <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center' }} className="shadow-none rounded-md">
                <PageCanvas
                  page={currentPage}
                  catalog={displayCatalog as any}
                  onAddProduct={handleAddProduct}
                  onEditSlot={setEditingSlot}
                  onClearSlot={handleClearSlot}
                  scale={1} 
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-32 opacity-20">
                <span className="material-icons-outlined text-6xl">description</span>
                <p className="text-[10px] font-medium uppercase tracking-widest">Nenhuma página selecionada</p>
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
}
