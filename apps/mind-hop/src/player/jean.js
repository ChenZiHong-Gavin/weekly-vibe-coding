import * as THREE from 'three';
import { MOVE } from '../config.js';
import { CharacterRig, projectPose } from '../core/rig.js';
import { clamp, damp, shortAngle, camRelative } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════
//  琴·葛蕾 —— 本体
//
//  她没有超人的体能：走得不快、跳不高、挨不了几下。
//  她唯一的武器是把意识送出去 —— 而那时候，这具身体就留在原地。
// ═══════════════════════════════════════════════════════════

const _v = new THREE.Vector3();

export class Jean {
  constructor(model, clips, city) {
    this.city = city;
    this.rig = new CharacterRig(model, clips, 1.74);
    this.root = this.rig.root;
    this.radius = 0.34;

    // ── 琴的形象 ──
    // 手上没有电影角色模型，所以在 shader 里做定向重染，让她一眼可辨：
    //   · 头发 → 赤褐色（原贴图是近黑，按低明度+头部高度定位）
    //   · 上身 → 深酒红夹克
    //   · 常驻余烬轮廓 + 投射时升温
    // 关键是这套配色不出现在任何路人身上（路人走色相旋转，见 crowdRender）。
    this.mats = [];
    this.rig.setMaterial(o => {
      const src = Array.isArray(o.material) ? o.material[0] : o.material;
      const m = new THREE.MeshStandardMaterial({
        map: src.map || null,
        normalMap: src.normalMap || null,
        color: 0xffffff,
        roughness: 0.58, metalness: 0.05,
      });
      m.userData.u = { uHeat: { value: 0 }, uTime: { value: 0 }, uFootY: { value: 0 } };
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, m.userData.u);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', `#include <common>
            varying vec3 vVP; varying vec3 vVN; varying vec3 vOP; varying float vWY;`)
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;')
          // 必须用蒙皮后的世界高度：Michelle 的几何体是 Z-up 的，
          // 按 position.y 分带会全部落空（根节点的 +90°X 旋转就是为此存在）。
          .replace('#include <project_vertex>', `#include <project_vertex>
            vVP = mvPosition.xyz; vVN = normalize(normalMatrix * objectNormal);
            vWY = (modelMatrix * vec4(transformed, 1.0)).y;`);
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
            uniform float uHeat; uniform float uTime; uniform float uFootY;
            varying vec3 vVP; varying vec3 vVN; varying vec3 vOP; varying float vWY;
            float h13(vec3 p){ p=fract(p*0.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
            float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
              return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
                         mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
          .replace('#include <color_fragment>', `#include <color_fragment>
          {
            float hy = vWY - uFootY;      // 脚底以上的实际米数
            float lum = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114));
            float mx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
            float mn = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
            float sat = mx > 1e-4 ? (mx - mn) / mx : 0.0;

            // 头发：头部高度 + 低明度 + 低饱和 → 赤褐
            float head = smoothstep(1.30, 1.48, hy);
            float dark = 1.0 - smoothstep(0.03, 0.20, lum);
            float hair = head * dark * (1.0 - smoothstep(0.25, 0.45, sat));
            vec3 auburn = vec3(0.42, 0.115, 0.045) * (0.55 + lum * 5.5);
            diffuseColor.rgb = mix(diffuseColor.rgb, auburn, hair * 0.95);

            // 上身：躯干高度带 → 深酒红夹克（保留贴图明暗结构）
            float torso = smoothstep(0.78, 0.92, hy) * (1.0 - smoothstep(1.26, 1.40, hy));
            vec3 jacket = vec3(0.30, 0.055, 0.075) * (0.45 + lum * 3.2);
            diffuseColor.rgb = mix(diffuseColor.rgb, jacket, torso * 0.82 * (1.0 - hair));

            // 下身：深色长裤
            float legs = 1.0 - smoothstep(0.62, 0.80, hy);
            vec3 pants = vec3(0.085, 0.088, 0.115) * (0.5 + lum * 2.6);
            diffuseColor.rgb = mix(diffuseColor.rgb, pants, legs * 0.80);
          }`)
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>
            // 余烬轮廓：只在边缘，不要把整个人洗成一团光
            float fres = pow(1.0 - abs(dot(normalize(-vVP), normalize(vVN))), 4.2);
            float flow = n3(vOP*7.0 + vec3(0.0, -uTime*2.2, 0.0));
            vec3 ember = mix(vec3(1.0,0.30,0.04), vec3(1.0,0.72,0.26), flow);
            gl_FragColor.rgb += fres * ember * (0.28 + 0.95*uHeat);
            gl_FragColor.rgb += ember * smoothstep(0.74,0.98,flow) * 0.30 * uHeat;`);
      };
      m.customProgramCacheKey = () => 'jean-phoenix';
      o.material = m;
      this.mats.push(m);
    });

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.grounded = true;
    this.groundY = 0;
    this.heat = 0.3;
    this.projecting = false;
    this.t = 0;
  }

  teleport(x, y, z) { this.pos.set(x, y, z); this.vel.set(0, 0, 0); }

  /**
   * @param active   true = 玩家正在直接操控本体（意识也在这里）
   * @param drag     投射在外时的本体操控：{ ax, ay, yaw } —— 方向键 + 监视窗视角
   */
  update(dt, input, camYaw, _unused, drag) {
    this.t += dt;
    this.dragging = false;
    this.active = false;

    const full = drag && drag.full;
    if (full && (drag.ax !== 0 || drag.ay !== 0)) {
      // 意识在自己身上：方向键就是正常走动
      const [wx, wz] = camRelative(drag.ax, drag.ay, drag.yaw);
      const speed = input.run ? MOVE.run : MOVE.walk;
      const tgt = _v.set(wx, 0, wz).multiplyScalar(speed);
      this.vel.x = damp(this.vel.x, tgt.x, MOVE.accel / 3.4, dt);
      this.vel.z = damp(this.vel.z, tgt.z, MOVE.accel / 3.4, dt);
      this.active = true;
    } else if (full) {
      this.vel.x = damp(this.vel.x, 0, 14, dt);
      this.vel.z = damp(this.vel.z, 0, 14, dt);
      this.active = true;
    } else if (drag && (drag.ax !== 0 || drag.ay !== 0)) {
      // 意识在外，但还留着一丝对自己身体的控制 —— 像梦游一样挪动。
      // 转向相对**监视窗**的视角，因为玩家是看着那个小窗口在操舵的。
      const [wx, wz] = camRelative(drag.ax, drag.ay, drag.yaw);
      const tgt = _v.set(wx, 0, wz).multiplyScalar(MOVE.drag);
      this.vel.x = damp(this.vel.x, tgt.x, 5.0, dt);
      this.vel.z = damp(this.vel.z, tgt.z, 5.0, dt);
      this.dragging = true;
    } else {
      // 投射中且没有操舵：钉在原地
      this.vel.x = damp(this.vel.x, 0, 12, dt);
      this.vel.z = damp(this.vel.z, 0, 12, dt);
      this.active = false;
    }
    this.vel.y -= MOVE.gravity * dt;
    this.#integrate(dt);

    const act = this.active;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if ((act || this.dragging) && hs > 0.25) {
      this.yaw += shortAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z))
                  * Math.min(1, dt * (act ? 13 : 4.5));   // 梦游时转身也是钝的
    }

    this.heat = damp(this.heat, this.projecting ? 0.95 : 0.30, 4, dt);

    this.rig.animate(dt, (act || this.dragging) ? hs : 0);
    if (this.projecting) {
      // 梦游时完全不叠投射姿态：overlay 是直接替换骨骼旋转，会把手臂内收
      // 修正一起抹掉，看起来又变成"摊着手走路"。失神感交给下面的倾斜与摆动。
      if (!this.dragging) this.rig.overlay(projectPose(this.t), 1);
      this.rig.bob = Math.sin(this.t * 1.5) * 0.035;
      this.rig.tilt = damp(this.rig.tilt, this.dragging ? 0.10 : 0, 5, dt);
      this.rig.roll = damp(this.rig.roll, this.dragging ? Math.sin(this.t * 2.1) * 0.06 : 0, 4, dt);
    } else {
      this.rig.bob = damp(this.rig.bob, 0, 8, dt);
      this.rig.tilt = damp(this.rig.tilt, 0, 8, dt);
      this.rig.roll = damp(this.rig.roll, 0, 8, dt);
    }
    this.rig.applyTransform(this.pos.x, this.pos.y, this.pos.z, this.yaw);

    for (const m of this.mats) {
      m.userData.u.uHeat.value = this.heat;
      m.userData.u.uTime.value = this.t;
      m.userData.u.uFootY.value = this.pos.y;
    }
  }

  #integrate(dt) {
    const city = this.city;
    this.pos.addScaledVector(this.vel, dt);
    for (const b of city.boxes) {
      if (b.low) continue;
      const dx = this.pos.x - b.x, dz = this.pos.z - b.z, R = this.radius;
      if (Math.abs(dx) < b.hw + R && Math.abs(dz) < b.hd + R) {
        if (this.pos.y >= b.h - 0.05) continue;
        const ox = b.hw + R - Math.abs(dx), oz = b.hd + R - Math.abs(dz);
        if (ox < oz) { this.pos.x += Math.sign(dx || 1) * ox; this.vel.x = 0; }
        else { this.pos.z += Math.sign(dz || 1) * oz; this.vel.z = 0; }
      }
    }
    const gy = city.heightAt(this.pos.x, this.pos.z);
    this.groundY = gy;
    if (this.pos.y <= gy + 0.001) {
      this.pos.y = gy;
      if (this.vel.y < 0) this.vel.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
  }
}
