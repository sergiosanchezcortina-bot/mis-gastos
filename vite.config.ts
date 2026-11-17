/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import paquete from './package.json' with { type: 'json' };

export default defineConfig({
  // Rutas relativas: el sitio funciona en cualquier dirección (GitHub Pages, Netlify u otra).
  base: './',
  plugins: [
    react(),
    VitePWA({
      // Una versión nueva se descarga en segundo plano y queda activa la próxima vez
      // que se abre la app. Nunca se recarga mientras se está usando.
      registerType: 'prompt',
      injectRegister: 'script-defer',
      // Solo en la versión publicada; en desarrollo no hay service worker.
      devOptions: { enabled: false },
      // Los íconos ya entran por globPatterns; así no quedan repetidos.
      includeManifestIcons: false,
      manifest: {
        name: 'Mis gastos',
        short_name: 'Mis gastos',
        description: 'Anota tus gastos y mira en qué se te va la plata.',
        lang: 'es-CL',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo lo necesario para abrir sin conexión, incluida la fuente.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  define: {
    // Versión que se muestra en Ajustes (AJU-3).
    __VERSION__: JSON.stringify(paquete.version),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas/setup.ts'],
  },
});
