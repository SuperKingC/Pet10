import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('socket.io-client')) {
              return 'vendor'
            }
          }
          if (id.includes('/games/tarot/')) return 'tarot'
          if (id.includes('/games/gobang/') || id.includes('/games/map/')) return 'games'
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['server/**', '**/node_modules/**', 'dist/**', '.worktrees/**']
  }
})
