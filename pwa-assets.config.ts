/**
 * Genera los íconos PNG desde public/icono.svg: npx pwa-assets-generator
 * Los archivos generados quedan en public/ y se guardan en el repositorio.
 */
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // El fondo verde llega hasta el borde en los íconos "maskable" y de Apple.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#abd037' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#abd037' } },
  },
  images: ['public/icono.svg'],
});
