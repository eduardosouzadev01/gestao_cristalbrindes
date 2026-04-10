// Catalog System Types

export type BgType = 'solid' | 'gradient' | 'image';
export type SlotOrientation = 'vertical' | 'horizontal';

export interface Catalog {
  id: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  logo_url: string | null;
  font_family: string;
  primary_color: string;
  secondary_color: string;
  bg_type: BgType;
  bg_value: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogPage {
  id: string;
  catalog_id: string;
  page_number: number;
  bg_override: string | null;
  created_at: string;
}

export interface CatalogSlot {
  id: string;
  page_id: string;
  slot_position: number; // 0..3
  orientation: SlotOrientation;
  product_id: string | null;
  custom_image: string | null;
  custom_title: string | null;
  custom_desc: string | null;
  show_price: boolean;
  show_code: boolean;
  created_at: string;
  // Joined from products table
  product?: SlotProduct | null;
}

export interface SlotProduct {
  id: string;
  name: string;
  code: string | null;
  image_url: string | null;
  images: string[] | null;
  unit_price: number | null;
  source: string | null;
  description: string | null;
}

export interface CatalogPageWithSlots extends CatalogPage {
  slots: CatalogSlot[];
}

export interface CatalogWithPages extends Catalog {
  pages: CatalogPageWithSlots[];
}

export type CreateCatalogInput = Omit<Catalog, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCatalogInput = Partial<CreateCatalogInput>;

export type CreatePageInput = Omit<CatalogPage, 'id' | 'created_at'>;
export type UpdatePageInput = Partial<Pick<CatalogPage, 'page_number' | 'bg_override'>>;

export type CreateSlotInput = Omit<CatalogSlot, 'id' | 'created_at' | 'product'>;
export type UpdateSlotInput = Partial<Omit<CatalogSlot, 'id' | 'created_at' | 'page_id' | 'slot_position' | 'product'>>;

export const AVAILABLE_FONTS = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Raleway', value: 'Raleway' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Roboto', value: 'Roboto' },
] as const;

export const DEFAULT_CATALOG: CreateCatalogInput = {
  title: 'Novo Catálogo',
  subtitle: null,
  cover_image: null,
  logo_url: null,
  font_family: 'Inter',
  primary_color: '#1e3a5f',
  secondary_color: '#6b7280',
  bg_type: 'solid',
  bg_value: '#ffffff',
  created_by: null,
};

// Slot layout config: positions 0,1 = vertical; 2,3 = horizontal
export const SLOT_LAYOUT: { position: number; orientation: SlotOrientation }[] = [
  { position: 0, orientation: 'vertical' },
  { position: 1, orientation: 'vertical' },
  { position: 2, orientation: 'horizontal' },
  { position: 3, orientation: 'horizontal' },
];
