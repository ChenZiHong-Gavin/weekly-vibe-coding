import * as THREE from 'three';
import { clamp } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════
//  特效：余烬粒子 / 落地冲击 / 念力光束 / 凤凰气泡 / 速度线
//  全部走一个加法混合的 Points，外加少量独立网格
// ═══════════════════════════════════════════════════════════

const MAXP = 4200;

export class VFX {
  constructor(scene) {
    this.scene = scene;
    this.n = MAXP; this.head = 0;
    this.pos = new Float32Array(MAXP * 3);
    this.vel = new Float32Array(MAXP * 3);
    this.col = new Float32Array(MAXP * 3);
    this.life = new Float32Array(MAXP);
    this.max = new Float32Array(MAXP);
    this.size = new Float32Array(MAXP);
    this.drag = new Float32Array(MAXP);
    this.grav = new Float32Array(MAXP);
    this.aSize = new Float32Array(MAXP);
    this.aAlpha = new Float32Array(MAXP);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.aSize, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.aAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, MAXP);
    this.geo = g;

    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: innerHeight * 0.5 } },
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
        varying vec3 vC; varying float vA;
        uniform float uScale;
        void main(){
          vC=aColor; vA=aAlpha;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(-mv.z, 0.001);
          if (aAlpha <= 0.001) gl_Position = vec4(2.0,2.0,2.0,1.0);
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d)*2.0;
          float a = smoothstep(1.0, 0.05, r);
          a *= a;
          gl_FragColor = vec4(vC * a, a * vA);
        }`,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);

    // 凤凰气泡
    this.bubble = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 4),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uT: { value: 0 }, uAmp: { value: 0 } },
        vertexShader: `
          uniform float uT; varying vec3 vN; varying vec3 vP;
          void main(){
            vN = normalize(normalMatrix*normal); vP = position;
            vec3 p = position * (1.0 + 0.022*sin(position.y*7.0+uT*3.0) + 0.02*sin(position.x*5.0-uT*2.2));
            vec4 mv = modelViewMatrix*vec4(p,1.0);
            gl_Position = projectionMatrix*mv;
          }`,
        fragmentShader: `
          uniform float uT; uniform float uAmp; varying vec3 vN; varying vec3 vP;
          void main(){
            float f = pow(1.0-abs(vN.z), 2.6);
            float band = 0.5+0.5*sin(vP.y*10.0 - uT*4.0);
            vec3 c = mix(vec3(0.55,0.25,1.0), vec3(1.0,0.55,0.2), band*0.55);
            float a = (f*0.75 + 0.06) * uAmp;
            gl_FragColor = vec4(c*a*2.2, a);
          }`,
      })
    );
    this.bubble.visible = false;
    scene.add(this.bubble);

    // 念力光束
    this.beamGeo = new THREE.BufferGeometry();
    this.beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.beam = new THREE.Line(this.beamGeo, new THREE.LineBasicMaterial({
      color: 0xc07aff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.beam.frustumCulled = false;
    scene.add(this.beam);

    // 凤凰之力的地面冲击环
    const rg = new THREE.RingGeometry(0.86, 1.0, 96);
    rg.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({
      color: 0xffa552, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    this.ring.visible = false;
    scene.add(this.ring);
    this.ringT = 0; this.ringMax = 1; this.ringDur = 0.75;

    this.t = 0;
  }

  shockwave(x, y, z, radius) {
    this.ring.position.set(x, y + 0.08, z);
    this.ringMax = radius;
    this.ringT = this.ringDur;
    this.ring.visible = true;
  }

  updateShockwave(dt) {
    if (this.ringT <= 0) { this.ring.visible = false; return; }
    this.ringT -= dt;
    const k = 1 - this.ringT / this.ringDur;      // 0→1
    const e = 1 - Math.pow(1 - k, 3);
    this.ring.scale.setScalar(0.6 + e * this.ringMax);
    this.ring.material.opacity = (1 - k) * 0.85;
  }

  #spawn(x, y, z, vx, vy, vz, r, g, b, size, life, drag = 1.6, grav = 0) {
    const i = this.head; this.head = (this.head + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.life[i] = life; this.max[i] = life; this.size[i] = size;
    this.drag[i] = drag; this.grav[i] = grav;
  }

  /** 附身飞行的余烬拖尾 */
  trail(x, y, z, chain = 0) {
    const n = 3 + (chain > 2 ? 2 : 0);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, r = Math.random() * 0.42;
      const warm = Math.random();
      this.#spawn(
        x + Math.cos(a) * r, y + (Math.random() - 0.5) * 0.8, z + Math.sin(a) * r,
        (Math.random() - 0.5) * 1.6, 0.8 + Math.random() * 1.6, (Math.random() - 0.5) * 1.6,
        1.0, 0.30 + warm * 0.45, 0.06 + warm * 0.12,
        0.10 + Math.random() * 0.13, 0.42 + Math.random() * 0.4, 2.2, 1.2
      );
    }
    // 少量紫色念力
    if (Math.random() < 0.5)
      this.#spawn(x, y + 0.4, z, (Math.random() - 0.5) * 2, 1.2, (Math.random() - 0.5) * 2,
        0.62, 0.32, 1.0, 0.11, 0.5, 2.4, 0.4);
  }

  /** 落地/命中爆发 */
  burst(x, y, z, chain = 0) {
    const n = 26 + chain * 7;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, e = Math.random() * 1.1;
      const s = 3.5 + Math.random() * 7 + chain;
      const warm = Math.random();
      this.#spawn(x, y, z,
        Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s * 0.85, Math.sin(a) * Math.cos(e) * s,
        1.0, 0.34 + warm * 0.5, 0.07 + warm * 0.2,
        0.11 + Math.random() * 0.16, 0.42 + Math.random() * 0.5, 3.1, 7.5);
    }
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * 6.283;
      this.#spawn(x, y, z, Math.cos(a) * 5, Math.random() * 3, Math.sin(a) * 5,
        0.66, 0.34, 1.0, 0.13, 0.45, 3.4, 3);
    }
  }

  impact(x, y, z, r = 1, g = 0.7, b = 0.35, n = 12, spd = 5) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, e = Math.random() * 1.4;
      const s = spd * (0.4 + Math.random());
      this.#spawn(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s,
        r, g, b, 0.07 + Math.random() * 0.1, 0.25 + Math.random() * 0.3, 3.6, 9);
    }
  }

  psiPuff(x, y, z, n = 8) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283;
      this.#spawn(x + (Math.random() - 0.5), y + (Math.random() - 0.5), z + (Math.random() - 0.5),
        Math.cos(a) * 1.2, 0.5 + Math.random(), Math.sin(a) * 1.2,
        0.62, 0.30, 1.0, 0.09, 0.5, 2.0, -0.4);
    }
  }

  setBeam(from, to, on) {
    const p = this.beamGeo.attributes.position.array;
    p[0] = from.x; p[1] = from.y; p[2] = from.z;
    p[3] = to.x; p[4] = to.y; p[5] = to.z;
    this.beamGeo.attributes.position.needsUpdate = true;
    this.beam.material.opacity = on ? 0.55 + Math.sin(this.t * 24) * 0.16 : 0;
  }

  setBubble(center, radius, amp) {
    this.bubble.visible = amp > 0.01;
    if (!this.bubble.visible) return;
    this.bubble.position.copy(center);
    this.bubble.scale.setScalar(radius);
    this.bubble.material.uniforms.uT.value = this.t;
    this.bubble.material.uniforms.uAmp.value = amp;
  }

  update(dt) {
    this.t += dt;
    const P = this.pos, V = this.vel, L = this.life, M = this.max,
          A = this.aAlpha, Z = this.aSize, S = this.size, D = this.drag, G = this.grav;
    for (let i = 0; i < this.n; i++) {
      if (L[i] <= 0) { A[i] = 0; continue; }
      L[i] -= dt;
      if (L[i] <= 0) { A[i] = 0; continue; }
      const k = L[i] / M[i];
      const d = Math.exp(-D[i] * dt);
      V[i * 3] *= d; V[i * 3 + 2] *= d;
      V[i * 3 + 1] = V[i * 3 + 1] * d - G[i] * dt;   // G>0 下落, G<0 上飘
      P[i * 3] += V[i * 3] * dt;
      P[i * 3 + 1] += V[i * 3 + 1] * dt;
      P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < 0.04) { P[i * 3 + 1] = 0.04; V[i * 3 + 1] *= -0.2; }
      A[i] = k * k;
      Z[i] = S[i] * (0.45 + k * 0.85);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  resize() { this.points.material.uniforms.uScale.value = innerHeight * 0.5; }
}
