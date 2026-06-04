---
name: planet-slide
description: Create standalone HTML slide pages with immersive Three.js 3D planet/cosmic scenes, layered HTML text overlays, and rich interactive details — following the same architecture as the AI World Guide cover slide.
argument-hint: "[style] [title]"
metadata:
  author: chen
  version: "1.1.0"
---

# Planet Slide

Generate single-page HTML slides that combine a **Three.js 3D scene** (half-sphere ground + sky objects) with **layered HTML overlays** (title, subtitle, vignette), following the architecture of the `ai-domination/cover.html` pattern.

## Architecture

Every slide produced by this skill follows a two-tier architecture:

```
┌──────────────────────────────────────────────┐
│  HTML Overlay Layer  (z-index > 0)           │
│  .title-block  .vignette  .paper-overlay     │
├──────────────────────────────────────────────┤
│  Three.js 3D Layer   (z-index: 1, absolute)  │
│  Scene → Camera → Renderer → Composer        │
│  Lights → Half-sphere Ground → Objects →     │
│  Particles → Animations                      │
└──────────────────────────────────────────────┘
```

Key principles:
- **Single self-contained HTML file** — `<style>`, `<div>`, and `<script type="importmap">` + `<script type="module">` all in one file
- Three.js loaded via CDN importmap (`three@0.170.0`)
- Post-processing: `EffectComposer` → `RenderPass` → `UnrealBloomPass` → optional custom Sobel outline `ShaderPass`
- Camera: **mouse drag orbit** (click-drag to rotate) + **WASD keyboard** controls
- **Half-sphere ground** in every style: `SphereGeometry(300, segs, segs, 0, Math.PI*2, 0, Math.PI/2)` positioned at `y = -293`
- Spherical camera coordinates around a fixed orbit center with lerp smoothing
- Touch support for mobile drag

## Visual Styles

Pick one style when generating a slide. Each style defines: background gradient/map, half-sphere ground treatment, sky objects, post-processing tone, font family, and lighting color temperature.

### 1. warm-storybook (温暖童话绘本)
The original cover slide style. Soft watercolor gradient sky, toon-shaded grassy half-sphere hill, storybook tree, cute robot under the tree with blinking eyes and page-flipping book, floating mini-books/gears/bulbs, fluffy clouds, paper-texture overlay, vignette. Font: Comic Sans MS / cursive. Post: bloom 0.4 + Sobel outline 0.35. Most complex scene (~400 lines).

### 2. neon-synthwave (霓虹合成波)
Dark purple-black background `#0a0020`, dark half-sphere with neon grid rings and radial lines, neon crystal structures on ground with bob animation, synthwave sun with rays and colored rings, starfield with additive blending, floating neon octahedron diamonds. Font: Orbitron / monospace. Post: bloom 1.5, no outline.

### 3. deep-space (深空探索)
Deep navy `#000011` background, procedural starfield (2500 colored stars in a spherical distribution), large ringed gas giant planet in the sky (vertex-colored sphere + 3 ring layers), asteroid-like rocky half-sphere ground with scattered icosahedron rocks, nebula sprites with additive blending. Font: Space Grotesk / system-ui. Post: bloom 0.6, no outline.

### 4. paper-cutout (剪纸折纸)
Warm paper gradient `#fef9ef→#d4e8f0`, paper-texture half-sphere ground with fold rings, 5 layers of paper-cut mountains (extruded ShapeGeometry with bottoms curved to match the spherical ground), origami icosahedron planet with wireframe overlay, origami paper birds with wing-flap and orbit animation, craft-paper texture overlay. Font: Caveat / cursive handwriting. Post: bloom 0.15 + strong Sobel outline 0.6.

### 5. retro-pixel (复古像素)
Solid dark-teal `#1a2b3c` background, low-poly half-sphere ground with vertex colors, low-poly icosahedron planet (detail=1), cube trees on the ground, cube clouds with orbit animation, pixel-art star sprites, pixel sun with rays. Renderer: `pixelRatio=1`, resolution scaled to 1/4 then CSS-scaled up with `image-rendering: pixelated`. Font: "Press Start 2P". Post: bloom 0.3, no outline.

### 6. liquid-glass (液态玻璃)
Dark purple gradient `#1a1230→#1a1038`, frosted glass half-sphere ground (MeshPhysicalMaterial with clearcoat, transparent, opacity 0.6), glass planet (MeshPhysicalMaterial roughness=0 transmission=0.85 ior=1.5) with inner color core and iridescent ring, floating glass shard tetrahedra with orbit/bob animation, caustic light orbs. Font: Inter / system-ui, extra-light weight. Post: bloom 0.8.

### 7. fire-magma (熔岩地心)
Deep red-black `#0a0000` background with fog, emissive lava half-sphere ground (`emissiveIntensity: 0.6` pulsing), lava crack rings (partial torus arcs), 100 ember sprite particles with additive blending rising from the surface, 12 smoke sprite wisps. Font: "Playfair Display". Post: bloom 1.0.

### 8. ice-crystal (冰晶极地)
Dark navy gradient `#1a2a4a→#1a2848` with fog, faceted ice half-sphere ground (flat shading + vertex colors), faceted ice planet (icosahedron + flat shading) with crystalline rings, aurora borealis ribbons (TubeGeometry with HSL vertex colors, opacity animation), 500 snow particles, 20 ice crystal cones scattered on the ground. Font: "Raleway" thin. Post: bloom 0.6.

## Component Recipes

### Half-Sphere Ground (required for every style)

The ground in every slide is a half-sphere mimicking the cover page:

```js
// Upper half only: phi from 0 to PI/2
const groundGeo = new THREE.SphereGeometry(300, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
const ground = new THREE.Mesh(groundGeo, groundMaterial);
ground.position.set(0, -293, 0); // center at -293 so rim sits near y=7
scene.add(ground);
```

The ground surface y at any (x, z) follows: `y = sqrt(300² - x² - z²) - 293`.
This is used to place objects (trees, crystals, mountains) on the curved surface.

### Scene & Background

```js
// Option A: Canvas gradient (warm/soft styles)
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 2; bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d');
const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
grad.addColorStop(0,    STYLE.topColor);
grad.addColorStop(0.3,  STYLE.midTopColor);
grad.addColorStop(0.6,  STYLE.midColor);
grad.addColorStop(1,    STYLE.botColor);
bgCtx.fillStyle = grad;
bgCtx.fillRect(0, 0, 2, 512);
scene.background = new THREE.CanvasTexture(bgCanvas);

// Option B: Solid color (minimal/dark styles)
scene.background = new THREE.Color(STYLE.bgColor);
scene.fog = new THREE.Fog(STYLE.bgColor, 200, 900); // optional fog
```

### Starfield (for space styles)

```js
const starsGeo = new THREE.BufferGeometry();
const starCount = 2000;
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 2000;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 1200;
  positions[i * 3 + 2] = -200 - Math.random() * 600;
}
starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({
  color: 0xffffff, size: 0.8,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(stars);
```

### Planet Generator

```js
function createPlanet(radius, color, style) {
  const group = new THREE.Group();
  let geo, mat;

  switch (style) {
    case 'smooth':
      geo = new THREE.SphereGeometry(radius, 64, 48);
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
      break;
    case 'toon':
      geo = new THREE.SphereGeometry(radius, 32, 24);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color, gradientMap: toonGradient })));
      const outline = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3a2f45, side: THREE.BackSide }));
      outline.scale.setScalar(1.02);
      g.add(outline);
      return g;
    case 'lowpoly':
      geo = new THREE.IcosahedronGeometry(radius, 2);
      mat = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient, flatShading: true });
      break;
    case 'glass':
      geo = new THREE.SphereGeometry(radius, 64, 48);
      mat = new THREE.MeshPhysicalMaterial({
        color, roughness: 0, metalness: 0,
        transmission: 0.9, ior: 1.5, thickness: 2,
      });
      break;
    case 'lava':
      geo = new THREE.SphereGeometry(radius, 48, 36);
      mat = new THREE.MeshStandardMaterial({
        color, roughness: 0.3, metalness: 0.1,
        emissive: new THREE.Color('#ff4400'), emissiveIntensity: 0.8,
      });
      break;
    case 'ice-faceted':
      geo = new THREE.IcosahedronGeometry(radius, 2);
      mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.05, flatShading: true });
      break;
    default:
      geo = new THREE.SphereGeometry(radius, 48, 36);
      mat = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient });
  }
  group.add(new THREE.Mesh(geo, mat));
  return group;
}
```

### Ring (for Saturn-like planets)

```js
const ringGeo = new THREE.TorusGeometry(radius * 1.6, radius * 0.15, 16, 100);
const ringMat = new THREE.MeshStandardMaterial({
  color: ringColor, roughness: 0.3, metalness: 0.2,
  side: THREE.DoubleSide, transparent: true, opacity: 0.85,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI * 0.45;
planetGroup.add(ring);
```

### Floating Orbiting Decorations

Each floater has `userData` with orbit/bob/spin parameters, animated in the loop:

```js
// Creation
obj.userData = {
  by: baseY, bx: baseX, bz: baseZ,      // base position
  bA: 5, bS: 0.4,                        // bob amplitude & speed
  oR: 40, oS: 0.05,                      // orbit radius & speed
  sS: 0.01,                              // spin speed
  ph: Math.random() * Math.PI * 2,       // phase offset
};

// Animation loop
for (const f of floaters) {
  const d = f.userData;
  const angle = t * d.oS + d.ph;
  f.position.x = d.bx + Math.cos(angle) * d.oR;
  f.position.z = d.bz + Math.sin(angle) * d.oR * 0.5;
  f.position.y = d.by + Math.sin(t * d.bS + d.ph) * d.bA;
  f.rotation.y += d.sS;
}
```

### Text Overlay (HTML, not 3D)

```html
<div class="title-block">
  <h1>中文标题</h1>
  <p class="subtitle">English Subtitle — Description</p>
  <div class="meta"><span>Style #N · 完整连贯的中文描述</span></div>
</div>
<div class="style-tag">planet-slide / style-name</div>
```

CSS: `position: absolute;` with appropriate top/left/right/bottom.
Font size via `clamp(min, vw, max)` — minimums must be large enough for projection.
**Never use mid-dot "·" to join phrases** — write complete, coherent sentences in Chinese for the meta text.

### Post-processing Pipeline

```js
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(W, H),
  STYLE.bloomStrength,  // 0.15 ~ 1.5
  STYLE.bloomRadius,    // 0.4 ~ 1.0
  STYLE.bloomThreshold, // 0.5 ~ 0.85
));

// Optional Sobel outline pass
if (STYLE.outlineStrength > 0) {
  const OutlineShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(W, H) },
      edgeStrength: { value: STYLE.outlineStrength },
      edgeColor: { value: new THREE.Vector3(r, g, b) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float edgeStrength; uniform vec3 edgeColor; varying vec2 vUv;
      void main(){ vec2 tx=1.0/resolution; vec4 c=texture2D(tDiffuse,vUv);
        float tl=dot(texture2D(tDiffuse,vUv+tx*vec2(-1,1)).rgb,vec3(.299,.587,.114));
        float t=dot(texture2D(tDiffuse,vUv+tx*vec2(0,1)).rgb,vec3(.299,.587,.114));
        float tr=dot(texture2D(tDiffuse,vUv+tx*vec2(1,1)).rgb,vec3(.299,.587,.114));
        float l=dot(texture2D(tDiffuse,vUv+tx*vec2(-1,0)).rgb,vec3(.299,.587,.114));
        float r=dot(texture2D(tDiffuse,vUv+tx*vec2(1,0)).rgb,vec3(.299,.587,.114));
        float bl=dot(texture2D(tDiffuse,vUv+tx*vec2(-1,-1)).rgb,vec3(.299,.587,.114));
        float b=dot(texture2D(tDiffuse,vUv+tx*vec2(0,-1)).rgb,vec3(.299,.587,.114));
        float br=dot(texture2D(tDiffuse,vUv+tx*vec2(1,-1)).rgb,vec3(.299,.587,.114));
        float gx=-tl-2.0*l-bl+tr+2.0*r+br; float gy=-tl-2.0*t-tr+bl+2.0*b+br;
        float edge=length(vec2(gx,gy)); float ef=smoothstep(0.03,0.12,edge)*edgeStrength;
        gl_FragColor=vec4(mix(c.rgb,edgeColor,ef),c.a); }`,
  };
  composer.addPass(new ShaderPass(OutlineShader));
}
```

### Camera: Mouse Drag Orbit + WASD

**This is the standard camera pattern used in every slide.** Mouse click-drag rotates the view, WASD keys also rotate, both with lerp smoothing.

```js
// Orbit state
let isDragging = false, pmx = 0, pmy = 0;
let orbitH = 0, orbitHt = 0;       // horizontal angle & target
let orbitV = 0.35, orbitVt = 0.35; // vertical angle & target (clamped 0.05–0.65)
const OC = new THREE.Vector3(0, 30, 0); // orbit center
const OR = 350;                        // orbit radius

// Mouse drag
container.addEventListener('mousedown', e => { isDragging = true; pmx = e.clientX; pmy = e.clientY; });
window.addEventListener('mousemove', e => {
  if (isDragging) {
    orbitHt -= (e.clientX - pmx) * 0.004;
    orbitVt -= (e.clientY - pmy) * 0.003;
    orbitVt = Math.max(0.05, Math.min(0.65, orbitVt));
    pmx = e.clientX; pmy = e.clientY;
  }
});
window.addEventListener('mouseup', () => { isDragging = false; });

// Touch support
container.addEventListener('touchstart', e => {
  if (e.touches.length === 1) { isDragging = true; pmx = e.touches[0].clientX; pmy = e.touches[0].clientY; }
});
window.addEventListener('touchmove', e => {
  if (isDragging && e.touches.length === 1) {
    orbitHt -= (e.touches[0].clientX - pmx) * 0.004;
    orbitVt -= (e.touches[0].clientY - pmy) * 0.003;
    orbitVt = Math.max(0.05, Math.min(0.65, orbitVt));
    pmx = e.touches[0].clientX; pmy = e.touches[0].clientY;
  }
});
window.addEventListener('touchend', () => { isDragging = false; });

// Keyboard (WASD)
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });
```

In the animation loop:

```js
// WASD input
if (keys['a'] || keys['A']) orbitHt -= 0.02;
if (keys['d'] || keys['D']) orbitHt += 0.02;
if (keys['w'] || keys['W']) orbitVt -= 0.012;
if (keys['s'] || keys['S']) orbitVt += 0.012;
orbitVt = Math.max(0.05, Math.min(0.65, orbitVt));

// Lerp smoothing
orbitH += (orbitHt - orbitH) * 0.1;
orbitV += (orbitVt - orbitV) * 0.1;

// Spherical → Cartesian
const ya = orbitV * Math.PI * 0.5;
camera.position.x = OC.x + Math.sin(orbitH) * Math.cos(ya) * OR;
camera.position.z = OC.z + Math.cos(orbitH) * Math.cos(ya) * OR;
camera.position.y = OC.y + Math.sin(ya) * OR;
camera.lookAt(OC);
```

### Particles (Sprite-based)

Use `THREE.Sprite` with `CanvasTexture` from `<canvas>` — suitable for embers, snowflakes, sparkles, floating symbols, etc.

```js
function createParticleSprite(color1, color2, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rg = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  rg.addColorStop(0, color1);
  rg.addColorStop(0.3, color2);
  rg.addColorStop(1, 'transparent');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, size, size);
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  }));
}
```

### Placing Objects on the Curved Ground

Use the half-sphere surface equation to find y at any (x, z):

```js
const R = 300, GCY = -293;
function groundY(x, z) {
  return Math.sqrt(Math.max(0, R * R - x * x - z * z)) + GCY;
}

// Place a tree at (tx, tz) on the surface
const sy = groundY(tx, tz);
if (sy > -5) { // only if above the visible rim
  tree.position.set(tx, sy + treeHeight / 2, tz);
  scene.add(tree);
}
```

This pattern is essential for the paper-cutout mountains (curved bottom edge) and for scattering objects (trees, crystals, rocks) on the ground.

### Texture Overlays (HTML/CSS, not 3D)

Two essential overlays used across styles:

1. **Paper texture** (warm-storybook, paper-cutout) — `repeating-linear-gradient` at low opacity with `mix-blend-mode: multiply`
2. **Vignette** (all dark styles) — `radial-gradient(ellipse at center, transparent 40%, darkColor 100%)`

These sit on `position: absolute; inset: 0; pointer-events: none;` divs between the canvas and the title block.

## Slide Template

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{TITLE}}</title>
  <style>
    @import url('{{GOOGLE_FONT_URL}}');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: {{BODY_BG}}; }
    .scene-3d {
      position: relative; width: 100%; height: 100%;
      overflow: hidden; user-select: none;
      font-family: {{FONT_STACK}};
    }
    .scene-3d canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
    {{STYLE_OVERLAYS}}
    .title-block {
      position: absolute; {{TITLE_POSITION}}; z-index: 10;
      text-align: {{TITLE_ALIGN}}; pointer-events: none; max-width: {{TITLE_MAX_WIDTH}};
    }
    .title-block h1 {
      font-size: clamp(3rem, 7vw, 6rem); font-weight: {{TITLE_WEIGHT}};
      margin: 0; letter-spacing: 0.06em; line-height: 1.1;
      color: {{TITLE_COLOR}}; text-shadow: {{TITLE_SHADOW}};
    }
    .title-block .subtitle {
      margin-top: 0.8rem; font-size: clamp(1.2rem, 2.5vw, 1.8rem);
      color: {{SUBTITLE_COLOR}}; letter-spacing: 0.12em; font-weight: {{SUBTITLE_WEIGHT}};
    }
    .title-block .meta {
      margin-top: 2rem; font-size: clamp(1rem, 1.6vw, 1.3rem);
      color: {{META_COLOR}}; letter-spacing: 0.06em; font-weight: 300;
    }
  </style>
  <script type="importmap">
  { "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }}
  </script>
</head>
<body>
  <div class="scene-3d" id="scene3d">
    <!-- Overlays -->
    {{OVERLAY_DIVS}}
    <!-- Title -->
    <div class="title-block">
      <h1>{{MAIN_TITLE}}</h1>
      <p class="subtitle">{{SUBTITLE}}</p>
      <div class="meta"><span>{{META_INFO}}</span></div>
    </div>
  </div>

  <script type="module">
    import * as THREE from 'three';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    {{EXTRA_IMPORTS}}

    const container = document.getElementById('scene3d');
    let W = container.clientWidth, H = container.clientHeight;

    // ===== Scene & Background =====
    const scene = new THREE.Scene();
    {{SCENE_BACKGROUND}}

    // ===== Camera =====
    const camera = new THREE.PerspectiveCamera({{FOV}}, W / H, 1, 2000);
    camera.position.set(0, {{CAM_Y}}, {{CAM_Z}});
    camera.lookAt(0, {{LOOK_Y}}, 0);

    // ===== Renderer =====
    const renderer = new THREE.WebGLRenderer({ antialias: {{ANTIALIAS}}, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio({{PIXEL_RATIO}});
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = {{EXPOSURE}};
    container.insertBefore(renderer.domElement, container.firstChild);

    // ===== Lights =====
    {{LIGHTS}}

    // ===== Half-sphere Ground =====
    const groundGeo = new THREE.SphereGeometry(300, {{GROUND_SEG_H}}, {{GROUND_SEG_V}}, 0, Math.PI * 2, 0, Math.PI / 2);
    {{GROUND_SETUP}}
    ground.position.set(0, -293, 0);
    scene.add(ground);

    // ===== Sky Objects =====
    {{SKY_OBJECTS}}

    // ===== Particles =====
    {{PARTICLES}}

    // ===== Post Processing =====
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), {{BLOOM_STRENGTH}}, {{BLOOM_RADIUS}}, {{BLOOM_THRESHOLD}}));
    {{OUTLINE_PASS}}

    // ===== Mouse Drag Orbit =====
    let isDragging = false, pmx = 0, pmy = 0;
    let orbitH = 0, orbitHt = 0, orbitV = {{ORBIT_V}}, orbitVt = {{ORBIT_V}};
    const OC = new THREE.Vector3({{OC_X}}, {{OC_Y}}, {{OC_Z}}), OR = {{ORBIT_R}};

    container.addEventListener('mousedown', e => { isDragging = true; pmx = e.clientX; pmy = e.clientY; });
    window.addEventListener('mousemove', e => {
      if (isDragging) {
        orbitHt -= (e.clientX - pmx) * 0.004;
        orbitVt -= (e.clientY - pmy) * 0.003;
        orbitVt = Math.max(0.05, Math.min({{ORBIT_V_MAX}}, orbitVt));
        pmx = e.clientX; pmy = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
    container.addEventListener('touchstart', e => {
      if (e.touches.length === 1) { isDragging = true; pmx = e.touches[0].clientX; pmy = e.touches[0].clientY; }
    });
    window.addEventListener('touchmove', e => {
      if (isDragging && e.touches.length === 1) {
        orbitHt -= (e.touches[0].clientX - pmx) * 0.004;
        orbitVt -= (e.touches[0].clientY - pmy) * 0.003;
        orbitVt = Math.max(0.05, Math.min({{ORBIT_V_MAX}}, orbitVt));
        pmx = e.touches[0].clientX; pmy = e.touches[0].clientY;
      }
    });
    window.addEventListener('touchend', () => { isDragging = false; });

    // ===== Keyboard (WASD) =====
    const keys = {};
    window.addEventListener('keydown', e => { keys[e.key] = true; });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    // ===== Animation Loop =====
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Keyboard input
      if (keys['a'] || keys['A']) orbitHt -= 0.02;
      if (keys['d'] || keys['D']) orbitHt += 0.02;
      if (keys['w'] || keys['W']) orbitVt -= 0.012;
      if (keys['s'] || keys['S']) orbitVt += 0.012;
      orbitVt = Math.max(0.05, Math.min({{ORBIT_V_MAX}}, orbitVt));

      // Lerp orbit
      orbitH += (orbitHt - orbitH) * 0.1;
      orbitV += (orbitVt - orbitV) * 0.1;
      const ya = orbitV * Math.PI * 0.5;
      camera.position.x = OC.x + Math.sin(orbitH) * Math.cos(ya) * OR;
      camera.position.z = OC.z + Math.cos(orbitH) * Math.cos(ya) * OR;
      camera.position.y = OC.y + Math.sin(ya) * OR;
      camera.lookAt(OC);

      {{OBJECT_ANIMATIONS}}
      composer.render();
    }
    animate();

    // ===== Resize =====
    window.addEventListener('resize', () => {
      W = container.clientWidth; H = container.clientHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H); composer.setSize(W, H);
    });
  </script>
</body>
</html>
```

## Usage Workflow

1. **Pick a style** from the 8 available styles (or describe a custom one to me)
2. **Define the main title** and optional subtitle/meta
3. **Generate the slide** — I output a single self-contained HTML file
4. **Place it** in the `planet-slides/` directory, or open standalone in browser

## Style Quick-Reference

| # | Style | Key Colors | Ground Type | Sky Object | Special FX | Font |
|---|-------|-----------|-------------|------------|------------|------|
| 1 | warm-storybook | #f5e6d3→#b8d0f0 | toon grassy hill | robot, tree, books, gears | paper texture, blink, page flip | Comic Sans MS |
| 2 | neon-synthwave | #0a0020 | dark + neon grid rings | sun with rays & rings | neon crystals, diamonds, starfield | Orbitron |
| 3 | deep-space | #000011 | rocky asteroid | giant ringed planet | 2500 stars, nebula sprites, rocks | Space Grotesk |
| 4 | paper-cutout | #fef9ef→#d4e8f0 | paper + fold rings | origami icosahedron | 5 curved-mountain layers, paper birds | Caveat |
| 5 | retro-pixel | #1a2b3c | low-poly green | low-poly icosahedron + moon | cube trees, cube clouds, pixel stars | Press Start 2P |
| 6 | liquid-glass | #1a1230→#1a1038 | frosted glass | glass sphere (transmission) | glass shards, caustic orbs | Inter light |
| 7 | fire-magma | #0a0000 | emissive lava | (none — ground is focus) | lava cracks, embers, smoke | Playfair Display |
| 8 | ice-crystal | #1a2a4a→#1a2848 | faceted ice | faceted ice icosahedron + rings | aurora ribbons, snow, ice crystals | Raleway thin |

## Constraints

- Always produce a **single self-contained HTML file** — no external CSS/JS dependencies beyond the Three.js CDN importmap
- Fonts: use system fonts or Google Fonts via `@import` in `<style>`
- Renderer must use `preserveDrawingBuffer: true` for screenshot capability
- Post-processing: always include at minimum `RenderPass` + `UnrealBloomPass`; outline pass is optional (used in warm-storybook and paper-cutout)
- Text must be large enough for projection (`clamp()` with reasonable minimums)
- **Never use mid-dot "·" to join phrases** — write complete, coherent sentences in Chinese text
- Every style uses a **half-sphere ground** at y=-293, not a floating full sphere
- Camera uses **mouse drag orbit + WASD keyboard**, not passive mouse parallax
- Objects placed on the ground must use the `groundY(x, z)` surface equation to avoid floating
