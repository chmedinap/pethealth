import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo, el backend corre aparte (cd backend && npm run dev)
const backend = process.env.BACKEND_URL || 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/uploads': { target: backend, changeOrigin: true },
    },
  },
})
