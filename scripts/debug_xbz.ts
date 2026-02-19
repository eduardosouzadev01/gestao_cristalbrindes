
// Native fetch


const API_CONFIG = {
    xbz: {
        baseUrl: 'https://api.minhaxbz.com.br:5001/api/clientes/GetListaDeProdutos',
        cnpj: '08769700000157',
        token: 'XCDFF6B22B',
    },
};

async function debugXBZ() {
    console.log('Fetching XBZ...');
    const url = `${API_CONFIG.xbz.baseUrl}?cnpj=${API_CONFIG.xbz.cnpj}&token=${API_CONFIG.xbz.token}`;
    console.log('URL:', url);

    try {
        const res = await fetch(url);
        console.log('Status:', res.status);

        const text = await res.text();
        console.log('Response length:', text.length);
        console.log('First 500 chars:', text.slice(0, 500));

        try {
            const json = JSON.parse(text);
            console.log('Is Array?', Array.isArray(json));
            if (!Array.isArray(json)) {
                console.log('Keys:', Object.keys(json));
                // Inspect specific keys if they exist
                if (json.data) console.log('Data key type:', typeof json.data, Array.isArray(json.data));
                if (json.produtos) console.log('Produtos key type:', typeof json.produtos, Array.isArray(json.produtos));
            } else {
                console.log('Array length:', json.length);
                if (json.length > 0) console.log('First item:', json[0]);
            }
        } catch (e) {
            console.log('Not valid JSON');
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

debugXBZ();
