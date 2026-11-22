// Sample "memories": real photos in public/samples/, all CC0 or public domain (credits in
// public/samples/CREDITS.md), so the kitchen can be tried without any photo of your own.
// The button puts four on the board at a time, in this order.
const base = import.meta.env?.BASE_URL ?? '/';

export const SAMPLES = [
  { file: 'sea.jpg', name: '海边的傍晚', flavor: '海风' },
  { file: 'kitchen.jpg', name: '外婆家的厨房', flavor: '炊烟' },
  { file: 'rain.jpg', name: '雨天的车窗', flavor: '潮湿' },
  { file: 'playground.jpg', name: '夏天的操场', flavor: '蝉鸣' },
  { file: 'market.jpg', name: '夜市的水果摊', flavor: '清甜' },
  { file: 'snow.jpg', name: '下雪的街角', flavor: '安静' },
  { file: 'sunflowers.jpg', name: '向日葵田', flavor: '晴天' },
  { file: 'station.jpg', name: '乡下的小站', flavor: '远行' },
];

export function makeSamples() {
  return SAMPLES.map((s) => ({ name: s.name, flavor: s.flavor, src: `${base}samples/${s.file}`, origin: 'sample' }));
}
