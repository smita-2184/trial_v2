import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['monaco-editor']
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            '@radix-ui/react-tabs',
            'firebase'
          ]
        }
      }
    }
  }
})