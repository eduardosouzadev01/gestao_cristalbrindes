import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/product';

export const productService = {
  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }

    return (data || []).map(mapDbProductToProduct);
  },

  async getLatestProducts(limit = 8): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching latest products:', error);
      return [];
    }

    return (data || []).map(mapDbProductToProduct);
  },

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product by id:', error.message, error.details);
      return null;
    }

    return data ? mapDbProductToProduct(data) : null;
  },

  async searchProducts(query: string, filters?: any): Promise<Product[]> {
    let supabaseQuery = supabase
      .from('products')
      .select('*');

    if (query) {
      supabaseQuery = supabaseQuery.ilike('name', `%${query}%`);
    }

    // Filters by category instead of source
    if (filters?.cat) {
      supabaseQuery = supabaseQuery.ilike('description', `%${filters.cat}%`);
    }

    const { data, error } = await supabaseQuery
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error searching products:', error.message, error.details);
      return [];
    }

    return (data || []).map(mapDbProductToProduct);
  }
};

function mapDbProductToProduct(dbProduct: any): Product {
  return {
    id: dbProduct.id,
    source: dbProduct.source,
    external_id: dbProduct.external_id,
    code: dbProduct.code || '',
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: dbProduct.unit_price || 0,
    priceFormatted: (dbProduct.unit_price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    image: dbProduct.image_url || '',
    images: dbProduct.images || [],
    stock: dbProduct.stock || 0,
    color: dbProduct.color || 'N/A',
    dimensions: dbProduct.dimensions || { h: 0, w: 0, d: 0 },
    material: dbProduct.material,
    weight: dbProduct.weight,
    variations: dbProduct.variations || [],
    badge: dbProduct.stock > 1000 ? 'Estoque Alto' : null
  };
}
