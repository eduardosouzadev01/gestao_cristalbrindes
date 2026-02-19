export interface Variation {
    id: string;
    color: string;
    image: string;
    stock: number;
    price: number;
    priceFormatted: string;
}

export interface Product {
    id: string;
    source: 'XBZ' | 'Asia' | 'Spot';
    code: string;
    name: string;
    description: string;
    price: number;
    priceFormatted: string;
    image: string;
    images: string[];
    stock: number;
    color: string;
    link: string;
    dimensions: {
        h: number;
        w: number;
        d: number;
    };
    material?: string;
    weight?: number;
    badge?: string | null;
    variations: Variation[];
}
