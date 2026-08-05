import { chromium } from 'playwright-core';
// 步态回归：用同一把尺子量三套模型的走路周期。
//
// 起因是"礼帽男走路有点奇怪"。查出来两个缺陷，都不只影响他一个：
//  1. adductArms 把手臂朝"正下方"压，分不清外张和前后摆 → 摆臂被吃掉一半
//     （单独由 armswing.mjs 守）
//  2. 重定向把 Hips 的**位移轨道**整个丢掉了。Xbot 的走路是原地循环
//     （前后分量恒为 0），丢掉的其实是 4.4cm 上下起伏 + 4.8cm 左右重心转移。
//     结果胯高幅度恒为 0，人是"滑"过去的；而且 Mixamo 的腿部角度本来就是
//     和胯部起伏一起编的，抽掉起伏，支撑脚就踩不住地。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.waitForTimeout(1500);

const r = JSON.parse(await p.evaluate(async () => {
  const g = window.__game, THREE = g.THREE;
  const NAMES = ['Michelle(平民A)', 'readyplayer.me(礼帽男)', 'Soldier(DODC)'];
  const out = {};

  const bn = raw => raw.replace('mixamorig:', '').replace('mixamorig', '');
  const findBones = (rig, want) => {
    const m = {};
    rig.model.traverse(o => { if (o.isBone) { const n = bn(o.name); if (want.includes(n)) m[n] = o; } });
    return m;
  };
  const WANT = ['Hips','Spine','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
                'RightUpLeg','RightLeg','RightFoot','RightToeBase','Head'];

  for (let ri = 0; ri < g.hostAv.rigs.length; ri++) {
    const rig = g.hostAv.rigs[ri];
    const bones = findBones(rig, WANT);
    const missing = WANT.filter(n => !bones[n]);

    // 只播走路，权重锁死，避免 idle 混进来
    for (const k in rig.actions) rig.actions[k].setEffectiveWeight(k === 'walk' ? 1 : 0);
    if (rig.actions.walk) { rig.actions.walk.setEffectiveTimeScale(1); rig.actions.walk.time = 0; }
    rig.root.position.set(0,0,0); rig.root.rotation.set(0,0,0);
    rig.model.rotation.set(0,0,0);

    const dur = rig.actions.walk ? rig.actions.walk.getClip().duration : 0;
    const N = 32, dt = dur / N;
    const S = [];
    const wp = o => o.getWorldPosition(new THREE.Vector3());
    for (let i = 0; i < N; i++) {
      rig.mixer.update(i === 0 ? 0 : dt);
      // adductArms 只动手臂，不影响腿，但保持与游戏内一致
      rig.root.updateMatrixWorld(true);
      const s = {};
      for (const n of WANT) if (bones[n]) { const v = wp(bones[n]); s[n] = [v.x, v.y, v.z]; }
      S.push(s);
    }

    const get = (i, n) => S[i][n];
    const sub = (a, c) => [a[0]-c[0], a[1]-c[1], a[2]-c[2]];
    const len = v => Math.hypot(v[0], v[1], v[2]);
    const ang = (u, v) => {
      const d = (u[0]*v[0]+u[1]*v[1]+u[2]*v[2]) / (len(u)*len(v) || 1);
      return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
    };
    const rng = arr => ({ min:+Math.min(...arr).toFixed(3), max:+Math.max(...arr).toFixed(3),
                          幅度:+(Math.max(...arr)-Math.min(...arr)).toFixed(3) });

    const hipY = [], lfY = [], rfY = [], kneeL = [], kneeR = [], stride = [], splay = [], sway = [];
    for (let i = 0; i < N; i++) {
      if (!S[i].Hips) continue;
      hipY.push(get(i,'Hips')[1]);
      if (S[i].LeftFoot)  lfY.push(get(i,'LeftFoot')[1]);
      if (S[i].RightFoot) rfY.push(get(i,'RightFoot')[1]);
      // 膝角：大腿向量与小腿向量的夹角（0 = 完全伸直）
      if (S[i].LeftUpLeg && S[i].LeftLeg && S[i].LeftFoot)
        kneeL.push(ang(sub(get(i,'LeftLeg'), get(i,'LeftUpLeg')), sub(get(i,'LeftFoot'), get(i,'LeftLeg'))));
      if (S[i].RightUpLeg && S[i].RightLeg && S[i].RightFoot)
        kneeR.push(ang(sub(get(i,'RightLeg'), get(i,'RightUpLeg')), sub(get(i,'RightFoot'), get(i,'RightLeg'))));
      if (S[i].LeftFoot && S[i].RightFoot) {
        stride.push(Math.abs(get(i,'LeftFoot')[2] - get(i,'RightFoot')[2]));  // 前后跨度
        splay.push(Math.abs(get(i,'LeftFoot')[0] - get(i,'RightFoot')[0]));   // 左右分开
      }
      if (S[i].Head && S[i].Hips) sway.push(get(i,'Head')[0] - get(i,'Hips')[0]);
    }

    out[NAMES[ri]] = {
      缺失骨骼: missing,
      走路轨道数: rig.actions.walk ? rig.actions.walk.getClip().tracks.length : 0,
      周期秒: +dur.toFixed(2),
      胯高: rng(hipY),
      左脚离地: rng(lfY), 右脚离地: rng(rfY),
      左膝角: rng(kneeL), 右膝角: rng(kneeR),
      前后跨度: rng(stride), 左右分腿: rng(splay),
      头相对胯的横向偏移: rng(sway),
    };
  }
  return JSON.stringify(out, null, 1);
}));

console.log(JSON.stringify(r, null, 1));

const fails = [];
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };
for (const [name, m] of Object.entries(r)) {
  chk(`${name} 没有缺骨骼`, m.缺失骨骼.length === 0, m.缺失骨骼.join(','));
  // 走路必须有上下起伏。恒为 0 = 位移轨道被丢了 = 滑行
  chk(`${name} 有上下起伏（2~12cm）`,
      m.胯高.幅度 >= 0.02 && m.胯高.幅度 <= 0.12, `${(m.胯高.幅度*100).toFixed(1)}cm`);
  chk(`${name} 脚没穿地也没飞起来`,
      m.左脚离地.min > 0.02 && m.左脚离地.max < 0.55 &&
      m.右脚离地.min > 0.02 && m.右脚离地.max < 0.55,
      `左 ${m.左脚离地.min}~${m.左脚离地.max} 右 ${m.右脚离地.min}~${m.右脚离地.max}`);
  chk(`${name} 膝盖有正常屈伸（>30°）`,
      m.左膝角.幅度 > 30 && m.右膝角.幅度 > 30, `左 ${m.左膝角.幅度}° 右 ${m.右膝角.幅度}°`);
  chk(`${name} 步幅正常（0.4~1.1m）`,
      m.前后跨度.max > 0.4 && m.前后跨度.max < 1.1, `${m.前后跨度.max}m`);
  chk(`${name} 两腿没劈开（<0.3m）`, m.左右分腿.max < 0.3, `${m.左右分腿.max}m`);
}
console.log(fails.length ? `\n✗ ${fails.length} 项失败` : '\n✓ 三套模型步态正常');
await b.close();
process.exit(fails.length ? 1 : 0);
