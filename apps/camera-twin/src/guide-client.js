// Browser-direct guide for the static (GitHub Pages) build: calls Volcengine Ark from the page with a key the user stores locally
// or one injected at build time (VITE_ARK_API_KEY). Mirrors server.mjs so answers are identical either way.
import { buildRequest, cleanMessages, arkRequestBody, consumeArkStream } from './guide-request.js';

const DEFAULTS = { base: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-evolving' };
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export function loadArkConfig() {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('twin.ark') || '{}'); } catch {}
  return { key: saved.key || env.VITE_ARK_API_KEY || '', model: saved.model || env.VITE_DOUBAO_MODEL || DEFAULTS.model, base: (saved.base || env.VITE_DOUBAO_BASE_URL || DEFAULTS.base).replace(/\/$/, ''), fromBuild: !saved.key && !!env.VITE_ARK_API_KEY };
}
export function saveArkConfig({ key, model, base }) { try { localStorage.setItem('twin.ark', JSON.stringify({ key: key || '', model: model || '', base: base || '' })); } catch {} }

/** Ask the guide directly from the browser. onAnswer gets the growing answer text. Resolves { plan } or { error }. */
export async function askArkDirect(payload, onAnswer) {
  const cfg = loadArkConfig(); if (!cfg.key) return { error: '未配置豆包密钥：点右上角「?」填写 ARK_API_KEY。' };
  const messages = cleanMessages(payload.messages); if (!messages.length) return { error: '缺少用户问题' };
  const { system, messages: msgs } = buildRequest(payload, messages);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort('timeout'), 90000);
  try {
    const r = await fetch(cfg.base + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cfg.key }, body: JSON.stringify(arkRequestBody({ model: cfg.model, system, messages: msgs, stream: true })), signal: controller.signal });
    if (!r.ok) { const raw = await r.text(); return { error: r.status === 401 || r.status === 403 ? '豆包密钥无效或无权限' : `豆包接口 ${r.status}：${raw.slice(0, 200)}` }; }
    return await consumeArkStream(r, onAnswer);
  } catch (e) { return { error: e.name === 'AbortError' ? '豆包请求超时' : '无法连接豆包接口（可能是网络或跨域限制）：' + e.message }; }
  finally { clearTimeout(timer); }
}
