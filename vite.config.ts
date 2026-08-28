import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: { target: 'es2022', cssCodeSplit: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'assets/blueprint-still-life.webp'],
      manifest: {
        name: 'Hex Daily Notebook',
        short_name: 'Hex Notebook',
        description: 'A private daily hex deduction puzzle with a pencil layer.',
        theme_color: '#073b4c',
        background_color: '#052d3a',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,webp,avif,json}'],
        cleanupOutdatedCaches: true
      }
    })
  ]
});
