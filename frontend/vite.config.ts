import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['symphoniaapp.axiotic.ai', 'app.symphonia.axiotic.ai', 'localhost'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          /* Core React runtime — cached independently */
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          /* TipTap editor suite — only needed on summary/editor pages */
          'vendor-tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-highlight',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-underline',
            '@tiptap/extension-bubble-menu',
            '@tiptap/extension-floating-menu',
            '@tiptap/extension-collaboration',
            '@tiptap/extension-collaboration-cursor',
          ],
          /* Markdown rendering */
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'rehype-raw'],
          /* Icons */
          'vendor-icons': ['lucide-react'],
          /* Document export */
          'vendor-docx': ['docx', 'file-saver'],
          /* Yjs collaboration — bundled with tiptap chunk via imports */
        },
      },
    },
  },
})
