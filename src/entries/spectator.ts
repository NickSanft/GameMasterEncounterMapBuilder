import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { createSyncChannel } from '../sync/channel.js';
import { deserializeState, fromSerializablePatch } from '../sync/messages.js';
import {
  loadPersistedState,
  saveState,
  saveStateSync,
} from '../state/persistence.js';
import { debounce, rafThrottle } from '../util/debounce.js';
import { createImageLoader } from '../images/loader.js';
import { createPreferences } from '../state/preferences.js';
import { loadCamera, saveCamera, clearCamera } from '../state/camera-persistence.js';
import { mountSettingsModal } from '../ui/settings-modal.js';
import { mountZoomControls } from '../ui/zoom-controls.js';
import { mountShortcutOverlay } from '../ui/shortcut-overlay.js';
import { mountInitiativeBar } from '../ui/initiative-bar.js';
import { mountDiagnosticsOverlay } from '../ui/diagnostics-overlay.js';
import { mountHelpOverlay } from '../ui/help-overlay.js';
import { mountDicePanel } from '../ui/dice-panel.js';
import { mountMiniMap } from '../ui/mini-map.js';
import { createPingManager } from '../state/ping-manager.js';
import { createMeasurementOverlayRef } from '../input/context.js';
import { createMeasureTool, createRulerToolOptionsRef } from '../input/tool-measure.js';
import { mountRulerSettings } from '../ui/ruler-settings.js';
import { RULER_PRESETS } from '../state/ruler.js';
import { viewportFromCamera } from '../render/viewport.js';
import {
  zoomBy,
  fitToContent,
  resetCamera,
  ZOOM_BUTTON_STEP,
} from '../render/camera-controls.js';
import { isEditableFocus } from '../util/focus.js';
import { createAnnouncer } from '../util/announcer.js';
import { registerPwa } from '../util/pwa.js';
import { mountStatusBanners } from '../ui/status-banners.js';
import { createFogWorkerClient } from '../render/fog-worker-client.js';
import FogWorker from '../render/fog-worker.js?worker';
import {
  collectSightWalls,
  collectViewers,
  spectatorEffectiveFog,
} from '../state/los-compose.js';
import type { PanZoomHandle } from '../input/pan-zoom.js';

const canvasEl = document.getElementById('canvas');
if (!(canvasEl instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element #canvas not found');
}
const canvas: HTMLCanvasElement = canvasEl;

const preferences = createPreferences();
applyPrefsToBody(preferences.get());

const announcer = createAnnouncer();

const fogWorkerClient = createFogWorkerClient({
  workerFactory: () => new FogWorker(),
});

// Start with default state; hydrate from IDB (with LS fallback) as
// soon as the async load resolves. Spectator typically receives a
// full-state message from the GM shortly after, but this lets a
// standalone Spectator tab preserve its last-seen state across reloads.
const store = createStore();
void loadPersistedState().then((persisted) => {
  if (persisted) store.loadState(persisted);
});

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
  getRulerTargetFeet: () => rulerToolOptionsRef.current.targetFeet,
  getFogRects: () => fogWorkerClient.getLatest(),
});

fogWorkerClient.onUpdate(() => renderer.requestRender());

function refreshLos(): void {
  const state = store.getState();
  if (preferences.get().losMode === 'off') return;
  fogWorkerClient.requestLos(
    collectViewers(state.tokens, state.grid),
    collectSightWalls(state.walls),
  );
}

function refreshFogRects(): void {
  const state = store.getState();
  const losOn = preferences.get().losMode !== 'off';
  const polygons = fogWorkerClient.getLatestPolygons();
  const fog = spectatorEffectiveFog(state, polygons, losOn);
  fogWorkerClient.request(fog, state.grid.cols, state.grid.rows);
}

// When LoS polygons change, the effective fog changes too — rebuild.
fogWorkerClient.onLosUpdate(() => {
  refreshFogRects();
  renderer.requestRender();
});

refreshLos();
refreshFogRects();

panZoomRef.handle = attachPanZoom(renderer);

const rulerToolOptionsRef = createRulerToolOptionsRef();
const measureTool = createMeasureTool({
  canvas,
  renderer,
  measurementOverlay: measurementOverlayRef,
  isSpaceHeld: () => panZoomRef.handle?.isSpaceHeld() ?? false,
  isPinching: () => panZoomRef.handle?.isPinching() ?? false,
  rulerOptions: rulerToolOptionsRef,
  getFeetPerSquare: () => preferences.get().feetPerSquare,
  getCellSize: () => store.getState().grid.cellSize,
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
  diagnosticsOverlay?.setEnabled(prefs.showDiagnostics);
  miniMap?.setEnabled(prefs.showMiniMap);
  // losMode change: re-run LoS + rebuild effective fog so the
  // Spectator canvas reacts to the toggle without needing a reload.
  refreshLos();
  refreshFogRects();
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
mountInitiativeBar(store, 'spectator');
mountHelpOverlay('spectator');
const dicePanel = mountDicePanel({
  viewMode: 'spectator',
  onLocalRoll: (roll) => {
    channel?.send({ type: 'dice-roll', roll });
    announcer.announce(`You rolled ${roll.source}: ${roll.total}.`);
  },
});

let rulerActive = false;
const rulerBtn = mountSpectatorToolbar(() => setRulerActive(!rulerActive));
const rulerSettings = mountRulerSettings(document.body, rulerToolOptionsRef);

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
  rulerSettings.setVisible(active);
  announcer.announce(active ? 'Ruler tool active.' : 'Ruler tool off.');
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

const persist = debounce(() => {
  void saveState(store.getState());
}, 200);

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
  refreshLos();
  refreshFogRects();
  if (patch?.kind === 'token-update' && patch.changes.imageId) {
    imageLoader.invalidate(patch.changes.imageId);
  } else if (patch?.kind === 'background-update' && patch.changes.imageId) {
    imageLoader.invalidate(patch.changes.imageId);
  }
});

const channel = createSyncChannel();

function broadcastViewport() {
  if (!channel) return;
  const viewport = viewportFromCamera(
    renderer.camera,
    renderer.cssWidth,
    renderer.cssHeight,
  );
  if (viewport.width <= 0 || viewport.height <= 0) return;
  channel.send({ type: 'spectator-viewport', viewport });
}

const broadcastViewportThrottled = rafThrottle(broadcastViewport);

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
    } else if (msg.type === 'hello' && msg.from === 'gm') {
      // GM just loaded — (re)announce our viewport so the indicator appears.
      broadcastViewportThrottled();
    } else if (msg.type === 'dice-roll') {
      dicePanel.pushRemoteRoll(msg.roll);
      if (msg.roll.from !== 'spectator') {
        announcer.announce(`GM rolled ${msg.roll.source}: ${msg.roll.total}.`);
      }
    }
  });
  channel.send({ type: 'hello', from: 'spectator' });
  broadcastViewportThrottled();
} else {
  showSyncWarning();
}

renderer.onCameraChange(broadcastViewportThrottled);
window.addEventListener('resize', broadcastViewportThrottled);

const diagnosticsOverlay = mountDiagnosticsOverlay({
  renderer,
  store,
  viewMode: 'spectator',
});
diagnosticsOverlay.setEnabled(preferences.get().showDiagnostics);

const miniMap = mountMiniMap({
  renderer,
  store,
  viewMode: 'spectator',
  getImage: (id) => imageLoader.get(id),
});
miniMap.setEnabled(preferences.get().showMiniMap);

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
  // Ruler preset hotkeys mirror the GM bindings.
  if (rulerActive && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    const preset = RULER_PRESETS.find((p) => p.shortcut === e.key);
    if (preset) {
      rulerToolOptionsRef.current = {
        ...rulerToolOptionsRef.current,
        targetFeet: preset.feet,
      };
      rulerSettings.sync();
      renderer.requestRender();
      e.preventDefault();
    }
  }
});

const statusBanners = mountStatusBanners();
registerPwa({
  onUpdateReady: (reload) => {
    statusBanners.show({
      message: 'A new version of GM Encounter Maps is available.',
      variant: 'info',
      dismissible: true,
      actionLabel: 'Reload to update',
      onAction: () => reload(),
      onDismiss: () => statusBanners.hide(),
    });
    announcer.announce('Update available — reload to apply.', 'assertive');
  },
});

window.addEventListener('beforeunload', () => {
  persist.flush();
  saveStateSync(store.getState());
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
