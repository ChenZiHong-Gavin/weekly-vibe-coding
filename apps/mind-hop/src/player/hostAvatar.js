import * as THREE from 'three';
import { CharacterRig, stumblePose, shoutPose } from '../core/rig.js';
import { clamp, damp, shortAngle } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════
//  被附身者的化身
//
//  被附身的那一个从 VAT 人群里"取出来"，换成真正的蒙皮网格：
//  近景要看得清踉跄、要有平滑的动画混合。身上叠一层紫色念力反光，
//  提示玩家"你现在穿着别人的身体"。
// ═══════════════════════════════════════════════════════════

export class HostAvatar {
  /** @param variants [{model, clips}]  与人群模型一一对应（0=Michelle 1=Soldier） */
  constructor(variants) {
    this.scene = null;
    this.rigs = [];
    variants.forEach((v, i) => this.addVariant(i, v));
    this.active = -1;
    this.agent = null;
    this.yaw = 0;
    this.stumbleT = 0; this.stumbleDur = 1; this.stumbleDir = 1;
    this.shoutT = 0; this.shoutDur = 0.9;
  }

  /**
   * 注册一种宿主外观。模型是分批流式加载的（首屏只下 Michelle + Xbot），
   * 所以 1=平民B、2=DODC 会在开局之后才补进来。
   * attach() 里的 clamp 保证在补进来之前不会索引越界。
   */
  addVariant(index, v) {
    {
      const rig = new CharacterRig(v.model, v.clips, 1.72);
      rig.visible = false;
      rig.mats = [];
      rig.setMaterial(o => {
        const src = Array.isArray(o.material) ? o.material[0] : o.material;
        const m = new THREE.MeshStandardMaterial({
          map: src.map || null,
          color: src.map ? 0xffffff : (src.color ? src.color.clone() : new THREE.Color(0x9aa3b4)),
          roughness: 0.8, metalness: 0.04,
        });
        m.userData.u = { uPsi: { value: 0 } };
        m.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, m.userData.u);
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\n varying vec3 vVP; varying vec3 vVN;')
            .replace('#include <project_vertex>', `#include <project_vertex>
              vVP = mvPosition.xyz; vVN = normalize(normalMatrix * objectNormal);`);
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\n uniform float uPsi;\n varying vec3 vVP; varying vec3 vVN;')
            .replace('#include <dithering_fragment>', `#include <dithering_fragment>
              float f = pow(1.0 - abs(dot(normalize(-vVP), normalize(vVN))), 2.6);
              gl_FragColor.rgb += vec3(0.46, 0.24, 1.0) * f * uPsi * 1.15;
              gl_FragColor.rgb = mix(gl_FragColor.rgb,
                vec3(dot(gl_FragColor.rgb, vec3(0.299,0.587,0.114))), uPsi * 0.34);`);
        };
        m.customProgramCacheKey = () => 'host-psi';
        o.material = m;
        rig.mats.push(m);
      });
      this.rigs[index] = rig;
      if (this.scene) this.scene.add(rig.root);
    }
  }

  addTo(scene) { this.scene = scene; for (const r of this.rigs) if (r) scene.add(r.root); }

  attach(agent) {
    this.detach();
    this.agent = agent;
    // 外观是分批到货的，而且不保证按顺序（Soldier 可能比平民B 先到），
    // 所以 clamp 之外还要检查那个槽位是不是真的有东西，没有就退回 0。
    let want = clamp(agent.model | 0, 0, Math.max(0, this.rigs.length - 1));
    if (!this.rigs[want]) want = 0;
    this.active = want;
    const rig = this.rigs[this.active];
    rig.visible = true;
    rig.model.scale.setScalar(rig.model.scale.x);      // 保持归一化
    this.yaw = agent.yaw;
    this.startStumble(agent.stumble || 0.55, 1);
  }

  detach() {
    if (this.active >= 0) this.rigs[this.active].visible = false;
    this.active = -1; this.agent = null;
  }

  startStumble(dur, dir) { this.stumbleT = dur; this.stumbleDur = dur; this.stumbleDir = dir; }
  startShout() { this.shoutT = this.shoutDur; }

  get rig() { return this.active >= 0 ? this.rigs[this.active] : null; }

  update(dt) {
    const rig = this.rig, a = this.agent;
    if (!rig || !a) return;

    const sp = Math.hypot(a.vx, a.vz);
    // 踉跄期间步频紊乱
    let animSp = sp;
    if (this.stumbleT > 0) animSp = sp * 0.4 + 1.2;
    rig.animate(dt, animSp);

    if (this.stumbleT > 0) {
      this.stumbleT = Math.max(0, this.stumbleT - dt);
      const k = 1 - this.stumbleT / this.stumbleDur;      // 0→1
      rig.overlay(stumblePose(k, this.stumbleDir), 1);
      rig.tilt = Math.sin(k * Math.PI) * 0.26 * this.stumbleDir;
      rig.roll = Math.sin(k * Math.PI * 1.7) * 0.14;
      rig.bob = -Math.sin(k * Math.PI) * 0.09;
    } else if (this.shoutT > 0) {
      this.shoutT = Math.max(0, this.shoutT - dt);
      const k = 1 - this.shoutT / this.shoutDur;
      rig.overlay(shoutPose(k), 1);
      rig.tilt = -Math.sin(k * Math.PI) * 0.16;
      rig.roll = damp(rig.roll, 0, 9, dt);
      rig.bob = Math.sin(k * Math.PI) * 0.05;
    } else {
      rig.tilt = damp(rig.tilt, 0, 9, dt);
      rig.roll = damp(rig.roll, 0, 9, dt);
      rig.bob = damp(rig.bob, 0, 9, dt);
    }

    if (sp > 0.15) {
      const want = Math.atan2(a.vx, a.vz);
      this.yaw += shortAngle(this.yaw, want) * Math.min(1, dt * 10);
    }
    a.yaw = this.yaw;

    // 身高按 agent 缩放
    const k = a.h / 1.72;
    rig.root.scale.setScalar(k);
    rig.applyTransform(a.x, a.y, a.z, this.yaw);

    const psi = 0.55 + Math.sin(rig.t * 2.4) * 0.12;
    for (const m of rig.mats) m.userData.u.uPsi.value = psi;
  }

  /** 踉跄中操控迟钝 */
  get controlFactor() {
    if (this.stumbleT > 0) return 0.18;
    if (this.shoutT > 0) return 0.35;
    return 1;
  }
}
