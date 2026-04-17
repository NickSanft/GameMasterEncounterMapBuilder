import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { createSelectionState } from '../input/context.js';
import { createToolManager } from '../input/tool-manager.js';
import { createSelectTool } from '../input/tool-select.js';
import { createTokenTool } from '../input/tool-token.js';
import { createFogTool, createFogPreviewRef } from '../input/tool-fog.js';
import { mountToolbar } from '../ui/toolbar.js';
import { mountSessionMenu } from '../ui/session-menu.js';
import { mountTokenEditor } from '../ui/token-editor.js';
import { createSyncChannel } from '../sync/channel.js';
import { serializeState, toSerializablePatch } from '../sync/messages.js';
import { loadPersistedState, saveState } from '../state/persistence.js';
import { debounce } from '../util/debounce.js';
import { createImageLoader } from '../images/loader.js';
import { hitTestToken } from '../input/hit-test.js';
import { screenToWorld } from '../render/coords.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #canvas not found');

const initial = loadPersistedState();
const store = createStore(initial ?? undefined);
const selection = createSelectionState();
const fogPreviewRef = createFogPreviewRef();

const panZoomRef: { handle: { isSpaceHeld(): boolean } | null } = { handle: null };

const imageLoader = createImageLoader(() => renderer.requestRender());

const renderer = createRenderer({
  canvas,
  mode: 'gm',
  camera: { ...DEFAULT_CAMERA },
  getState: () => store.getState(),
  getHighlightIds: () => selection.ids,
  getFogPreview: () => fogPreviewRef.current,
  getTokenImage: (id) => imageLoader.get(id),
});

panZoomRef.handle = attachPanZoom(renderer);

const inputContext = {
  canvas,
  renderer,
  store,
  selection,
  isSpaceHeld: () => panZoomRef.handle?.isSpaceHeld() ?? false,
};

const toolManager = createToolManager(canvas);
toolManager.register(createSelectTool(inputContext));
toolManager.register(createTokenTool(inputContext));
toolManager.register(createFogTool(inputContext, 'reveal', fogPreviewRef));
toolManager.register(createFogTool(inputContext, 'hide', fogPreviewRef));

mountToolbar(document.body, toolManager, [
  { id: 'select', label: 'Select', title: 'Click tokens to select. Drag to move. Right-click to edit.' },
  { id: 'token', label: 'Token', title: 'Click a cell to place a token.' },
  { id: 'fog-reveal', label: 'Reveal', title: 'Drag a rectangle to reveal cells.' },
  { id: 'fog-hide', label: 'Hide', title: 'Drag a rectangle to hide cells.' },
]);

toolManager.setActive('select');

mountSessionMenu(document.body, {
  onNewSession: () => {
    store.resetSession();
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
  if (patch && channel) {
    channel.send({ type: 'patch', patch: toSerializablePatch(patch) });
  }
});

window.addEventListener('beforeunload', () => persist.flush());
