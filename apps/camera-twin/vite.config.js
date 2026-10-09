import { defineConfig } from 'vite';
// Served at /weekly-vibe-coding/camera-twin/ on GitHub Pages; './' keeps the local server and `vite preview` working.
export default defineConfig({ base: process.env.NODE_ENV === 'production' ? '/weekly-vibe-coding/camera-twin/' : './', build: { outDir: 'dist', emptyOutDir: true } });
