import type { Product } from '@/types/product';

// All external API calls now go through the server-side proxy
// No API keys are exposed to the browser

async function serverProxy(action: string, extra?: Record<string, any>): Promise<Response> {
    const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(extra || {}) }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        let detail = text.slice(0, 200);
        try {
            const parsed = JSON.parse(text);
            detail = parsed.error || detail;
        } catch {}
        throw new Error(`Server proxy error ${res.status}: ${detail}`);
    }
    return res;
}

const COLOR_MAP: Record<string, string> = {
    AZUL: '#3b82f6',
    VERMELHO: '#ef4444',
    VERDE: '#22c55e',
    AMARELO: '#fbbf24',
    PRETO: '#1f2937',
    BRANCO: '#f8fafc',
    ROSA: '#ec4899',
    ROXO: '#a855f7',
    LARANJA: '#f97316',
    CINZA: '#6b7280',
    PRATA: '#94a3b8',
    CHUMBO: '#374151',
    MARROM: '#78350f',
    BEGE: '#d4a574',
    DOURADO: '#d4af37',
    MADEIRA: '#8b5a2b',
    KRAFT: '#c9a86c',
    INOX: '#9ca3af',
    BRONZE: '#cd7f32',
    TRANSPARENTE: '#e5e7eb',
};

function mapXBZProduct(p: any): Product {
    const normalizeUrl = (url: string) => {
        if (!url || typeof url !== 'string') return url;
        if (url.startsWith('http')) return url;
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('/')) return 'https://cdn.xbzbrindes.com.br' + url;
        return 'https://cdn.xbzbrindes.com.br/' + url;
    };

    const images: string[] = [];
    
    // Primary and High-Res images
    if (p.ImageLinkHigh) images.push(normalizeUrl(p.ImageLinkHigh));
    if (p.ImageLink) images.push(normalizeUrl(p.ImageLink));
    
    // Explicit gallery fields
    if (p.ImageLink2) images.push(normalizeUrl(p.ImageLink2));
    if (p.ImageLink3) images.push(normalizeUrl(p.ImageLink3));
    if (p.ImageLink4) images.push(normalizeUrl(p.ImageLink4));
    
    // Dynamic discovery of image fields
    Object.entries(p).forEach(([key, val]) => {
        if (typeof val === 'string' && (val.startsWith('http') || val.match(/\.(jpg|jpeg|png|webp|gif)/i))) {
            const lowerKey = key.toLowerCase();
            const isImageField = lowerKey.includes('image') || lowerKey.includes('foto') || lowerKey.includes('img');
            if (isImageField || val.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
                const norm = normalizeUrl(val);
                if (!images.includes(norm)) images.push(norm);
            }
        }
    });

    // Special handling for XBZ naming convention (base_1.jpg, base_2.jpg...)
    const mainImgRaw = p.ImageLinkHigh || p.ImageLink;
    if (mainImgRaw && mainImgRaw.includes('.jpg')) {
        const base = mainImgRaw.replace('.jpg', '');
        // Usually XBZ has up to 8 images per product
        for (let i = 1; i <= 6; i++) {
            const specUrl = normalizeUrl(`${base}_${i}.jpg`);
            if (!images.includes(specUrl)) images.push(specUrl);
        }
    }

    const finalImage = normalizeUrl(p.ImageLinkHigh || p.ImageLink || (images.length > 0 ? images[0] : ''));

    return {
        id: `XBZ-${p.IdProduto}`,
        source: 'XBZ' as const,
        code: p.CodigoAmigavel || p.CodigoXBZ,
        name: p.Nome,
        description: p.Descricao,
        price: p.PrecoVenda,
        priceFormatted: p.PrecoVendaFormatado,
        image: finalImage,
        images: Array.from(new Set(images.filter(Boolean))),
        stock: p.QuantidadeDisponivel,
        color: p.CorWebPrincipal?.trim() || 'N/A',
        link: p.SiteLink,
        dimensions: { h: p.Altura, w: p.Largura, d: p.Profundidade },
        material: p.Material,
        weight: p.Peso,
        badge: p.PontaDeEstoque ? 'Ponta de Estoque' : (p.Lancamento ? 'Lançamento' : null),
        variations: [
            {
                id: `XBZ-${p.IdProduto}`,
                color: p.CorWebPrincipal?.trim() || 'N/A',
                image: finalImage,
                stock: p.QuantidadeDisponivel,
                price: p.PrecoVenda,
                priceFormatted: p.PrecoVendaFormatado,
            },
        ],
    };
}

export async function fetchXBZProducts(onBatch?: (products: Product[]) => void): Promise<Product[]> {
    const response = await serverProxy('xbz');
    const data = await response.json();
    let productsData: any[] = [];
    if (Array.isArray(data)) productsData = data;
    else if (data.produtos && Array.isArray(data.produtos)) productsData = data.produtos;
    else if (data.Data && Array.isArray(data.Data)) productsData = data.Data;
    else throw new Error('XBZ: unexpected response format');

    const BATCH_SIZE = 40;
    const allItems: Product[] = [];
    for (let i = 0; i < productsData.length; i += BATCH_SIZE) {
        const chunk = productsData.slice(i, i + BATCH_SIZE).map(mapXBZProduct);
        allItems.push(...chunk);
        onBatch?.(chunk);
        if (i + BATCH_SIZE < productsData.length) await new Promise((r) => setTimeout(r, 0));
    }
    return allItems;
}

export async function fetchXBZProductDetails(productUrl: string): Promise<string[]> {
    if (!productUrl || productUrl === '#' || !productUrl.startsWith('http')) return [];
    try {
        const response = await serverProxy('xbz-page', { targetUrl: productUrl });
        const html = await response.text();
        const images: string[] = [];
        const anchorRegex = /<a[^>]+rel=["']fancybox_item["'][^>]*>/gi;
        const hrefRegex = /href=["']([^"']+)["']/;
        let match;
        while ((match = anchorRegex.exec(html)) !== null) {
            const anchorTag = match[0];
            const hrefMatch = anchorTag.match(hrefRegex);
            if (hrefMatch && hrefMatch[1]) {
                let url = hrefMatch[1];
                if (url.startsWith('//')) url = 'https:' + url;
                else if (url.startsWith('/')) url = 'https://cdn.xbzbrindes.com.br' + url;
                if (url.match(/\.(jpg|jpeg|png|webp)/i) && !images.includes(url)) images.push(url);
            }
        }
        return images;
    } catch (e) {
        console.error('Error fetching XBZ details:', e);
        return [];
    }
}

export async function fetchAsiaProducts(onBatch?: (products: Product[]) => void): Promise<Product[]> {
    const fetchPage = async (page: number) => {
        const response = await serverProxy('asia', { page });
        const data = await response.json();
        if (data.msg && data.msg.includes('obrigatórios')) throw new Error('Asia Auth Error');
        if (!data.produtos) return { items: [] as Product[], totalPages: 0 };
        const items: Product[] = data.produtos.map((p: any) => {
            let totalStock = 0;
            if (p.variacoes && Array.isArray(p.variacoes)) totalStock = p.variacoes.reduce((sum: number, v: any) => sum + (parseInt(v.qtd_estoque) || 0), 0);
            let mainColor = 'N/A';
            try {
                if (p.variacoes && Array.isArray(p.variacoes) && p.variacoes.length > 0) {
                    const firstVar = p.variacoes[0];
                    if (firstVar.atributos) {
                        if (Array.isArray(firstVar.atributos)) {
                            const colorAttr = firstVar.atributos.find((a: any) => typeof a === 'string' && (a.toLowerCase().includes('cor') || COLOR_MAP[a.toUpperCase()]));
                            if (colorAttr) mainColor = colorAttr;
                        } else if (typeof firstVar.atributos === 'object') {
                            Object.values(firstVar.atributos).forEach((val: any) => { if (typeof val === 'string' && (val.toLowerCase().includes('cor') || COLOR_MAP[val.toUpperCase()])) mainColor = val; });
                        }
                    }
                }
            } catch (_e) {}
            const images: string[] = [];
            if (p.imagem) images.push(p.imagem);
            if (p.galeria && Array.isArray(p.galeria)) p.galeria.forEach((img: any) => { if (img && typeof img === 'string') images.push(img); });
            else if (p.imagens && Array.isArray(p.imagens)) p.imagens.forEach((img: any) => { if (img && typeof img === 'string') images.push(img); });
            return {
                id: `ASI-${p.referencia}`, source: 'Asia' as const, code: p.referencia, name: p.nome, description: p.description || p.descricao,
                price: parseFloat(p.preco) || 0, priceFormatted: (parseFloat(p.preco) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                image: p.imagem || (images.length > 0 ? images[0] : ''), images: Array.from(new Set(images.filter(Boolean))), stock: totalStock, color: mainColor, link: '#',
                dimensions: { h: p.altura || 0, w: p.largura || 0, d: p.comprimento || 0 }, material: p.material, weight: p.peso, badge: p.promocao == 1 ? 'Promoção' : null,
                variations: (p.variacoes || []).map((v: any) => ({ id: v.sku || v.id_variacao, color: (v.atributos && v.atributos.cor && v.atributos.cor.value) || 'N/A', image: v.imagem || p.imagem, stock: parseInt(v.qtd_estoque) || 0, price: parseFloat(p.preco) || 0, priceFormatted: (parseFloat(p.preco) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) })),
            };
        });
        return { items, totalPages: parseInt(data.total_paginas) || 1 };
    };
    const allItems: Product[] = [];
    const firstPageData = await fetchPage(1);
    if (!firstPageData.items.length) return [];
    allItems.push(...firstPageData.items);
    onBatch?.(firstPageData.items);
    const totalPages = firstPageData.totalPages;
    if (totalPages > 1) {
        for (let p = 2; p <= totalPages; p++) {
            const pageData = await fetchPage(p);
            allItems.push(...pageData.items);
            onBatch?.(pageData.items);
            await new Promise((r) => setTimeout(r, 100));
        }
    }
    return allItems;
}

function parseCSV(csv: string): Record<string, string>[] {
    const cleanCsv = csv.replace(/^\uFEFF/, '');
    const lines = cleanCsv.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return [];
    const headers = lines[0].split(';').map((h) => h.trim().replace(/"/g, ''));
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map((v) => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        rows.push(row);
    }
    return rows;
}

export async function fetchSpotProducts(onBatch?: (products: Product[]) => void): Promise<Product[]> {
    const fetchCSV = async (type: string): Promise<string> => {
        const response = await serverProxy('spot', { dataType: type });
        return await response.text();
    };
    const [productsRaw, stocksRaw, optionalsRaw] = await Promise.all([fetchCSV('products'), fetchCSV('stocks'), fetchCSV('optionalsPrice').catch(() => '')]);
    const productsData = parseCSV(productsRaw);
    const stocksData = parseCSV(stocksRaw);
    const optionalsData = optionalsRaw ? parseCSV(optionalsRaw) : [];
    const stockMap: Record<string, number> = {};
    const stockVariationsMap: Record<string, any[]> = {};
    stocksData.forEach((row) => {
        const ref = row.ProdReference || (row.Reference ? row.Reference.split('-')[0] : null);
        if (ref) {
            stockMap[ref] = (stockMap[ref] || 0) + (parseInt(row.Quantity) || 0);
            const color = row.ColorName || row.Color || 'N/A';
            if (color !== 'N/A' && color !== '') {
                if (!stockVariationsMap[ref]) stockVariationsMap[ref] = [];
                const existing = stockVariationsMap[ref].find((v: any) => v.color === color);
                if (existing) existing.stock += (parseInt(row.Quantity) || 0);
                else stockVariationsMap[ref].push({ id: row.Reference || row.Sku || `${ref}-${color}`, color: color, image: '', stock: parseInt(row.Quantity) || 0, price: 0 });
            }
        }
    });
    const variationsMap: Record<string, any[]> = {};
    optionalsData.forEach((row) => {
        const ref = row.ProdReference;
        if (!ref) return;
        const price = parseFloat((row.Value || row.Price || row.Preco || '0').replace(',', '.'));
        const color = row.ColorName || 'N/A';
        const img = row.ImageLink ? (row.ImageLink.startsWith('http') ? row.ImageLink : 'https://www.spotgifts.com.br/fotos/produtos/' + row.ImageLink) : '';
        if (!variationsMap[ref]) variationsMap[ref] = [];
        if (!variationsMap[ref].some((v: any) => v.color === color)) {
            variationsMap[ref].push({ id: row.Sku || row.WebSku || `${ref}-${color}`, color: color, image: img, stock: stockMap[ref] || 0, price: price, priceFormatted: price > 0 ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Sob Consulta' });
        }
    });

    const allMapped = productsData.map((p) => {
        const ref = p.ProdReference;
        if (!ref) return null;
        let variationList = variationsMap[ref] || [];
        if (variationList.length === 0 && stockVariationsMap[ref]) variationList = stockVariationsMap[ref];
        const stock = stockMap[ref] || 0;
        const basePriceStr = p.Price || p.Preco || p.WebPrice || p.Value || '0';
        const basePrice = parseFloat(basePriceStr.replace(',', '.'));
        const price = variationList.length > 0 && variationList[0].price > 0 ? variationList[0].price : basePrice;
        const baseUrl = 'https://www.spotgifts.com.br/fotos/produtos/';
        const images: string[] = [];
        const addImg = (img: string | undefined) => {
            if (!img) return;
            const trimmed = img.trim();
            if (!trimmed) return;
            const url = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
            if (!images.includes(url)) images.push(url);
        };
        addImg(p.MainImage);
        if (p.AllImageList) p.AllImageList.split(',').forEach((img) => addImg(img));
        if (p.AditionalImageList) p.AditionalImageList.split(',').forEach((img) => addImg(img));
        addImg(p.BoxImage); addImg(p.BagImage); addImg(p.PouchImage);
        variationList = variationList.map((v: any) => ({ ...v, image: v.image || images[0] || '', price: v.price || price, priceFormatted: v.priceFormatted || (price > 0 ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Sob Consulta') }));
        const finalVariations = variationList.length > 0 ? variationList : [{ id: `SPOT-${ref}`, color: 'N/A', image: images[0] || '', stock, price, priceFormatted: price > 0 ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Sob Consulta' }];
        return {
            id: `SPOT-${ref}`, source: 'Spot' as const, code: ref, name: p.Name, description: p.Description || p.ShortDescription, price, priceFormatted: price > 0 ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Sob Consulta',
            image: images[0] || '', images: images, stock, color: finalVariations[0].color, link: '#', dimensions: { h: 0, w: 0, d: 0 }, badge: null, variations: finalVariations,
        } as Product;
    }).filter((p): p is Product => p !== null);

    const BATCH_SIZE = 40;
    for (let i = 0; i < allMapped.length; i += BATCH_SIZE) {
        const chunk = allMapped.slice(i, i + BATCH_SIZE);
        onBatch?.(chunk);
        if (i + BATCH_SIZE < allMapped.length) await new Promise((r) => setTimeout(r, 0));
    }
    return allMapped;
}
