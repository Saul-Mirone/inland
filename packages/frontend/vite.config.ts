import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/auth/github': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth/me': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth/logout': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth/refresh': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/sites': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/articles': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
