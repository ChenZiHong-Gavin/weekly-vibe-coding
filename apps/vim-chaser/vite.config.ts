import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  base: process.env.NODE_ENV === 'production' ? '/weekly-vibe-coding/vim-chaser/' : '/',
  server: {
    host: "::",
    port: 8080,
    historyApiFallback: true
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

