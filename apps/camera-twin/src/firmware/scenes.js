// What the lens is looking at. Photos are CC-licensed (public/scenes/CREDITS.md); faces/eyes are hand-annotated in normalized coords.
export const SCENES = {
  landscape: { id: 'landscape', name: '湖边风景（默认）', src: null, sceneEV: 13, faces: [] },
  kid: { id: 'kid', name: '大笑的孩子', src: './scenes/kid.jpg', sceneEV: 9, faces: [{ box: [0.40, 0.30, 0.48, 0.46], eyes: [[0.60, 0.455], [0.76, 0.44]], near: 1 }] },
  lowkey: { id: 'lowkey', name: '暗处的男孩', src: './scenes/lowkey.jpg', sceneEV: 6, faces: [{ box: [0.15, 0.09, 0.29, 0.54], eyes: [[0.275, 0.32], [0.33, 0.32]], near: 1 }] },
  backlit: { id: 'backlit', name: '窗边逆光', src: './scenes/backlit.jpg', sceneEV: 12, backlit: { faceStops: -2.2 }, faces: [{ box: [0.09, 0.50, 0.24, 0.45], eyes: [[0.30, 0.62], [0.32, 0.61]], near: 1 }, { box: [0.50, 0.15, 0.22, 0.35], eyes: [[0.555, 0.285], [0.59, 0.28]], near: 0 }] }
};
export const SCENE_IDS = Object.keys(SCENES);
