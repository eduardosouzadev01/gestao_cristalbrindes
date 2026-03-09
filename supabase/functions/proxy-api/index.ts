import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const WHITELIST = [
    'api.minhaxbz.com.br',
    'api.asiaimport.com.br',
    'ws.spotgifts.com.br',
    'www.spotgifts.com.br',
    'cdn.xbzbrindes.com.br'
];

Deno.serve(async (req: Request) => {
    // 1. Manuseio de CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info',
            }
        });
    }

    try {
        const url = new URL(req.url);
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'Missing target URL' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const parsedTarget = new URL(targetUrl);
        if (!WHITELIST.includes(parsedTarget.hostname)) {
            return new Response(JSON.stringify({ error: `Hostname ${parsedTarget.hostname} not whitelisted` }), {
                status: 403,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Encaminha a requisição com User-Agent de navegador para evitar bloqueios
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...(req.headers.get('content-type') ? { 'Content-Type': req.headers.get('content-type')! } : {})
            },
            body: req.method === 'POST' ? await req.blob() : null
        });

        const headers = new Headers(response.headers);
        // Garante que o CORS no navegador aceite a resposta da Edge Function
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(await response.blob(), {
            status: response.status,
            headers
        });

    } catch (err: any) {
        console.error('Edge Proxy Error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});
