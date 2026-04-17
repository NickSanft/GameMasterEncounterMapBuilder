import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { DEFAULT_CAMERA, DEFAULT_GRID } from '../state/types.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #canvas not found');

const renderer = createRenderer({
  canvas,
  mode: 'spectator',
  camera: { ...DEFAULT_CAMERA },
  grid: { ...DEFAULT_GRID },
});

attachPanZoom(renderer);
