import {
  prepareWithSegments, layoutNextLine,
  type PreparedTextWithSegments, type LayoutCursor,
} from '@chenglou/pretext'
import { planets, HEADLINE, ARTICLE, type Planet } from './planets'
import { initStars } from './stars'

// ─── Typography ──────────────────────────────────────────────────────
const BODY_FONT = '18px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif'
const BODY_LH = 28
const HEAD_FONT = '700 86px/80px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif'
const HEAD_LH = 85
const MARGIN = 48
const COL_GAP = 40
const DROP_CAP_FONT = '700 86px/86px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif'
const BOTTOM_RESERVE = 36

// ─── State ───────────────────────────────────────────────────────────
let speed = 0.3, animTime = 0, cx = 0, cy = 0, paused = false
let frameCalls = 0, frameMs = 0, frameLinesCount = 0
let headlinePrepared: PreparedTextWithSegments | null = null
let bodyPrepared: PreparedTextWithSegments | null = null

// Each orb has:
//  - visual radius (the CSS div size, big, includes glow)
//  - clip radius (the zone where text is displaced, smaller, just the solid core)
type Orb = { x: number; y: number; visualR: number; clipR: number; planet: Planet }
let orbs: Orb[] = []

// DOM pools
let linePool: HTMLSpanElement[] = []
let headlinePool: HTMLSpanElement[] = []
let orbEls: HTMLDivElement[] = []
let labelEls: HTMLDivElement[] = []
let dropCapEl: HTMLDivElement | null = null
let sunEl: HTMLDivElement | null = null
let sunLabel: HTMLDivElement | null = null
let orbitSvg: SVGSVGElement | null = null

const stage = document.getElementById('stage')!
const starsCanvas = document.getElementById('stars-canvas') as HTMLCanvasElement
const stars = initStars(starsCanvas)
const spdInput = document.getElementById('speed') as HTMLInputElement
spdInput.addEventListener('input', () => { speed = +spdInput.value / 100 })
stage.addEventListener('click', () => { paused = !paused })

// ─── Boot ────────────────────────────────────────────────────────────
document.fonts.ready.then(() => {
  headlinePrepared = prepareWithSegments(HEADLINE, HEAD_FONT)
  bodyPrepared = prepareWithSegments(ARTICLE, BODY_FONT)

  for (const p of planets) {
    const orb = document.createElement('div')
    orb.className = 'orb'
    const [r, g, b] = p.color
    // Bright core, soft glow fading to transparent
    orb.style.background = `radial-gradient(circle at 35% 35%, rgba(${r},${g},${b},0.80), rgba(${r},${g},${b},0.40) 40%, rgba(${r},${g},${b},0.12) 62%, transparent 82%)`
    orb.style.boxShadow = `rgba(${r},${g},${b},0.40) 0 0 50px 20px, rgba(${r},${g},${b},0.15) 0 0 120px 50px`
    stage.appendChild(orb)
    orbEls.push(orb)

    const lbl = document.createElement('div')
    lbl.className = 'planet-label'
    lbl.textContent = p.name
    stage.appendChild(lbl)
    labelEls.push(lbl)
  }

  dropCapEl = document.createElement('div')
  dropCapEl.className = 'drop-cap'
  dropCapEl.textContent = ARTICLE[0]
  dropCapEl.style.font = DROP_CAP_FONT
  stage.appendChild(dropCapEl)

  sunEl = document.createElement('div')
  sunEl.className = 'orb'
  sunEl.style.background = 'radial-gradient(circle at 38% 38%, rgba(255,248,220,0.95), rgba(255,210,70,0.60) 28%, rgba(255,150,30,0.20) 55%, transparent 80%)'
  sunEl.style.boxShadow = 'rgba(255,210,70,0.45) 0 0 70px 30px, rgba(255,150,30,0.18) 0 0 180px 80px'
  stage.appendChild(sunEl)

  sunLabel = document.createElement('div')
  sunLabel.className = 'planet-label'
  sunLabel.textContent = 'Sun'
  sunLabel.style.color = 'rgba(255,220,110,0.55)'
  stage.appendChild(sunLabel)

  orbitSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  orbitSvg.setAttribute('class', 'orbit-svg')
  stage.insertBefore(orbitSvg, stage.firstChild)

  onResize()
  window.addEventListener('resize', onResize)
  requestAnimationFrame(loop)
})

function onResize() {
  cx = innerWidth / 2; cy = innerHeight / 2
  if (!orbitSvg) return
  orbitSvg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`)
  orbitSvg.innerHTML = ''
  const fit = getFit()
  for (const p of planets) {
    const rx = p.orbit * fit, ry = rx * Math.cos(p.tilt * Math.PI / 180)
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
    el.setAttribute('cx', String(cx)); el.setAttribute('cy', String(cy))
    el.setAttribute('rx', String(rx)); el.setAttribute('ry', String(ry))
    el.setAttribute('fill', 'none'); el.setAttribute('stroke', 'rgba(255,255,255,0.04)')
    el.setAttribute('stroke-width', '1'); orbitSvg.appendChild(el)
  }
}

function getFit() { return Math.min(innerWidth * 0.55, innerHeight * 0.55) / 780 }

// ─── Span pool ───────────────────────────────────────────────────────
function acquire(pool: HTMLSpanElement[], idx: { v: number }, cls: string): HTMLSpanElement {
  if (idx.v < pool.length) { const e = pool[idx.v]; e.style.display = ''; idx.v++; return e }
  const e = document.createElement('span'); e.className = cls; stage.appendChild(e); pool.push(e); idx.v++; return e
}
function hideFrom(pool: HTMLSpanElement[], n: number) { for (let i = n; i < pool.length; i++) pool[i].style.display = 'none' }

// ─── Update orbs ─────────────────────────────────────────────────────
function updateOrbs() {
  const fit = getFit()
  orbs = []

  // Sun: visualR is the big glowing div, clipR is the solid core that displaces text
  const sunVisual = 100 * Math.max(0.55, fit * 1.2)
  const sunClip = sunVisual * 0.5 + 26 // core + label space
  if (sunEl) {
    sunEl.style.width = sunVisual + 'px'; sunEl.style.height = sunVisual + 'px'
    sunEl.style.left = (cx - sunVisual / 2) + 'px'; sunEl.style.top = (cy - sunVisual / 2) + 'px'
  }
  if (sunLabel) {
    sunLabel.style.left = cx + 'px'; sunLabel.style.top = (cy + sunVisual / 2 + 14) + 'px'
    sunLabel.style.transform = 'translateX(-50%)'
  }
  orbs.push({ x: cx, y: cy, visualR: sunVisual, clipR: sunClip, planet: { name: 'Sun', color: [255, 200, 60], r: 100, orbit: 0, tilt: 0, period: 999, angle0: 0 } })

  for (let i = 0; i < planets.length; i++) {
    const p = planets[i]
    const angle = p.angle0 + (animTime / 1000) * (Math.PI * 2) / p.period
    const tilt = p.tilt * Math.PI / 180
    const orbit = p.orbit * fit
    const x = cx + Math.cos(angle) * orbit
    const y = cy + Math.sin(angle) * orbit * Math.cos(tilt)
    const visualR = p.r * Math.max(0.65, fit * 1.35)
    // clipR = visual half + label space (~14px gap + ~12px label height)
    const clipR = visualR * 0.5 + 26
    orbs.push({ x, y, visualR, clipR, planet: p })

    orbEls[i].style.width = visualR + 'px'; orbEls[i].style.height = visualR + 'px'
    orbEls[i].style.left = (x - visualR / 2) + 'px'; orbEls[i].style.top = (y - visualR / 2) + 'px'

    labelEls[i].style.left = x + 'px'
    labelEls[i].style.top = (y + visualR / 2 + 14) + 'px'
    labelEls[i].style.transform = 'translateX(-50%)'
    labelEls[i].style.opacity = String(Math.min(1, visualR / 40 * 0.7))
  }
}

// ─── Clip: compute available [left, right] for a text line at given Y ─
// Uses clipR (the solid core), NOT the full visual size
function clipLine(y: number, h: number, colL: number, colR: number): { left: number; right: number } | null {
  let left = colL, right = colR

  for (const orb of orbs) {
    const R = orb.clipR + 6 // +6px breathing room so text doesn't touch the core
    const dy = (y + h / 2) - orb.y
    if (Math.abs(dy) >= R) continue
    const hx = Math.sqrt(R * R - dy * dy)
    const oL = orb.x - hx, oR = orb.x + hx
    if (oR <= left || oL >= right) continue

    const spL = oL - left, spR = right - oR
    if (spL <= 0 && spR <= 0) return null
    if (spL > spR) right = Math.min(right, oL - 4)
    else left = Math.max(left, oR + 4)
  }
  return (right - left < 50) ? null : { left, right }
}

// ─── Layout ──────────────────────────────────────────────────────────
function layoutText() {
  if (!headlinePrepared || !bodyPrepared) return
  const t0 = performance.now()
  frameCalls = 0; frameLinesCount = 0
  const hI = { v: 0 }, lI = { v: 0 }
  const W = innerWidth, H = innerHeight - BOTTOM_RESERVE

  // ── Headline (no avoidance, fixed full width) ──
  let hCur: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let curY = MARGIN
  const headW = W - MARGIN * 2
  while (curY + HEAD_LH < MARGIN + HEAD_LH * 5) {
    const line = layoutNextLine(headlinePrepared, hCur, headW)
    frameCalls++
    if (!line) break
    const el = acquire(headlinePool, hI, 'headline-line')
    el.textContent = line.text; el.style.font = HEAD_FONT
    el.style.left = MARGIN + 'px'; el.style.top = curY + 'px'
    frameLinesCount++
    hCur = line.end; curY += HEAD_LH
  }
  curY += 16

  // ── Drop cap ──
  if (dropCapEl) { dropCapEl.style.left = MARGIN + 'px'; dropCapEl.style.top = curY + 'px' }

  // ── Body (ALSO avoids orbs — text wraps around solid cores) ──
  const bodyY = curY
  const numCols = W > 1100 ? 4 : W > 800 ? 3 : W > 550 ? 2 : 1
  const colW = (W - MARGIN * 2 - COL_GAP * (numCols - 1)) / numCols
  const DROP_W = 65, DROP_LINES = 3

  let cur: LayoutCursor = { segmentIndex: 0, graphemeIndex: 1 }

  for (let col = 0; col < numCols; col++) {
    const colL = MARGIN + col * (colW + COL_GAP)
    const colR = colL + colW
    let y = bodyY

    while (y + BODY_LH <= H) {
      // Clip this line against all orb cores
      const clip = clipLine(y, BODY_LH, colL, colR)
      if (!clip) { y += BODY_LH; continue }

      let lineL = clip.left
      let lineW = clip.right - lineL

      // Drop cap indent
      if (col === 0 && y < bodyY + DROP_LINES * BODY_LH) {
        lineL = Math.max(lineL, colL + DROP_W)
        lineW = clip.right - lineL
      }
      if (lineW < 50) { y += BODY_LH; continue }

      // ★ PRETEXT: layout next line at THIS width (may differ per line due to orb) ★
      const line = layoutNextLine(bodyPrepared!, cur, lineW)
      frameCalls++
      if (!line) break

      const el = acquire(linePool, lI, 'line')
      el.textContent = line.text; el.style.font = BODY_FONT
      el.style.left = lineL + 'px'; el.style.top = y + 'px'
      frameLinesCount++

      cur = line.end; y += BODY_LH
    }
  }

  hideFrom(headlinePool, hI.v)
  hideFrom(linePool, lI.v)
  frameMs = performance.now() - t0
}

// ─── Loop ────────────────────────────────────────────────────────────
let lastT = 0
function loop(t: number) {
  const dt = lastT === 0 ? 16 : Math.min(t - lastT, 50)
  lastT = t
  if (!paused) animTime += dt * speed
  cx = innerWidth / 2; cy = innerHeight / 2
  stars.draw(t); updateOrbs(); layoutText()
  document.getElementById('s-calls')!.textContent = String(frameCalls)
  document.getElementById('s-ms')!.textContent = frameMs.toFixed(1)
  document.getElementById('s-lines')!.textContent = String(frameLinesCount)
  requestAnimationFrame(loop)
}
