import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: false,
    },
    build: {
      chunkSizeWarningLimit: 3000,
    },
    plugins: [
      {
        name: 'safe-pwa-dev-hmr',
        enforce: 'pre',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.includes('@vite-plugin-pwa/pwa-entry-point-loaded')) {
              res.setHeader('Content-Type', 'application/javascript');
              res.end('export {};');
              return;
            }
            next();
          });
        },
        resolveId(id) {
          if (id.includes('@vite-plugin-pwa/pwa-entry-point-loaded')) {
            return '\0safe-pwa-entry-point-loaded';
          }
        },
        load(id) {
          if (id === '\0safe-pwa-entry-point-loaded') {
            return 'export {};';
          }
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'سیستم مدیریت صادرات گاز',
          short_name: 'مدیریت گاز',
          description: 'سیستم جامع مدیریت صادرات گاز، رانندگان، صرافی و امور مالی با پشتیبانی کامل آفلاین',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          dir: 'rtl',
          lang: 'fa',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
