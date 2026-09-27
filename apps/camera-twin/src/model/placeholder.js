// Blocky stand-in so the app runs before the real model exists. Every required part is present, roughly placed.
import { BODY_SIZE_CM, REQUIRED_PART_IDS } from './contract.js';

export function buildCamera(THREE) {
  const { width: W, height: H, depth: D } = BODY_SIZE_CM;
  const g = new THREE.Group(); g.name = 'camera_placeholder';
  const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.1, ...extra });
  const part = (id, geo, m, pos, rot) => { const o = new THREE.Group(); o.name = id; o.userData.part = id; const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; o.add(mesh); if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); g.add(o); return o; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r, h, s = 32) => new THREE.CylinderGeometry(r, r, h, s);
  const dark = mat(0x2a2a2a), key = mat(0x3c3c3c), metal = mat(0xb9b9b9, { metalness: 0.8, roughness: 0.3 }), glass = mat(0x1a1f2b, { roughness: 0.2 });
  // body: main block + grip + viewfinder hump
  const body = part('body', box(W - 3.2, H - 2.4, D - 3.2), dark, [-1.4, -1.2, 0]);
  const hump = new THREE.Mesh(box(4.2, 2.6, 5), dark); hump.position.set(0.6, H / 2 - 1.5, 0.8); body.add(hump);
  part('grip', box(3.2, H - 2.4, D - 1.2), key, [W / 2 - 1.6, -1.2, 0.6]);
  part('hot_shoe', box(2.2, 0.4, 2.4), metal, [0.6, H / 2 + 0.05, 0.6]);
  const front = -D / 2 + 1.6, back = D / 2 - 1.6, top = H / 2 - 1.5 + 1.2;
  part('lens_mount', new THREE.TorusGeometry(2.7, 0.35, 12, 48), metal, [-1.4, -0.6, front - 0.2]);
  part('image_sensor', box(3.6, 2.4, 0.1), glass, [-1.4, -0.6, front + 0.3]);
  part('lens_contacts', box(1.6, 0.15, 0.2), metal, [-1.4, -2.6, front + 0.2]);
  part('mount_index', cyl(0.12, 0.05), mat(0xd23b2f), [-1.4, 2.4, front - 0.1], [Math.PI / 2, 0, 0]);
  part('lens_release_button', cyl(0.5, 0.2), key, [1.9, -0.6, front - 0.1], [Math.PI / 2, 0, 0]);
  part('dof_preview_button', cyl(0.35, 0.2), key, [-4.6, -3.2, front - 0.1], [Math.PI / 2, 0, 0]);
  part('af_assist_lamp', cyl(0.2, 0.1), mat(0xffd27a), [4.2, 1.8, front - 0.1], [Math.PI / 2, 0, 0]);
  part('tally_lamp', cyl(0.12, 0.1), mat(0xd23b2f), [-1.4, 3.4, front - 0.1], [Math.PI / 2, 0, 0]);
  part('microphone', box(1.2, 0.05, 0.6), key, [-4.4, top + 0.02, -1]);
  part('body_cap', cyl(2.6, 0.5), key, [-1.4, -0.6, front - 0.6], [Math.PI / 2, 0, 0]).visible = false;
  // top
  part('mode_dial', cyl(1.3, 0.5), key, [2.6, top, -0.4]);
  part('power_switch', new THREE.TorusGeometry(1.55, 0.18, 8, 32), key, [2.6, top - 0.1, -0.4], [Math.PI / 2, 0, 0]);
  part('shutter_button', cyl(0.55, 0.3), key, [5.2, top + 0.4, -2.6]);
  part('main_dial', cyl(0.9, 0.5, 40), key, [5.2, top + 0.5, -0.8], [0, 0, Math.PI / 2]);
  part('mfn_button', cyl(0.3, 0.2), key, [4.4, top + 0.2, -1.6]);
  part('movie_button', cyl(0.4, 0.25), mat(0xc0392b), [4.6, top + 0.15, 0.4]);
  part('still_movie_switch', cyl(0.9, 0.35), key, [-5.4, top, 1.2]);
  part('quick_control_dial_2', cyl(0.9, 0.5, 40), key, [4.2, top + 0.2, 2.2], [Math.PI / 2, 0, 0]);
  part('strap_mount_left', new THREE.TorusGeometry(0.4, 0.1, 8, 24), metal, [-W / 2 + 1.2, 1.6, 0.6], [0, Math.PI / 2, 0]);
  part('strap_mount_right', new THREE.TorusGeometry(0.4, 0.1, 8, 24), metal, [W / 2 - 0.6, 1.6, 0.6], [0, Math.PI / 2, 0]);
  // back
  part('viewfinder', box(2.4, 1.6, 0.2), glass, [0.6, 3.2, back + 0.9]);
  part('eyecup', box(3.4, 2.6, 0.8), mat(0x151515), [0.6, 3.2, back + 0.4]);
  part('viewfinder_sensor', box(0.8, 0.3, 0.05), glass, [0.6, 1.7, back + 0.05]);
  part('diopter_knob', cyl(0.35, 0.3, 24), key, [2.6, 3.4, back + 0.2], [Math.PI / 2, 0, 0]);
  part('screen', box(7.6, 5.2, 0.5), glass, [-2.6, -1.4, back + 0.3]);
  part('menu_button', cyl(0.4, 0.15), key, [-4.6, 2.6, back + 0.05], [Math.PI / 2, 0, 0]);
  part('rate_button', cyl(0.4, 0.15), key, [-5.8, 2.6, back + 0.05], [Math.PI / 2, 0, 0]);
  part('speaker', box(0.8, 0.5, 0.05), key, [-3.2, 3.6, back + 0.02]);
  part('multi_controller', cyl(0.45, 0.4, 24), key, [2.8, 2.4, back + 0.2], [Math.PI / 2, 0, 0]);
  part('af_on_button', cyl(0.4, 0.15), key, [4.2, 2.6, back + 0.05], [Math.PI / 2, 0, 0]);
  part('ae_lock_button', cyl(0.35, 0.15), key, [5.4, 2.2, back + 0.05], [Math.PI / 2, 0, 0]);
  part('af_point_button', cyl(0.35, 0.15), key, [6.3, 2.2, back + 0.05], [Math.PI / 2, 0, 0]);
  part('magnify_button', cyl(0.35, 0.15), key, [3.6, 0.8, back + 0.05], [Math.PI / 2, 0, 0]);
  part('info_button', cyl(0.35, 0.15), key, [3.6, -0.3, back + 0.05], [Math.PI / 2, 0, 0]);
  part('q_button', cyl(0.35, 0.15), key, [4.7, -0.3, back + 0.05], [Math.PI / 2, 0, 0]);
  part('quick_control_dial_1', new THREE.TorusGeometry(1.1, 0.3, 10, 40), key, [4.5, -2.2, back + 0.15]);
  part('set_button', cyl(0.55, 0.2), key, [4.5, -2.2, back + 0.15], [Math.PI / 2, 0, 0]);
  part('playback_button', cyl(0.35, 0.15), key, [3.8, -4.0, back + 0.05], [Math.PI / 2, 0, 0]);
  part('erase_button', cyl(0.35, 0.15), key, [4.9, -4.0, back + 0.05], [Math.PI / 2, 0, 0]);
  part('access_lamp', cyl(0.1, 0.05), mat(0xff8844), [5.7, -3.4, back + 0.02], [Math.PI / 2, 0, 0]);
  // left side terminals
  const left = -W / 2 + 0.05;
  part('terminal_cover', box(0.3, 5.6, 2.2), mat(0x202020), [left + 0.1, -0.8, 0.4]);
  const term = (id, y) => part(id, box(0.1, 0.5, 0.5), metal, [left, y, 0.4], [0, 0, 0]);
  term('mic_terminal', 1.4); term('usb_terminal', 0.4); term('headphone_terminal', -0.6); term('hdmi_terminal', -1.6); term('remote_terminal', -2.8);
  // right side card slots
  const right = W / 2 - 0.05;
  part('card_slot_cover', box(0.3, 5.4, 4.2), key, [right - 0.1, -1.4, 0.8]);
  part('card_slot_1', box(0.2, 3.0, 0.4), metal, [right, -1.2, 0.2]);
  part('card_slot_2', box(0.2, 2.6, 0.3), metal, [right, -1.2, 1.4]);
  // bottom
  const bottom = -H / 2 + 0.3;
  part('tripod_socket', cyl(0.35, 0.3), metal, [-1.4, bottom, 0]);
  part('battery_cover', box(3.0, 0.2, D - 1.6), key, [W / 2 - 1.6, bottom, 0.6]);
  part('battery_cover_lock', box(0.8, 0.15, 0.3), metal, [W / 2 - 1.6, bottom - 0.1, -2.6]);
  // lens: RF 24-105 F4L stand-in (10.7 long, 8.4 diameter), pointing -Z from the mount
  const lens = new THREE.Group(); lens.name = 'lens'; lens.userData.part = 'lens'; lens.position.set(-1.4, -0.6, front - 0.2); g.add(lens);
  const lp = (id, geo, m, z, extra) => { const o = new THREE.Group(); o.name = id; o.userData.part = id; const mesh = new THREE.Mesh(geo, m); o.add(mesh); o.position.z = z; o.rotation.x = Math.PI / 2; if (extra) extra(o); lens.add(o); return o; };
  lp('lens_mount_ring', cyl(2.9, 0.5, 48), metal, -0.25);
  lp('lens_barrel', cyl(3.4, 2.0, 48), dark, -1.5);
  lp('lens_zoom_ring', cyl(4.2, 3.2, 48), key, -4.1);
  lp('lens_focus_ring', cyl(4.1, 1.4, 48), key, -6.5);
  lp('lens_red_ring', cyl(4.15, 0.3, 48), mat(0xc0392b), -7.4);
  lp('lens_control_ring', cyl(4.2, 1.2, 48), metal, -8.3);
  lp('lens_front_element', cyl(3.4, 0.2, 48), glass, -9.0);
  lp('lens_af_mf_switch', box(0.3, 0.8, 0.4), key, -3.2, o => { o.position.x = -4.1; o.position.y = 0.8; });
  lp('lens_is_switch', box(0.3, 0.8, 0.4), key, -3.2, o => { o.position.x = -4.1; o.position.y = -0.4; });
  const frontCap = new THREE.Mesh(cyl(4.2, 10.7 - 0.5, 48), dark); frontCap.visible = false; // keeps bbox = spec length
  // simple controls so the guide can demonstrate state even on the placeholder
  const modeDial = g.getObjectByName('mode_dial'), screen = g.getObjectByName('screen'), door = g.getObjectByName('card_slot_cover');
  g.userData.controls = {
    mode_dial: t => { modeDial.rotation.y = -t * Math.PI * 2 * (11 / 12); },
    screen_open: t => { screen.position.x = -2.6 - t * 6.4; screen.rotation.y = -t * Math.PI; },
    card_door_open: t => { door.position.z = 0.8 + t * 3.6; },
    lens_attached: t => { lens.position.z = front - 0.2 - (1 - t) * 6; },
    lens_zoom: t => { lens.getObjectByName('lens_barrel').position.z = -1.5 - t * 2.4; }
  };
  const missing = REQUIRED_PART_IDS.filter(id => !g.getObjectByName(id));
  if (missing.length) throw new Error('placeholder 缺少部件：' + missing.join(', '));
  return g;
}
