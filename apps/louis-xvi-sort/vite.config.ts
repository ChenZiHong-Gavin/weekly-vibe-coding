import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/weekly-vibe-coding/louis-xvi-sort/' : '/',
  plugins: [react(), tailwindcss()],
});
