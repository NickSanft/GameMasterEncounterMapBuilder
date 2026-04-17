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
} from '../input/tool-fog.js';
import { createBackgroundTool } from '../input/tool-background.js';
import { mountToolbar } from '../ui/toolbar.js';
import { mountSessionMenu } from '../ui/session-menu.js';
import { mountTokenEditor } from '../ui/token-editor.js';
import { mountFogSettings } from '../ui/fog-settings.js';
import { createSyncChannel } from '../sync/channel.js';
import { serializeState, toSerializablePatch } from '../sync/messages.js';
import { loadPersistedState, saveState } from '../state/persistence.js';
import { exportSession, importSession } from '../state/export.js';
import { debounce } from '../util/debounce.js';
import { createImageLoader } from '../images/loader.js';
import { putImage } from '../images/store.js';
import { hitTestToken } from '../input/hit-test.js';
import { screenToWorld } from '../render/coords.js';
import type { PanZoomHandle } from '../input/pan-zoom.js';
import { EXPORT_FILENAME_PREFIX } from '../util/constants.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #canvas not found');

const initial = loadPersistedState();
const store = createStore(initial ?? undefined);
const selection = createSelectionState();
const fogPreviewRef = createFogPreviewRef();
const fogOptionsRef = createFogOptionsRef();

const panZoomRef: { handle: PanZoomHandle | null } = { handle: null };

const imageLoader = createImageLoader(() => renderer.requestRender());

const renderer = createRenderer({
  canvas,
  mode: 'gm',
  camera: { ...DEFAULT_CAMERA },
  getState: () => store.getState(),
  getHighlightIds: () => selection.ids,
  getFogPreview: () => fogPreviewRef.current,
  getImage: (id) => imageLoader.get(id),
});

panZoomRef.handle = attachPanZoom(renderer);

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
toolManager.register(createFogTool(inputContext, 'reveal', fogPreviewRef, fogOptionsRef));
toolManager.register(createFogTool(inputContext, 'hide', fogPreviewRef, fogOptionsRef));
toolManager.register(createBackgroundTool(inputContext));

mountToolbar(document.body, toolManager, [
  { id: 'select', label: 'Select (S)', title: 'Click tokens to select. Drag to move. Right-click to edit.' },
  { id: 'token', label: 'Token (T)', title: 'Click a cell to place a token.' },
  { id: 'fog-reveal', label: 'Reveal (R)', title: 'Drag to reveal cells.' },
  { id: 'fog-hide', label: 'Hide (H)', title: 'Drag to hide cells.' },
  { id: 'background', label: 'Map (M)', title: 'Drag to move the background, wheel to scale.' },
]);

toolManager.setActive('select');

mountFogSettings(document.body, fogOptionsRef, toolManager);

mountSessionMenu(document.body, {
  onNewSession: () => {
    store.resetSession();
  },
  onUploadBackground: async (file) => {
    try {
      const { width, height } = await readImageDimensions(file);
      const id = await putImage(file, file.type || 'image/png');
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
    } catch (err) {
      console.error('[gm] upload background failed', err);
      window.alert('Failed to upload background image.');
    }
  },
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
      window.alert('Failed to import session. Check the file is a valid dnd-maps export.');
    }
  },
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
if (channel) {
  channel.onMessage((msg) => {
    if (msg.type === 'hello' && msg.from === 'spectator') {
      channel.send({ type: 'full-state', state: serializeState(store.getState()) });
    } else if (msg.type === 'request-full-state') {
      channel.send({ type: 'full-state', state: serializeState(store.getState()) });
    }
  });
  channel.send({ type: 'full-state', state: serializeState(store.getState()) });
}

const persist = debounce(() => saveState(store.getState()), 200);

store.subscribe((patch) => {
  renderer.requestRender();
  persist();
  if (!channel) return;
  if (patch) {
    channel.send({ type: 'patch', patch: toSerializablePatch(patch) });
  } else {
    channel.send({ type: 'full-state', state: serializeState(store.getState()) });
  }
});

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

window.addEventListener('beforeunload', () => persist.flush());

function isEditableFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
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
