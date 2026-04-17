import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { createSelectionState } from '../input/context.js';
import { createToolManager } from '../input/tool-manager.js';
import { createSelectTool } from '../input/tool-select.js';
import { createTokenTool } from '../input/tool-token.js';
import {
  createFogTool,
  createFogPreviewRef,
  createFogOptionsRef,
  createFogHoverRef,
} from '../input/tool-fog.js';
import { createBackgroundTool } from '../input/tool-background.js';
import { mountToolbar } from '../ui/toolbar.js';
import { mountSessionMenu } from '../ui/session-menu.js';
import { mountTokenEditor } from '../ui/token-editor.js';
import { mountFogSettings } from '../ui/fog-settings.js';
import { mountSettingsModal } from '../ui/settings-modal.js';
import { mountZoomControls } from '../ui/zoom-controls.js';
import { createSyncChannel } from '../sync/channel.js';
import { serializeState, toSerializablePatch } from '../sync/messages.js';
import { loadPersistedState, saveState } from '../state/persistence.js';
import { exportSession, importSession } from '../state/export.js';
import { createPreferences } from '../state/preferences.js';
import { loadCamera, saveCamera, clearCamera } from '../state/camera-persistence.js';
import { debounce, rafThrottle } from '../util/debounce.js';
import { createImageLoader } from '../images/loader.js';
import { putImage } from '../images/store.js';
import { hitTestToken } from '../input/hit-test.js';
import { screenToWorld } from '../render/coords.js';
import { duplicateTokens } from '../state/token-clipboard.js';
import type { Token } from '../state/types.js';
import { mountPresetBackgroundsModal } from '../ui/preset-backgrounds-modal.js';
import { resolvePresetUrl } from '../state/preset-backgrounds.js';
import {
  zoomBy,
  fitToContent,
  resetCamera,
  ZOOM_BUTTON_STEP,
} from '../render/camera-controls.js';
import type { PanZoomHandle } from '../input/pan-zoom.js';
import { EXPORT_FILENAME_PREFIX } from '../util/constants.js';
import { isEditableFocus } from '../util/focus.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #canvas not found');

const preferences = createPreferences();
applyPrefsToBody(preferences.get());

const initial = loadPersistedState();
const store = createStore(initial ?? undefined);
const selection = createSelectionState();
const fogPreviewRef = createFogPreviewRef();
const fogOptionsRef = createFogOptionsRef();
const fogHoverRef = createFogHoverRef();

const panZoomRef: { handle: PanZoomHandle | null } = { handle: null };

const imageLoader = createImageLoader(() => renderer.requestRender());

const initialCamera = (preferences.get().persistCamera && loadCamera('gm')) || { ...DEFAULT_CAMERA };

const renderer = createRenderer({
  canvas,
  mode: 'gm',
  camera: initialCamera,
  getState: () => store.getState(),
  getHighlightIds: () => selection.ids,
  getFogPreview: () => fogPreviewRef.current,
  getFogHoverPreview: () => fogHoverRef.current,
  getImage: (id) => imageLoader.get(id),
  getPreferences: () => preferences.get(),
});

panZoomRef.handle = attachPanZoom(renderer);

const persistCameraDebounced = debounce(() => {
  if (preferences.get().persistCamera) saveCamera('gm', renderer.camera);
}, 400);
renderer.onCameraChange(persistCameraDebounced);

preferences.subscribe((prefs) => {
  applyPrefsToBody(prefs);
  renderer.requestRender();
  if (!prefs.persistCamera) clearCamera('gm');
  else persistCameraDebounced();
});

const inputContext = {
  canvas,
  renderer,
  store,
  selection,
  isSpaceHeld: () => panZoomRef.handle?.isSpaceHeld() ?? false,
  setWheelEnabled: (enabled: boolean) => panZoomRef.handle?.setWheelEnabled(enabled),
};

const toolManager = createToolManager(canvas);
toolManager.register(createSelectTool(inputContext));
toolManager.register(createTokenTool(inputContext));
toolManager.register(createFogTool(inputContext, 'reveal', fogPreviewRef, fogOptionsRef, fogHoverRef));
toolManager.register(createFogTool(inputContext, 'hide', fogPreviewRef, fogOptionsRef, fogHoverRef));
toolManager.register(createBackgroundTool(inputContext));

const toolbarHandle = mountToolbar(
  document.body,
  toolManager,
  [
    { id: 'select', label: 'Select (S)', title: 'Click tokens to select. Drag to move. Right-click to edit.' },
    { id: 'token', label: 'Token (T)', title: 'Click a cell to place a token.' },
    { id: 'fog-reveal', label: 'Reveal (R)', title: 'Drag to reveal cells.' },
    { id: 'fog-hide', label: 'Hide (H)', title: 'Drag to hide cells.' },
    { id: 'background', label: 'Map (M)', title: 'Drag to move the background, wheel to scale.' },
  ],
  [
    {
      id: 'undo',
      label: '↶ Undo',
      title: 'Undo (Ctrl/Cmd+Z)',
      onClick: () => store.undo(),
      isEnabled: () => store.canUndo(),
    },
    {
      id: 'redo',
      label: '↷ Redo',
      title: 'Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)',
      onClick: () => store.redo(),
      isEnabled: () => store.canRedo(),
    },
  ],
);

toolManager.setActive('select');

mountFogSettings(document.body, fogOptionsRef, toolManager);

mountZoomControls(document.body, {
  onZoomIn: () => zoomBy(renderer, ZOOM_BUTTON_STEP),
  onZoomOut: () => zoomBy(renderer, 1 / ZOOM_BUTTON_STEP),
  onFit: () => fitToContent(renderer, store.getState(), (id) => imageLoader.get(id)),
  onReset: () => resetCamera(renderer),
});

const settingsModal = mountSettingsModal({
  viewMode: 'gm',
  preferences,
  store,
});

async function applyBackgroundBlob(blob: Blob, mimeType: string) {
  const { width, height } = await readBlobImageDimensions(blob);
  const id = await putImage(blob, mimeType);
  imageLoader.invalidate(id);
  const { grid } = store.getState();
  const gridW = grid.cols * grid.cellSize;
  const gridH = grid.rows * grid.cellSize;
  const scaleX = gridW / width;
  const scaleY = gridH / height;
  store.applyPatch({
    kind: 'background-update',
    changes: { imageId: id, offsetX: 0, offsetY: 0, scaleX, scaleY },
  });
}

const presetBackgroundsModal = mountPresetBackgroundsModal({
  onPick: async (preset) => {
    try {
      const url = resolvePresetUrl(preset);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      await applyBackgroundBlob(blob, blob.type || 'image/svg+xml');
    } catch (err) {
      console.error('[gm] preset background load failed', err);
      window.alert('Failed to load preset map.');
    }
  },
});

mountSessionMenu(document.body, {
  onNewSession: () => {
    store.resetSession();
  },
  onUploadBackground: async (file) => {
    try {
      await applyBackgroundBlob(file, file.type || 'image/png');
    } catch (err) {
      console.error('[gm] upload background failed', err);
      window.alert('Failed to upload background image.');
    }
  },
  onPresetBackground: () => presetBackgroundsModal.open(),
  onExport: async () => {
    try {
      const json = await exportSession(store.getState());
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${EXPORT_FILENAME_PREFIX}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[gm] export failed', err);
      window.alert('Failed to export session.');
    }
  },
  onImport: async (file) => {
    try {
      const text = await file.text();
      const { state, imageIds } = await importSession(text);
      for (const id of imageIds) imageLoader.invalidate(id);
      selection.ids = new Set();
      store.applyPatch({ kind: 'session-reset', state });
    } catch (err) {
      console.error('[gm] import failed', err);
      window.alert('Failed to import session. Check the file is a valid export.');
    }
  },
  onSettings: () => settingsModal.open(),
});

const tokenEditor = mountTokenEditor({
  store,
  selection,
  imageLoader,
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const world = screenToWorld(
    renderer.camera,
    e.clientX - rect.left,
    e.clientY - rect.top,
  );
  const state = store.getState();
  const hit = hitTestToken(state.tokens, state.grid, world.x, world.y);
  if (hit) {
    selection.ids = new Set([hit.id]);
    renderer.requestRender();
    tokenEditor.openFor(hit);
  }
});

const channel = createSyncChannel();

function sendCameraIfBroadcasting() {
  if (channel && preferences.get().broadcastCamera) {
    channel.send({ type: 'camera', camera: renderer.camera });
  }
}

if (channel) {
  channel.onMessage((msg) => {
    if (msg.type === 'hello' && msg.from === 'spectator') {
      channel.send({ type: 'full-state', state: serializeState(store.getState()) });
      sendCameraIfBroadcasting();
    } else if (msg.type === 'request-full-state') {
      channel.send({ type: 'full-state', state: serializeState(store.getState()) });
      sendCameraIfBroadcasting();
    } else if (msg.type === 'request-camera') {
      sendCameraIfBroadcasting();
    }
  });
  channel.send({ type: 'full-state', state: serializeState(store.getState()) });
}

const broadcastCameraThrottled = rafThrottle(sendCameraIfBroadcasting);
renderer.onCameraChange(broadcastCameraThrottled);

const persist = debounce(() => saveState(store.getState()), 200);

function updateCanvasLabel() {
  if (!canvas) return;
  const state = store.getState();
  const tokenCount = state.tokens.length;
  const total = state.grid.cols * state.grid.rows;
  let revealed = 0;
  for (let i = 0; i < state.fog.length; i++) if (state.fog[i] === 1) revealed++;
  const pct = total > 0 ? Math.round((revealed / total) * 100) : 0;
  const tokenLabel = tokenCount === 1 ? '1 token' : `${tokenCount} tokens`;
  canvas.setAttribute(
    'aria-label',
    `GM battle map. ${tokenLabel} placed. ${pct}% of fog revealed.`,
  );
}

const updateCanvasLabelDebounced = debounce(updateCanvasLabel, 250);
updateCanvasLabel();

store.subscribe((patch) => {
  renderer.requestRender();
  persist();
  toolbarHandle.refreshActions();
  updateCanvasLabelDebounced();
  if (!channel) return;
  if (patch) {
    channel.send({ type: 'patch', patch: toSerializablePatch(patch) });
  } else {
    channel.send({ type: 'full-state', state: serializeState(store.getState()) });
  }
});

let tokenClipboard: Token[] = [];

function selectedTokens(): Token[] {
  const state = store.getState();
  return state.tokens.filter((t) => selection.ids.has(t.id));
}

function copySelection(): boolean {
  const sel = selectedTokens();
  if (sel.length === 0) return false;
  tokenClipboard = sel.map((t) => ({ ...t }));
  return true;
}

function pasteClipboard(): boolean {
  if (tokenClipboard.length === 0) return false;
  const copies = duplicateTokens(tokenClipboard);
  for (const token of copies) {
    store.applyPatch({ kind: 'token-add', token });
  }
  selection.ids = new Set(copies.map((t) => t.id));
  renderer.requestRender();
  return true;
}

function cutSelection(): boolean {
  if (!copySelection()) return false;
  for (const id of selection.ids) {
    store.applyPatch({ kind: 'token-remove', id });
  }
  selection.ids = new Set();
  renderer.requestRender();
  return true;
}

function duplicateSelection(): boolean {
  const sel = selectedTokens();
  if (sel.length === 0) return false;
  const copies = duplicateTokens(sel);
  for (const token of copies) {
    store.applyPatch({ kind: 'token-add', token });
  }
  selection.ids = new Set(copies.map((t) => t.id));
  renderer.requestRender();
  return true;
}

window.addEventListener('keydown', (e) => {
  if (isEditableFocus(e.target)) return;

  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    if (key === 'z') {
      if (e.shiftKey) store.redo();
      else store.undo();
      e.preventDefault();
      return;
    }
    if (key === 'y') {
      store.redo();
      e.preventDefault();
      return;
    }
    if (key === 'c') {
      if (copySelection()) e.preventDefault();
      return;
    }
    if (key === 'v') {
      if (pasteClipboard()) e.preventDefault();
      return;
    }
    if (key === 'x') {
      if (cutSelection()) e.preventDefault();
      return;
    }
    if (key === 'd') {
      if (duplicateSelection()) e.preventDefault();
      return;
    }
    return;
  }

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

  if (e.altKey || e.shiftKey) return;

  switch (e.key.toLowerCase()) {
    case 's':
      toolManager.setActive('select');
      e.preventDefault();
      break;
    case 't':
      toolManager.setActive('token');
      e.preventDefault();
      break;
    case 'r':
      toolManager.setActive('fog-reveal');
      e.preventDefault();
      break;
    case 'h':
      toolManager.setActive('fog-hide');
      e.preventDefault();
      break;
    case 'm':
      toolManager.setActive('background');
      e.preventDefault();
      break;
  }
});

window.addEventListener('beforeunload', () => {
  persist.flush();
  persistCameraDebounced.flush();
});

function applyPrefsToBody(prefs: { reducedMotion: boolean; highContrast: boolean }) {
  document.body.classList.toggle('reduced-motion', prefs.reducedMotion);
  document.body.classList.toggle('high-contrast', prefs.highContrast);
}

function readBlobImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    img.src = url;
  });
}
