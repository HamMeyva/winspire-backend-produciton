import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5010', // Updated backend server address to port 5010
        changeOrigin: true,
        secure: false
      }
    }
  }
})
