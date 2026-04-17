import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Catalog, CreateCatalogInput, UpdateCatalogInput } from '../types/catalog';

export function useCatalog(id?: string) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('catalogs')
      .select('*')
      .order('updated_at', { ascending: false });

    if (err) setError(err.message);
    else setCatalogs(data || []);
    setLoading(false);
  }, []);

  const fetchCatalog = useCallback(async (catalogId: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('catalogs')
      .select('*')
      .eq('id', catalogId)
      .single();

    if (err) setError(err.message);
    else setCatalog(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (id) fetchCatalog(id);
    else fetchCatalogs();
  }, [id, fetchCatalog, fetchCatalogs]);

  const createCatalog = async (input: CreateCatalogInput): Promise<Catalog | null> => {
    const { data, error: err } = await supabase
      .from('catalogs')
      .insert(input)
      .select()
      .single();

    if (err) { setError(err.message); return null; }

    // Create first page automatically
    await supabase.from('catalog_pages').insert({
      catalog_id: data.id,
      page_number: 1,
    });

    await fetchCatalogs();
    return data;
  };

  const updateCatalog = async (catalogId: string, input: UpdateCatalogInput): Promise<boolean> => {
    const { error: err } = await supabase
      .from('catalogs')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', catalogId);

    if (err) { setError(err.message); return false; }
    if (id) await fetchCatalog(catalogId);
    else await fetchCatalogs();
    return true;
  };

  const deleteCatalog = async (catalogId: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('catalogs')
      .delete()
      .eq('id', catalogId);

    if (err) { setError(err.message); return false; }
    await fetchCatalogs();
    return true;
  };

  const duplicateCatalog = async (catalogId: string): Promise<Catalog | null> => {
    // Fetch full catalog with pages and slots
    const { data: src } = await supabase
      .from('catalogs')
      .select('*')
      .eq('id', catalogId)
      .single();

    if (!src) return null;

    const { id: _id, created_at, updated_at, ...rest } = src;
    const newCatalog = await createCatalog({ ...rest, title: `${src.title} (Cópia)` });
    if (!newCatalog) return null;

    // Copy pages and slots
    const { data: pages } = await supabase
      .from('catalog_pages')
      .select('*')
      .eq('catalog_id', catalogId);

    for (const page of (pages || [])) {
      const { data: newPage } = await supabase
        .from('catalog_pages')
        .insert({ catalog_id: newCatalog.id, page_number: page.page_number, bg_override: page.bg_override })
        .select()
        .single();

      if (!newPage) continue;

      const { data: slots } = await supabase
        .from('catalog_slots')
        .select('*')
        .eq('page_id', page.id);

      if (slots && slots.length > 0) {
        await supabase.from('catalog_slots').insert(
          slots.map(s => {
            const { id: _sid, created_at: _sca, page_id: _spid, ...sRest } = s;
            return { ...sRest, page_id: newPage.id };
          })
        );
      }
    }

    await fetchCatalogs();
    return newCatalog;
  };

  return {
    catalog, catalogs, loading, error,
    createCatalog, updateCatalog, deleteCatalog, duplicateCatalog,
    refetch: id ? () => fetchCatalog(id) : fetchCatalogs,
  };
}
