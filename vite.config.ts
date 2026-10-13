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
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
})
