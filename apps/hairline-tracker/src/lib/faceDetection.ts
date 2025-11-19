import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let detector: any = null;

export const initFaceDetector = async () => {
  if (!detector) {
    console.log('Initializing face detector...');
    detector = await pipeline('object-detection', 'Xenova/detr-resnet-50', {
      device: 'webgpu',
    });
  }
  return detector;
};

export const detectFaceLandmarks = async (imageUrl: string): Promise<number> => {
  try {
    const detector = await initFaceDetector();
    
    // Load image
    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve) => { img.onload = resolve; });
    
    // Create canvas to measure image dimensions
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(img, 0, 0);
    
    // Detect face
    const result = await detector(imageUrl);
    console.log('Detection result:', result);
    
    if (!result || result.length === 0) {
      throw new Error('No face detected in the image');
    }
    
    // Find the largest face
    const faces = result.filter((r: any) => 
      r.label === 'person' || r.label.includes('face')
    );
    
    if (faces.length === 0) {
      throw new Error('No face detected in the image');
    }
    
    const face = faces.reduce((prev: any, current: any) => 
      (current.score > prev.score) ? current : prev
    );
    
    // Estimate hairline and eyebrow positions based on face bounding box
    // Typical proportions: hairline is at ~10-15% from top of face
    // Eyebrows are at ~25-30% from top of face
    const faceHeight = face.box.ymax - face.box.ymin;
    const hairlineY = face.box.ymin + (faceHeight * 0.12);
    const eyebrowY = face.box.ymin + (faceHeight * 0.28);
    
    // Calculate distance
    const distance = Math.abs(eyebrowY - hairlineY);
    
    console.log('Calculated hairline distance:', distance);
    return distance;
  } catch (error) {
    console.error('Error detecting face landmarks:', error);
    throw error;
  }
};
