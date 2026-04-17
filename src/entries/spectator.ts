import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { createSyncChannel } from '../sync/channel.js';
import { deserializeState, fromSerializablePatch } from '../sync/messages.js';

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

const channel = createSyncChannel();
if (channel) {
  channel.onMessage((msg) => {
    if (msg.type === 'full-state') {
      store.loadState(deserializeState(msg.state));
    } else if (msg.type === 'patch') {
      store.applyPatch(fromSerializablePatch(msg.patch));
    }
  });
  channel.send({ type: 'hello', from: 'spectator' });
} else {
  showSyncWarning();
}

function showSyncWarning() {
  const banner = document.createElement('div');
  banner.className = 'sync-warning';
  banner.textContent =
    'Live sync unavailable in this browser (likely private mode). Refresh to see updates.';
  document.body.appendChild(banner);
}
