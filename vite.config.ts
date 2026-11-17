/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import paquete from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
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
