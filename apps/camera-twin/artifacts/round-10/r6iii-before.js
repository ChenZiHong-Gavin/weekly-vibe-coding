import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Procedural EOS R6 Mark III. Centimetres; +Z photographer, +X right hand.
// No downloaded geometry, textures or fonts. Canvas markings gracefully fall back in Node.
export const IMPLEMENTED = true;

export function buildCamera(THREE) {
  const root = new THREE.Group();
  root.name = 'canon_eos_r6_mark_iii';
  const PI = Math.PI;
  const material = (color, roughness = .6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const shell = material(0x383b3e, .62, .08), rubber = material(0x27292c, .90);
  const leather = material(0x3b3d40, .91), key = material(0x42464a, .44, .12);
  const black = material(0x060709, .84), silver = material(0xc5cad0, .32, .62);
  const gold = material(0xd3a34e, .3, .75), white = material(0xc8cccf, .6);
  const red = material(0xc52e33, .4), blue = material(0x50a5cc, .46);
  const glass = material(0x37434e, .22, .22), optical = material(0x51455b, .16, .3);
  // Object-space grain, generated in the standard PBR shader (no texture assets).
  function grain(mat, frequency, strength) {
    mat.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 vCameraSurface;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCameraSurface = position;');
      shader.fragmentShader = 'varying vec3 vCameraSurface;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        vec3 cell = floor(vCameraSurface * ${frequency.toFixed(1)});
        float grainValue = fract(sin(dot(cell, vec3(12.9898,78.233,37.719))) * 43758.5453);
        float grainFade = 1.0 / (1.0 + length(fwidth(vCameraSurface * ${frequency.toFixed(1)})));
        diffuseColor.rgb *= 1.0 + (grainValue - 0.5) * ${strength.toFixed(2)} * grainFade;
      `);
    };
    mat.customProgramCacheKey = () => `r6-grain-${frequency}-${strength}`;
    // The guide clones materials for highlighting; retain the finish in that state.
    mat.clone = function() { const copy = new THREE.MeshStandardMaterial().copy(this); grain(copy,frequency,strength); return copy; };
  }
  grain(shell, 68, .30); grain(leather, 26, .85);
  const part = (id, pos = [0, 0, 0], rotation = [0, 0, 0]) => {
    const p = new THREE.Group(); p.name = id; p.userData.part = id;
    p.position.set(...pos); p.rotation.set(...rotation); root.add(p); return p;
  };
  function mesh(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function roundedShape(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function extrude(s, d, bevel = .08, curveSegments = 6) {
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments });
    g.translate(0, 0, -d / 2 + bevel); return g;
  }
  function pad(p, w, h, d, r, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
    const b = Math.min(.07, d / 4, r / 3);
    return mesh(p, extrude(roundedShape(w - 2*b, h - 2*b, Math.min(r, (w-2*b)/2, (h-2*b)/2)), d, b), mat, pos, rot);
  }
  const cylinder = (p, r, d, mat, pos = [0, 0, 0], rot = [0, 0, 0], segments = 40) => mesh(p, new THREE.CylinderGeometry(r, r, d, segments), mat, pos, rot);
  const torus = (p, r, tube, mat, pos = [0, 0, 0], rot = [0, 0, 0]) => mesh(p, new THREE.TorusGeometry(r, tube, 8, 48), mat, pos, rot);
  function annulus(p, inner, outer, depth, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
    const s = new THREE.Shape(); s.absarc(0, 0, outer, 0, 2*PI, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, 2*PI, true); s.holes.push(hole);
    return mesh(p, extrude(s, depth, .015, 40), mat, pos, rot);
  }
  function stroke(p, points, radius, mat) {
    return mesh(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(a => new THREE.Vector3(...a))), Math.max(8, points.length * 5), radius, 5, false), mat);
  }
  function button(id, pos, radius = .32, rotation = [PI/2, 0, 0]) {
    const p = part(id, pos, rotation);
    cylinder(p, radius + .085, .10, black);
    cylinder(p, radius, .17, key, [0, .065, 0]);
    torus(p, radius - .035, .026, rubber, [0, .155, 0], [PI/2, 0, 0]);
    return p;
  }
  function dial(id, pos, radius, depth, rotation = [0, 0, 0], teeth = 56) {
    const p = part(id, pos, rotation);
    cylinder(p, radius, depth, rubber); cylinder(p, radius - .07, .05, key, [0, depth / 2, 0]);
    const tooth = new THREE.BoxGeometry(.075, depth * .8, .065);
    for (let i=0; i<teeth; i++) {
      const a = i * 2*PI / teeth;
      mesh(p, tooth, key, [radius*Math.sin(a), 0, radius*Math.cos(a)], [0, a, 0]);
    }
    return p;
  }

  // Decals face local +Z; button caps use -PI/2 around X to face local +Y.
  // Keep texture creation inside the builder: importing/building in Node needs no DOM.
  const decalMaterials = new Map();
  function decal(p, mark, w, h, pos, rot = [0,0,0], color = '#ededeb') {
    const cacheKey = `${mark}:${color}`;
    let mat = decalMaterials.get(cacheKey);
    if (!mat) {
      mat = material(color, .62);
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = Math.max(128, Math.round(512*h/w));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(canvas.width/256, canvas.height/256);
          ctx.fillStyle = ctx.strokeStyle = color;
          ctx.lineWidth = 13; ctx.lineCap = ctx.lineJoin = 'round';
          const line = points => {ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
          const triangle = () => {ctx.beginPath();ctx.moveTo(104,79);ctx.lineTo(175,128);ctx.lineTo(104,177);ctx.closePath();ctx.fill();};
          if (mark === 'playback' || mark === 'movie-toggle') {
            ctx.strokeRect(36,51,184,154); triangle();
            if(mark==='movie-toggle') { line([[23,45],[8,75],[23,99]]);line([[233,157],[248,185],[233,211]]); }
          } else if(mark === 'trash') {
            line([[68,80],[80,222],[178,222],[190,80]]);line([[51,57],[202,37]]);
            line([[105,41],[108,23],[150,18],[155,33]]);
            line([[105,98],[109,198]]);line([[151,98],[147,198]]);
          } else if(mark === 'magnify') {
            ctx.beginPath();ctx.arc(105,102,62,0,PI*2);ctx.stroke();line([[151,152],[219,226]]);
          } else if(mark === 'Q') {
            ctx.strokeRect(37,31,182,194);ctx.font='bold 177px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Q',128,137);
          } else if(mark === 'star') {
            for(let i=0;i<3;i++){ const a=i*PI/3;line([[128-96*Math.cos(a),128-96*Math.sin(a)],[128+96*Math.cos(a),128+96*Math.sin(a)]]); }
          } else if(mark === 'af-area') {
            ctx.strokeRect(18,49,220,158);ctx.strokeRect(111,103,34,50);line([[49,89],[75,89]]);line([[181,166],[208,166]]);
          } else if(mark === 'camera') {
            ctx.fillRect(24,78,208,145);ctx.fillRect(68,45,71,36);ctx.fillStyle='#161719';ctx.beginPath();ctx.arc(130,147,46,0,PI*2);ctx.fill();
          } else if(mark === 'video') {
            ctx.fillRect(24,63,137,119);ctx.beginPath();ctx.moveTo(171,95);ctx.lineTo(232,66);ctx.lineTo(232,181);ctx.lineTo(171,152);ctx.fill();line([[89,193],[65,238]]);line([[119,193],[143,238]]);
          } else if(mark === 'mode') {
            const modes=['B','M','Av','Tv','P','Fv','A+','SCN','C3','C2','C1','S&F'];
            ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 28px sans-serif';
            modes.forEach((label,i)=>{ const a=(-15-i*30)*PI/180;ctx.save();ctx.translate(128+96*Math.sin(a),128-96*Math.cos(a));ctx.rotate(a);ctx.fillStyle=label==='A+'?'#69ddd5':color;ctx.fillText(label,0,0);ctx.restore(); });
          } else if(mark === 'optical-coating') {
            const shade=ctx.createRadialGradient(126,124,10,128,128,126);
            shade.addColorStop(0,'#020708');shade.addColorStop(.28,'#101b1b');
            shade.addColorStop(.47,'#05100f');shade.addColorStop(.70,'#263634');shade.addColorStop(1,'#070e0f');
            ctx.fillStyle=shade;ctx.beginPath();ctx.arc(128,128,126,0,PI*2);ctx.fill();
            for(const [x,y,r,color] of [[67,98,57,'rgba(117,49,117,.48)'],[160,87,70,'rgba(45,109,112,.28)'],[98,123,26,'rgba(155,103,52,.4)']]) {
              const glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,color);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,256,256);
            }
            ctx.strokeStyle='rgba(134,153,147,.20)';ctx.lineWidth=1;
            for(const r of [44,51,63,73,91,116]){ctx.beginPath();ctx.arc(128,128,r,0,PI*2);ctx.stroke();}
            const pupil=ctx.createRadialGradient(128,128,4,128,128,30);pupil.addColorStop(0,'#010303');pupil.addColorStop(.65,'#020606');pupil.addColorStop(1,'#182422');
            ctx.fillStyle=pupil;ctx.beginPath();ctx.arc(128,128,30,0,PI*2);ctx.fill();
          } else if(mark === 'lens-name') {
            ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='13px sans-serif';
            const text='CANON LENS RF24-105mm F4 L IS USM';
            [...text].forEach((char,i)=>{const a=(-73+i*146/(text.length-1))*PI/180;ctx.save();ctx.translate(128+113*Math.sin(a),128-113*Math.cos(a));ctx.rotate(a);ctx.fillStyle=char==='L'&&i>23?'#d33436':color;ctx.fillText(char,0,0);ctx.restore();});
            ctx.save();ctx.translate(128,236);ctx.rotate(PI);ctx.fillText('Φ77mm',0,0);ctx.restore();
          } else {
            ctx.font='500 210px sans-serif'; ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(mark,128,139,242);
          }
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
          mat.map=texture; mat.color.set(0xffffff);
          mat.emissive.set(0xffffff);mat.emissiveMap=texture;mat.emissiveIntensity=mark==='optical-coating'?.12:.40;
          if(mark==='optical-coating') {mat.roughness=.18;mat.metalness=.25;}
          mat.transparent=true;mat.alphaTest=.05;mat.depthWrite=false;
          mat.polygonOffset=true;mat.polygonOffsetFactor=-1;mat.polygonOffsetUnits=-1;
        }
      }
      decalMaterials.set(cacheKey,mat);
    }
    const label=mesh(p,new THREE.PlaneGeometry(w,h),mat,pos,rot);
    label.name=`mark_${mark}`; label.castShadow=false;
    return label;
  }

  // One continuous shoulder silhouette, with a THROUGH hole for the RF chamber.
  const body = part('body');
  const outline = new THREE.Shape();
  outline.moveTo(-5.9, -4.45); outline.bezierCurveTo(-6.65,-4.45,-6.8,-4.1,-6.8,-3.4);
  outline.lineTo(-6.8,1.65); outline.bezierCurveTo(-6.8,2.7,-6.15,2.95,-5.4,3.05);
  outline.lineTo(-3.6,3.3); outline.bezierCurveTo(-2.9,3.45,-2.8,4.65,-1.95,4.7);
  outline.lineTo(.45,4.7); outline.bezierCurveTo(1.15,4.65,1.35,3.5,2.1,3.25);
  outline.bezierCurveTo(3.35,3.1,5.9,3.4,6.5,2.45);
  outline.bezierCurveTo(6.9,1.4,6.75,-2.8,6.65,-3.85);
  outline.quadraticCurveTo(6.55,-4.45,5.85,-4.45); outline.closePath();
  const chamber = new THREE.Path(); chamber.absarc(-.9, -.65, 2.72, 0, 2*PI, true); outline.holes.push(chamber);
  const shellGeometry = extrude(outline, 4.15, .28, 32);
  // Recede the leading edge of the prism housing; the back stays tall for the EVF.
  const vertices = shellGeometry.attributes.position;
  for (let i=0; i<vertices.count; i++) {
    const y = vertices.getY(i), z = vertices.getZ(i);
    if (y > 3.25) vertices.setY(i, y - Math.max(0, -z) * .25 * Math.min(1, (y-3.25)/1.3));
  }
  shellGeometry.deleteAttribute("normal"); shellGeometry.deleteAttribute("uv");
  const smoothShell = mergeVertices(shellGeometry); smoothShell.computeVertexNormals(); mesh(body, smoothShell, shell);
  pad(body, 12.55, 6.7, .24, .5, shell, [0,-1.05,2.07]);
  // Front left leather panel and mount surround blend into the body.
  pad(body, 2.0, 5.65, .23, .55, leather, [-5.42,-1.05,-2.13]);
  annulus(body, 2.73, 3.2, .34, shell, [-.9,-.65,-2.12]);
  // Brand lettering intentionally omitted as permitted by the brief.
  // Discreet model badge / decorative bars, without a font or texture dependency.
  pad(body, 1.12,.17,.04,.04,key,[-5.15,2.08,-2.12]);
  pad(body, .85,.13,.04,.03,key,[-5.15,1.65,-2.12]);

  // Lofted, asymmetric grip. Cross sections vary with height rather than stacking boxes.
  const grip = part('grip');
  const rows = [
    [-4.72,4.92,-.85,1.34,2.80],[-4.56,4.97,-.78,1.43,2.90],
    [-3.95,4.98,-.8,1.64,3.03],[-2.5,5.02,-.94,1.66,3.11],
    [-.7,5.03,-1.03,1.58,3.23],[1.0,5.10,-1.04,1.58,3.28],
    [2.35,5.13,-1.00,1.66,3.30],[2.95,5.1,-.94,1.55,3.12],
    [3.28,5.06,-.8,1.20,2.73],[3.38,5.04,-.7,.72,1.6]
  ];
  function gripLoft() {
    const positions=[], indices=[], n=64;
    rows.forEach(([y,x,z,rx,rz]) => {
      for(let j=0;j<n;j++) {
        const a=j*2*PI/n, c=Math.cos(a), s=Math.sin(a);
        const px=x+rx*Math.sign(c)*Math.pow(Math.abs(c),.64);
        const pz=z+rz*Math.sign(s)*Math.pow(Math.abs(s),.72);
        positions.push(px,y + Math.min(0,pz+1.8)*.10*Math.max(0,(y-1)/2),pz);
      }
    });
    for(let i=0;i<rows.length-1;i++) for(let j=0;j<n;j++) {
      const a=i*n+j,b=i*n+(j+1)%n,c=b+n,d=a+n; indices.push(a,d,b,b,d,c);
    }
    for (const [row, reverse] of [[0,true],[rows.length-1,false]]) {
      const offset=positions.length/3, [y,x,z]=rows[row]; positions.push(x,y,z);
      for(let j=0;j<n;j++) { const a=row*n+j,b=row*n+(j+1)%n; indices.push(offset,reverse?a:b,reverse?b:a); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const gripGeometry = gripLoft(), skinIndices = [], crownIndices = [];
  const gripIndices = gripGeometry.index.array;
  for (let i=0;i<gripIndices.length;i+=3) {
    const triangle=Array.from(gripIndices.slice(i,i+3));
    // Row 6 is the physical mould seam; share normals along that boundary.
    (triangle.every(index => index >= 6*64) ? crownIndices : skinIndices).push(...triangle);
  }
  const crownGeometry=gripGeometry.clone();
  gripGeometry.setIndex(skinIndices); crownGeometry.setIndex(crownIndices);
  mesh(grip,gripGeometry,leather); mesh(grip,crownGeometry,shell);
  // Seam running around the sloping shutter platform.
  const gripSeam = [];
  for (let i=0;i<=32;i++) {
    const a=PI+i*PI/32, c=Math.cos(a), sn=Math.sin(a);
    const x=5.13+1.666*Math.sign(c)*Math.pow(Math.abs(c),.64);
    const z=-1.0+3.306*Math.sign(sn)*Math.pow(Math.abs(sn),.72);
    gripSeam.push([x,2.35+Math.min(0,z+1.8)*.0675,z]);
  }
  stroke(grip, gripSeam, .018, black);
  pad(grip,.27,1.05,.10,.08,black,[4.1,-3.57,-3.99]); // DC coupler flap (manual front 9)

  // RF bayonet: metal annuli, black recessed tube, tabs, screws, lower contact arc.
  const mount = part('lens_mount',[-.9,-.65,-2.4]);
  annulus(mount,2.70,3.10,.24,silver); annulus(mount,2.59,2.73,.32,black,[0,0,.15]);
  annulus(mount,2.57,2.76,1.86,black,[0,0,.86]);
  torus(mount,3.045,.026,key,[0,0,-.14]);
  for (let i=0;i<4;i++) {
    const a=PI*.25+i*PI/2, x=2.92*Math.cos(a), y=2.92*Math.sin(a);
    cylinder(mount,.125,.035,key,[x,y,-.14],[PI/2,0,0],24);
    pad(mount,.13,.025,.012,.01,black,[x,y,-.163],[0,0,a]);
  }
  for(const a of [.25,2.35,4.35]) {
    const tab = pad(mount,.68,.17,.14,.035,silver,[2.57*Math.cos(a),2.57*Math.sin(a),.12]); tab.rotation.z=a+PI/2;
  }
  cylinder(mount,.10,.13,silver,[-2.58,-1.0,-.17],[PI/2,0,0],24); // locking pin
  cylinder(mount,2.95,.12,black,[0,0,1.65],[PI/2,0,0],80);
  const sensor = part('image_sensor',[-.9,-.65,-.94]);
  pad(sensor,4.68,3.48,.16,.18,black);
  pad(sensor,3.6,2.4,.08,.04,optical,[0,0,-.13]);
  // Closed shutter blades, matching the official body-only drawing.
  for(let i=0;i<6;i++) pad(sensor,3.65,.395,.04,.01,key,[0,-1+i*.4,-.19-i*.006]);
  const contacts = part('lens_contacts',[-.9,-.65,-2.42]);
  for(let i=0;i<12;i++) {
    const a=PI*1.23+i*PI*.54/11, x=2.37*Math.cos(a), y=2.37*Math.sin(a);
    cylinder(contacts,.115,.09,black,[x,y,.16],[PI/2,0,0],16);
    cylinder(contacts,.070,.085,gold,[x,y,.105],[PI/2,0,0],16);
  }
  const index = part('mount_index',[-.9,2.48,-2.58]); pad(index,.13,.26,.05,.05,red);
  const release = button('lens_release_button',[-4.32,-.7,-2.29],.39,[-PI/2,0,0]);
  release.scale.set(1,1,1.6);
  button('dof_preview_button',[2.58,-2.8,-2.3],.30,[-PI/2,0,0]);
  button('af_assist_lamp',[2.68,1.82,-2.27],.14,[-PI/2,0,0]).children[1].material=glass;
  const tally=part('tally_lamp',[-4.52,2.55,-2.17]); pad(tally,.14,.39,.07,.055,white);

  // Shoulder controls. The official top photograph locates power around rear dial 2.
  const mode = dial('mode_dial',[2.7,3.45,-.28],1.03,.44);
  decal(mode,'mode',1.94,1.94,[0,.254,0],[-PI/2,0,0]);
  const power = part('power_switch',[5.06,3.42,1.0]);
  annulus(power,.91,1.08,.13,black,[0,0,0],[PI/2,0,0]);
  // A rounded, 7 x 4 mm thumb tab follows the collar tangentially, not a radial needle.
  // Curve its footprint around the dial; the underside joins the collar and clears the teeth.
  const powerTab = extrude(roundedShape(.66,.36,.11),.20,.02,10);
  const tabVertices = powerTab.attributes.position;
  for(let i=0;i<tabVertices.count;i++) {
    const a=tabVertices.getX(i), r=1.0+tabVertices.getY(i);
    // Relief under the inner lip clears the dial's teeth without making the whole tab tall.
    if(r<.925) tabVertices.setZ(i,Math.max(tabVertices.getZ(i),.025));
    tabVertices.setXY(i,r*Math.sin(a),r*Math.cos(a));
  }
  powerTab.computeVertexNormals();
  // The raised tab bridges over the teeth; its narrow foot remains seated on the collar.
  pad(power,.54,.10,.12,.04,key,[0,.075,-1.0]);
  mesh(power,powerTab,key,[0,.18,0],[-PI/2,0,0]);
  // Low transverse grip ribs keep the short tab visibly knurled in shoulder close-ups.
  for(let i=-3;i<=3;i++) {
    const a=i*.073;
    pad(power,.025,.027,.24,.01,rubber,
      [Math.sin(a),.285,-Math.cos(a)],[0,-a,0]);
  }
  // Fixed shoulder labels determine detents: OFF (left), LOCK (centre), ON (right).
  const powerAngles = {
    off: Math.atan2(5.06-4.10,1.0-.02),
    lock: Math.atan2(5.06-5.05,1.0-(-.30)),
    on: Math.atan2(5.06-6.12,1.0-.06)
  };
  power.rotation.y=powerAngles.off;
  const quickDial2=dial('quick_control_dial_2',[5.06,3.4,1.0],.87,.39);
  // Fine concentric machining on this cap only; keep side teeth and other controls unchanged.
  const dialFace=key.clone();
  function concentricFinish(mat) {
    mat.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 vDialFace;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvDialFace = position.xz;');
      shader.fragmentShader='varying vec2 vDialFace;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
        #include <roughnessmap_fragment>
        float dialRadius = length(vDialFace);
        float dialPhase = dialRadius * 314.159;
        float dialFade = 1.0 / (1.0 + fwidth(dialPhase) * fwidth(dialPhase));
        float dialGroove = sin(dialPhase) * dialFade;
        diffuseColor.rgb *= 1.0 + 0.18 * dialGroove;
        roughnessFactor = clamp(roughnessFactor + 0.09 * dialGroove, 0.25, 0.65);
      `);
    };
    mat.customProgramCacheKey=()=> 'r6-quick-dial-2-concentric';
    mat.clone=function(){const copy=new THREE.MeshStandardMaterial().copy(this);concentricFinish(copy);return copy;};
  }
  concentricFinish(dialFace);
  quickDial2.children[1].material=dialFace;
  dial('main_dial',[5.2,2.90,-2.17],.48,1.34,[0,0,PI/2],40);
  const shutter = button('shutter_button',[5.08,3.18,-3.45],.49,[-.23,0,0]);
  shutter.scale.z=.86;
  const mfn=button('mfn_button',[4.26,3.22,-2.7],.235,[0,0,0]);
  decal(mfn,'M-Fn',.69,.24,[0,.29,.43],[-PI/2,0,0]);
  const movie = button('movie_button',[4.42,3.3,-.76],.34,[0,0,0]);
  cylinder(movie,.15,.014,red,[0,.16,0]);
  decal(movie,'movie-toggle',.46,.34,[-.49,.20,-.63],[-PI/2,0,0],'#71c9ed');
  // Stationary legends remain on the shoulder as the power lever turns.
  for(const [label,x,z] of [['OFF',4.10,.02],['LOCK',5.05,-.30],['ON',6.12,.06]])
    decal(body,label,label==='LOCK'?.78:.57,.25,[x,3.49,z],[-PI/2,0,0]);
  const still = dial('still_movie_switch',[-5.25,3.31,.73],.65,.27,[0,0,0],32);
  pad(still,.18,.2,1.4,.06,key,[0,.18,.13]);
  pad(still,.065,.025,.32,.02,white,[0,.293,-.28]);
  const shoe = part('hot_shoe',[-.8,4.76,.32]);
  pad(shoe,2.28,.19,2.6,.15,black);
  for(const x of [-.96,.96]) {
    pad(shoe,.25,.23,2.36,.04,silver,[x,.17,0]);
    pad(shoe,.38,.09,2.36,.025,silver,[x*.92,.31,0]);
  }
  pad(shoe,1.45,.1,1.9,.08,key,[0,.13,.1]);
  for(const [x,z] of [[0,0],[-.35,.4],[.35,.4],[-.35,.75],[.35,.75]]) cylinder(shoe,.09,.025,silver,[x,.2,z],undefined,20);
  for(let i=0;i<12;i++) pad(shoe,.045,.03,.17,.009,gold,[-.55+i*.10,.20,-.9]);
  decal(body,'camera',.35,.30,[-5.61,3.50,-.28],[-PI/2,0,0]);
  decal(body,'video',.38,.33,[-4.88,3.50,-.28],[-PI/2,0,0]);
  const mic=part('microphone');
  for(const x of [-3.42,1.73]) for(let i=0;i<2;i++) cylinder(mic,.065,.035,black,[x,3.40,-1.2+i*.25],undefined,16);
  const speaker=part('speaker');
  for(const [x,z] of [[0,0],[-.15,.17],[.15,.17],[0,.34]]) cylinder(speaker,.055,.032,black,[-5.13+x,3.33,-.45+z],undefined,12);
  for(const [id,x] of [['strap_mount_left',-6.59],['strap_mount_right',6.57]]) {
    const p=part(id,[x,2.64,.3],[0,0,x<0?.25:-.25]);
    pad(p,.25,.28,1.28,.08,black);
    const s=roundedShape(.62,1.06,.19), h=roundedShape(.32,.72,.10); s.holes.push(new THREE.Path(h.getPoints()));
    mesh(p,extrude(s,.13,.02),key,[0,.36,0],[PI/2,0,0]);
  }

  // EVF: layered rubber frame with a real aperture, recessed optical window.
  pad(body,3.44,2.25,1.12,.50,shell,[-.8,3.0,2.67]);
  const cup=part('eyecup',[-.8,3.05,3.40]);
  const cupShape=roundedShape(4.0,2.85,.68), cupHole=roundedShape(2.40,1.89,.42);
  cupShape.holes.push(new THREE.Path(cupHole.getPoints())); mesh(cup,extrude(cupShape,.84,.10),rubber);
  const finder=part('viewfinder',[-.8,3.27,3.62]);
  pad(finder,2.23,1.64,.15,.35,black); pad(finder,1.98,1.44,.07,.3,optical,[0,0,.10]);
  pad(finder,.23,.9,.025,.10,glass,[.54,0,.148]);
  const eyeSensor=part('viewfinder_sensor',[-.8,1.99,3.845]);pad(eyeSensor,.72,.33,.08,.055,black);
  dial('diopter_knob',[1.29,3.04,2.60],.40,.23,[0,0,PI/2],32);

  // Screen leaf is attached to a left-side hinge, then rotates about its own horizontal axis.
  const screen=part('screen',[-5.98,-1.65,2.44]);
  const leaf=new THREE.Group(); leaf.position.x=3.76; screen.add(leaf);
  pad(leaf,7.5,5.54,.38,.20,rubber);
  pad(leaf,7.16,5.19,.09,.11,key,[0,0,.226]);
  pad(leaf,6.66,4.65,.045,.065,glass,[0,.04,.294]);
  pad(leaf,7.06,5.06,.10,.12,shell,[0,0,-.234]);
  for(const y of [-1.85,1.85]) cylinder(screen,.20,1.30,shell,[0,y,0],undefined,32);
  const backButtons = [
    ['rate_button',-5.48,2.20,.30],['menu_button',-4.50,2.20,.30],
    ['multi_controller',2.48,2.22,.39],['af_on_button',3.82,2.38,.31],
    ['ae_lock_button',5.18,2.23,.28],['af_point_button',6.02,2.12,.27],
    ['magnify_button',2.91,.83,.30],['info_button',2.91,-.05,.30],['q_button',4.04,-.04,.32],
    ['set_button',3.92,-2.15,.40],['playback_button',3.48,-3.86,.30],['erase_button',4.46,-3.86,.30]
  ];
  const buttons={};
  for(const [id,x,y,r] of backButtons) buttons[id]=button(id,[x,y,2.39],r);
  const joystick=buttons.multi_controller;
  for(let x=-2;x<=2;x++) for(let z=-2;z<=2;z++) if(x*x+z*z<7) cylinder(joystick,.035,.025,rubber,[x*.105,.17,z*.105],undefined,8);
  const rearWheel = dial('quick_control_dial_1',[3.92,-2.15,2.40],1.12,.23,[PI/2,0,0],56);
  annulus(rearWheel,.55,.72,.075,key,[0,.17,0],[PI/2,0,0]);
  const ribGeometry = new THREE.CapsuleGeometry(.042,.31,2,6);
  for(let i=0;i<48;i++) {
    const a=i*2*PI/48;
    const rib=mesh(rearWheel,ribGeometry,key,[.89*Math.sin(a),.157,.89*Math.cos(a)]);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.sin(a),0,Math.cos(a)));
  }
  // SET is just proud of the rear wheel, without coplanar surfaces.
  buttons.set_button.position.z=2.60;
  const lamp=part('access_lamp',[5.29,-3.42,2.37]);pad(lamp,.12,.27,.07,.04,white);
  const thumbShape=new THREE.Shape();thumbShape.moveTo(4.70,1.85);thumbShape.bezierCurveTo(4.25,1.6,4.4,.5,4.7,.38);thumbShape.lineTo(5.15,.2);thumbShape.lineTo(5.27,-3.65);thumbShape.quadraticCurveTo(5.3,-4.24,6.3,-4.14);thumbShape.lineTo(6.35,1.68);thumbShape.closePath();
  mesh(body,extrude(thumbShape,.15,.06),leather,[0,0,2.25]);
  // Printed key legends match the official rear view, including outlined blue icons.
  for(const [id,text,w,h,color] of [
    ['rate_button','RATE',.51,.23,'#71c9ed'],['menu_button','MENU',.51,.23],
    ['info_button','INFO',.49,.24],['set_button','SET',.54,.28],
    ['q_button','Q',.37,.39],['magnify_button','magnify',.40,.42],
    ['playback_button','playback',.43,.36,'#71c9ed'],['erase_button','trash',.37,.46,'#71c9ed']
  ]) decal(buttons[id],text,w,h,[0,.187,0],[-PI/2,0,0],color);
  decal(buttons.rate_button,'COLOR',.77,.25,[0,.035,.55],[-PI/2,0,0]);
  decal(buttons.af_on_button,'AF-ON',.91,.23,[0,.035,-.55],[-PI/2,0,0]);
  decal(buttons.ae_lock_button,'star',.36,.28,[0,.035,-.48],[-PI/2,0,0]);
  decal(buttons.af_point_button,'af-area',.42,.26,[0,.035,-.49],[-PI/2,0,0]);

  // Left side: sealed split rubber covers; individual connectors remain under the covers.
  const cover=part('terminal_cover',[-7.13,-.65,0]);
  for(const [z,h,y] of [[-.84,3.6,.48],[.82,5.46,-.45],[-.84,1.55,-2.4]]) {
    pad(cover,1.42,h,.15,.20,rubber,[0,y,z],[0,-PI/2,0]);
    pad(cover,.39,.07,.025,.025,key,[-.09,y-h/2+.22,z],[0,-PI/2,0]);
  }
  for(const [id,y,z,round] of [['mic_terminal',.85,-.83,true],['headphone_terminal',-.50,-.83,true],['remote_terminal',-2.66,-.83,true],['usb_terminal',.8,.81,false],['hdmi_terminal',-1.3,.81,false]]) {
    const p=part(id,[-7.05,y,z],[0,-PI/2,0]);
    if(round) {annulus(p,.14,.24,.08,silver);cylinder(p,.137,.10,black,[0,0,-.03],[PI/2,0,0],24);}
    else {pad(p,.45,id==='usb_terminal'?.91:1.39,.10,.10,silver);pad(p,.27,id==='usb_terminal'?.70:1.1,.08,.07,black,[0,0,.06]);}
  }
  // Card compartment is outside the structural shell; the leaf slides then swings.
  pad(body,3.44,5.29,.12,.24,black,[6.78,-1.02,.26],[0,PI/2,0]);
  for(const [id,z,h] of [['card_slot_1',-.60,3.58],['card_slot_2',.79,3.13]]) {
    const p=part(id,[6.91,-.96,z],[0,PI/2,0]);
    pad(p,.61,h,.14,.09,key);pad(p,.28,h-.35,.08,.035,black,[0,0,.10]);
    pad(p,.065,h-.55,.09,.018,silver,[-.19,0,.13]);pad(p,.11,h-.84,.08,.025,red,[.04,0,.14]);
  }
  const door=part('card_slot_cover',[6.98,-1.02,-1.43]);
  pad(door,3.46,5.54,.22,.25,leather,[.22,0,1.73],[0,PI/2,0]);
  pad(door,.09,1.09,.56,.07,key,[.37,.25,2.96]);
  for(let i=0;i<4;i++)pad(door,.055,.05,.36,.015,rubber,[.43,.02+i*.16,2.96]);
  for(const y of [-2.22,2.22]) cylinder(door,.13,.68,key,[0,y,.04],undefined,24);

  // Bottom plate, tripod bushing, battery hatch and untagged locator/serial details.
  const socket=part('tripod_socket',[-.9,-4.81,-.20],[PI/2,0,0]);
  annulus(socket,.17,.34,.14,silver);cylinder(socket,.16,.06,black,[0,0,-.04],[PI/2,0,0],24);
  for(let i=0;i<3;i++)torus(socket,.19,.021,key,[0,0,-.035+i*.045]);
  const battery=part('battery_cover',[4.93,-4.78,-.85],[PI/2,0,0]);pad(battery,2.68,5.54,.16,.43,rubber);
  const lock=part('battery_cover_lock',[5.0,-4.91,-2.65]);pad(lock,.67,.13,.27,.07,key);
  pad(body,2.86,1.02,.026,.09,key,[-2.6,-4.76,1],[PI/2,0,0]);
  for(const x of [-4.8,1.45])cylinder(body,.11,.04,black,[x,-4.76,.4],undefined,20);

  // RF 24-105 F4L: local z=0 is the body flange, front rim is z=-10.7.
  const lens=part('lens',[-.9,-.65,-2.53]);
  const lensPart=(id,pos=[0,0,0],parent=lens)=>{const p=part(id,pos);parent.add(p);return p;};
  const lensMetal=material(0x6d7074,.37,.58), lensRubber=material(0x242629,.83);
  // Lathed profiles keep concentric surfaces smooth without expensive extruded rings.
  function lathe(p,profile,mat) {
    return mesh(p,new THREE.LatheGeometry(profile.map(([r,z])=>new THREE.Vector2(r,-z)),96),mat,[0,0,0],[-PI/2,0,0]);
  }
  const lm=lensPart('lens_mount_ring');
  lathe(lm,[[2.62,0],[3.03,0],[3.03,-.26],[3.22,-.32],[3.22,-.52],[2.62,-.52]],silver);
  torus(lm,3.15,.065,rubber,[0,0,-.34]);
  cylinder(lm,.105,.045,red,[0,3.25,-.55]);
  lathe(lens,[[3.12,-.25],[3.45,-.65],[3.70,-1.15],[3.83,-2.15],[4.04,-2.55],[4.04,-6.65],[3.80,-7.0]],shell);
  // Wide rubber zoom sleeve and a narrower manual focus ring, with longitudinal ribs.
  function lensRing(id,z,r,width,mat,teeth) {
    const p=lensPart(id,[0,0,z]);
    lathe(p,[[r-.10,width/2],[r,width/2-.06],[r,-width/2+.06],[r-.10,-width/2]],mat);
    const rib=new THREE.BoxGeometry(.045,.075,width-.13);
    for(let i=0;i<teeth;i++) { const a=i*2*PI/teeth;
      mesh(p,rib,mat,[r*Math.sin(a),r*Math.cos(a),0],[0,0,-a]);
    }
    return p;
  }
  const zoom=lensRing('lens_zoom_ring',-4.15,4.08,2.65,lensRubber,112);
  lensRing('lens_focus_ring',-6.22,4.055,.98,lensRubber,112);
  // Focal lengths on the smooth collar directly behind the zoom grip.
  for(const [i,text] of ['24','35','50','70','105'].entries()) {
    const a=i*.26;
    const tick=decal(zoom,text,.46,.24,[4.09*Math.sin(a),4.09*Math.cos(a),1.49],[-PI/2,0,-a]);
    tick.rotation.order='ZYX'; // Rotate the face onto the cylinder before turning around its axis.
  }
  decal(lens,'│',.08,.28,[0,3.92,-2.30],[-PI/2,0,0]);
  const barrel=lensPart('lens_barrel');
  lathe(barrel,[[3.77,-4.25],[3.90,-4.25],[3.90,-9.86],[3.72,-10.02]],key);
  const redRing=lensPart('lens_red_ring',[0,0,0],barrel);
  lathe(redRing,[[3.90,-8.72],[4.12,-8.74],[4.12,-8.88],[3.90,-8.91]],red);
  const control=lensRing('lens_control_ring',-9.40,4.13,.85,lensMetal,120);
  barrel.add(control);
  // Crossed fine knurling on the front control ring.
  for(let i=0;i<120;i++){const a=i*2*PI/120;const tooth=mesh(control,new THREE.BoxGeometry(.035,.045,.48),silver,[4.16*Math.sin(a),4.16*Math.cos(a),0]);tooth.rotation.order='ZYX';tooth.rotation.set(0,.42,-a);}
  const front=lensPart('lens_front_element',[0,0,0],barrel);
  lathe(front,[[3.78,-9.78],[4.18,-9.90],[4.20,-10.48],[4.12,-10.70],[3.62,-10.70],[3.38,-10.28],[3.04,-10.03],[2.95,-9.88]],rubber);
  for(const [r,z] of [[4.07,-10.68],[3.83,-10.68],[3.56,-10.53],[3.13,-10.05],[2.72,-10.00],[2.38,-9.98],[1.98,-9.96]])
    torus(front,r,.035,key,[0,0,z]);
  const lensGlass=material(0x173e3b,.13,.52);
  cylinder(front,3.06,.045,lensGlass,[0,0,-9.94],[PI/2,0,0],96);
  cylinder(front,1.60,.048,optical,[0,0,-9.98],[PI/2,0,0],80);
  cylinder(front,1.04,.05,black,[0,0,-10.02],[PI/2,0,0],64);
  for(const r of [1.12,1.34,1.67,1.89,2.28]) torus(front,r,.014,key,[0,0,-10.06]);
  decal(front,'optical-coating',6.06,6.06,[0,0,-10.09],[0,PI,0],'#182623');
  decal(front,'lens-name',8.04,8.04,[0,0,-10.713],[0,PI,0],'#c6c7c4');
  // Two recessed, individually selectable switches on the photographer's left.
  for(const [id,y,label] of [['lens_af_mf_switch',.83,'AF  MF'],['lens_is_switch',-.61,'ON  OFF']]) {
    const p=lensPart(id,[-3.86,y,-1.55]); p.rotation.y=-PI/2;
    pad(p,1.10,.49,.19,.13,black);
    pad(p,.44,.32,.13,.07,key,[-.23,0,.13]);
    decal(p,label,1.03,.23,[0,.48,.13]);
    if(id==='lens_is_switch') decal(p,'STABILIZER',1.24,.18,[0,-.46,.13]);
  }

  const clamp = t => Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
  root.userData.controls = {
    mode_dial(t) { mode.rotation.y=-clamp(t)*2*PI*11/12; },
    screen_open(t) {
      t=clamp(t); screen.rotation.y=-PI*t;
      // t=0 glass faces inward; t=1 screen is to the left and glass faces forward.
      leaf.rotation.x=PI*(1-t);
    },
    card_door_open(t) { t=clamp(t);door.position.z=-1.43+.30*Math.min(1,t*4);door.rotation.y=1.72*t; },
    power(t) {
      t=clamp(t);
      // Preserve the public API (0 OFF, .5 ON, 1 LOCK), despite the physical OFF-LOCK-ON order.
      power.rotation.y=t<=.5
        ? powerAngles.off+(powerAngles.on-powerAngles.off)*(t*2)
        : powerAngles.on+(powerAngles.lock-powerAngles.on)*((t-.5)*2);
    },
    still_movie(t) { still.rotation.y=clamp(t)*.80; },
    lens_attached(t) { lens.position.z=-2.53-6*(1-clamp(t)); },
    lens_zoom(t) { t=clamp(t);barrel.position.z=-2.5*t;zoom.rotation.z=1.04*t; }
  };
  // Display configuration follows the rear product photo: shut, display facing out.
  root.userData.displayConfiguration = 'screen closed, display outward; screen_open(0) stows display inward';
  root.traverse(parent => {
    if (parent.isMesh) return;
    const batches = new Map();
    for (const child of parent.children) if (child.isMesh) {
      if (!batches.has(child.material)) batches.set(child.material, []);
      batches.get(child.material).push(child);
    }
    for (const [mat, children] of batches) if (children.length > 1) {
      const geometries = children.map(child => {
        child.updateMatrix(); const geometry=child.geometry.clone().applyMatrix4(child.matrix);
        // Preserve decal UVs when batching textured meshes.
        if (!mat.map && !mat.emissiveMap) geometry.deleteAttribute('uv');
        return geometry.index ? geometry.toNonIndexed() : geometry;
      });
      const combined=mergeGeometries(geometries);
      children.forEach(child => parent.remove(child));
      mesh(parent,combined,mat);
      geometries.forEach(geometry => geometry.dispose());
    }
  });
  return root;
}
