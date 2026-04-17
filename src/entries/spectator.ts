import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { createSyncChannel } from '../sync/channel.js';
import { deserializeState, fromSerializablePatch } from '../sync/messages.js';
import { loadPersistedState, saveState } from '../state/persistence.js';
import { debounce } from '../util/debounce.js';
import { createImageLoader } from '../images/loader.js';
import { createPreferences } from '../state/preferences.js';
import { loadCamera, saveCamera, clearCamera } from '../state/camera-persistence.js';
import { mountSettingsModal } from '../ui/settings-modal.js';
import { mountZoomControls } from '../ui/zoom-controls.js';
import {
  zoomBy,
  fitToContent,
  resetCamera,
  ZOOM_BUTTON_STEP,
} from '../render/camera-controls.js';
import { isEditableFocus } from '../util/focus.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #canvas not found');

const preferences = createPreferences();
applyPrefsToBody(preferences.get());

const initial = loadPersistedState();
const store = createStore(initial ?? undefined);

const imageLoader = createImageLoader(() => renderer.requestRender());

const initialCamera = (preferences.get().persistCamera && loadCamera('spectator')) || { ...DEFAULT_CAMERA };

const renderer = createRenderer({
  canvas,
  mode: 'spectator',
  camera: initialCamera,
  getState: () => store.getState(),
  getImage: (id) => imageLoader.get(id),
  getPreferences: () => preferences.get(),
});

attachPanZoom(renderer);

const persistCameraDebounced = debounce(() => {
  if (preferences.get().persistCamera) saveCamera('spectator', renderer.camera);
}, 400);
renderer.onCameraChange(persistCameraDebounced);

preferences.subscribe((prefs) => {
  applyPrefsToBody(prefs);
  renderer.requestRender();
  if (!prefs.persistCamera) clearCamera('spectator');
  else persistCameraDebounced();
});

const settingsModal = mountSettingsModal({
  viewMode: 'spectator',
  preferences,
  store,
});

mountSpectatorMenu(() => settingsModal.open());

mountZoomControls(document.body, {
  onZoomIn: () => zoomBy(renderer, ZOOM_BUTTON_STEP),
  onZoomOut: () => zoomBy(renderer, 1 / ZOOM_BUTTON_STEP),
  onFit: () => fitToContent(renderer, store.getState(), (id) => imageLoader.get(id)),
  onReset: () => resetCamera(renderer),
});

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

window.addEventListener('keydown', (e) => {
  if (isEditableFocus(e.target)) return;
  if (e.ctrlKey || e.metaKey) return;
  if (e.key === '+' || e.key === '=') {
    zoomBy(renderer, ZOOM_BUTTON_STEP);
    e.preventDefault();
    return;
  }
  if (e.key === '-' || e.key === '_') {
    zoomBy(renderer, 1 / ZOOM_BUTTON_STEP);
    e.preventDefault();
    return;
  }
  if (e.key === '0') {
    resetCamera(renderer);
    e.preventDefault();
    return;
  }
  if (e.key.toLowerCase() === 'f') {
    fitToContent(renderer, store.getState(), (id) => imageLoader.get(id));
    e.preventDefault();
    return;
  }
});

window.addEventListener('beforeunload', () => {
  persist.flush();
  persistCameraDebounced.flush();
});

function mountSpectatorMenu(onSettings: () => void) {
  const menu = document.createElement('div');
  menu.className = 'session-menu';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Settings';
  btn.title = 'Open settings panel';
  btn.addEventListener('click', () => {
    btn.blur();
    onSettings();
  });
  menu.appendChild(btn);
  document.body.appendChild(menu);
}

function applyPrefsToBody(prefs: { reducedMotion: boolean; highContrast: boolean }) {
  document.body.classList.toggle('reduced-motion', prefs.reducedMotion);
  document.body.classList.toggle('high-contrast', prefs.highContrast);
}

function showSyncWarning() {
  const banner = document.createElement('div');
  banner.className = 'sync-warning';
  banner.textContent =
    'Live sync unavailable in this browser (likely private mode). Refresh to see updates.';
  document.body.appendChild(banner);
}
