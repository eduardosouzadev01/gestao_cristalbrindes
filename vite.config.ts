import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Custom Proxy Plugin
const proxyPlugin = () => ({
  name: 'configure-proxy',
  configureServer(server) {
    server.middlewares.use('/api/proxy', async (req, res, next) => {
      try {
        // Parse the request URL to get Query Params
        // req.url is typically just the path + query (e.g. /xbz?url=...)
        // We construct a full dummy URL to parse safely
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const targetUrl = urlObj.searchParams.get('url');

        if (!targetUrl) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }

        // console.log(`[Proxy] Forwarding to: ${targetUrl}`);

        const response = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        res.statusCode = response.status;

        // Copy headers (filtering out some if necessary, but forwarding most is fine for dev)
        response.headers.forEach((val, key) => {
          res.setHeader(key, val);
        });

        // Ensure CORS for local dev
        res.setHeader('Access-Control-Allow-Origin', '*');

        const arrayBuffer = await response.arrayBuffer();
        res.end(Buffer.from(arrayBuffer));

      } catch (err) {
        console.error('[Proxy Error]', err);
        res.statusCode = 500;
        res.end(`Proxy Error: ${err.message}`);
      }
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './', // Use caminhos relativos para garantir compatibilidade em qualquer subdiretório
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), proxyPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          }
        }
      },
      chunkSizeWarningLimit: 1000
    }
  };
});
