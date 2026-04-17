import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/weekly-vibe-coding/pretext-solar-system/' : '/',
});
