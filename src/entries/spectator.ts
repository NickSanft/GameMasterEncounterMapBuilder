import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { createSyncChannel } from '../sync/channel.js';
import { deserializeState, fromSerializablePatch } from '../sync/messages.js';
import { loadPersistedState, saveState } from '../state/persistence.js';
import { debounce } from '../util/debounce.js';
import { createImageLoader } from '../images/loader.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #canvas not found');

const initial = loadPersistedState();
const store = createStore(initial ?? undefined);

const imageLoader = createImageLoader(() => renderer.requestRender());

const renderer = createRenderer({
  canvas,
  mode: 'spectator',
  camera: { ...DEFAULT_CAMERA },
  getState: () => store.getState(),
  getImage: (id) => imageLoader.get(id),
});

attachPanZoom(renderer);

const persist = debounce(() => saveState(store.getState()), 200);

store.subscribe((patch) => {
  renderer.requestRender();
  persist();
  if (patch?.kind === 'token-update' && patch.changes.imageId) {
    imageLoader.invalidate(patch.changes.imageId);
  } else if (patch?.kind === 'background-update' && patch.changes.imageId) {
    imageLoader.invalidate(patch.changes.imageId);
  }
});

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

window.addEventListener('beforeunload', () => persist.flush());

function showSyncWarning() {
  const banner = document.createElement('div');
  banner.className = 'sync-warning';
  banner.textContent =
    'Live sync unavailable in this browser (likely private mode). Refresh to see updates.';
  document.body.appendChild(banner);
}
