// Local server: serves the Vite app and proxies guide questions to Claude. The API key never reaches the browser.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import { describeCamera, guideTool, validatePlan } from './src/guide-contract.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4319);
const production = process.argv.includes('--production');
// Two providers: Volcengine Ark (Doubao, OpenAI-compatible chat/completions) when ARK_API_KEY is set, else Anthropic.
const ark = process.env.ARK_API_KEY ? { key: process.env.ARK_API_KEY, model: process.env.DOUBAO_MODEL || 'doubao-seed-evolving', base: (process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '') } : null;
const MODEL = ark ? ark.model : (process.env.ANTHROPIC_MODEL || 'claude-opus-5');
const configured = Boolean(ark || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = !ark && configured ? new Anthropic() : null;

const SYSTEM = `你是一台 Canon EOS R6 Mark III 的数字孪生讲解员，面向摄影初学者。
你面前是这台相机的三维模型，用户能看到它。回答时用简明的中文，先说结论再说操作，避免比喻。
每次回答都调用 present_camera 工具提交：answer 是给用户看的文字；steps 是让三维模型配合演示的步骤，零到六步。
步骤只能引用部件清单里的 id。要让用户"看到"位置时，把 focus 设为 true 并给出 parts；要演示机械动作用 control；要真正操作相机（开机、换模式、改光圈快门 ISO、按 MENU/Q/INFO/快门）用 firmware，屏幕会跟着变。
用户问"现在是什么模式/参数"时，直接读"虚拟相机当前状态"回答。用户想练习或想学某个操作时，用 start_lesson 开一门匹配的课程（清单在 lessons 字段），然后只提示不代劳。教操作时先 focus 到要碰的部件，再用 firmware 执行，一步一个动作。相机关机时先 power_on。
不确定的事实就说不确定，不要编造菜单路径。清单外的功能（比如具体菜单第几页）可以描述大致位置但要说明是大致。
如果当前模型是占位方块（modelSource=placeholder），仍然按部件 id 演示，位置是近似的。`;

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((resolve, reject) => { let s = ''; req.on('data', c => { s += c; if (s.length > 1e6) reject(new Error('body too large')); }); req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } }); req.on('error', reject); });

async function guide(body) {
  if (!ark && !client) return { status: 503, error: '未配置模型密钥。复制 .env.example 为 .env 并填入 ARK_API_KEY 或 ANTHROPIC_API_KEY 后重启。' };
  const messages = (Array.isArray(body.messages) ? body.messages : []).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length < 4000).slice(-12);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return { status: 400, error: '缺少用户问题' };
  const manifest = describeCamera(body.modelSource === 'r6iii' ? 'r6iii' : 'placeholder');
  let context = body.context?.part ? `\n\n用户当前选中的部件：${body.context.part}` : '';
  if (body.context?.camera && typeof body.context.camera === 'object') context += `\n\n虚拟相机当前状态（JSON）：${JSON.stringify(body.context.camera).slice(0, 1500)}`;
  if (body.context?.lesson && typeof body.context.lesson === 'object') { const L = body.context.lesson; context += `\n\n用户正在练习课程「${L.title}」，目标进度：${(L.goals || []).map((g, i) => `${i + 1}.${g.text}${g.done ? '✓' : ''}`).join(' ')}。当前卡在第 ${(L.next ?? 0) + 1} 步。练习中只给提示和 focus 到相关部件，不要用 firmware 替用户完成目标，除非用户明确说"帮我做"。`; }
  const system = [{ type: 'text', text: SYSTEM + '\n\n部件清单与控制件（JSON）：\n' + JSON.stringify(manifest), cache_control: { type: 'ephemeral' } }];
  const last = messages[messages.length - 1];
  messages[messages.length - 1] = { role: 'user', content: last.content + context };
  if (ark) return guideViaArk(system[0].text, messages);
  const response = await client.messages.create({ model: MODEL, max_tokens: 4000, system, messages, tools: [guideTool()], tool_choice: { type: 'auto' }, thinking: { type: 'adaptive' } });
  if (response.stop_reason === 'refusal') return { status: 422, error: '讲解员拒绝了这个请求。' + (response.stop_details?.explanation ? ' ' + response.stop_details.explanation : '') };
  const tool = response.content.find(b => b.type === 'tool_use' && b.name === 'present_camera');
  if (tool) { try { return { status: 200, plan: validatePlan(tool.input), usage: response.usage }; } catch (e) { return { status: 502, error: '讲解格式无效：' + e.message }; } }
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (text) return { status: 200, plan: { answer: text, steps: [] }, usage: response.usage };
  return { status: 502, error: '讲解员没有返回内容' };
}

async function guideViaArk(systemText, messages) {
  const t = guideTool(); const tool = { type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } };
  const body = { model: ark.model, messages: [{ role: 'system', content: systemText }, ...messages], tools: [tool], tool_choice: { type: 'function', function: { name: t.name } }, temperature: 0.2, max_tokens: 2600, ...(ark.model === 'doubao-seed-evolving' ? { thinking: { type: 'disabled' } } : {}) };
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort('timeout'), 90000);
  try {
    const r = await fetch(ark.base + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + ark.key }, body: JSON.stringify(body), signal: controller.signal });
    const raw = await r.text();
    if (!r.ok) return { status: r.status === 401 || r.status === 403 ? 401 : r.status === 429 ? 429 : 502, error: `豆包接口 ${r.status}：${raw.slice(0, 300)}` };
    let result; try { result = JSON.parse(raw); } catch { return { status: 502, error: '豆包响应不是 JSON' }; }
    const choice = result.choices?.[0], msg = choice?.message, call = msg?.tool_calls?.[0];
    if (choice?.finish_reason === 'length') return { status: 502, error: '讲解内容被截断' };
    if (call?.function?.name === t.name) { try { return { status: 200, plan: validatePlan(JSON.parse(call.function.arguments)), usage: result.usage }; } catch (e) { console.warn('豆包工具参数无效', e.message, call.function.arguments.slice(0, 1500)); return { status: 502, error: '讲解格式无效：' + e.message }; } }
    const text = typeof msg?.content === 'string' ? msg.content.trim() : '';
    if (text) return { status: 200, plan: { answer: text, steps: [] }, usage: result.usage };
    return { status: 502, error: '豆包没有返回内容' };
  } catch (e) { return { status: 502, error: e.name === 'AbortError' ? '豆包请求超时' : '无法连接豆包接口：' + e.message }; }
  finally { clearTimeout(timer); }
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') return json(res, 200, { configured, model: MODEL, provider: ark ? 'ark' : 'anthropic' });
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
