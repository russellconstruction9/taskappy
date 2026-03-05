import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'WorkFlow — Task Manager',
        short_name: 'WorkFlow',
        description: 'Business task manager for owners and employees',
        theme_color: '#ea580c',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: '/assets/icons/icon_192.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icons/icon_512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});
