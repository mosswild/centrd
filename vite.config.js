import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/centrd/',
  server: {
    proxy: {
      '/centrd/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/centrd/, '')
      },
      '/centrd/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})
