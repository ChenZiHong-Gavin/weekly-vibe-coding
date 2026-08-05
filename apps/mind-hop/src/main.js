import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { CITY, CROWD, RENDER, DODC, MOVE, MISSION, EXPO, WITNESS } from './config.js';
import { retargetAll } from './core/retarget.js';
import { Input } from './core/input.js';
import { clamp, damp, camRelative } from './core/utils.js';
import { City } from './world/city.js';
import { Crowd, S_STUN, S_PANIC } from './world/crowd.js';
import { VATCrowd, BlobShadows } from './world/crowdRender.js';
import { Props } from './world/props.js';
import { Guards, G_CHALLENGE, G_ALERT, G_INVESTIGATE } from './world/guards.js';
import { Mission, ST_TRACE, ST_INFILTRATE, ST_EXTRACT, ST_DONE } from './world/mission.js';
import { adductArms } from './core/rig.js';
import { Jean } from './player/jean.js';
import { HostAvatar } from './player/hostAvatar.js';
import { Possession, P_BODY, P_TRAVEL, P_HOST, P_RETURN } from './player/possession.js';
import { TPCamera } from './player/camera.js';
import { VFX } from './fx/vfx.js';
import { HUD } from './ui/hud.js';
import { Audio } from './audio/engine.js';
import { AudioSettings } from './ui/settings.js';

const bfill = document.getElementById('bfill');
const bmsg = document.getElementById('bmsg');
const statsEl = document.getElementById('stats');
const say = (p, m) => { bfill.style.width = p + '%'; bmsg.textContent = m; };

// ═══════════ 渲染 ═══════════
const canvas = document.getElementById('cv');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141a2b);
scene.fog = new THREE.FogExp2(0x1b2138, 0.0044);
const camera = new THREE.PerspectiveCamera(RENDER.fov, innerWidth / innerHeight, 0.1, 900);
// 画中画：附身在外时，右下角持续盯着自己那具毫无防备的身体。
// 这是把"身体留在原地"从一个数字变成看得见的东西。
const pipCam = new THREE.PerspectiveCamera(44, RENDER.pip.w / RENDER.pip.h, 0.1, 400);

scene.add(new THREE.HemisphereLight(0x6d80b8, 0x4a3a26, 1.95));
scene.add(new THREE.AmbientLight(0x38455f, 0.85));
const sun = new THREE.DirectionalLight(0xffc79a, 1.25);
sun.castShadow = true;
sun.shadow.mapSize.set(RENDER.shadowSize, RENDER.shadowSize);
const SS = RENDER.shadowSpan;
sun.shadow.camera.left = -SS; sun.shadow.camera.right = SS;
sun.shadow.camera.top = SS; sun.shadow.camera.bottom = -SS;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 320;
sun.shadow.bias = -0.0009; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

const psiLight = new THREE.PointLight(0xa070ff, 0, 13, 2.1);
scene.add(psiLight);
const bodyLight = new THREE.PointLight(0xff7a30, 3, 11, 2.2);
scene.add(bodyLight);

{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(0x131c33) }, uMid: { value: new THREE.Color(0x2c3a5c) },
                uHor: { value: new THREE.Color(0x7a5364) }, uGlow: { value: new THREE.Color(0xffa257) } },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform vec3 uTop,uMid,uHor,uGlow; varying vec3 vP;
      void main(){
        vec3 d = normalize(vP);
        float t = clamp(d.y*1.4+0.12, 0.0, 1.0);
        vec3 c = mix(mix(uHor,uMid,smoothstep(0.0,0.34,t)), uTop, smoothstep(0.3,1.0,t));
        float s = max(0.0, dot(d, normalize(vec3(-0.62,0.10,-0.42))));
        c += uGlow * pow(s, 26.0) * 0.55 * (1.0-smoothstep(0.0,0.30,t));
        c += uGlow * pow(s, 6.0)  * 0.14 * (1.0-smoothstep(0.0,0.22,t));
        gl_FragColor = vec4(c,1.0);
      }`,
  }));
  sky.frustumCulled = false;
  scene.add(sky);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
  vfx?.resize();
});

say(10, '生成城市…');
const city = new City();
scene.add(city.group);

const loader = new GLTFLoader();
const load = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));

let crowd, civVat, suitVat, dodcVat, blobs, props, guards, mission, streamRest,
    jean, hostAv, poss, tpcam, vfx, hud, composer, audio, aset;
let gateMarker = null;
const G = { over: null, t: 0, center: '', centerT: 0, firstPerson: false, detainT: 0 };
let spotted = 0;

async function boot() {
  say(22, '加载角色…');
  // 默认加载瘦身过的模型（tools/optimize-models.mjs 产物，9.7MB → 2.8MB）。
  // ?models=raw 切回原始文件，用来 A/B 对比重定向质量。
  const B = import.meta.env.BASE_URL;          // 子路径部署：绝不能写死 '/models/…'
  const MDIR = new URLSearchParams(location.search).get('models') === 'raw'
    ? `${B}models` : `${B}models/opt`;
  // ── 首屏只下必需的两个（1.1MB）：Michelle 是琴自己 + 平民A，Xbot 是动画源。
  //    DODC 全都布在设施周围，而琴出生在离设施最远的人行道上（200m 开外，
  //    远超 110m 的剔除距离）—— 开局根本看不见，可以后台补。
  //    平民B 只是第二种外观，没到货之前那些人先用平民A 的皮渲染。
  //    效果：首屏 3.07MB → 1.4MB，开局烘焙 972ms → 约 320ms。
  const [michelle, xbot] = await Promise.all([
    load(`${MDIR}/Michelle.glb`), load(`${MDIR}/Xbot.glb`)]);

  const jeanModel = skeletonClone(michelle.scene);
  const hostF = skeletonClone(michelle.scene);   // 平民 A

  // Xbot 的 idle/walk/run 重定向到 Michelle 骨架（静止姿态不同，按绑定姿态共轭）
  const rc = retargetAll(xbot.animations, xbot.scene, michelle.scene, ['idle', 'walk', 'run']);

  say(48, '烘焙市民动画纹理…');
  await new Promise(r => setTimeout(r, 20));
  const t0 = performance.now();
  civVat = new VATCrowd(michelle, [rc.idle, rc.walk, rc.run], CROWD.count + 8);
  civVat.addTo(scene);
  const bakeMs = performance.now() - t0;

  // ── 剩下两个在开局之后流式补齐，不挡首屏 ──
  streamRest = async () => {
    try {
      const soldier = await load(`${MDIR}/Soldier.glb`);
      const sClips = {};
      for (const n of ['Idle', 'Walk', 'Run'])
        sClips[n.toLowerCase()] = soldier.animations.find(c => c.name.toLowerCase() === n.toLowerCase());
      dodcVat = new VATCrowd(soldier, [sClips.idle, sClips.walk, sClips.run], DODC.count + 8);
      dodcVat.addTo(scene);
      hostAv.addVariant(2, { model: skeletonClone(soldier.scene), clips: sClips });
      if (window.__game) window.__game.dodcVat = dodcVat;   // __game 是快照，得同步

      const suit = await load(`${MDIR}/readyplayer.me.glb`);
      const rcSuit = retargetAll(xbot.animations, xbot.scene, suit.scene, ['idle', 'walk', 'run']);
      suitVat = new VATCrowd(suit, [rcSuit.idle, rcSuit.walk, rcSuit.run], CROWD.count + 8, { minVerts: 600 });
      suitVat.addTo(scene);
      hostAv.addVariant(1, { model: skeletonClone(suit.scene), clips: rcSuit });
      if (window.__game) window.__game.suitVat = suitVat;
      window.__streamed = true;
    } catch (e) {
      console.warn('补充模型加载失败，继续用已有外观：', e);
      window.__streamed = 'failed';
    }
  };

  say(72, '装配世界…');
  vfx = new VFX(scene);
  crowd = new Crowd(city, CROWD.count);
  blobs = new BlobShadows(CROWD.count + DODC.count + 8);
  scene.add(blobs.mesh);
  props = new Props(city);
  scene.add(props.group);

  mission = new Mission(city, crowd);
  guards = new Guards(city, vfx, mission.facility, mission.gate);

  say(88, '召唤凤凰…');
  jean = new Jean(jeanModel, rc, city);
  scene.add(jean.root);
  // 1=平民B、2=DODC 由 streamRest() 后补
  hostAv = new HostAvatar([{ model: hostF, clips: rc }]);
  hostAv.addTo(scene);

  // 出生：离设施远的一条人行道
  let best = null, bd = -1;
  for (const w of city.walkPts) {
    const d = Math.hypot(w.x - mission.facility.x, w.y - mission.facility.z);
    if (d > bd) { bd = d; best = w; }
  }
  jean.teleport(best.x, 0, best.y);
  const bp = new THREE.Vector3(jean.pos.x, 0, jean.pos.z);
  city.pushOut(bp, 1.2); jean.pos.copy(bp);

  tpcam = new TPCamera(camera);
  tpcam.yaw = Math.atan2(mission.facility.x - jean.pos.x, mission.facility.z - jean.pos.z) + Math.PI;
  poss = new Possession(jean, crowd, city, vfx);
  poss.guards = guards;
  hud = new HUD(RENDER.pip);

  // 音频：浏览器要求由用户手势启动，所以挂在"点击画面锁定鼠标"那一下
  audio = new Audio();
  aset = new AudioSettings(audio);
  // 遮挡查询：隔着建筑的声音要变闷
  audio.occluder = (ax, az, bx, bz) => {
    let hit = 0;
    for (const b of city.boxes) {
      if (b.low) continue;
      for (let k = 1; k < 5; k++) {
        const t = k / 5;
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd) { hit++; break; }
      }
      if (hit >= 2) break;
    }
    return Math.min(1, hit * 0.55);
  };
  const startAudio = async () => {
    if (audio.ok) return;
    await audio.init();
    if (!audio.ok) return;
    audio.loop('air', 'air', 'amb');
    audio.loop('murmur', 'murmur', 'amb');
    audio.loop('psiLoop', 'psi', 'sfx');
    audio.loop('alarm', 'alarm', 'sfx');
    audio.setLoop('air', 0.5, 2.0);
    audio.setMusic(0.35);
  };
  canvas.addEventListener('mousedown', startAudio);
  addEventListener('keydown', startAudio);

  // 附身/脱离是当众发生的：宿主会猛地一趔趄。看到的人要有反应，
  // 否则"挑落单的人跳"就没有理由，制造骚乱也就没有用处。
  function witnessed(a, exiting) {
    const nG = guards.witnessHop(a.x, a.z, !!a.isGuard, exiting);
    const nC = crowd.gawkAt(a.x, a.z, WITNESS.civRange);
    if (nC) mission.addExpo(nC * WITNESS.civExpo);
    if (nG) {
      audio?.at('bark', a.x, a.z, { vol: 0.55, maxD: 50, rate: 1.05 });
      G.center = `<span class="bad">被看到了</span> —— ${nG} 名守卫朝这边来`;
      G.centerT = 2.2;
    }
    return nG;
  }
  poss.onPossess = a => {
    hostAv.attach(a);
    audio?.at('land', a.x, a.z, { vol: 0.85, maxD: 30 });
    audio?.at('stumble', a.x, a.z, { vol: 0.5, maxD: 24, rate: 0.95 + Math.random() * 0.1 });
    witnessed(a, false);
  };
  poss.onRelease = a => {
    hostAv.detach();
    audio?.at('stumble', a.x, a.z, { vol: 0.6, maxD: 26, rate: 0.9 + Math.random() * 0.12 });
    witnessed(a, true);
  };
  guards.onDetain = g => {
    if (poss.state !== P_HOST) return;
    mission.addExpo(EXPO.detained);
    guards.raiseAlarm(0.55);
    poss.forceReturn(tpcam);
    audio?.play('snapback', { vol: 0.75, bus: 'sfx' });
    G.detainT = 2.6;
    G.center = '<span class="k">被制服</span> —— 意识被打断，弹回本体';
    G.centerT = 2.6;
  };
  guards.onAlarm = () => {
    mission.addExpo(EXPO.alarm); mission.pushLog('警报拉响。');
    audio?.play('stStage', { vol: 0.4, bus: 'sfx', rate: 0.8 });
  };

  // 设施闸口的地面标记
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 3.4, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x4fd6c2, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.set(mission.gate.x, 0.06, mission.gate.z);
  scene.add(ring); gateMarker = ring;

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.34, 0.48, 1.15));
  composer.addPass(new OutputPass());
  composer.setSize(innerWidth, innerHeight);

  window.__adduct = adductArms;          // 供 armswing.mjs 在测试里复现游戏内的修正顺序
  window.__game = { jean, poss, crowd, guards, mission, hostAv, city, tpcam, G, Input, THREE,
                    renderer, scene, camera, composer,
                    civVat, suitVat, dodcVat, audio, aset, pipCam };
  window.__diag = { bakeMs: Math.round(bakeMs), vatMB: +(civVat.bytes / 1048576).toFixed(1),
                    informants: mission.informants.length,
                    facility: [mission.facility.x | 0, mission.facility.z | 0] };
  say(100, '就绪');
  document.getElementById('boot').classList.add('gone');
  loop();
  streamRest();                     // 开局之后再补 DODC 与平民B 的外观
}

// ═══════════ 输入 ═══════════
const pin = { move: [0, 0], drag: [0, 0], run: false, hop: false, recall: false,
              read: false, act: false, dx: 0, dy: 0 };
function gatherInput() {
  const [ax, ay] = Input.axis();
  pin.move[0] = ax; pin.move[1] = ay;
  // 严格分离：WASD 只管"你穿着的那具身体"，方向键只管"你自己的身体"。
  // 早先把方向键混进 pin.move，结果一按方向键宿主和本体一起动 —— 两个视角
  // 的人被同一个键驱动，完全说不清是在操谁。
  const [bx, by] = Input.arrows();
  pin.drag[0] = bx; pin.drag[1] = by;
  pin.run = !!Input.keys[' '];              // 长按空格 = 跑（显眼）
  pin.hop = !!Input.pressed['e'];
  pin.recall = !!Input.pressed['x'];
  pin.read = !!Input.keys['f'];
  pin.act = !!Input.mousePressed[0];        // 用这具身体做事：平民喊叫 / 守卫开火
  pin.dx = Input.dx; pin.dy = Input.dy;
}

// ═══════════ 循环 ═══════════
const FIXED = 1 / 90;
let acc = 0, last = performance.now(), fps = 60, frames = 0, fpsT = 0;
const camDir = new THREE.Vector3();
const hostInput = { x: 0, z: 0, speed: 0 };
const view = { pos: new THREE.Vector3(), vel: new THREE.Vector3() };
const mk = new THREE.Vector3();
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.066);
  last = now;
  G.t += dt;
  G.detainT = Math.max(0, G.detainT - dt);

  gatherInput();
  // 面板开着的时候不该还在走路 —— 清掉移动/动作输入，但相机与世界继续跑
  if (aset?.open) {
    pin.move[0] = 0; pin.move[1] = 0;
    pin.drag[0] = 0; pin.drag[1] = 0;
    pin.run = pin.hop = pin.recall = pin.read = pin.act = false;
    pin.dx = 0; pin.dy = 0;
  }
  if (Input.pressed['r']) { location.reload(); return; }
  if (Input.pressed['tab']) aset?.toggle();
  if (Input.pressed['v'] && !aset?.open) G.firstPerson = !G.firstPerson;
  if (Input.pressed['m'] && !aset?.open) aset?.setMuted(audio?.toggleMute());
  aset?.update(dt);
  camera.getWorldDirection(camDir);

  const inHost = poss.state === P_HOST;
  const host = poss.host;
  const isGuardHost = inHost && !!host?.isGuard;

  if (!G.over) {
    // ── 附身 ──
    poss.acquire(camDir);
    if (pin.hop) {
      const before = poss.hops;
      poss.hop(tpcam);
      if (poss.hops > before) {
        const o = poss.origin(tmpA);
        audio?.at('whoosh', o.x, o.z, { vol: 0.7, maxD: 40 });
      }
    }
    if (pin.recall && poss.recall(tpcam)) audio?.play('whoosh', { vol: 0.5, bus: 'sfx', rate: 0.72 });
    poss.update(dt, tpcam);

    // ── 本体 ──
    jean.projecting = poss.state !== P_BODY;
    const inBody = poss.state === P_BODY && poss.stunT <= 0;
    const arrows = pin.drag[0] !== 0 || pin.drag[1] !== 0;
    // 意识在自己身上时，方向键就是正常走动（相对主相机）；
    // 意识在外时，方向键是"梦游操舵"（相对监视窗）。
    G.steering = !inBody && arrows && poss.state !== P_TRAVEL && poss.state !== P_RETURN;
    const bodyDrive = inBody
      ? { ax: pin.drag[0], ay: pin.drag[1], yaw: tpcam.yaw, full: true }
      : (G.steering ? { ax: pin.drag[0], ay: pin.drag[1], yaw: G.pipYaw ?? 0 } : null);
    jean.update(dt, pin, tpcam.yaw, false, bodyDrive);
    // WASD 在本体状态下没有可操控的宿主 —— 给一次性提示，别让人以为坏了
    if (inBody && (pin.move[0] !== 0 || pin.move[1] !== 0) && !G.wasdHinted) {
      G.wasdHinted = true;
      G.center = '<span class="k">方向键</span>走动 —— <b>WASD</b> 是给你附身的那具身体用的';
      G.centerT = 3.6;
    }

    // ── 宿主操控 ──
    hostInput.x = 0; hostInput.z = 0; hostInput.speed = 0;
    if (inHost && host) {
      const [ax, ay] = pin.move;
      const [wx, wz] = camRelative(ax, ay, tpcam.yaw);
      const cf = hostAv.controlFactor;
      if (wx !== 0 || wz !== 0) {
        hostInput.x = wx; hostInput.z = wz;
        hostInput.speed = (pin.run ? MOVE.hostRun : MOVE.hostWalk) * cf;
      }
      if (host.isGuard) guards.driveHost(host, dt, hostInput.x, hostInput.z, hostInput.speed);
      hostAv.update(dt);
    }

    // ── 读取记忆 ──
    let readRes = null;
    if (pin.read && inHost && hostAv.stumbleT <= 0) readRes = mission.read(host, dt);
    else { mission.reading = 0; mission.readTarget = null; }
    audio?.setLoop('psi', (pin.read && inHost && hostAv.stumbleT <= 0) ? 0.30 : 0, 0.18);
    if (readRes === 'again' && G.centerT <= 0) {
      G.center = '这具身体的记忆你已经翻过一遍了';
      G.centerT = 1.6;
    }
    if (readRes === 'filler') {
      audio?.play('memFiller', { vol: 0.55, bus: 'sfx' });
      if (G.centerT <= 0) { G.center = '不是他。'; G.centerT = 1.4; }
    }
    if (readRes === 'clue') {
      audio?.play('memClue', { vol: 0.75, bus: 'sfx' });
      vfx.burst(host.x, 1.5, host.z, 3);
      tpcam.addPunch(0.4);
      G.center = '<span class="k">记忆碎片</span> 已读取';
      G.centerT = 2.4;
    }

    // ── 左键「用这具身体做事」：平民喊叫制造骚乱，守卫朝同僚开火 ──
    if (pin.act && inHost && hostAv.stumbleT <= 0 && poss.link > MISSION.disturbCost) {
      poss.link -= MISSION.disturbCost;
      hostAv.startShout();
      tpcam.addShake(0.24, 28);
      if (isGuardHost) {
        const victim = guards.hostFires(host);
        audio?.at('gunshot', host.x, host.z, { vol: 1.0, maxD: 110 });
        crowd.panicAt(host.x, host.z, 30);
        mission.addExpo(6);
        G.center = victim
          ? '<span class="k">开火</span> —— 全场警报，但没人怀疑一名"自己人"以外的东西'
          : '<span class="k">周围没有同僚</span>';
      } else {
        const n = guards.attract(host.x, host.z);
        audio?.at('bark', host.x, host.z, { vol: 0.9, maxD: 60, rate: 0.95 + Math.random() * 0.15 });
        crowd.panicAt(host.x, host.z, 12);
        vfx.burst(host.x, 1.5, host.z, 2);
        vfx.shockwave(host.x, 0, host.z, MISSION.disturbPull * 0.5);
        mission.addExpo(2);
        G.center = n ? `<span class="k">骚乱</span> —— ${n} 名守卫离岗赶来，别处空了`
                     : '<span class="k">骚乱</span> —— 附近没有守卫，白喊了';
      }
      G.centerT = 2.6;
    }

    // ── 世界 ──
    const avatarInfo = {
      x: inHost ? host.x : jean.pos.x,
      z: inHost ? host.z : jean.pos.z,
      isHost: inHost, isGuardHost,
      stumbleT: inHost ? hostAv.stumbleT : 0,
      speed: inHost ? Math.hypot(host.vx, host.vz) : Math.hypot(jean.vel.x, jean.vel.z),
      inRestricted: mission.inRestricted(inHost ? host.x : jean.pos.x, inHost ? host.z : jean.pos.z),
    };

    acc += dt;
    let n = 0;
    while (acc >= FIXED && n < 5) {
      crowd.step(FIXED, hostInput);
      guards.update(FIXED, avatarInfo, tpcam,
        { x: jean.pos.x, z: jean.pos.z, projecting: jean.projecting });
      props.step(FIXED, {});
      acc -= FIXED; n++;
    }

    // 有守卫直视投射中的本体 —— 这是最危险的状态
    spotted = 0; G.bodyThreat = Infinity;
    if (jean.projecting) for (const g of guards.list) {
      if (!(g.bodyLock > 0)) continue;
      spotted++;
      G.bodyThreat = Math.min(G.bodyThreat, Math.hypot(g.x - jean.pos.x, g.z - jean.pos.z));
    }
    if (spotted) {
      // 越走越近，暴露涨得越快 —— 站在身体旁边就是最坏情况
      const prox = clamp(1 + (10 - G.bodyThreat) / 5, 1, 3.2);
      mission.addExpo(spotted * 3.6 * prox * dt);
      if (G.centerT <= 0) {          // 别盖掉刚触发的一次性提示
        G.center = '<span class="k">有人在看你的身体</span> —— 立刻撤回或换个藏身处';
        G.centerT = 0.6;
      }
    }

    mission.update(dt, {
      x: avatarInfo.x, z: avatarInfo.z,
      bodyX: jean.pos.x, bodyZ: jean.pos.z,
      isGuardHost, inBody: poss.state === P_BODY,
    });

    if (mission.stage !== G.prevStage) {
      if (G.prevStage !== undefined) audio?.play('stStage', { vol: 0.55, bus: 'sfx' });
      G.prevStage = mission.stage;
    }
    if (mission.failed) {
      G.over = 'lose';
      audio?.play('stLose', { vol: 0.7, bus: 'sfx' });
      hud.finish('他们找到了她的身体。',
        `你在外面的时候，恐慌把 DODC 引到了那条街上。<br>
         记忆碎片 <span class="k">${mission.found}/${MISSION.informants}</span> ·
         附身 <span class="k">${poss.hops}</span> 次<br><br>按 <span class="k">R</span> 重来`);
    } else if (mission.stage === ST_DONE) {
      G.over = 'win';
      audio?.play('stWin', { vol: 0.7, bus: 'sfx' });
      hud.finish('回到自己身体里。',
        `Sara 的档案写着“样本回收”，日期是三个月前。<br>
         你穿过 <span class="k">${poss.burned}</span> 个人才走到那份文件前面。<br>
         暴露度停在 <span class="k">${Math.round(mission.expo)}</span>。<br><br>按 <span class="k">R</span> 重来`);
    }
  }

  // ═══ 相机：跟随当前操控对象 ═══
  if (poss.state === P_TRAVEL || poss.state === P_RETURN) {
    view.pos.copy(poss.spark);
    view.vel.set(0, 0, 0);
  } else if (inHost && host) {
    view.pos.set(host.x, host.y || 0, host.z);
    view.vel.set(host.vx, 0, host.vz);
  } else {
    view.pos.copy(jean.pos); view.vel.copy(jean.vel);
  }
  const fp = G.firstPerson && inHost;
  if (hostAv.rig) hostAv.rig.visible = inHost && !fp;
  // 相机被建筑挤到很近时淡出当前身体，否则整个屏幕都是后脑勺
  const fade = fp ? 0 : clamp((tpcam.dist - 1.0) / 1.6, 0, 1);
  if (inHost) { hostAv.rig?.setFade(fade); jean.rig.setFade(1); }
  else { jean.rig.setFade(fade); hostAv.rig?.setFade(1); }
  // 调试钩子：截图脚本要把相机架到指定位置观察某个路人（见 hatshot.mjs）。
  // 只在设置了 window.__camLook 时生效，正常游戏里恒为 undefined。
  if (window.__camLook) {
    const c = window.__camLook;
    camera.position.set(c.px, c.py, c.pz);
    camera.lookAt(c.tx, c.ty, c.tz);
    camera.updateMatrixWorld(true);
  } else
  tpcam.update(dt, view, { dx: pin.dx, dy: pin.dy, run: pin.run }, city, {
    dist: poss.busy ? 3.2 : (fp ? 0.02 : 4.6),
    height: fp ? 1.60 : 1.42,
    shoulder: fp ? 0 : 0.6,
    fov: poss.busy ? RENDER.fovHop : RENDER.fov,
    snappy: poss.busy,
    lead: poss.busy ? 0.02 : 0.14,
  });

  // ═══ VAT 写入 ═══
  let vi = 0, si = 0, bi = 0;
  // 距离剔除：城市有 267m 跨度但雾里只看得到 ~120m。
  // 仿真对所有 agent 照跑，只是不写渲染实例 —— 玩法不受影响。
  const cvx = camera.position.x, cvz = camera.position.z;
  const cullSq = RENDER.cullDist * RENDER.cullDist;
  const cullGSq = RENDER.cullDistGuard * RENDER.cullDistGuard;
  // 画中画是第二个观察点 —— 剔除必须同时考虑它，否则监视窗里空无一人，
  // 而"有没有人在靠近我的身体"正是这个窗口存在的唯一理由。
  const pipOn = poss.state !== P_BODY;
  const pvx = jean.pos.x, pvz = jean.pos.z;
  const pipSq = RENDER.pip.cull * RENDER.pip.cull;
  for (const a of crowd.a) {
    if (!a.alive) continue;
    if (a.host) continue;                      // 被附身的那个换成真蒙皮网格
    const ddx = a.x - cvx, ddz = a.z - cvz;
    const dsq = ddx * ddx + ddz * ddz;
    // 知情者和当前锁定目标永不剔除
    const keep = (a.knows && !a.knows.read) || (poss.target && poss.target.obj === a);
    if (dsq > cullSq && !keep) {
      if (!pipOn) continue;
      const px = a.x - pvx, pz = a.z - pvz;
      if (px * px + pz * pz > pipSq) continue;
    }
    // 平民B 的外观是开局后才流式到货的。没到之前，那些人先用平民A 的皮渲染 ——
    // a.model 本身不改，所以到货那一刻自动切过去，仿真侧一个字段都不用动。
    const useSuit = a.model === 1 && suitVat;
    const V = useSuit ? suitVat : civVat;
    const idx = useSuit ? si : vi;
    const [ra, rb, mx] = V.sample(a.clip, a.phase);
    const tilt = a.stumble > 0
      ? Math.sin((1 - a.stumble / (a.stumbleDur || 0.6)) * Math.PI) * 0.30 * (a.stumbleDir || 1) : 0;
    V.setTransform(idx, a.x, a.y, a.z, a.yaw, tilt, tilt * 0.4, a.girth || 1);
    V.setAnim(idx, ra, rb, mx, a.h);
    // 换装参数固定不变；状态只改自发光与明度，避免"变色龙"
    if (a.state === S_PANIC) {
      V.setLook(idx, a.hue, a.sat * 0.9, a.val * 0.96);
      V.setEmissive(idx, 0, 0, 0, 0);
    } else if (a.state === S_STUN) {
      V.setLook(idx, a.hue, a.sat * 0.45, a.val * 0.82);
      V.setEmissive(idx, 0.55, 0.24, 0.95, 0.22);
    } else {
      V.setLook(idx, a.hue, a.sat, a.val);
      V.setEmissive(idx, 0, 0, 0, 0);
    }
    if (a.knows && !a.knows.read) {
      const p = 0.35 + 0.35 * Math.sin(G.t * 3 + a.i);
      V.setEmissive(idx, 1.0, 0.72, 0.22, p * 0.5);
    }
    if (poss.target && poss.target.obj === a) V.setEmissive(idx, 0.8, 0.45, 1.0, 0.75);
    blobs.set(bi++, a.x, 0, a.z, a.r * 3.0);
    if (useSuit) si++; else vi++;
  }
  // 三套 VAT 各自独立计数，每一套都必须 setCount ——
  // InstancedMesh 默认 count = max，漏掉哪一套就会画出一堆定格在旧位置的
  // 幽灵实例（实测西装男仿真 124 个却渲染 328 个，318 个位置纹丝不动）。
  civVat.setCount(vi);
  suitVat?.setCount(si);
  let ei = 0;              // 守卫是独立的实例空间，不接在 si 后面
  for (const g of guards.list) {
    if (!dodcVat) break;   // DODC 外观还在路上（他们此刻都在 200m 外的设施边）
    if (g.host) continue;
    const gdx = g.x - cvx, gdz = g.z - cvz;
    if (gdx * gdx + gdz * gdz > cullGSq && !(poss.target && poss.target.obj === g)) {
      if (!pipOn) continue;
      const px = g.x - pvx, pz = g.z - pvz;
      if (px * px + pz * pz > pipSq) continue;      // 靠近本体的守卫必须画出来
    }
    const [ra, rb, mx] = dodcVat.sample(g.clip, g.phase);
    let tilt = g.stumble > 0
      ? Math.sin((1 - g.stumble / (g.stumbleDur || 0.6)) * Math.PI) * 0.30 * (g.stumbleDir || 1) : 0;
    if (!g.alive) tilt = g.down * 1.45;                    // 倒地
    dodcVat.setTransform(ei, g.x, g.y, g.z, g.yaw, tilt, tilt * 0.3);
    dodcVat.setAnim(ei, ra, rb, mx, g.h * (1 - g.down * 0.12));
    if (!g.alive) {
      dodcVat.setLook(ei, 0.0, 0.2, 0.4);
      dodcVat.setEmissive(ei, 0.4, 0.1, 0.1, 0.05);
      blobs.set(bi++, g.x, 0, g.z, 1.3);
      ei++; continue;
    }
    dodcVat.setLook(ei, 0.0, 0.35, 0.55);      // DODC 统一制服：去饱和压暗
    const sus = g.suspect / 100;
    const pulse = 0.5 + 0.5 * Math.sin(G.t * (4 + sus * 8) + g.id);
    if (g.state === G_ALERT) dodcVat.setEmissive(ei, 1.0, 0.10, 0.06, 1.5 * pulse);
    else if (g.state === G_CHALLENGE) dodcVat.setEmissive(ei, 1.0, 0.42, 0.08, 0.9 * pulse);
    else if (g.state === G_INVESTIGATE) dodcVat.setEmissive(ei, 1.0, 0.78, 0.20, 0.5 * pulse);
    else dodcVat.setEmissive(ei, 0.9, 0.16, 0.12, 0.18 + sus * 0.7);
    if (poss.target && poss.target.obj === g) dodcVat.setEmissive(ei, 0.3, 1.0, 0.85, 1.1);
    blobs.set(bi++, g.x, 0, g.z, 1.0);
    ei++;
  }
  dodcVat?.setCount(ei);
  blobs.setCount(bi);
  civVat.flush(); suitVat?.flush(); dodcVat?.flush(); blobs.flush(); props.flush();

  // ═══ 特效与灯光 ═══
  vfx.update(dt);
  vfx.updateShockwave(dt);
  vfx.setBubble(tmpA.set(0, -99, 0), 1, 0);
  vfx.setBeam(tmpA.set(0, -99, 0), tmpB.set(0, -99, 0), false);

  bodyLight.position.set(jean.pos.x, jean.pos.y + 1.3, jean.pos.z);
  bodyLight.intensity = damp(bodyLight.intensity, jean.projecting ? 6.5 : 3, 5, dt);
  if (poss.busy) { psiLight.position.copy(poss.spark); psiLight.intensity = 11; }
  else if (inHost && host) { psiLight.position.set(host.x, 1.4, host.z); psiLight.intensity = damp(psiLight.intensity, 3.5, 6, dt); }
  else psiLight.intensity = damp(psiLight.intensity, 0, 6, dt);

  gateMarker.material.opacity = mission.stage === ST_INFILTRATE
    ? 0.28 + 0.2 * Math.sin(G.t * 2.4) : 0.08;

  sun.target.position.set(view.pos.x, 0, view.pos.z);
  sun.position.set(view.pos.x - 55, 78, view.pos.z - 44);

  // ═══ 标记 ═══
  {
    const list = [];
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2, pad = 46;
    const push = (wx, wy, wz, cls, label) => {
      mk.set(wx, wy, wz).project(camera);
      const behind = mk.z > 1;
      let sx = (mk.x * 0.5 + 0.5) * W, sy = (-mk.y * 0.5 + 0.5) * H;
      const off = behind || sx < pad || sx > W - pad || sy < pad || sy > H - pad;
      if (off) {
        let vx = sx - cx, vy = sy - cy;
        if (behind) { vx = -vx; vy = -vy; }
        const l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l;
        const k = Math.min(Math.abs(ux) > 1e-4 ? (W / 2 - pad) / Math.abs(ux) : Infinity,
                           Math.abs(uy) > 1e-4 ? (H / 2 - pad) / Math.abs(uy) : Infinity);
        sx = cx + ux * k; sy = cy + uy * k;
      }
      list.push({ x: sx, y: sy, cls, label, alpha: off ? 0.6 : 0.95 });
    };
    // 本体永远标出来
    if (poss.state !== P_BODY) {
      const d = Math.hypot(view.pos.x - jean.pos.x, view.pos.z - jean.pos.z);
      push(jean.pos.x, 2.1, jean.pos.z, 'body', `本体 ${d.toFixed(0)}m`);
    }
    // 心灵回响：只有靠得够近才显形（HUD 标记不受遮挡，玩家一定看得到）
    const echo = mission.nearestEcho(view.pos.x, view.pos.z);
    G.echoDist = echo ? echo.d : null;
    let echoK = 0;
    if (echo && mission.stage === ST_TRACE) {
      echoK = clamp(1 - (echo.d - MISSION.senseNear) / (MISSION.senseFar - MISSION.senseNear), 0, 1);
      if (echo.d < MISSION.senseNear) {
        push(echo.agent.x, echo.agent.h + 0.5, echo.agent.z, 'echo', '回响');
      } else if (echoK > 0.02) {
        // 只给方向，不给精确位置 —— 还是得自己找
        const dx = echo.agent.x - view.pos.x, dz = echo.agent.z - view.pos.z, l = Math.hypot(dx, dz) || 1;
        push(view.pos.x + dx / l * 22, 1.7, view.pos.z + dz / l * 22, 'echo',
          echo.d < MISSION.senseFar * 0.6 ? '很近了' : '这个方向');
      }
    }
    if (mission.stage === ST_INFILTRATE || mission.stage === ST_EXTRACT) {
      const t = mission.stage === ST_INFILTRATE ? mission.gate : jean.pos;
      const d = Math.hypot(view.pos.x - t.x, view.pos.z - (t.z ?? t.z));
      push(t.x, 2.4, t.z, 'goal', `${mission.stage === ST_INFILTRATE ? 'B 区闸口' : '本体'} ${d.toFixed(0)}m`);
    }
    // 重叠的标记互相错开 —— 两个圈叠在一起时两个标签都读不了
    for (let i = 1; i < list.length; i++) {
      for (let k = 0; k < i; k++) {
        const dx = list[i].x - list[k].x, dy = list[i].y - list[k].y;
        const d = Math.hypot(dx, dy);
        if (d < 46) {
          const push = (46 - d) / 2 + 2;
          const ux = d > 0.5 ? dx / d : 0, uy = d > 0.5 ? dy / d : 1;
          list[i].x += ux * push; list[i].y += uy * push;
          list[k].x -= ux * push; list[k].y -= uy * push;
        }
      }
    }
    hud.setMarkers(list.slice(0, 8));
    G.echoK = echoK;
  }

  // ═══ HUD ═══
  const sus = guards.peakSuspect();
  if (!G.over && sus > 55 && G.centerT <= 0) {
    if (inHost) {
      G.center = sus >= 100 ? '<span class="k">被识破了</span> —— 立刻换宿主或撤回（X）'
                            : '有人盯上了这具身体 —— 走开，或换个宿主';
    } else {
      G.center = sus >= 100 ? '<span class="k">他们看见你了</span> —— 快离开这里'
                            : '有守卫在注意这边 —— 别停在他视线里';
    }
    G.centerT = 0.5;
  }
  if (!G.over && inHost && poss.link < 34 && G.centerT <= 0) {
    G.center = '<span class="k">链条快断了</span> —— 撤回本体（X），把身体挪近一点';
    G.centerT = 0.5;
  }

  hud.update(dt, {
    link: clamp(poss.link, 0, 100),
    expo: mission.expo,
    suspect: sus,
    lockWatched: poss.target && poss.state === P_BODY
      ? guards.wouldWitness(poss.target.obj.x, poss.target.obj.z) : 0,
    lockKind: poss.target ? (poss.target.obj.isGuard ? 'guard'
      : (poss.target.obj.knows && !poss.target.obj.knows.read) ? 'know' : '') : '',
    // 两套操作逻辑：面板按当前身份整块切换
    scheme: poss.busy ? 'fly' : inHost ? (host.isGuard ? 'guard' : 'civ') : 'body',
    objMain: mission.objectiveMain,
    objSub: mission.stage === 0 && G.echoDist != null
      ? `记忆碎片 ${mission.found}/${MISSION.informants} · 最近的回响约 ${G.echoDist.toFixed(0)}m`
      : mission.objectiveSub,
    logHtml: mission.log.map(l => `<div>${l.t}</div>`).join(''),
    echo: G.echoK || 0,
    readK: mission.reading > 0 ? clamp(mission.reading / MISSION.readTime, 0, 1) : 0,
    psiFx: poss.busy ? 0.5 : (inHost ? 0.09 : 0),
    center: G.centerT > 0 ? G.center : '',
    pipOn: !!G.pipOn,
    bodySpotted: spotted > 0,
    bodyThreat: G.bodyThreat,
    steering: !!G.steering,
    bodyDist: poss.distFromBody(),
  });
  G.centerT = Math.max(0, G.centerT - dt);

  // ═══ 音频 ═══
  if (audio && audio.ok) updateAudio(dt, inHost, host, sus);

  renderer.info.autoReset = false; renderer.info.reset();
  composer.render();
  drawPiP(dt);

  frames++; fpsT += dt;
  if (fpsT > 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  const ri = renderer.info.render;
  statsEl.textContent = `${fps.toFixed(0)} fps · 单位 ${vi + si + ei} · draw ${ri.calls} · tri ${(ri.triangles / 1000) | 0}k`;
  Input.flush();
}

// ═══════════ 画中画：本体监视 ═══════════
// 附身在外时，右下角持续盯着自己那具毫无防备的身体。
// 这是把"身体留在原地"从一个数字变成看得见的东西。
const _pipTgt = new THREE.Vector3();
function drawPiP(dt) {
  const show = poss.state !== P_BODY;
  G.pipOn = show;
  if (!show) return;

  const P = RENDER.pip;
  const w = P.w, h = P.h;
  const x = innerWidth - w - P.margin;
  const y = P.margin;                      // WebGL 原点在左下

  // 缓慢环绕，让四面八方的接近者都会轮到画面里。
  // 但环到墙后面就看不见身体了 —— 挡住时就近换一个通视的角度。
  // 操舵时冻结环绕：参考系一直转的话根本没法照着窗口按方向键
  if (!G.steering) G.pipAngle = (G.pipAngle || 0) + dt * 0.20;
  _pipTgt.set(jean.pos.x, jean.pos.y + 0.95, jean.pos.z);
  const R = 5.0, HY = 3.1;
  const blocked = (ang) => {
    const cx = jean.pos.x + Math.sin(ang) * R;
    const cz = jean.pos.z + Math.cos(ang) * R;
    for (const b of city.boxes) {
      if (b.low || b.h < HY) continue;
      // 相机落在墙里
      if (Math.abs(cx - b.x) < b.hw + 0.4 && Math.abs(cz - b.z) < b.hd + 0.4) return true;
      // 相机与身体之间被挡
      for (let k = 1; k < 6; k++) {
        const t = k / 6;
        const sx = cx + (jean.pos.x - cx) * t, sz = cz + (jean.pos.z - cz) * t;
        if (Math.abs(sx - b.x) < b.hw && Math.abs(sz - b.z) < b.hd) return true;
      }
    }
    return false;
  };
  let ang = G.pipAngle;
  if (blocked(ang)) {
    for (let i = 1; i <= 12; i++) {
      const step = i * Math.PI / 12;
      if (!blocked(ang + step)) { ang += step; break; }
      if (!blocked(ang - step)) { ang -= step; break; }
    }
  }
  pipCam.position.set(jean.pos.x + Math.sin(ang) * R, jean.pos.y + HY, jean.pos.z + Math.cos(ang) * R);
  pipCam.lookAt(_pipTgt);
  // 记下监视窗的朝向，方向键的转向要以它为参考（玩家是看着这个窗口操舵的）。
  // camRelative 的约定是 forward = (-sin yaw, -cos yaw)；监视相机在
  // body + (sin ang, ·, cos ang)*R 处看向本体，视线方向正是 (-sin ang, -cos ang)，
  // 所以这里就该是 ang 本身。早先写成 atan2(-sin,-cos) = ang + π，操舵整个反了 180°，
  // 而 dirtest/dragtest 又用同一个公式反推"期望前向"，于是双方一起错、测试全绿。
  G.pipYaw = ang;

  renderer.autoClear = false;
  renderer.setScissorTest(true);
  renderer.setViewport(x, y, w, h);
  renderer.setScissor(x, y, w, h);
  renderer.clearDepth();
  renderer.render(scene, pipCam);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
  renderer.autoClear = true;
}

// ═══════════ 逐帧音频 ═══════════
// 听觉在这个游戏里是情报：靴子声比便鞋重且闷，所以你能靠声音判断
// 是谁在靠近；而附身在外时本体那边的声音也听得见（会闷一些）。
const _stepBuf = [];
function updateAudio(dt, inHost, host, sus) {
  // 监听者：耳朵跟着相机；投射在外时本体那边也当作一只耳朵
  audio.setListener(camera, poss.state !== P_BODY ? { x: jean.pos.x, z: jean.pos.z } : null);

  // ── 环境：人群低语随附近人数、警报随警戒度 ──
  let nearPeople = 0;
  const lx = camera.position.x, lz = camera.position.z;
  for (const a of crowd.a) {
    if (!a.alive) continue;
    const dx = a.x - lx, dz = a.z - lz;
    if (dx * dx + dz * dz < 900) nearPeople++;          // 30m 内
  }
  audio.setLoop('murmur', Math.min(0.42, nearPeople * 0.016), 0.6);
  audio.setLoopTone('murmur', 900 + Math.min(nearPeople, 30) * 40);
  audio.setLoop('alarm', guards.alarm > 0.5 ? (guards.alarm - 0.5) * 0.5 : 0, 0.8);

  // ── 脚步：只给最近的若干个发声，按材质分靴子/便鞋 ──
  _stepBuf.length = 0;
  const consider = (o, boot) => {
    const sp = Math.hypot(o.vx || 0, o.vz || 0);
    if (sp < 0.5) return;
    const dx = o.x - lx, dz = o.z - lz;
    let d2 = dx * dx + dz * dz;
    if (poss.state !== P_BODY) {           // 本体那只耳朵
      const bx = o.x - jean.pos.x, bz = o.z - jean.pos.z;
      d2 = Math.min(d2, bx * bx + bz * bz);
    }
    if (d2 > 1600) return;                 // 40m
    _stepBuf.push({ o, boot, d2, sp });
  };
  for (const g of guards.list) if (g.alive && !g.host) consider(g, true);
  for (const a of crowd.a) if (a.alive && !a.host) consider(a, false);
  _stepBuf.sort((p, q) => p.d2 - q.d2);
  const LIMIT = 14;
  for (let i = 0; i < Math.min(LIMIT, _stepBuf.length); i++) {
    const e = _stepBuf[i], o = e.o;
    // 步频跟着速度：跑起来更密
    o._stepT = (o._stepT ?? Math.random() * 0.5) - dt * e.sp / (e.boot ? 1.55 : 1.45);
    if (o._stepT > 0) continue;
    o._stepT = 0.5;
    audio.at(e.boot ? 'boot' : 'step', o.x, o.z, {
      vol: e.boot ? 0.85 : 0.5, maxD: e.boot ? 40 : 26,
      rate: 0.9 + Math.random() * 0.2,
    });
    if (!e.boot && Math.random() < 0.4)
      audio.at('cloth', o.x, o.z, { vol: 0.3, maxD: 16, rate: 0.9 + Math.random() * 0.3 });
  }

  // ── 自己的脚步 ──
  const me = inHost && host ? { x: host.x, z: host.z, sp: Math.hypot(host.vx, host.vz) }
                            : { x: jean.pos.x, z: jean.pos.z, sp: Math.hypot(jean.vel.x, jean.vel.z) };
  if (poss.state !== P_TRAVEL && poss.state !== P_RETURN && me.sp > 0.5) {
    G.stepT = (G.stepT ?? 0) - dt * me.sp / 1.5;
    if (G.stepT <= 0) {
      G.stepT = 0.5;
      const boot = inHost && host?.isGuard;
      audio.at(boot ? 'boot' : 'step', me.x, me.z,
        { vol: boot ? 0.5 : 0.34, maxD: 12, rate: 0.95 + Math.random() * 0.14 });
    }
  }

  // ── 守卫喝止 ──
  for (const g of guards.list) {
    if (!g.alive || g.host) continue;
    const barking = g.state >= G_CHALLENGE || g.bodyLock > 0;
    if (!barking) { g._barkT = 0; continue; }
    g._barkT = (g._barkT ?? 0) - dt;
    if (g._barkT <= 0) {
      g._barkT = 2.4 + Math.random() * 2.2;
      audio.at('bark', g.x, g.z, { vol: 0.8, maxD: 55, rate: 0.92 + Math.random() * 0.16 });
    }
  }

  // ── 恐慌骤起 ──
  let panicking = 0;
  for (const a of crowd.a) if (a.alive && a.state === S_PANIC) panicking++;
  if (panicking > (G.prevPanic ?? 0) + 6) {
    audio.play('panic', { vol: 0.4, bus: 'amb' });
  }
  G.prevPanic = panicking;

  // ── 紧张度：暴露度 + 被怀疑 + 有人在靠近身体 ──
  const threat = spotted > 0 ? clamp(1 - (G.bodyThreat - 2) / 10, 0, 1) : 0;
  const tension = clamp(Math.max(mission.expo / 100, sus / 100 * 0.8, threat), 0, 1);
  audio.updateTension(dt, tension);
  audio.linkWarning(dt, inHost && poss.link < 34);

  // ── 音乐：随阶段与紧张度 ──
  const stageVol = [0.30, 0.38, 0.46, 0.22][mission.stage] ?? 0.3;
  audio.setMusic(G.over ? 0.12 : stageVol + tension * 0.22,
                 700 + tension * 1400);
}

Input.init(canvas);
boot().catch(e => { say(100, '出错: ' + e.message); console.error(e); });
