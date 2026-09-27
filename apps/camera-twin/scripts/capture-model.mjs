import { chromium } from '../../mechanical-explainer/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const dir = process.argv[2] || 'artifacts/round-1';
await mkdir(dir, {recursive:true});
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1800,height:1120},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
  // Test-only exposure of the same scene instance; no production code changes.
  await page.route(/\/src\/main\.js(?:\?.*)?$/, async route => {
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nwindow.__modelReview = { stage, root };'});
  });
  await page.goto('http://127.0.0.1:4319');
  await page.locator('#model-status').filter({hasText:'R6 Mark III'}).waitFor();
  // Enlarge the existing viewport only; screenshots still use the app's actual scene and view buttons.
  await page.addStyleTag({content:'.parts,.guide{display:none!important}.layout{grid-template-columns:1fr!important;grid-template-rows:minmax(0,1fr)!important}.stage{height:calc(100vh - 45px)!important;min-height:0!important}'});
  for(const view of (process.argv.includes('--controls-only') ? [] : ['front','back','top','left','right','overview'])) {
    await page.locator(`.viewbar [data-view="${view}"]`).click();
    await page.evaluate(() => new Promise(resolve => { let frames = 0; function tick() { if (++frames >= 42) resolve(); else requestAnimationFrame(tick); } requestAnimationFrame(tick); }));
    await page.screenshot({path:`${dir}/${view}.png`});
  }
  if (process.argv.includes('--controls') || process.argv.includes('--controls-only')) {
    await page.waitForFunction(() => Boolean(window.__modelReview));
    for (const [name,view] of [['screen_open','front'],['card_door_open','right'],['bottom','bottom'],['lens_attached','overview'],['lens_zoom','left'],['lens_zoom_top','top']]) {
      await page.evaluate(({name,view}) => {
        const {stage}=window.__modelReview;
        stage.control('screen_open',0); stage.control('card_door_open',0);
        stage.control('lens_attached',1); stage.control('lens_zoom',0);
        if(name!=='bottom') stage.control(name==='lens_zoom_top'?'lens_zoom':name,name==='lens_attached'?0:1);
        stage.setView(view);
      },{name,view});
      await page.evaluate(() => new Promise(resolve => { let frames=0; function tick(){ if(++frames>=42) resolve(); else requestAnimationFrame(tick); } requestAnimationFrame(tick); }));
      await page.screenshot({path:`${dir}/${name}.png`});
    }
  }
  const textureReport=await page.evaluate(async () => {
    const {root,stage}=window.__modelReview, T=stage.THREE;
    stage.control('lens_attached',1);stage.control('lens_zoom',0);
    stage.control('card_door_open',0);
    // Reset the screen to the original outward-facing display configuration.
    stage.control('screen_open',0);stage.state.parts.get('screen').children[0].rotation.x=0;
    const mapped=[];root.traverse(o=>{if(o.isMesh && o.material.map){if(!o.geometry.attributes.uv)throw new Error('Missing decal UVs');mapped.push(o.material.map);}});
    const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1400,980);
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;
    renderer.domElement.id='orthographic-review';document.body.append(renderer.domElement);
    window.__orthoReview={renderer,camera:new T.OrthographicCamera(-8.15,8.15,5.705,-5.705,.1,100)};
    return {canvasTextures:new Set(mapped).size,missingUVs:0};
  });
  for(const view of ['back','top','front','top-controls']) {
    await page.evaluate(view=>{
      const {renderer,camera}=window.__orthoReview,{root}=window.__modelReview;
      const top=view.startsWith('top');camera.up.set(0,top?0:1,top?-1:0);
      window.__modelReview.stage.state.parts.get('lens').visible=view!=='top-controls';
      if(view==='top') {camera.left=-14;camera.right=14;camera.top=9.8;camera.bottom=-9.8;camera.position.set(0,30,-4.5);camera.lookAt(0,0,-4.5);}
      else if(view==='top-controls') {camera.left=-8.15;camera.right=8.15;camera.top=5.705;camera.bottom=-5.705;camera.position.set(0,30,-.4);camera.lookAt(0,0,-.4);}
      else {camera.left=-8.15;camera.right=8.15;camera.top=5.705;camera.bottom=-5.705;camera.position.set(0,0,view==='back'?30:-35);camera.lookAt(0,0,0);}
      camera.updateProjectionMatrix();root.updateMatrixWorld(true);renderer.render(root.parent,camera);
    },view);
    await page.locator('#orthographic-review').screenshot({path:`${dir}/${view}-orthographic.png`});
  }
  await page.evaluate(()=>{window.__modelReview.stage.state.parts.get('lens').visible=true;window.__orthoReview.renderer.dispose();document.querySelector('#orthographic-review').remove();});
  await writeFile(`${dir}/browser.json`,JSON.stringify({status:await page.locator('#model-status').textContent(),textureReport,errors},null,2));
  if(errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
