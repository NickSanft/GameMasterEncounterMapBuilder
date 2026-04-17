import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { createSelectionState } from '../input/context.js';
import { createToolManager } from '../input/tool-manager.js';
import { createSelectTool } from '../input/tool-select.js';
import { createTokenTool } from '../input/tool-token.js';
import { mountToolbar } from '../ui/toolbar.js';
import { createSyncChannel } from '../sync/channel.js';
import { serializeState, toSerializablePatch } from '../sync/messages.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #canvas not found');

const store = createStore();
const selection = createSelectionState();

const panZoomRef: { handle: { isSpaceHeld(): boolean } | null } = { handle: null };

const renderer = createRenderer({
  canvas,
  mode: 'gm',
  camera: { ...DEFAULT_CAMERA },
  getState: () => store.getState(),
  getHighlightIds: () => selection.ids,
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

mountToolbar(document.body, toolManager, [
  { id: 'select', label: 'Select', title: 'Click tokens to select. Drag to move.' },
  { id: 'token', label: 'Token', title: 'Click a cell to place a token.' },
]);

toolManager.setActive('select');

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

store.subscribe((patch) => {
  renderer.requestRender();
  if (patch && channel) {
    channel.send({ type: 'patch', patch: toSerializablePatch(patch) });
  }
});
