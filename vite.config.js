import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Permite probar la app en tu celular conectado al mismo WiFi
    host: true, 
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    // Optimización extrema para Telegram Mini Apps (Carga ultrarrápida)
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa las librerías pesadas para que la app principal abra al instante
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@twa-dev/sdk')) return 'vendor-twa';
            return 'vendor';
          }
        }
      }
    }
  }
});
