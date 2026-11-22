// Image generation adapter. `local` needs no network; the others are reserved slots
// for real image-to-image APIs and read their settings from localStorage.
import { cookLocally } from './localCook.js';

export const PROVIDERS = {
  local: { label: '本地合成（无需网络）', needsKey: false },
  openai: { label: 'OpenAI 兼容 /images/edits', needsKey: true, baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-1' },
  ark: { label: '火山方舟 Seedream 图生图', needsKey: true, baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seedream-4-0-250828' },
  custom: { label: '自定义接口（JSON）', needsKey: false, baseUrl: '', model: '' },
};

const STORAGE_KEY = 'memory-kitchen.imageApi';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return { provider: 'local', baseUrl: '', apiKey: '', model: '', size: '1024x1024', ...saved };
  } catch {
    return { provider: 'local', baseUrl: '', apiKey: '', model: '', size: '1024x1024' };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode: settings live only for this page load.
  }
}

export async function cook({ rows, recipe, prompt, seed, settings, onProgress, signal }) {
  const provider = settings?.provider || 'local';
  if (provider === 'local') {
    const result = await cookLocally({ rows, recipe, seed, onProgress, signal });
    return { ...result, provider };
  }
  onProgress?.(0.1);
  const fn = REMOTE[provider];
  if (!fn) throw new Error(`未知的生图接口：${provider}`);
  const blob = await fn({ rows, prompt, settings, signal });
  onProgress?.(0.95);
  return { blob, provider };
}

function resolve(settings) {
  const def = PROVIDERS[settings.provider] || {};
  return {
    baseUrl: (settings.baseUrl || def.baseUrl || '').replace(/\/$/, ''),
    model: settings.model || def.model || '',
    apiKey: settings.apiKey || '',
    size: settings.size || '1024x1024',
  };
}

async function dataUrlToBlob(src) {
  const res = await fetch(src);
  return res.blob();
}

async function readError(res) {
  const text = await res.text().catch(() => '');
  return new Error(`接口返回 ${res.status}${text ? `：${text.slice(0, 300)}` : ''}`);
}

async function fromB64OrUrl(item) {
  if (item?.b64_json) {
    const bin = atob(item.b64_json);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: 'image/png' });
  }
  if (item?.url) {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error('下载生成结果失败');
    return res.blob();
  }
  throw new Error('接口没有返回图片');
}

const REMOTE = {
  // OpenAI Images API edit endpoint with several reference images (gpt-image-1 style).
  async openai({ rows, prompt, settings, signal }) {
    const { baseUrl, model, apiKey, size } = resolve(settings);
    if (!apiKey) throw new Error('请先在设置里填写 API Key');
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', prompt);
    form.append('size', size);
    for (const row of rows) {
      const blob = await dataUrlToBlob(row.ingredient.src);
      form.append('image[]', blob, `${row.ingredient.name || 'memory'}.jpg`);
    }
    const res = await fetch(`${baseUrl}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal,
    });
    if (!res.ok) throw await readError(res);
    const json = await res.json();
    return fromB64OrUrl(json.data?.[0]);
  },

  // Volcengine Ark Seedream image-to-image: JSON body, `image` accepts an array of data URLs.
  async ark({ rows, prompt, settings, signal }) {
    const { baseUrl, model, apiKey } = resolve(settings);
    if (!apiKey) throw new Error('请先在设置里填写 API Key');
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        image: rows.map((r) => r.ingredient.src),
        size: '2K',
        response_format: 'b64_json',
        watermark: false,
      }),
      signal,
    });
    if (!res.ok) throw await readError(res);
    const json = await res.json();
    return fromB64OrUrl(json.data?.[0]);
  },

  // Your own endpoint: POST JSON { prompt, images: [dataURL], method, heat } -> { image: dataURL | url }
  async custom({ rows, prompt, settings, signal }) {
    const { baseUrl, apiKey } = resolve(settings);
    if (!baseUrl) throw new Error('请先在设置里填写接口地址');
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, images: rows.map((r) => r.ingredient.src) }),
      signal,
    });
    if (!res.ok) throw await readError(res);
    const json = await res.json();
    const image = json.image || json.url || json.data?.[0]?.url || json.data?.[0]?.b64_json;
    if (!image) throw new Error('接口没有返回 image 字段');
    if (image.startsWith('data:') || image.startsWith('http')) {
      const r = await fetch(image);
      return r.blob();
    }
    return fromB64OrUrl({ b64_json: image });
  },
};
