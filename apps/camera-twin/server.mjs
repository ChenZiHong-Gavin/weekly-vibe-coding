// Local server: serves the Vite app and proxies guide questions to Claude. The API key never reaches the browser.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import { guideTool, validatePlan } from './src/guide-contract.js';
import { buildRequest, arkRequestBody, consumeArkStream } from './src/guide-request.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4319);
const production = process.argv.includes('--production');
// Two providers: Volcengine Ark (Doubao, OpenAI-compatible chat/completions) when ARK_API_KEY is set, else Anthropic.
const ark = process.env.ARK_API_KEY ? { key: process.env.ARK_API_KEY, model: process.env.DOUBAO_MODEL || 'doubao-seed-evolving', base: (process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '') } : null;
const MODEL = ark ? ark.model : (process.env.ANTHROPIC_MODEL || 'claude-opus-5');
const configured = Boolean(ark || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = !ark && configured ? new Anthropic() : null;


const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((resolve, reject) => { let s = ''; req.on('data', c => { s += c; if (s.length > 1e6) reject(new Error('body too large')); }); req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } }); req.on('error', reject); });

async function guide(body) {
  if (!ark && !client) return { status: 503, error: '未配置模型密钥。复制 .env.example 为 .env 并填入 ARK_API_KEY 或 ANTHROPIC_API_KEY 后重启。' };
  const messages = (Array.isArray(body.messages) ? body.messages : []).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length < 4000).slice(-12);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return { status: 400, error: '缺少用户问题' };
  const { system: sysText, messages: msgs } = buildRequest(body, messages);
  if (ark) return guideViaArk(sysText, msgs);
  const system = [{ type: 'text', text: sysText, cache_control: { type: 'ephemeral' } }];
  const response = await client.messages.create({ model: MODEL, max_tokens: 4000, system, messages: msgs, tools: [guideTool()], tool_choice: { type: 'auto' }, thinking: { type: 'adaptive' } });
  if (response.stop_reason === 'refusal') return { status: 422, error: '讲解员拒绝了这个请求。' + (response.stop_details?.explanation ? ' ' + response.stop_details.explanation : '') };
  const tool = response.content.find(b => b.type === 'tool_use' && b.name === 'present_camera');
  if (tool) { try { return { status: 200, plan: validatePlan(tool.input), usage: response.usage }; } catch (e) { return { status: 502, error: '讲解格式无效：' + e.message }; } }
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (text) return { status: 200, plan: { answer: text, steps: [] }, usage: response.usage };
  return { status: 502, error: '讲解员没有返回内容' };
}


/** Streaming variant for Ark: emits NDJSON lines {type:'answer',text} while the answer field grows, then {type:'plan'} or {type:'error'}. */
async function guideStreamViaArk(systemText, messages, res) {
  res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' });
  const send = obj => res.write(JSON.stringify(obj) + '\n');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort('timeout'), 90000);
  try {
    const r = await fetch(ark.base + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + ark.key }, body: JSON.stringify(arkRequestBody({ model: ark.model, system: systemText, messages, stream: true })), signal: controller.signal });
    if (!r.ok) { const raw = await r.text(); send({ type: 'error', status: r.status, error: `豆包接口 ${r.status}：${raw.slice(0, 300)}` }); return res.end(); }
    const out = await consumeArkStream(r, text => send({ type: 'answer', text }));
    if (out.plan) send({ type: 'plan', plan: out.plan }); else { if (out.raw) console.warn('豆包流式参数无效', out.error, out.raw); send({ type: 'error', status: 502, error: out.error }); }
  } catch (e) { send({ type: 'error', status: 502, error: e.name === 'AbortError' ? '豆包请求超时' : '无法连接豆包接口：' + e.message }); }
  finally { clearTimeout(timer); res.end(); }
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') return json(res, 200, { configured, model: MODEL, provider: ark ? 'ark' : 'anthropic' });
  if (url.pathname === '/api/guide/stream' && req.method === 'POST') {
    let body; try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    if (!ark) return json(res, 503, { error: '流式讲解目前只支持豆包接口' });
    const messages = (Array.isArray(body.messages) ? body.messages : []).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length < 4000).slice(-12);
    if (!messages.length || messages[messages.length - 1].role !== 'user') return json(res, 400, { error: '缺少用户问题' });
    const { system, messages: msgs } = buildRequest(body, messages);
    return guideStreamViaArk(system, msgs, res);
  }
  if (url.pathname === '/api/guide' && req.method === 'POST') {
    try { const r = await guide(await readBody(req)); return json(res, r.status, r.status === 200 ? { plan: r.plan, usage: r.usage } : { error: r.error }); }
    catch (e) {
      if (e instanceof Anthropic.AuthenticationError) return json(res, 401, { error: 'API 密钥无效' });
      if (e instanceof Anthropic.NotFoundError) return json(res, 404, { error: `模型 ${MODEL} 不存在` });
      if (e instanceof Anthropic.RateLimitError) return json(res, 429, { error: '请求过于频繁，稍后再试' });
      if (e instanceof Anthropic.APIStatusError) return json(res, 502, { error: `上游错误 ${e.status}：${e.message}` });
      if (e instanceof Anthropic.APIConnectionError) return json(res, 502, { error: '无法连接到 Anthropic API' });
      console.error(e); return json(res, 500, { error: e.message });
    }
  }
  return json(res, 404, { error: 'not found' });
}

let vite = null;
if (!production) { const { createServer } = await import('vite'); vite = await createServer({ root, server: { middlewareMode: true, host: '127.0.0.1', fs: { deny: ['**/.env', '**/.env.*'] }, hmr: { host: '127.0.0.1', port: port + 20000 } }, appType: 'spa' }); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
async function serveDist(req, res, url) {
  let p = path.normalize(path.join(root, 'dist', decodeURIComponent(url.pathname)));
  if (!p.startsWith(path.join(root, 'dist'))) return json(res, 403, { error: 'forbidden' });
  try { let data; try { data = await readFile(p); } catch { p = path.join(root, 'dist', 'index.html'); data = await readFile(p); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data); }
  catch { json(res, 404, { error: 'not found' }); }
}
http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (vite) return vite.middlewares(req, res, () => json(res, 404, { error: 'not found' }));
  return serveDist(req, res, url);
}).listen(port, '127.0.0.1', () => console.log(`camera-twin ${production ? 'production' : 'dev'} → http://127.0.0.1:${port}  模型接口：${configured ? MODEL : '未配置'}`));
