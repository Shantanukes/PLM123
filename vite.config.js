import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://203.16.201.251:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
