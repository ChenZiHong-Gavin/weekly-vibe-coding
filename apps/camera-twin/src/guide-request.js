// Shared by the local server (server.mjs) and the browser-direct client (guide-client.js).
import { describeCamera, guideTool, validatePlan } from './guide-contract.js';

export const SYSTEM = `你是一台 Canon EOS R6 Mark III 的数字孪生讲解员，面向摄影初学者。
你面前是这台相机的三维模型，用户能看到它。回答时用简明的中文，先说结论再说操作，避免比喻。
每次回答都调用 present_camera 工具提交：answer 是给用户看的文字；steps 是让三维模型配合演示的步骤，零到六步。
步骤只能引用部件清单里的 id。要让用户"看到"位置时，把 focus 设为 true 并给出 parts；要演示机械动作用 control；要真正操作相机（开机、换模式、改光圈快门 ISO、按 MENU/Q/INFO/快门）用 firmware，屏幕会跟着变。
用户问"现在是什么模式/参数"时，直接读"虚拟相机当前状态"回答。用户想练习或想学某个操作时，用 start_lesson 开一门匹配的课程（清单在 lessons 字段），然后只提示不代劳。教操作时先 focus 到要碰的部件，再用 firmware 执行，一步一个动作。相机关机时先 power_on。
不确定的事实就说不确定，不要编造菜单路径。清单外的功能（比如具体菜单第几页）可以描述大致位置但要说明是大致。
如果当前模型是占位方块（modelSource=placeholder），仍然按部件 id 演示，位置是近似的。`;

export function buildRequest(body, messages) {
  const manifest = describeCamera(body.modelSource === 'r6iii' ? 'r6iii' : 'placeholder');
  let context = body.context?.part ? `\n\n用户当前选中的部件：${body.context.part}` : '';
  if (body.context?.camera && typeof body.context.camera === 'object') context += `\n\n虚拟相机当前状态（JSON）：${JSON.stringify(body.context.camera).slice(0, 1500)}`;
  if (body.context?.lesson && typeof body.context.lesson === 'object') { const L = body.context.lesson; context += `\n\n用户正在练习课程「${L.title}」，目标进度：${(L.goals || []).map((g, i) => `${i + 1}.${g.text}${g.done ? '✓' : ''}`).join(' ')}。当前卡在第 ${(L.next ?? 0) + 1} 步。练习中只给提示和 focus 到相关部件，不要用 firmware 替用户完成目标，除非用户明确说"帮我做"。`; }
  const system = SYSTEM + '\n\n部件清单与控制件（JSON）：\n' + JSON.stringify(manifest);
  const last = messages[messages.length - 1];
  const msgs = messages.slice(0, -1).concat({ role: 'user', content: last.content + context });
  return { system, messages: msgs };
}

/** Clean the chat history the way the server does. */
export function cleanMessages(list) {
  return (Array.isArray(list) ? list : []).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length < 4000).slice(-12);
}

/** OpenAI-style chat/completions body for Volcengine Ark (Doubao), forcing the present_camera tool. */
export function arkRequestBody({ model, system, messages, stream }) {
  const t = guideTool(); const tool = { type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } };
  return { model, stream: !!stream, messages: [{ role: 'system', content: system }, ...messages], tools: [tool], tool_choice: { type: 'function', function: { name: t.name } }, temperature: 0.2, max_tokens: 2600, ...(model === 'doubao-seed-evolving' ? { thinking: { type: 'disabled' } } : {}) };
}

/** Pull the partial "answer" string out of a growing tool-arguments JSON fragment. */
export function partialAnswer(args) {
  const m = /"answer"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(args); if (!m) return null;
  try { return JSON.parse('"' + m[1] + '"'); } catch { return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'); }
}

/** Read an Ark SSE stream. Calls onAnswer(text) as the answer grows; resolves { plan } or { error }. */
export async function consumeArkStream(response, onAnswer) {
  const reader = response.body.getReader(); const dec = new TextDecoder(); let buf = '', args = '', content = '', last = '', finish = null;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue; const data = line.slice(5).trim(); if (data === '[DONE]') continue;
      let j; try { j = JSON.parse(data); } catch { continue; }
      const ch = j.choices?.[0]; if (!ch) continue; if (ch.finish_reason) finish = ch.finish_reason;
      const d = ch.delta || {}; if (typeof d.content === 'string') content += d.content;
      for (const tc of d.tool_calls || []) if (tc.function?.arguments) args += tc.function.arguments;
      const a = partialAnswer(args); if (a && a !== last) { last = a; onAnswer?.(a); }
    }
  }
  if (finish === 'length') return { error: '讲解内容被截断' };
  if (args) { try { return { plan: validatePlan(JSON.parse(args)) }; } catch (e) { return { error: '讲解格式无效：' + e.message, raw: args.slice(0, 800) }; } }
  if (content.trim()) return { plan: { answer: content.trim(), steps: [] } };
  return { error: '豆包没有返回内容' };
}
