import { defineConfig } from 'vite';

// Pages 部署在子路径下（/weekly-vibe-coding/mind-hop/），所以生产构建必须带 base。
// 注意：代码里加载 GLB 一律走 import.meta.env.BASE_URL，绝不能写死 '/models/…' ——
// 那会解析到域名根目录，本地开发看不出来，一上线全部 404。
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/weekly-vibe-coding/mind-hop/' : '/',
  server: { port: 5178, open: false },
  build: { target: 'esnext' },
}));
