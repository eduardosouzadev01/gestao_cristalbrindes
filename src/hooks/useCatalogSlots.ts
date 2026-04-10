import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { CatalogSlot, SlotProduct, UpdateSlotInput } from '../types/catalog';

export function useCatalogSlots() {
  const [searchResults, setSearchResults] = useState<SlotProduct[]>([]);
  const [searching, setSearching] = useState(false);

  const searchProducts = useCallback(async (term: string) => {
    if (!term.trim()) { setSearchResults([]); return; }
    setSearching(true);

    const { data } = await supabase
      .from('products')
      .select('id, name, code, image_url, images, unit_price, source, description')
      .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
      .order('name')
      .limit(20);

    setSearchResults((data as SlotProduct[]) || []);
    setSearching(false);
  }, []);

  const assignProduct = async (slotId: string, product: SlotProduct): Promise<boolean> => {
    const { error } = await supabase
      .from('catalog_slots')
      .update({
        product_id: product.id,
        custom_title: null,
        custom_desc: null,
        custom_image: null,
      })
      .eq('id', slotId);

    return !error;
  };

  const clearSlot = async (slotId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('catalog_slots')
      .update({
        product_id: null,
        custom_title: null,
        custom_desc: null,
        custom_image: null,
      })
      .eq('id', slotId);

    return !error;
  };

  const updateSlot = async (slotId: string, input: UpdateSlotInput): Promise<boolean> => {
    const { error } = await supabase
      .from('catalog_slots')
      .update(input)
      .eq('id', slotId);

    return !error;
  };

  const uploadSlotImage = async (slotId: string, file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `slot-images/${slotId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('catalog-assets')
      .upload(path, file, { upsert: true });

    if (uploadErr) return null;

    const { data } = supabase.storage.from('catalog-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    searchResults, searching,
    searchProducts, assignProduct, clearSlot, updateSlot, uploadSlotImage,
  };
}
