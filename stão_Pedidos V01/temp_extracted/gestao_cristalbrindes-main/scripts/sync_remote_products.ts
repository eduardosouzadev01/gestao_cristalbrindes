
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const API_CONFIG = {
    xbz: {
        baseUrl: 'https://api.minhaxbz.com.br:5001/api/clientes/GetListaDeProdutos',
        cnpj: '08769700000157',
        token: 'XCDFF6B22B',
    },
    asia: {
        baseUrl: 'https://api.asiaimport.com.br/',
        apiKey: 'e58cc5ca94270acaceed13bc82dfedf7',
        secretKey: 'Rxwtufk7tEN2Wp2xUsB8Ga83rqH1LbyvxF5j4tl4Q6Zu6cegKQeYFISWRyNgsQjzayvwx0mC7FQ4p2MKsbxaXRfTAhbONncGTg3N8Q0m9mABiSdeKok0KozzBFODSr0',
    },
    spot: {
        accessKey: 'ZxCtBjjag6wEiUkS',
        baseUrl: 'https://ws.spotgifts.com.br/downloads/v1SSL/file',
    },
};

async function syncXBZ() {
    console.log('Syncing XBZ...');
    const url = `${API_CONFIG.xbz.baseUrl}?cnpj=${API_CONFIG.xbz.cnpj}&token=${API_CONFIG.xbz.token}`;
    const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
    const data: any = await res.json();

    if (!Array.isArray(data)) {
        console.error('XBZ Error: Response is not an array. Type:', typeof data, 'Keys:', Object.keys(data));
        if (data.produtos && Array.isArray(data.produtos)) {
            console.log('XBZ: Found products in .produtos field');
            return processXBZ(data.produtos);
        }
        if (data.Data && Array.isArray(data.Data)) {
            console.log('XBZ: Found products in .Data field');
            return processXBZ(data.Data);
        }
        return;
    }

    return processXBZ(data);
}

async function processXBZ(data: any[]) {
    const items = data.map((p: any) => ({
        source: 'XBZ',
        external_id: String(p.IdProduto || p.id),
        name: p.Nome || p.nome,
        description: p.Descricao || p.descricao || '',
        code: p.CodigoAmigavel || p.codigo,
        unit_price: p.PrecoVenda || p.preco || 0,
        image_url: p.ImageLink || p.imagem,
        images: [p.ImageLink, p.ImageLink2, p.ImageLink3, p.ImageLink4, p.imagem].filter(img => typeof img === 'string'),
        stock: p.QuantidadeDisponivel || p.estoque || 0,
        color: p.CorWebPrincipal?.trim() || 'N/A',
        variations: [{
            id: `XBZ-${p.IdProduto || p.id}`,
            color: p.CorWebPrincipal?.trim() || 'N/A',
            stock: p.QuantidadeDisponivel || p.estoque || 0,
            price: p.PrecoVenda || p.preco || 0
        }],
        updated_at: new Date().toISOString()
    }));

    await upsert(items, 'XBZ');
}

async function syncAsia() {
    console.log('Syncing Asia...');
    const fetchPage = async (page: number) => {
        const params = new URLSearchParams();
        params.append('api_key', API_CONFIG.asia.apiKey);
        params.append('secret_key', API_CONFIG.asia.secretKey);
        params.append('funcao', 'listarProdutos2');
        params.append('por_pagina', '100');
        params.append('pagina', String(page));

        const response = await fetch(API_CONFIG.asia.baseUrl, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': BROWSER_UA
            },
        });

        const data: any = await response.json();
        if (!data.produtos) return { items: [], totalPages: 0 };

        const items = data.produtos.map((p: any) => ({
            source: 'Asia',
            external_id: p.referencia,
            name: p.nome,
            description: p.descricao || '',
            code: p.referencia,
            unit_price: parseFloat(p.preco) || 0,
            image_url: p.imagem,
            images: [p.imagem, ...(p.galeria || [])].filter(img => typeof img === 'string'),
            stock: (p.variacoes || []).reduce((s: number, v: any) => s + (parseInt(v.qtd_estoque) || 0), 0),
            color: 'N/A',
            variations: (p.variacoes || []).map((v: any) => ({
                id: v.sku || v.id_variacao,
                color: v.atributos?.cor?.value || 'N/A',
                stock: parseInt(v.qtd_estoque) || 0,
                price: parseFloat(p.preco) || 0
            })),
            updated_at: new Date().toISOString()
        }));

        return { items, totalPages: parseInt(data.total_paginas) || 1 };
    };

    const firstResult = await fetchPage(1);
    await upsert(firstResult.items, 'Asia');

    if (firstResult.totalPages > 1) {
        for (let i = 2; i <= firstResult.totalPages; i++) {
            const res = await fetchPage(i);
            await upsert(res.items, `Asia Page ${i}`);
        }
    }
}

async function syncSpot() {
    console.log('Syncing Spot...');
    const fetchCSV = async (type: string): Promise<string> => {
        const url = `${API_CONFIG.spot.baseUrl}?AccessKey=${API_CONFIG.spot.accessKey}&data=${type}&lang=PT&extension=csv`;
        const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
        return await res.text();
    };

    const [productsRaw, stocksRaw, optionalsRaw] = await Promise.all([
        fetchCSV('products'),
        fetchCSV('stocks'),
        fetchCSV('optionalsPrice').catch(() => '')
    ]);

    const parseCSV = (csv: string) => {
        if (!csv) return [];
        const clean = csv.replace(/^\uFEFF/, '');
        const lines = clean.split('\n').filter(l => l.trim());
        if (lines.length < 1) return [];
        const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
        return lines.slice(1).map(line => {
            const values = line.split(';').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((h, i) => row[h] = values[i]);
            return row;
        });
    };

    const products = parseCSV(productsRaw);
    const stocks = parseCSV(stocksRaw);
    const optionals = parseCSV(optionalsRaw);

    const stockMap: any = {};
    stocks.forEach((s: any) => {
        if (s.ProdReference) stockMap[s.ProdReference] = (stockMap[s.ProdReference] || 0) + (parseInt(s.Quantity) || 0);
    });

    const variationsMap: any = {};
    optionals.forEach((row: any) => {
        const ref = row.ProdReference;
        if (!ref) return;
        const price = parseFloat((row.Value || row.Price || row.Preco || '0').replace(',', '.'));
        if (!variationsMap[ref]) variationsMap[ref] = [];
        variationsMap[ref].push({
            id: row.Sku || `${ref}-${row.ColorName}`,
            color: row.ColorName || 'N/A',
            price: price,
            stock: stockMap[ref] || 0
        });
    });

    const items = products.filter((p: any) => p.ProdReference).map((p: any) => {
        const ref = p.ProdReference;
        const vList = variationsMap[ref] || [];
        const price = vList.length > 0 ? vList[0].price : 0;

        return {
            source: 'Spot',
            external_id: ref,
            name: p.Name,
            description: p.Description || p.ShortDescription || '',
            code: ref,
            unit_price: price,
            image_url: p.MainImage ? (p.MainImage.startsWith('http') ? p.MainImage : 'https://www.spotgifts.com.br/fotos/produtos/' + p.MainImage) : '',
            images: [p.MainImage, p.AllImageList, p.AditionalImageList].filter(Boolean).map(img => img.startsWith('http') ? img : 'https://www.spotgifts.com.br/fotos/produtos/' + img),
            stock: stockMap[ref] || 0,
            variations: vList,
            updated_at: new Date().toISOString()
        };
    });

    await upsert(items, 'Spot');
}

async function upsert(items: any[], label: string) {
    console.log(`Upserting ${items.length} items for ${label}...`);
    const BATCH = 100;
    for (let i = 0; i < items.length; i += BATCH) {
        const chunk = items.slice(i, i + BATCH);
        const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'source,external_id' });
        if (error) console.error(`Error in batch ${i}:`, error.message);
    }
}

async function main() {
    try {
        await syncXBZ();
        await syncAsia();
        await syncSpot();
        console.log('Done!');
    } catch (e) {
        console.error(e);
    }
}

main();
