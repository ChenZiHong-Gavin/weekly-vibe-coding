import { sample, tokenize, toRGBA } from "./sampler.js";

const $ = (id) => document.getElementById(id);
const ort = window.ort;
const state = { session: null, meta: null, attrs: null, backend: "", busy: false, last: null, n: 9, steps: 15 };

const EXAMPLES = [
  "a cat wearing a blue beret",
  "a cat with a happy face, wearing a pink afro",
  "a cat with a wink face, wearing a crown, dressed in a red hoodie",
  "a cat with three eyes face, wearing a purple bucket hat",
  "a cat with sunglasses heart face, wearing a yellow beret, dressed in a green tshirt",
  "a cat wearing an astro fishbowl, dressed in a tiger",
  "a pixel cat",
];

// ---------------------------------------------------------------- prompt builder

function article(phrase) { return /^[aeiou]/.test(phrase) ? "an" : "a"; }
function withColour(item, colour) { return colour ? `${colour} ${item}` : item; }

function fillBuilder() {
  const a = state.attrs;
  for (const key of ["face", "hat", "clothes"]) $(key).replaceChildren(new Option("不指定", ""), ...a[key].map((it) => new Option(it.item, it.item)));
  for (const key of ["hatColour", "clothesColour"]) $(key).replaceChildren(new Option("原色", ""), ...a.colours.map((c) => new Option(c, c)));
}

function buildPrompt() {
  const a = state.attrs, parts = [];
  const pick = (key, colourKey) => {
    const item = $(key).value; if (!item) return null;
    let colour = colourKey ? $(colourKey).value : "";
    if (!colour) { const real = a[key].find((x) => x.item === item)?.colours || []; colour = real[0] || ""; }
    return withColour(item, colour);
  };
  const face = pick("face", null), hat = pick("hat", "hatColour"), clothes = pick("clothes", "clothesColour");
  if (face) parts.push(`with ${article(face)} ${face} face`);
  if (hat) parts.push(`wearing ${article(hat)} ${hat}`);
  if (clothes) parts.push(`dressed in ${article(clothes)} ${clothes}`);
  return parts.length ? `a cat ${parts.join(", ")}` : "a pixel cat";
}

function randomise() {
  const a = state.attrs, r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  $("face").value = r(a.face).item; $("hat").value = r(a.hat).item; $("clothes").value = r(a.clothes).item;
  $("hatColour").value = Math.random() < 0.5 ? r(a.colours) : ""; $("clothesColour").value = Math.random() < 0.5 ? r(a.colours) : "";
  $("prompt").value = buildPrompt(); showTokens();
}

function showTokens() {
  const { known, unknown } = tokenize($("prompt").value, state.meta);
  const words = $("prompt").value.toLowerCase().replace(/[.!?;:,]/g, " ").split(/\s+/).filter(Boolean);
  $("tokens").replaceChildren(...words.map((w) => {
    const s = document.createElement("span"); s.className = "tok" + (state.meta.vocabIndex.has(w) ? "" : " off"); s.textContent = w; return s;
  }));
  $("tokenNote").hidden = !unknown.length;
  return known;
}

// ---------------------------------------------------------------- grid

function makeGrid(n) {
  const crop = state.meta.crop;
  $("grid").style.setProperty("--cols", String(Math.round(Math.sqrt(n))));
  $("grid").replaceChildren(...Array.from({ length: n }, (_, k) => {
    const cell = document.createElement("button"); cell.type = "button"; cell.className = "cat-cell"; cell.title = "下载这只猫";
    cell.setAttribute("aria-label", `下载第 ${k + 1} 只猫 PNG`); cell.style.setProperty("--delay", "0ms");
    const c = document.createElement("canvas"); c.width = c.height = crop;
    const caption = document.createElement("span"); caption.className = "cat-caption";
    const num = document.createElement("span"); num.textContent = String(k + 1).padStart(2, "0");
    const arrow = document.createElement("span"); arrow.textContent = "↓ PNG"; caption.append(num, arrow);
    cell.append(c, caption); cell.addEventListener("click", () => download(k));
    return cell;
  }));
}

function draw(batch, n) {
  const { size, crop } = state.meta, cells = $("grid").querySelectorAll("canvas");
  for (let k = 0; k < n; k++) cells[k].getContext("2d").putImageData(new ImageData(toRGBA(batch, k, size, crop), crop, crop), 0, 0);
}

function save(canvas, name) {
  canvas.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
}

function download(k) {
  if (!state.last) return;
  const c = $("grid").querySelectorAll("canvas")[k];
  const out = document.createElement("canvas"); out.width = out.height = state.meta.crop * 16;
  const g = out.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, out.width, out.height);
  save(out, `pixel-cat-${state.last.seed}-${k + 1}.png`);
}

function saveSheet() {
  const cs = [...$("grid").querySelectorAll("canvas")], cols = Math.round(Math.sqrt(cs.length));
  const crop = state.meta.crop, pad = 2, scale = 8, rows = Math.ceil(cs.length / cols);
  const out = document.createElement("canvas");
  out.width = (cols * (crop + pad) + pad) * scale; out.height = (rows * (crop + pad) + pad) * scale;
  const g = out.getContext("2d"); g.imageSmoothingEnabled = false; g.fillStyle = "#ffffff"; g.fillRect(0, 0, out.width, out.height);
  cs.forEach((c, i) => g.drawImage(c, (pad + (i % cols) * (crop + pad)) * scale, (pad + Math.floor(i / cols) * (crop + pad)) * scale, crop * scale, crop * scale));
  save(out, `pixel-cats-${state.last?.seed ?? 0}.png`);
}

// ---------------------------------------------------------------- run

async function generate() {
  if (state.busy || !state.session) return;
  state.busy = true; $("go").disabled = true; $("saveAll").disabled = true; $("goLabel").textContent = "生成中…";
  const known = showTokens();
  const { ids } = tokenize($("prompt").value, state.meta);
  const n = state.n, steps = state.steps, w = Number($("guidance").value), seed = Number($("seed").value) || 0;
  makeGrid(n);
  $("bar").style.width = "0"; $("stepText").textContent = "准备中…";
  const t0 = performance.now();
  try {
    await sample(ort, state.session, state.meta, known.length ? ids : state.meta.null_ids, {
      n, steps, w: known.length ? w : 1, seed,
      onStep: async (i, total, x0) => {
        draw(x0, n);
        $("bar").style.width = `${((i + 1) / total) * 100}%`;
        $("progress").setAttribute("aria-valuenow", String(Math.round(((i + 1) / total) * 100)));
        $("stepText").textContent = `去噪 ${i + 1}/${total}`;
        await new Promise(requestAnimationFrame);
      },
    });
    $("bar").style.width = "100%"; $("stepText").textContent = `完成 · ${((performance.now() - t0) / 1000).toFixed(1)} 秒`;
    state.last = { seed, n }; $("saveAll").disabled = false;
  } catch (e) {
    console.error(e); $("stepText").textContent = "出错了，看控制台";
  } finally { state.busy = false; $("go").disabled = false; $("goLabel").textContent = "生成"; }
}

function segmented(id, key) {
  const buttons = $(id).querySelectorAll("button");
  for (const b of buttons) b.addEventListener("click", () => {
    if (state.busy) return;
    buttons.forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    state[key] = Number(b.dataset.v);
  });
}

async function init() {
  segmented("count", "n"); segmented("steps", "steps");
  $("guidance").addEventListener("input", () => ($("guidanceOut").value = $("guidance").value));
  $("newSeed").addEventListener("click", () => { $("seed").value = Math.floor(Math.random() * 100000); });
  $("go").addEventListener("click", generate);
  $("saveAll").addEventListener("click", saveSheet);
  $("prompt").addEventListener("input", () => state.meta && showTokens());
  $("prompt").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generate(); } });

  const [meta, attrs] = await Promise.all([fetch("model/meta.json").then((r) => r.json()), fetch("model/attributes.json").then((r) => r.json())]);
  state.meta = meta; state.attrs = attrs; meta.vocabIndex = new Map(meta.vocab.map((w, i) => [w, i]));
  fillBuilder(); showTokens(); makeGrid(state.n);
  for (const key of ["face", "hat", "hatColour", "clothes", "clothesColour"]) $(key).addEventListener("change", () => { $("prompt").value = buildPrompt(); showTokens(); });
  $("randomise").addEventListener("click", randomise);
  document.querySelectorAll("[data-example]").forEach((b) => {
    const p = EXAMPLES[Number(b.dataset.example)]; b.title = p;
    b.addEventListener("click", () => { $("prompt").value = p; showTokens(); generate(); });
  });

  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
  ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 1);
  const t0 = performance.now(), providers = [];
  if (navigator.gpu) { try { if (await navigator.gpu.requestAdapter()) providers.push("webgpu"); } catch {} }
  providers.push("wasm");
  for (const p of providers) {
    try {
      state.session = await ort.InferenceSession.create("model/model.onnx", { executionProviders: [p], graphOptimizationLevel: "all" });
      state.backend = p; break;
    } catch (e) { console.warn(`backend ${p} failed`, e); }
  }
  if (!state.session) { $("status").textContent = "模型加载失败，换个浏览器试试"; return; }
  $("status").textContent = `${state.backend === "webgpu" ? "WebGPU" : "CPU"} · 加载 ${((performance.now() - t0) / 1000).toFixed(1)} 秒`;
  $("status").classList.add("ready"); $("go").disabled = false;
  generate();
}

init();
