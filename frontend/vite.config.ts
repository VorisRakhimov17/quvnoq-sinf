import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // /api so'rovlari lokal backendga yo'naltiriladi
    proxy: { '/api': 'http://localhost:3000' },
  },
});
