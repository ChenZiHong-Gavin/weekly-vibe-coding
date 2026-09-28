import { chromium } from '../../../mechanical-explainer/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1400,height:1050},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.error(String(e));});
  page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
  await page.goto('http://127.0.0.1:4319');await page.waitForFunction(()=>Boolean(window.__twin));
  await page.addStyleTag({content:'.parts,.guide{display:none!important}.layout{grid-template-columns:1fr!important;grid-template-rows:minmax(0,1fr)!important}.stage{height:calc(100vh - 45px)!important;min-height:0!important}'});
  const frames=()=>page.evaluate(()=>new Promise(resolve=>{let n=0;function tick(){if(++n>=42)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  await page.evaluate(()=>{
    const {stage,firmware}=window.__twin,T=stage.THREE;
    firmware.fw.setPower('on');stage.state.flight=null;
    const camera=stage.controls.object;camera.up.set(0,0,-1);camera.position.set(4.95,12,-2.1);
    stage.controls.target.set(4.95,3.3,-2.1);stage.controls.update();stage.invalidate();
  });await frames();
  const sample=()=>page.evaluate(()=>{
    const {stage,firmware}=window.__twin,T=stage.THREE,p=stage.state.parts.get('main_dial');
    const socket=stage.state.root.getObjectByName('main_dial_socket');stage.state.root.updateMatrixWorld(true);
    const vertex=p.children[0].geometry.attributes.position;
    return {rotation:p.rotation.toArray().slice(0,3),tooth:p.localToWorld(new T.Vector3().fromBufferAttribute(vertex,256+2)).toArray(),axle:new T.Vector3(1,0,0).applyQuaternion(p.getWorldQuaternion(new T.Quaternion())).toArray(),socket:socket.matrixWorld.toArray(),shutter:firmware.fw.display().shutter};
  });
  const target=await page.evaluate(()=>{
    const {stage}=window.__twin,T=stage.THREE,r=document.querySelector('#stage').getBoundingClientRect();
    const v=new T.Vector3(4.95,3.63,-2.1).project(stage.controls.object);
    const x=r.x+(v.x+1)*r.width/2,y=r.y+(1-v.y)*r.height/2;
    return {x,y,part:stage.pick(x,y)};
  });assert.equal(target.part,'main_dial');
  const before=await sample();await page.mouse.move(target.x,target.y);await page.mouse.wheel(0,100);await frames();const wheel=await sample();
  assert.ok(Math.abs(wheel.rotation[0]-before.rotation[0]-.35)<1e-8);assert.notDeepEqual(wheel.tooth,before.tooth);assert.deepEqual(wheel.axle,before.axle);assert.deepEqual(wheel.socket,before.socket);
  await page.mouse.move(target.x,target.y);await page.mouse.down();await page.mouse.move(target.x+60,target.y,{steps:8});await page.mouse.up();await frames();const drag=await sample();
  assert.ok(Math.abs(drag.rotation[0]-wheel.rotation[0]-.7)<1e-8);assert.deepEqual(drag.axle,before.axle);assert.deepEqual(drag.socket,before.socket);
  await page.evaluate(()=>{const {stage}=window.__twin;stage.state.parts.get('main_dial').rotation.x=0;stage.highlight([]);stage.invalidate();});
  await page.evaluate(()=>{
    const {stage}=window.__twin,T=stage.THREE;
    const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1400,1050);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;
    renderer.domElement.id='dial-review';document.body.append(renderer.domElement);
    window.__dialReview={renderer,camera:new T.OrthographicCamera(-2,2,1.5,-1.5,.1,100)};
  });
  for(const view of ['grip-top-closeup','grip-oblique-closeup','top-orthographic','front-orthographic']) {
    await page.evaluate(view=>{
      const {stage}=window.__twin,T=stage.THREE,root=stage.state.root,{renderer,camera}=window.__dialReview;
      const close=view.startsWith('grip'),front=view.startsWith('front');
      const half=close?2:8.2;camera.left=-half;camera.right=half;camera.top=half*.75;camera.bottom=-half*.75;
      camera.up.set(0,front?1:0,front?0:-1);
      const target=new T.Vector3(...(close?[4.95,3.3,-2.35]:front?[0,0,0]:[0,0,-.4]));
      camera.position.copy(target).add(new T.Vector3(...(view.includes('oblique')?[8,18,9]:front?[0,0,-30]:[0,30,0])));camera.lookAt(target);camera.updateProjectionMatrix();
      stage.state.parts.get('lens').visible=front;root.updateMatrixWorld(true);renderer.render(root.parent,camera);
    },view);
    await page.locator('#dial-review').screenshot({path:dir+view+'.png'});
  }
  await writeFile(dir+'browser.json',JSON.stringify({target,before,wheel,drag,errors},null,2));assert.deepEqual(errors,[]);
  await page.evaluate(()=>{window.__dialReview.renderer.dispose();document.querySelector('#dial-review').remove();});
} finally {await browser.close();}
