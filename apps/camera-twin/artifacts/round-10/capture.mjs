import { chromium } from '../../../mechanical-explainer/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
const dir=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1500,height:1100},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:'export const createHotContext = () => ({on(){},accept(){},dispose(){},invalidate(){}});'}));
  await page.goto('http://127.0.0.1:4319');await page.waitForFunction(()=>Boolean(window.__twin));
  await page.addStyleTag({content:'.parts,.guide{display:none!important}.layout{grid-template-columns:1fr!important;grid-template-rows:minmax(0,1fr)!important}.stage{height:calc(100vh - 45px)!important;min-height:0!important}'});
  await page.locator('.viewbar [data-view="front"]').click();
  await page.evaluate(()=>new Promise(resolve=>{let n=0;function tick(){if(++n>=42)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  await page.screenshot({path:dir+'front-app.png'});
  await page.evaluate(()=>{
    const {stage}=window.__twin,T=stage.THREE;
    const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(1400,1050);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;
    renderer.domElement.id='detail-review';document.body.append(renderer.domElement);
    window.__detailReview={renderer,camera:new T.OrthographicCamera(-8.2,8.2,6.15,-6.15,.1,100)};
  });
  const report={states:[],errors};
  const views=[
    ['front',[0,0,-35],[0,0,0],8.2,{}],
    ['front-screen-open',[0,0,-35],[-3.1,0,0],11.4,{screen_open:1}],
    ['top',[0,35,-4.5],[0,0,-4.5],14,{}],
    ['bottom-closed',[0,-35,0],[0,0,0],8.2,{}],
    ['bottom-battery-open',[0,-35,0],[0,0,0],8.2,{battery_cover_open:1}],
    ['battery-open-detail',[12,-20,-12],[4.93,-4.8,-.5],5.4,{battery_cover_open:1}],
    ['card-slot-closed',[30,2,6],[6.5,-.8,.5],5.0,{}],
    ['card-slot-open',[30,2,6],[6.5,-.8,.5],5.0,{card_door_open:1}],
    ['lens-af-is-off',[-30,0,-1.8],[-4.4,-.6,-4.3],3.6,{lens_af_mf:0,lens_is:0}],
    ['lens-mf-is-on',[-30,0,-1.8],[-4.4,-.6,-4.3],3.6,{lens_af_mf:1,lens_is:1}],
    ['lens-af-is-on',[-30,0,-1.8],[-4.4,-.6,-4.3],3.6,{lens_af_mf:0,lens_is:1}],
    ['lens-mf-is-off',[-30,0,-1.8],[-4.4,-.6,-4.3],3.6,{lens_af_mf:1,lens_is:0}]
  ];
  for(const [name,position,target,width,controls] of views) {
    const state=await page.evaluate(({name,position,target,width,controls})=>{
      const {stage}=window.__twin,{renderer,camera}=window.__detailReview,root=stage.state.root,T=stage.THREE;
      for(const [key,value] of Object.entries({screen_open:0,card_door_open:0,battery_cover_open:0,lens_af_mf:0,lens_is:1,...controls}))stage.control(key,value);
      camera.left=-width;camera.right=width;camera.top=width*.75;camera.bottom=-width*.75;
      camera.up.set(0,name==='top'||name.startsWith('bottom')?0:1,name==='top'?-1:name.startsWith('bottom')?1:0);
      camera.position.set(...position);camera.lookAt(...target);camera.updateProjectionMatrix();
      root.updateMatrixWorld(true);renderer.render(root.parent,camera);
      const mapped=[];root.traverse(o=>{if(o.isMesh&&o.material.map){if(!o.geometry.attributes.uv)throw new Error('Missing decal UV');mapped.push(o.material.map);}});
      return {name,controls,canvasTextures:new Set(mapped).size,batteryY:stage.state.parts.get('battery').position.y,sliders:['lens_af_mf_switch','lens_is_switch'].map(id=>root.getObjectByName(id+'_slider').position.x)};
    },{name,position,target,width,controls});
    report.states.push(state);await page.locator('#detail-review').screenshot({path:dir+name+'.png'});
  }
  await page.evaluate(()=>{window.__detailReview.renderer.dispose();document.querySelector('#detail-review').remove();});
  await writeFile(dir+'browser.json',JSON.stringify(report,null,2));
  if(errors.length)throw new Error(errors.join('\n'));
} finally {await browser.close();}
