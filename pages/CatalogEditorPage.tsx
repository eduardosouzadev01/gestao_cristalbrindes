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
import CoverEditor from '../src/components/catalog/CoverEditor';
import BackCoverEditor from '../src/components/catalog/BackCoverEditor';
import SlotEditorModal from '../src/components/catalog/SlotEditorModal';
import { supabase } from '../lib/supabase';
import type { CatalogSlot, UpdateCatalogInput, SlotProduct } from '../src/types/catalog';
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
  const { pages, loading: pagesLoading, fetchPages, addPage, deletePage } = useCatalogPages(id);
  const { assignProduct, clearSlot, updateSlot } = useCatalogSlots();

  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<CatalogSlot | null>(null);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [showBackCoverEditor, setShowBackCoverEditor] = useState(false);
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
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Carregando editor...</p>
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
        onCoverEdit={() => setShowCoverEditor(true)}
        onBackCoverEdit={() => setShowBackCoverEditor(true)}
      />

      {/* Middle: Page Thumbnails */}
      <PageThumbnailList
        pages={pages}
        currentPageId={currentPageId}
        onSelect={setCurrentPageId}
        onAdd={handleAddPage}
        onDelete={handleDeletePage}
        isAdding={addingPage}
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
              className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-700 transition-colors"
            >
              <span className="material-icons-outlined text-sm">arrow_back</span>
              Catálogos
            </button>
            <span className="text-gray-200">·</span>
            <span className="text-[11px] font-black text-gray-800 truncate max-w-[200px]">
              {displayCatalog.title}
            </span>
            {Object.keys(pendingChanges).length > 0 && (
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">● Não salvo</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/catalogo/${id}/preview`)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all"
            >
              <span className="material-icons-outlined text-sm">visibility</span>
              Preview
            </button>

            <button
              onClick={handleManualSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-60 shadow-sm"
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
          ) : currentPage ? (
            <div style={{ transform: 'scale(1)', transformOrigin: 'top center' }}>
              <PageCanvas
                page={currentPage}
                catalog={displayCatalog as any}
                onAddProduct={handleAddProduct}
                onEditSlot={setEditingSlot}
                onClearSlot={handleClearSlot}
                scale={0.78}
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

      {/* Cover Editor */}
      {showCoverEditor && (
        <CoverEditor
          catalog={displayCatalog as any}
          onChange={handleCatalogChange}
          onClose={() => setShowCoverEditor(false)}
        />
      )}

      {/* Back Cover Editor */}
      {showBackCoverEditor && (
        <BackCoverEditor
          catalog={displayCatalog as any}
          onChange={handleCatalogChange}
          onClose={() => setShowBackCoverEditor(false)}
        />
      )}
    </div>
  );
};

export default CatalogEditorPage;
