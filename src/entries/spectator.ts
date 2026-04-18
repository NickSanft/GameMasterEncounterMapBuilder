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
import { mountShortcutOverlay } from '../ui/shortcut-overlay.js';
import { createPingManager } from '../state/ping-manager.js';
import { createMeasurementOverlayRef } from '../input/context.js';
import { createMeasureTool } from '../input/tool-measure.js';
import {
  zoomBy,
  fitToContent,
  resetCamera,
  ZOOM_BUTTON_STEP,
} from '../render/camera-controls.js';
import { isEditableFocus } from '../util/focus.js';
import type { PanZoomHandle } from '../input/pan-zoom.js';

const canvasEl = document.getElementById('canvas');
if (!(canvasEl instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element #canvas not found');
}
const canvas: HTMLCanvasElement = canvasEl;

const preferences = createPreferences();
applyPrefsToBody(preferences.get());

const initial = loadPersistedState();
const store = createStore(initial ?? undefined);

const imageLoader = createImageLoader(() => renderer.requestRender());
const pingManager = createPingManager(() => renderer.requestRender());
const measurementOverlayRef = createMeasurementOverlayRef();

const initialCamera = (preferences.get().persistCamera && loadCamera('spectator')) || { ...DEFAULT_CAMERA };

const panZoomRef: { handle: PanZoomHandle | null } = { handle: null };

const renderer = createRenderer({
  canvas,
  mode: 'spectator',
  camera: initialCamera,
  getState: () => store.getState(),
  getImage: (id) => imageLoader.get(id),
  getPreferences: () => preferences.get(),
  getPings: () => pingManager.getActive(),
  getMeasurement: () => measurementOverlayRef.current,
});

panZoomRef.handle = attachPanZoom(renderer);

const measureTool = createMeasureTool({
  canvas,
  renderer,
  measurementOverlay: measurementOverlayRef,
  isSpaceHeld: () => panZoomRef.handle?.isSpaceHeld() ?? false,
});

const FOLLOW_PAUSE_MS = 2000;

let applyingRemoteCamera = false;
let pauseFollowUntil = 0;

const persistCameraDebounced = debounce(() => {
  if (preferences.get().persistCamera) saveCamera('spectator', renderer.camera);
}, 400);

renderer.onCameraChange(() => {
  persistCameraDebounced();
  if (!applyingRemoteCamera) {
    pauseFollowUntil = Date.now() + FOLLOW_PAUSE_MS;
  }
});

preferences.subscribe((prefs) => {
  applyPrefsToBody(prefs);
  renderer.requestRender();
  if (!prefs.persistCamera) clearCamera('spectator');
  else persistCameraDebounced();
});

function applyRemoteCamera(camera: { x: number; y: number; zoom: number }) {
  if (!preferences.get().followGmCamera) return;
  if (Date.now() < pauseFollowUntil) return;
  applyingRemoteCamera = true;
  renderer.camera = { x: camera.x, y: camera.y, zoom: camera.zoom };
  applyingRemoteCamera = false;
}

const settingsModal = mountSettingsModal({
  viewMode: 'spectator',
  preferences,
  store,
});

const shortcutOverlay = mountShortcutOverlay('spectator');

let rulerActive = false;
const rulerBtn = mountSpectatorToolbar(() => setRulerActive(!rulerActive));

function setRulerActive(active: boolean) {
  if (active === rulerActive) return;
  rulerActive = active;
  if (active) {
    measureTool.activate();
  } else {
    measureTool.deactivate();
  }
  rulerBtn.classList.toggle('active', active);
  rulerBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
  canvas.style.cursor = active ? 'crosshair' : '';
}

mountSpectatorMenu({
  onSettings: () => settingsModal.open(),
  onShortcuts: () => shortcutOverlay.open(),
});

mountZoomControls(document.body, {
  onZoomIn: () => zoomBy(renderer, ZOOM_BUTTON_STEP),
  onZoomOut: () => zoomBy(renderer, 1 / ZOOM_BUTTON_STEP),
  onFit: () => fitToContent(renderer, store.getState(), (id) => imageLoader.get(id)),
  onReset: () => resetCamera(renderer),
});

const persist = debounce(() => saveState(store.getState()), 200);

function updateCanvasLabel() {
  if (!canvas) return;
  const state = store.getState();
  const tokenCount = state.tokens.length;
  const total = state.grid.cols * state.grid.rows;
  let revealed = 0;
  for (let i = 0; i < state.fog.length; i++) if (state.fog[i] === 1) revealed++;
  const pct = total > 0 ? Math.round((revealed / total) * 100) : 0;
  const visibleTokens = state.tokens.filter((t) => {
    const gx = Math.floor(t.x);
    const gy = Math.floor(t.y);
    if (gx < 0 || gy < 0 || gx >= state.grid.cols || gy >= state.grid.rows) return false;
    return state.fog[gy * state.grid.cols + gx] === 1;
  }).length;
  const tokenLabel = visibleTokens === 1 ? '1 token' : `${visibleTokens} tokens`;
  canvas.setAttribute(
    'aria-label',
    `Spectator battle map. ${tokenLabel} visible. ${pct}% of map revealed. ${tokenCount} total tokens in session.`,
  );
}

const updateCanvasLabelDebounced = debounce(updateCanvasLabel, 250);
updateCanvasLabel();

store.subscribe((patch) => {
  renderer.requestRender();
  persist();
  updateCanvasLabelDebounced();
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
    } else if (msg.type === 'camera') {
      applyRemoteCamera(msg.camera);
    } else if (msg.type === 'ping') {
      pingManager.add(msg.x, msg.y, msg.color);
    }
  });
  channel.send({ type: 'hello', from: 'spectator' });
} else {
  showSyncWarning();
}

preferences.subscribe((prefs) => {
  if (prefs.followGmCamera && channel) {
    pauseFollowUntil = 0;
    channel.send({ type: 'request-camera' });
  }
});

window.addEventListener('keydown', (e) => {
  if (isEditableFocus(e.target)) return;
  if (e.key === '?') {
    shortcutOverlay.toggle();
    e.preventDefault();
    return;
  }
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
  if (e.key.toLowerCase() === 'l') {
    setRulerActive(!rulerActive);
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape' && rulerActive) {
    setRulerActive(false);
    e.preventDefault();
  }
});

window.addEventListener('beforeunload', () => {
  persist.flush();
  persistCameraDebounced.flush();
});

function mountSpectatorToolbar(onRuler: () => void): HTMLButtonElement {
  const bar = document.createElement('div');
  bar.className = 'gm-toolbar spectator-toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Spectator tools');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Ruler (L)';
  btn.title = 'Drag to measure distance in grid squares.';
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', 'Ruler — drag to measure distance');
  btn.addEventListener('click', () => {
    onRuler();
    btn.blur();
  });
  bar.appendChild(btn);

  document.body.appendChild(bar);
  return btn;
}

function mountSpectatorMenu(actions: { onSettings: () => void; onShortcuts: () => void }) {
  const menu = document.createElement('div');
  menu.className = 'session-menu';
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', 'Spectator menu');

  const shortcutsBtn = document.createElement('button');
  shortcutsBtn.type = 'button';
  shortcutsBtn.textContent = 'Shortcuts';
  shortcutsBtn.title = 'Show keyboard shortcuts (?)';
  shortcutsBtn.addEventListener('click', () => {
    shortcutsBtn.blur();
    actions.onShortcuts();
  });

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.textContent = 'Settings';
  settingsBtn.title = 'Open settings panel';
  settingsBtn.addEventListener('click', () => {
    settingsBtn.blur();
    actions.onSettings();
  });

  menu.appendChild(shortcutsBtn);
  menu.appendChild(settingsBtn);
  document.body.appendChild(menu);
}

function applyPrefsToBody(prefs: {
  reducedMotion: boolean;
  highContrast: boolean;
  theme: 'dark' | 'light';
}) {
  document.body.classList.toggle('reduced-motion', prefs.reducedMotion);
  document.body.classList.toggle('high-contrast', prefs.highContrast);
  document.body.classList.toggle('theme-light', prefs.theme === 'light');
}

function showSyncWarning() {
  const banner = document.createElement('div');
  banner.className = 'sync-warning';
  banner.textContent =
    'Live sync unavailable in this browser (likely private mode). Refresh to see updates.';
  document.body.appendChild(banner);
}
