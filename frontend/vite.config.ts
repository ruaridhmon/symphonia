import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['symphoniaapp.axiotic.ai', 'app.symphonia.axiotic.ai', 'localhost'],
  },
})
