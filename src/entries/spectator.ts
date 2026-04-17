import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #canvas not found');

const store = createStore();

const renderer = createRenderer({
  canvas,
  mode: 'spectator',
  camera: { ...DEFAULT_CAMERA },
  getState: () => store.getState(),
});

attachPanZoom(renderer);

store.subscribe(() => renderer.requestRender());
