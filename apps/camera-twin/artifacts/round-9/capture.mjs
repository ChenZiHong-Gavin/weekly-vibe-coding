import { chromium } from '../../../mechanical-explainer/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
const dir = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:1500,height:1100},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  // Freeze HMR during review so unrelated concurrent edits cannot reset the capture scene.
  await page.route('**/@vite/client', route=>route.fulfill({contentType:'application/javascript',body:'export const createHotContext = () => ({on(){},accept(){},dispose(){},invalidate(){}});'}));
  await page.goto('http://127.0.0.1:4319');
  await page.waitForFunction(()=>Boolean(window.__twin));
  await page.addStyleTag({content:'.parts,.guide{display:none!important}.layout{grid-template-columns:1fr!important;grid-template-rows:minmax(0,1fr)!important}.stage{height:calc(100vh - 45px)!important;min-height:0!important}'});
  await page.locator('.viewbar [data-view="top"]').click();
  await page.evaluate(()=>new Promise(resolve=>{let n=0;function tick(){if(++n>=42)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  await page.screenshot({path:dir+'top.png'});
  await page.evaluate(()=>{
    const {stage}=window.__twin,T=stage.THREE;
    const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(1400,1050);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;
    renderer.domElement.id='power-review';document.body.append(renderer.domElement);
    window.__powerReview={renderer,camera:new T.OrthographicCamera(-8.2,8.2,6.15,-6.15,.1,100)};
  });
  const report = {states:[],errors};
  for(const view of ['top-controls','shoulder-top','shoulder-oblique']) {
    for(const [label,t] of (view==='top-controls'?[['OFF',0]]:[['OFF',0],['ON',.5],['LOCK',1]])) {
      const state=await page.evaluate(({view,t})=>{
        const {stage}=window.__twin,{renderer,camera}=window.__powerReview;
        const root=stage.state.root,T=stage.THREE;
        stage.control('power',t);
        stage.state.parts.get('lens').visible=view!=='top-controls';
        camera.up.set(0,0,-1);
        if(view==='top-controls') {
          camera.left=-8.2;camera.right=8.2;camera.top=6.15;camera.bottom=-6.15;
          camera.position.set(0,30,-.4);camera.lookAt(0,0,-.4);
        } else {
          camera.left=-2.6;camera.right=2.6;camera.top=1.95;camera.bottom=-1.95;
          const target=new T.Vector3(4.75,3.3,.2);
          camera.position.copy(target).add(new T.Vector3(...(view==='shoulder-top'?[0,25,0]:[3,22,9])));
          camera.lookAt(target);
        }
        camera.updateProjectionMatrix();root.updateMatrixWorld(true);renderer.render(root.parent,camera);
        const p=stage.state.parts.get('power_switch');
        const tip=p.localToWorld(new T.Vector3(0,.285,-1.0));
        return {view,t,angleDegrees:T.MathUtils.radToDeg(p.rotation.y),tabCenter:tip.toArray(),labels:['OFF','LOCK','ON'].map(label=>root.getObjectByName('mark_'+label).getWorldPosition(new T.Vector3()).toArray())};
      },{view,t});
      report.states.push(state);
      await page.locator('#power-review').screenshot({path:dir+(view==='top-controls'?'top-controls':`${view}-power-${t}-${label.toLowerCase()}`)+'.png'});
    }
  }
  await page.evaluate(()=>{window.__powerReview.renderer.dispose();document.querySelector('#power-review').remove();});
  await writeFile(dir+'browser.json',JSON.stringify(report,null,2));
  if(errors.length)throw new Error(errors.join('\n'));
} finally {await browser.close();}
