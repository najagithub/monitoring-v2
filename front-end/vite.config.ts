import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['app.netpulse-mg.com'],
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
});
