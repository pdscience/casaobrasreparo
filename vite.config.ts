/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo_casa.png'],
      manifest: {
        name: 'Casa Obras e Reparos',
        short_name: 'CasaObras',
        description: 'Prestadores de serviços gerais e clientes com orçamentos por IA.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'logo_casa.png', sizes: 'any', type: 'image/png' }],
      },
      workbox: {
        // Os chunks de região geográfica (um por país) são carregados sob demanda
        // e não devem inflar o precache do service worker.
        manifestTransforms: [
          (manifest) => ({
            manifest: manifest.filter((entry) => !/(^|\/)assets\/geo-/.test(entry.url)),
          }),
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Prefixa os chunks de país/estado para que o precache do PWA consiga
        // identificá-los e deixá-los de fora.
        chunkFileNames: (chunk) =>
          /^[A-Z]{2}$/.test(chunk.name)
            ? 'assets/geo-[name]-[hash].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
})
