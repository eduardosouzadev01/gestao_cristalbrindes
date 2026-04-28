import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SLOT_LAYOUT } from '../types/catalog';
import type { CatalogPage, CatalogSlot, CatalogPageWithSlots, CreatePageInput, PageLayout } from '../types/catalog';

export function useCatalogPages(catalogId: string | undefined) {
  const [pages, setPages] = useState<CatalogPageWithSlots[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (!catalogId) return;
    setLoading(true);
    setError(null);

    const { data: pagesData, error: pErr } = await supabase
      .from('catalog_pages')
      .select('*')
      .eq('catalog_id', catalogId)
      .order('page_number');

    if (pErr) { setError(pErr.message); setLoading(false); return; }

    const pageIds = (pagesData || []).map(p => p.id);
    let slotsMap: Record<string, CatalogSlot[]> = {};

    if (pageIds.length > 0) {
      const { data: slotsData } = await supabase
        .from('catalog_slots')
        .select(`
          *,
          product:products(id, name, code, image_url, images, unit_price, source, description)
        `)
        .in('page_id', pageIds)
        .order('slot_position');

      (slotsData || []).forEach(slot => {
        if (!slotsMap[slot.page_id]) slotsMap[slot.page_id] = [];
        slotsMap[slot.page_id].push(slot as CatalogSlot);
      });
    }

    const full: CatalogPageWithSlots[] = (pagesData || []).map(page => ({
      ...page,
      slots: slotsMap[page.id] || [],
    }));

    setPages(full);
    setLoading(false);
  }, [catalogId]);

  const addPage = async (): Promise<CatalogPage | null> => {
    if (!catalogId) return null;
    const nextNumber = pages.length + 1;

    const { data: newPage, error: pErr } = await supabase
      .from('catalog_pages')
      .insert({ catalog_id: catalogId, page_number: nextNumber } as CreatePageInput)
      .select()
      .single();

    if (pErr || !newPage) { setError(pErr?.message || 'Erro ao criar página'); return null; }

    // Initialize 4 empty slots with correct orientations
    await supabase.from('catalog_slots').insert(
      SLOT_LAYOUT.map(sl => ({
        page_id: newPage.id,
        slot_position: sl.position,
        orientation: sl.orientation,
      }))
    );

    await fetchPages();
    return newPage;
  };

  const deletePage = async (pageId: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('catalog_pages')
      .delete()
      .eq('id', pageId);

    if (err) { setError(err.message); return false; }

    // Re-number remaining pages
    const remaining = pages.filter(p => p.id !== pageId).sort((a, b) => a.page_number - b.page_number);
    for (let i = 0; i < remaining.length; i++) {
      await supabase.from('catalog_pages').update({ page_number: i + 1 }).eq('id', remaining[i].id);
    }

    await fetchPages();
    return true;
  };

  const reorderPages = async (orderedIds: string[]): Promise<void> => {
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from('catalog_pages').update({ page_number: i + 1 }).eq('id', orderedIds[i]);
    }
    await fetchPages();
  };

  const updatePageBg = async (pageId: string, bgOverride: string | null): Promise<void> => {
    await supabase.from('catalog_pages').update({ bg_override: bgOverride }).eq('id', pageId);
    await fetchPages();
  };

  const updatePageLayout = async (pageId: string, layout: PageLayout): Promise<void> => {
    await supabase.from('catalog_pages').update({ page_layout: layout }).eq('id', pageId);
    await fetchPages();
  };

  return { pages, loading, error, fetchPages, addPage, deletePage, reorderPages, updatePageBg, updatePageLayout };
}
