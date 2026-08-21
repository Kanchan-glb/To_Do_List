import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      type: 'module',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Smart Productivity Manager',
        short_name: 'Smart Planner',
        start_url: '/',
        description: 'A premium smart productivity planner',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    // Enable CSS code splitting — each JS chunk gets its own CSS file
    cssCodeSplit: true,
    // Minify CSS
    cssMinify: true,
    // Raise warning limit to avoid noise for charts/heavy libs
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunks: split heavy vendors into separate cacheable files
        manualChunks(id) {
          // React core — smallest, most critical
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // Charts — large, lazy-load candidate
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/dayjs')) {
            return 'vendor-dates';
          }
          // DnD kit
          if (id.includes('node_modules/@dnd-kit')) {
            return 'vendor-dnd';
          }
          // Everything else in node_modules
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        }
      }
    }
  },
  // Pre-bundle heavy deps for faster dev cold starts
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'date-fns', 'axios']
  }
})
