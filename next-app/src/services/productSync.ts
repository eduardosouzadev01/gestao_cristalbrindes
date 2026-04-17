import { supabase } from '@/lib/supabase';
import { fetchXBZProducts, fetchAsiaProducts, fetchSpotProducts } from './api';
import type { Product } from '@/types/product';

export async function syncAllProducts(onProgress?: (msg: string) => void) {
    try {
        onProgress?.('Iniciando sincronização...');

        // 1. Fetch from XBZ
        onProgress?.('Buscando produtos XBZ...');
        const xbzProducts = await fetchXBZProducts();
        await upsertProducts(xbzProducts, 'XBZ');

        // 2. Fetch from Asia
        onProgress?.('Buscando produtos Asia Import...');
        const asiaProducts = await fetchAsiaProducts();
        await upsertProducts(asiaProducts, 'Asia');

        // 3. Fetch from Spot
        onProgress?.('Buscando produtos Spot Gifts...');
        const spotProducts = await fetchSpotProducts();
        await upsertProducts(spotProducts, 'Spot');

        onProgress?.('Sincronização concluída com sucesso!');
        return { success: true };
    } catch (error: any) {
        console.error('Error syncing products:', error);
        onProgress?.(`Erro na sincronização: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function upsertProducts(products: Product[], source: string) {
    const BATCH_SIZE = 100;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);

        const payload = batch.map(p => ({
            source: source,
            external_id: p.id.replace(`${source.toUpperCase()}-`, ''),
            name: p.name,
            description: p.description,
            code: p.code,
            unit_price: p.price,
            image_url: p.image,
            images: p.images,
            stock: p.stock,
            color: p.color,
            variations: p.variations,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('products')
            .upsert(payload, {
                onConflict: 'source,external_id'
            });

        if (error) {
            console.error(`Error upserting ${source} batch:`, error);
            throw error;
        }
    }
}
