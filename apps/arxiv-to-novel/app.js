/**
 * Paper2Novel – Pure Frontend
 * No backend needed. All logic runs in the browser:
 *   1. Fetch paper from ar5iv (HTML) or arXiv API (metadata)
 *   2. Chunk text by character/paragraph boundaries
 *   3. Call OpenAI-compatible API directly from browser with SSE streaming
 *   4. Render novel chapters in real-time
 *
 * API key is stored in localStorage — never sent anywhere except the configured API endpoint.
 */

// ── Genre Data ───────────────────────────────────────
const GENRES = [
  { id: "sci-fi",     name: "科幻",     emoji: "🚀", desc: "赛博朋克、星际旅行、未来科技" },
  { id: "fantasy",    name: "奇幻",     emoji: "🧙", desc: "魔法世界、龙与地下城、史诗冒险" },
  { id: "detective",  name: "悬疑推理", emoji: "🔍", desc: "福尔摩斯式推理、案件调查" },
  { id: "wuxia",      name: "武侠",     emoji: "⚔️", desc: "江湖恩怨、武功秘籍、侠客传奇" },
  { id: "romance",    name: "言情",     emoji: "💕", desc: "甜蜜恋爱、浪漫邂逅" },
  { id: "horror",     name: "恐怖",     emoji: "👻", desc: "克苏鲁风格、悬疑恐怖" },
  { id: "humor",      name: "幽默讽刺", emoji: "😂", desc: "黑色幽默、荒诞讽刺" },
  { id: "fairy-tale", name: "童话",     emoji: "🧚", desc: "温馨童话、寓言故事" },
  { id: "xianxia",    name: "仙侠修真", emoji: "🏔️", desc: "修仙问道、飞升渡劫" },
  { id: "war",        name: "战争史诗", emoji: "⚔️", desc: "宏大战争叙事、英雄传奇" },
];

let selectedGenre = "sci-fi";
let isConverting = false;

// ── Settings (localStorage) ──────────────────────────
const STORAGE_KEY = "papernovel_settings";

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  };
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function getSettings() {
  return loadSettings();
}


// ── LLM Prompt Templates ─────────────────────────────
const SYSTEM_PROMPT = `你是一位才华横溢的小说家，擅长将枯燥的学术论文改写为引人入胜的小说。

## 规则
1. 保留论文的**所有核心知识点**和技术内容，但用小说的方式表达
2. 创造生动的角色、场景和对话来承载论文的概念
3. 论文中的公式/数据可以转化为角色的对话或内心独白
4. 保持叙事连贯性 — 你在写一本连载小说的其中一章
5. 每章开头可以有简短的引入，但不要重复上一章的内容
6. 输出为纯文本，使用 Markdown 格式（标题用 ##，强调用 **）
7. 写作要有文学性，有画面感，有节奏感
8. **关键规则**：如果某段文字涉及重要知识点（如算法原理、模型架构、公式含义等），请在该段落末尾添加注释，格式为：\`[[知识点：这里是简短的解释]]\`。请确保每一章至少有 3-5 个这样的知识点注释。`;

function buildUserPrompt(chunkText, chunkIndex, totalChunks, paperTitle, genre, language) {
  let genreName = genre;
  for (const g of GENRES) {
    if (g.id === genre || g.name === genre) {
      genreName = `${g.emoji} ${g.name}（${g.desc}）`;
      break;
    }
  }

  let positionHint = "";
  if (chunkIndex === 0) {
    positionHint = "这是小说的**开篇**。需要设定世界观、介绍主要角色、铺垫故事背景。";
  } else if (chunkIndex === totalChunks - 1) {
    positionHint = "这是小说的**终章**。需要收束故事线、升华主题、给读者留下深刻印象。";
  } else {
    positionHint = `这是第 ${chunkIndex + 1}/${totalChunks} 章，承上启下，推进情节发展。`;
  }

  return `## 任务
将以下学术论文片段改写为 **${genreName}** 风格的小说章节。

## 论文标题
${paperTitle}

## 章节位置
${positionHint}

## 输出语言
${language}

## 论文原文（第 ${chunkIndex + 1}/${totalChunks} 段）
---
${chunkText}
---

请开始创作这一章的小说内容：`;
}


// ── Paper Fetcher (runs in browser) ──────────────────

function parseArxivId(url) {
  url = url.trim().replace(/\/+$/, "");
  const m = url.match(/(\d{4}\.\d{4,5})(v\d+)?/);
  if (m) return m[0];
  throw new Error(`无法从 URL 中提取 arXiv ID: ${url}`);
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// CORS proxy helpers — try direct first, then proxies
const CORS_PROXIES = [
  (url) => url, // direct (works when deployed on HTTPS)
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function fetchWithCorsProxy(url) {
  let lastError;
  for (const proxy of CORS_PROXIES) {
    try {
      const proxiedUrl = proxy(url);
      const resp = await fetch(proxiedUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp;
    } catch (e) {
      lastError = e;
      console.warn(`Fetch failed for ${url} via proxy:`, e.message);
    }
  }
  throw lastError;
}

async function fetchPaperFromAr5iv(arxivId) {
  const htmlUrl = `https://ar5iv.labs.arxiv.org/html/${arxivId}`;
  const resp = await fetchWithCorsProxy(htmlUrl);
  if (!resp.ok) throw new Error(`ar5iv 请求失败: ${resp.status}`);
  const html = await resp.text();

  // Parse using DOMParser (browser native!)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Extract title
  const titleEl = doc.querySelector("h1.ltx_title");
  const title = titleEl ? titleEl.textContent.trim() : "Unknown";

  // Extract authors
  const authorEls = doc.querySelectorAll(".ltx_personname");
  const authors = Array.from(authorEls).map(el => el.textContent.trim());

  // Extract abstract
  const abstractEl = doc.querySelector(".ltx_abstract");
  let abstract = "";
  if (abstractEl) {
    abstract = abstractEl.textContent.replace(/^Abstract\s*/i, "").trim();
  }

  // Extract body text - all paragraphs and headings
  const allTextParts = [];
  const elements = doc.querySelectorAll(
    "h2, h3, h4, h5, h6, .ltx_para, .ltx_p, p.ltx_p"
  );
  for (const el of elements) {
    const text = el.textContent.trim();
    if (text.length > 20) {
      if (el.tagName.match(/^H[2-6]$/i)) {
        allTextParts.push(`\n## ${text}\n`);
      } else {
        allTextParts.push(text);
      }
    }
  }

  const fullText = allTextParts.join("\n\n");
  if (fullText.length < 500) {
    throw new Error("从 ar5iv 提取的文本太短");
  }

  return { title, authors, abstract, fullText };
}

async function fetchMetadataFromApi(arxivId) {
  const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
  try {
    const resp = await fetchWithCorsProxy(apiUrl);
    const xml = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");

    const entries = doc.querySelectorAll("entry");
    if (entries.length === 0) return { title: "Unknown", authors: [], abstract: "" };

    const entry = entries[0];
    const title = entry.querySelector("title")?.textContent?.trim().replace(/\n/g, " ") || "Unknown";
    const authorNodes = entry.querySelectorAll("author name");
    const authors = Array.from(authorNodes).map(n => n.textContent.trim());
    const abstract = entry.querySelector("summary")?.textContent?.trim().replace(/\n/g, " ") || "";

    return { title, authors, abstract };
  } catch (e) {
    return { title: "Unknown", authors: [], abstract: "" };
  }
}

async function fetchPaper(url) {
  const arxivId = parseArxivId(url);

  // Try ar5iv HTML first
  try {
    const paper = await fetchPaperFromAr5iv(arxivId);
    if (paper.fullText && paper.fullText.length > 500) {
      return paper;
    }
  } catch (e) {
    console.warn("ar5iv fetch failed, trying metadata API:", e.message);
  }

  // Fallback: at least get metadata. PDF parsing is not feasible in pure frontend
  // without heavy WASM libraries, so we'll inform the user.
  const meta = await fetchMetadataFromApi(arxivId);
  if (meta.abstract && meta.abstract.length > 100) {
    // Use abstract as a last resort
    return {
      title: meta.title,
      authors: meta.authors,
      abstract: meta.abstract,
      fullText: meta.abstract,
    };
  }

  throw new Error(
    "无法提取论文全文。ar5iv 可能尚未收录此论文。请尝试较新的论文（通常 2019 年后的都有 HTML 版本）。"
  );
}


// ── Text Chunker (runs in browser) ───────────────────

function chunkText(text, maxChars = 6000) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let currentParts = [];
  let currentLen = 0;

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;

    // If a single paragraph exceeds max, split it further
    if (p.length > maxChars) {
      // Flush current
      if (currentParts.length > 0) {
        chunks.push(currentParts.join("\n\n"));
        currentParts = [];
        currentLen = 0;
      }
      // Split by sentences
      const sentences = p.split(/(?<=[.!?。！？\n])\s+/);
      let subParts = [];
      let subLen = 0;
      for (const sent of sentences) {
        if (subLen + sent.length > maxChars && subParts.length > 0) {
          chunks.push(subParts.join(" "));
          subParts = [];
          subLen = 0;
        }
        subParts.push(sent);
        subLen += sent.length;
      }
      if (subParts.length > 0) {
        chunks.push(subParts.join(" "));
      }
      continue;
    }

    if (currentLen + p.length > maxChars && currentParts.length > 0) {
      chunks.push(currentParts.join("\n\n"));
      currentParts = [p];
      currentLen = p.length;
    } else {
      currentParts.push(p);
      currentLen += p.length;
    }
  }

  if (currentParts.length > 0) {
    chunks.push(currentParts.join("\n\n"));
  }

  return chunks;
}


// ── OpenAI Streaming (direct from browser) ───────────

async function* streamChatCompletion(messages, signal) {
  const settings = getSettings();

  if (!settings.apiKey) {
    throw new Error("请先在右上角 ⚙️ 设置中配置 OpenAI API Key");
  }

  const baseUrl = (settings.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = settings.model || "gpt-4o";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: true,
      temperature: 0.85,
      max_tokens: 4096,
    }),
    signal: signal,
  });

  if (!response.ok) {
    let errMsg = `API 请求失败 (${response.status})`;
    try {
      const errBody = await response.json();
      errMsg = errBody.error?.message || errMsg;
    } catch (e) { /* ignore */ }
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch (e) {
        // skip unparseable lines
      }
    }
  }
}


// ── Init ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderGenresSection();
  renderGenrePicker();
  bindEvents();
  loadSettingsUI();
  initDemo();
});


// ── Render Genre Cards (showcase section) ────────────
function renderGenresSection() {
  const grid = document.getElementById("genresGrid");
  if (!grid) return;
  grid.innerHTML = GENRES.map(g => `
    <div class="genre-card clay-card" data-genre="${g.id}">
      <span class="genre-emoji">${g.emoji}</span>
      <div class="genre-name">${g.name}</div>
      <div class="genre-desc">${g.desc}</div>
    </div>
  `).join("");
}


// ── Render Genre Picker (converter section) ──────────
function renderGenrePicker() {
  const picker = document.getElementById("genrePicker");
  if (!picker) return;
  picker.innerHTML = GENRES.map(g => `
    <div class="genre-chip ${g.id === selectedGenre ? 'active' : ''}" data-genre="${g.id}">
      <span>${g.emoji}</span>
      <span>${g.name}</span>
    </div>
  `).join("");

  picker.querySelectorAll(".genre-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      selectedGenre = chip.dataset.genre;
      picker.querySelectorAll(".genre-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });
}


// ── Settings Modal ───────────────────────────────────
let settingsModalTimer = null;

function loadSettingsUI() {
  const s = loadSettings();
  document.getElementById("apiKey").value = s.apiKey || "";
  document.getElementById("baseUrl").value = s.baseUrl || "https://api.openai.com/v1";
  document.getElementById("modelName").value = s.model || "gpt-4o";
}

function showSettingsModal() {
  if (settingsModalTimer) {
    clearTimeout(settingsModalTimer);
    settingsModalTimer = null;
  }
  loadSettingsUI();
  const modal = document.getElementById("settingsModal");
  modal.style.display = "flex";
  // Force reflow to enable transition
  modal.offsetHeight;
  modal.classList.add("visible");
}

function hideSettingsModal() {
  const modal = document.getElementById("settingsModal");
  modal.classList.remove("visible");
  settingsModalTimer = setTimeout(() => {
    modal.style.display = "none";
    settingsModalTimer = null;
  }, 300);
}

function doSaveSettings() {
  const settings = {
    apiKey: document.getElementById("apiKey").value.trim(),
    baseUrl: document.getElementById("baseUrl").value.trim() || "https://api.openai.com/v1",
    model: document.getElementById("modelName").value.trim() || "gpt-4o",
  };
  saveSettings(settings);
  hideSettingsModal();

  // Visual feedback
  const btn = document.getElementById("btnSettings");
  const orig = btn.textContent;
  btn.textContent = "✅ 已保存";
  setTimeout(() => btn.textContent = orig, 1500);
}


let controller = null;

// ── Event Binding ────────────────────────────────────
function bindEvents() {
  document.getElementById("btnConvert").addEventListener("click", startConvert);
  document.getElementById("btnStop").addEventListener("click", stopConvert);
  document.getElementById("btnCopy").addEventListener("click", copyNovel);
  document.getElementById("btnDownload").addEventListener("click", downloadNovel);
  document.getElementById("btnSettings").addEventListener("click", showSettingsModal);
  document.getElementById("btnCloseSettings").addEventListener("click", hideSettingsModal);
  document.getElementById("btnSaveSettings").addEventListener("click", doSaveSettings);

  // Close modal on overlay click
  document.getElementById("settingsModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) hideSettingsModal();
  });
}


// ── Convert ──────────────────────────────────────────
async function startConvert() {
  if (isConverting) return;

  // Check settings
  const settings = getSettings();
  if (!settings.apiKey) {
    showSettingsModal();
    alert("请先配置 OpenAI API Key");
    return;
  }

  const url = document.getElementById("arxivUrl").value.trim();
  if (!url) {
    alert("请输入 arXiv 论文链接");
    return;
  }

  const chunkSize = parseInt(document.getElementById("chunkSize").value) || 6000;
  const language = document.getElementById("language").value;

  // UI state
  isConverting = true;
  controller = new AbortController();
  const btn = document.getElementById("btnConvert");
  const btnStop = document.getElementById("btnStop");
  
  btn.style.display = "none";
  btnStop.style.display = "inline-flex";
  
  const progressArea = document.getElementById("progressArea");
  const novelOutput = document.getElementById("novelOutput");
  progressArea.style.display = "block";
  novelOutput.style.display = "none";
  document.getElementById("novelContent").innerHTML = "";

  try {
    // Step 1: Fetch paper
    if (controller.signal.aborted) throw new Error("已停止");
    document.getElementById("paperTitle").textContent = "正在获取论文...";
    document.getElementById("paperAuthors").textContent = "从 ar5iv 提取全文中...";

    const paper = await fetchPaper(url);

    if (controller.signal.aborted) throw new Error("已停止");
    document.getElementById("paperTitle").textContent = paper.title;
    document.getElementById("paperAuthors").textContent = paper.authors.join(", ") || "Unknown";

    // Step 2: Chunk
    const chunks = chunkText(paper.fullText, chunkSize);
    const totalChunks = chunks.length;

    renderChunkIndicators(totalChunks);
    novelOutput.style.display = "block";

    // Set novel header
    const genreObj = GENRES.find(g => g.id === selectedGenre);
    document.getElementById("novelTitle").textContent = paper.title;
    document.getElementById("novelGenre").textContent = genreObj ? `${genreObj.emoji} ${genreObj.name}` : selectedGenre;
    document.getElementById("novelChapters").textContent = `共 ${totalChunks} 章`;

    // Step 3: Stream each chunk through LLM
    for (let idx = 0; idx < totalChunks; idx++) {
      if (controller.signal.aborted) throw new Error("已停止");
      
      setChunkStatus(idx, "active");
      updateProgress(idx, totalChunks);
      ensureChapterEl(idx, totalChunks);

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(chunks[idx], idx, totalChunks, paper.title, selectedGenre, language) },
      ];

      let chapterText = "";
      for await (const token of streamChatCompletion(messages, controller.signal)) {
        chapterText += token;
        renderChapterContent(idx, chapterText);
      }

      setChunkStatus(idx, "done");
    }

    updateProgress(totalChunks, totalChunks);

  } catch (err) {
    if (err.name === 'AbortError' || err.message === "已停止") {
      console.log("Conversion stopped by user");
    } else {
      alert("转换出错：" + err.message);
      console.error(err);
    }
  } finally {
    isConverting = false;
    controller = null;
    btn.style.display = "inline-flex";
    btn.querySelector(".btn-text").style.display = "inline-flex";
    btn.querySelector(".btn-loading").style.display = "none";
    btn.disabled = false;
    btnStop.style.display = "none";
  }
}

function stopConvert() {
  if (controller) {
    controller.abort();
  }
}

function downloadNovel() {
  const title = document.getElementById("novelTitle").textContent.trim();
  if (!title || title === "—") {
    alert("暂无内容可下载");
    return;
  }
  
  let content = `# ${title}\n\n`;
  const meta = document.getElementById("novelGenre").textContent;
  content += `> 风格：${meta}\n\n---\n\n`;

  const chapters = document.querySelectorAll("#novelContent .chapter");
  chapters.forEach(ch => {
    const chTitle = ch.querySelector(".chapter-title").innerText;
    const chBody = ch.querySelector(".chapter-body").innerText; // innerText preserves newlines better than textContent usually
    content += `## ${chTitle}\n\n${chBody}\n\n`;
  });

  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ── UI Helpers ───────────────────────────────────────
function renderChunkIndicators(total) {
  const container = document.getElementById("chunkIndicators");
  container.innerHTML = Array.from({ length: total }, (_, i) =>
    `<div class="chunk-dot" id="chunk-${i}">${i + 1}</div>`
  ).join("");
}

function setChunkStatus(index, status) {
  const dot = document.getElementById(`chunk-${index}`);
  if (dot) {
    dot.className = "chunk-dot " + status;
  }
}

function updateProgress(current, total) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressText").textContent = pct + "%";
}

function ensureChapterEl(index, total) {
  const container = document.getElementById("novelContent");
  if (!document.getElementById(`chapter-${index}`)) {
    const div = document.createElement("div");
    div.className = "chapter";
    div.id = `chapter-${index}`;
    div.innerHTML = `<div class="chapter-title">第 ${index + 1} 章</div><div class="chapter-body"></div>`;
    container.appendChild(div);
  }
}

function renderChapterContent(index, fullText) {
  const chapterEl = document.getElementById(`chapter-${index}`);
  if (!chapterEl) return;
  const body = chapterEl.querySelector(".chapter-body");
  body.innerHTML = renderNovelText(fullText);
}

function renderNovelText(text) {
  if (!text) return "";
  
  // Normalize
  text = text.replace(/\r\n/g, "\n");
  
  const blocks = text.split(/\n\n+/);
  let html = "";
  
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    
    // Headings
    if (trimmed.startsWith("## ")) {
      const heading = trimmed.slice(3).replace(/\*\*/g, "").replace(/\*/g, "");
      html += `<strong style="font-size:1.15em;display:block;margin:24px 0 12px;color:var(--primary-dark)">${heading}</strong>`;
      continue;
    }
    
    // Annotations: [[知识点：...]]
    const noteMatch = trimmed.match(/\[\[知识点：(.+?)\]\]/);
    let content = trimmed;
    let note = null;
    
    if (noteMatch) {
      note = noteMatch[1];
      content = trimmed.replace(noteMatch[0], "").trim();
    }
    
    // Markdown
    content = content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
      
    const noteHtml = note ? `<div class="novel-note">${note}</div>` : "";
    
    // Add toggle button if note exists
    const toggleBtn = note ? `<button class="note-toggle" aria-label="查看注释">💡</button>` : "";
    
    html += `
      <div class="novel-block">
        <div class="novel-text">${content}${toggleBtn}</div>
        ${noteHtml}
      </div>`;
  }
  
  return html;
}

// ── Event Delegation for Notes ─────────────────────────
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".note-toggle");
  if (!btn) return;
  
  // Prevent default button behavior
  e.preventDefault();
  e.stopPropagation();
  
  // Toggle active state on button
  btn.classList.toggle("active");
  
  // Find the note (it should be in the parent .novel-block, next to .novel-text)
  const block = btn.closest(".novel-block");
  if (block) {
    const note = block.querySelector(".novel-note");
    if (note) {
      note.classList.toggle("visible");
    }
  }
});

function copyNovel() {
  const content = document.getElementById("novelContent");
  const text = content.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("btnCopy");
    const orig = btn.textContent;
    btn.textContent = "✅ 已复制！";
    setTimeout(() => btn.textContent = orig, 2000);
  });
}


// ── Demo Novel Reader ────────────────────────────────
let demoCurrentChapter = 0;

function initDemo() {
  if (typeof DEMO_NOVEL_CHAPTERS === "undefined" || !DEMO_NOVEL_CHAPTERS.length) return;

  renderDemoToc();
  renderDemoChapter(0);
  bindDemoEvents();
}

function renderDemoToc() {
  const list = document.getElementById("demoTocList");
  if (!list) return;
  list.innerHTML = DEMO_NOVEL_CHAPTERS.map((ch, i) => {
    const shortTitle = ch.title.replace(/^第.+章\s*·\s*/, "");
    return `<div class="demo-toc-item ${i === 0 ? 'active' : ''}" data-chapter="${i}">
      <span class="demo-toc-num">${i + 1}</span>
      <span>${shortTitle}</span>
    </div>`;
  }).join("");

  list.querySelectorAll(".demo-toc-item").forEach(item => {
    item.addEventListener("click", () => {
      const idx = parseInt(item.dataset.chapter);
      navigateDemoChapter(idx);
    });
  });
}

function renderDemoChapter(index) {
  const ch = DEMO_NOVEL_CHAPTERS[index];
  if (!ch) return;

  const content = document.getElementById("demoReaderContent");
  const total = DEMO_NOVEL_CHAPTERS.length;

  let html = `<div class="demo-chapter-heading">${ch.title}</div>`;
  if (ch.subtitle) {
    html += `<div class="demo-chapter-subtitle">${ch.subtitle}</div>`;
  }

  for (const para of ch.paragraphs) {
    let text = "";
    let note = null;

    if (typeof para === "string") {
      text = para;
    } else {
      text = para.text;
      note = para.note;
    }

    // Check for special formatting
    if (text.startsWith("<strong")) {
      html += `<div class="novel-block"><div class="novel-text" style="text-indent:0">${text}</div></div>`;
    } else if (text.startsWith("——")) {
      html += `<div class="demo-separator">${text}</div>`;
    } else {
      // Convert markdown bold/italic in paragraph
      let processed = text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
      
      const noteHtml = note ? `<div class="novel-note">${note}</div>` : "";
      const toggleBtn = note ? `<button class="note-toggle" aria-label="查看注释">💡</button>` : "";
      
      html += `
        <div class="novel-block">
          <div class="novel-text">${processed}${toggleBtn}</div>
          ${noteHtml}
        </div>`;
    }
  }

  content.innerHTML = html;

  // Update indicator
  document.getElementById("demoChapterIndicator").textContent = `第 ${index + 1} / ${total} 章`;

  // Update buttons
  const prevBtns = [document.getElementById("demoPrev"), document.getElementById("demoPrevBottom")];
  const nextBtns = [document.getElementById("demoNext"), document.getElementById("demoNextBottom")];
  prevBtns.forEach(btn => { if (btn) btn.disabled = (index === 0); });
  nextBtns.forEach(btn => { if (btn) btn.disabled = (index === total - 1); });

  // Update TOC active state
  document.querySelectorAll(".demo-toc-item").forEach((item, i) => {
    item.classList.toggle("active", i === index);
  });

  demoCurrentChapter = index;
}

function navigateDemoChapter(index) {
  if (index < 0 || index >= DEMO_NOVEL_CHAPTERS.length) return;
  renderDemoChapter(index);
  // Scroll reader to top
  const reader = document.getElementById("demoReaderContent");
  if (reader) reader.scrollTop = 0;
  // Scroll into view on mobile
  const readerCard = document.getElementById("demoReader");
  if (readerCard && window.innerWidth <= 768) {
    readerCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function bindDemoEvents() {
  const prevBtn = document.getElementById("demoPrev");
  const nextBtn = document.getElementById("demoNext");
  const prevBtnBottom = document.getElementById("demoPrevBottom");
  const nextBtnBottom = document.getElementById("demoNextBottom");

  if (prevBtn) prevBtn.addEventListener("click", () => navigateDemoChapter(demoCurrentChapter - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => navigateDemoChapter(demoCurrentChapter + 1));
  if (prevBtnBottom) prevBtnBottom.addEventListener("click", () => navigateDemoChapter(demoCurrentChapter - 1));
  if (nextBtnBottom) nextBtnBottom.addEventListener("click", () => navigateDemoChapter(demoCurrentChapter + 1));
}
