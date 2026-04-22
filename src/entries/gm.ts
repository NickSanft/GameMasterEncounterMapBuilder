import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import {
  createSelectionState,
  createDragOverlayRef,
  createLassoOverlayRef,
  createLastPlacedRef,
  createMeasurementOverlayRef,
  createAoeOverlayRef,
  createDrawOverlayRef,
  createWallsOverlayRef,
} from '../input/context.js';
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
import { createNoteTool } from '../input/tool-note.js';
import { hitTestAnnotation } from '../input/hit-test-annotation.js';
import {
  createMeasureTool,
  createRulerToolOptionsRef,
} from '../input/tool-measure.js';
import { mountRulerSettings } from '../ui/ruler-settings.js';
import { RULER_PRESETS } from '../state/ruler.js';
import { createAoeTool, createAoeToolOptionsRef } from '../input/tool-aoe.js';
import { createDrawTool, createDrawToolOptionsRef } from '../input/tool-draw.js';
import { createWallsTool } from '../input/tool-walls.js';
import { hitTestWalls } from '../state/walls.js';
import { DEFAULT_STROKE_COLOR, DEFAULT_STROKE_WIDTH, hitTestStrokes } from '../state/draw.js';
import { mountDrawSettings } from '../ui/draw-settings.js';
import { hitTestAoe } from '../input/hit-test-aoe.js';
import { DEFAULT_AOE_COLOR } from '../state/aoe.js';
import { mountAoeSettings } from '../ui/aoe-settings.js';
import { mountToolbar } from '../ui/toolbar.js';
import { mountSessionMenu } from '../ui/session-menu.js';
import { mountTokenEditor } from '../ui/token-editor.js';
import { mountAnnotationEditor } from '../ui/annotation-editor.js';
import { mountFogSettings } from '../ui/fog-settings.js';
import { mountSettingsModal } from '../ui/settings-modal.js';
import { mountZoomControls } from '../ui/zoom-controls.js';
import { createSyncChannel } from '../sync/channel.js';
import { serializeState, toSerializablePatch } from '../sync/messages.js';
import {
  loadPersistedState,
  saveState,
  saveStateSync,
} from '../state/persistence.js';
import {
  getActiveSceneId,
  setActiveSceneId,
  ensureActiveScene,
  getSceneState,
  saveScene,
  listScenes,
  captureThumbnail,
} from '../state/scenes.js';
import { mountScenesModal } from '../ui/scenes-modal.js';
import { mountSceneIndicator } from '../ui/scene-indicator.js';
import { exportSession, importSession } from '../state/export.js';
import { createPreferences } from '../state/preferences.js';
import { loadCamera, saveCamera, clearCamera } from '../state/camera-persistence.js';
import { debounce, rafThrottle } from '../util/debounce.js';
import { createImageLoader } from '../images/loader.js';
import { putImage } from '../images/store.js';
import { hitTestToken } from '../input/hit-test.js';
import { screenToWorld } from '../render/coords.js';
import { duplicateTokens } from '../state/token-clipboard.js';
import { rotateBy, snapRotation } from '../state/token-rotation.js';
import { tokensInStackAt } from '../state/token-stack.js';
import type { Annotation, Token } from '../state/types.js';
import { DEFAULT_ANNOTATION_COLOR } from '../state/annotation-presets.js';
import { mountPresetBackgroundsModal } from '../ui/preset-backgrounds-modal.js';
import { resolvePresetUrl } from '../state/preset-backgrounds.js';
import { showContextMenu, type ContextMenuEntry } from '../ui/context-menu.js';
import { nid } from '../util/id.js';
import { nextTokenColor } from '../state/token-colors.js';
import {
  tokenFromCatalogEntry,
  type TokenCatalogEntry,
} from '../state/token-catalog.js';
import {
  saveTemplateToLibrary,
  placeTemplate,
  type TemplateCatalogEntry,
} from '../state/template-catalog.js';
import { mountTokenLibraryModal } from '../ui/token-library-modal.js';
import { mountTemplateLibraryModal } from '../ui/template-library-modal.js';
import { createPingManager } from '../state/ping-manager.js';
import { mountNotesPanel } from '../ui/notes-panel.js';
import { mountShortcutOverlay } from '../ui/shortcut-overlay.js';
import { mountInitiativeBar } from '../ui/initiative-bar.js';
import { mountInitiativeModal } from '../ui/initiative-modal.js';
import { mountDiagnosticsOverlay } from '../ui/diagnostics-overlay.js';
import { mountHelpOverlay } from '../ui/help-overlay.js';
import { mountDamageHealDialog } from '../ui/damage-heal-dialog.js';
import { mountDicePanel } from '../ui/dice-panel.js';
import { mountStatusBanners } from '../ui/status-banners.js';
import { mountImportOptionsModal } from '../ui/import-options-modal.js';
import { mergeImportState } from '../state/import-merge.js';
import { mountMiniMap } from '../ui/mini-map.js';
import { mountExportImageModal } from '../ui/export-image-modal.js';
import { renderSnapshot } from '../render/snapshot.js';
import { createConflictDetector } from '../state/conflict-detector.js';
import {
  consumeDirtyFlag,
  markDirty,
  markClean,
} from '../state/dirty-flag.js';
import type { ViewportRect } from '../sync/messages.js';
import {
  zoomBy,
  fitToContent,
  resetCamera,
  ZOOM_BUTTON_STEP,
} from '../render/camera-controls.js';
import type { PanZoomHandle } from '../input/pan-zoom.js';
import { EXPORT_FILENAME_PREFIX } from '../util/constants.js';
import { isEditableFocus } from '../util/focus.js';
import { createAnnouncer } from '../util/announcer.js';
import { registerPwa } from '../util/pwa.js';
import { createFogWorkerClient } from '../render/fog-worker-client.js';
import FogWorker from '../render/fog-worker.js?worker';
import { collectSightWalls, collectViewers } from '../state/los-compose.js';

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

// Tool id → human-readable label for live-region announcements.
const TOOL_LABELS: Record<string, string> = {
  select: 'Select',
  token: 'Token',
  'fog-reveal': 'Reveal fog',
  'fog-hide': 'Hide fog',
  background: 'Map',
  note: 'Note',
  measure: 'Ruler',
  aoe: 'AoE',
  draw: 'Draw',
  walls: 'Walls',
};

// Start with the default state so first paint is instant; hydrate from
// IDB asynchronously (see `hydrateFromIdb` at the bottom of this file,
// called once all UI handles are in scope).
const store = createStore();
const selection = createSelectionState();
const dragOverlayRef = createDragOverlayRef();
const lassoOverlayRef = createLassoOverlayRef();
const lastPlacedRef = createLastPlacedRef();
const measurementOverlayRef = createMeasurementOverlayRef();
const aoeOverlayRef = createAoeOverlayRef();
const drawOverlayRef = createDrawOverlayRef();
const wallsOverlayRef = createWallsOverlayRef();
const drawToolOptionsRef = createDrawToolOptionsRef({
  color: DEFAULT_STROKE_COLOR,
  width: DEFAULT_STROKE_WIDTH,
  visibility: 'shared',
});
const rulerToolOptionsRef = createRulerToolOptionsRef();
const aoeToolOptionsRef = createAoeToolOptionsRef({
  kind: 'sphere',
  color: DEFAULT_AOE_COLOR,
  visibility: 'shared',
});
const fogPreviewRef = createFogPreviewRef();
const fogOptionsRef = createFogOptionsRef();
const fogHoverRef = createFogHoverRef();

const panZoomRef: { handle: PanZoomHandle | null } = { handle: null };

const imageLoader = createImageLoader(() => renderer.requestRender());
const pingManager = createPingManager(() => renderer.requestRender());

const spectatorViewportRef: { current: ViewportRect | null; lastUpdate: number } = {
  current: null,
  lastUpdate: 0,
};
const SPECTATOR_VIEWPORT_TIMEOUT_MS = 15_000;

function getSpectatorViewport(): ViewportRect | null {
  if (!preferences.get().showSpectatorViewport) return null;
  if (!spectatorViewportRef.current) return null;
  if (Date.now() - spectatorViewportRef.lastUpdate > SPECTATOR_VIEWPORT_TIMEOUT_MS) {
    return null;
  }
  return spectatorViewportRef.current;
}

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
  getDragOverlay: () => dragOverlayRef.current,
  getLassoOverlay: () => lassoOverlayRef.current,
  getPings: () => pingManager.getActive(),
  getMeasurement: () => measurementOverlayRef.current,
  getAoePreview: () => aoeOverlayRef.current,
  getSpectatorViewport,
  getRulerTargetFeet: () => rulerToolOptionsRef.current.targetFeet,
  getDrawPreview: () => drawOverlayRef.current,
  getFogRects: () => fogWorkerClient.getLatest(),
  getWallsOverlay: () => wallsOverlayRef.current,
  getLosPolygons: () =>
    preferences.get().losMode === 'off'
      ? null
      : fogWorkerClient.getLatestPolygons(),
});

// Whenever the worker has fresh rects, request a re-paint.
fogWorkerClient.onUpdate(() => renderer.requestRender());

// Re-request compaction whenever the store changes (the worker dedupes
// identical-fog requests, so this is cheap when fog hasn't moved).
function refreshLos(): void {
  if (preferences.get().losMode === 'off') return;
  const state = store.getState();
  // Pass the live drag overlay so a viewer being dragged updates its
  // LoS polygon every frame (instead of staying frozen at the
  // pre-drag position until pointerup commits the move). The overlay
  // is null whenever no drag is in progress, in which case
  // collectViewers walks `state.tokens` exactly as before.
  fogWorkerClient.requestLos(
    collectViewers(state.tokens, state.grid, dragOverlayRef.current),
    collectSightWalls(state.walls),
  );
}

// While a drag is active the store doesn't change between pointer-down
// and pointer-up, so `store.subscribe` never fires — and our
// LoS-during-drag wouldn't update without a separate trigger. Hook
// renderer.onFrame to recompute LoS when the drag overlay's position
// has shifted since the last frame. Signature-cached in the worker
// client, so once-per-frame calls are essentially free when nothing
// has changed.
let lastDragLosKey: string | null = null;
renderer.onFrame(() => {
  if (preferences.get().losMode === 'off') {
    lastDragLosKey = null;
    return;
  }
  const drag = dragOverlayRef.current;
  if (!drag || drag.ids.length === 0) {
    lastDragLosKey = null;
    return;
  }
  const key = `${drag.ids.join(',')}#${drag.deltaX.toFixed(2)},${drag.deltaY.toFixed(2)}`;
  if (key === lastDragLosKey) return;
  lastDragLosKey = key;
  refreshLos();
});

function refreshFogRects(): void {
  const state = store.getState();
  // GM view always paints the raw, GM-authored fog — they need to see
  // what they've revealed so they can keep painting. LoS visualization
  // on the GM canvas is a subtle polygon outline, not a fog mask.
  fogWorkerClient.request(state.fog, state.grid.cols, state.grid.rows);
}

fogWorkerClient.onLosUpdate(() => renderer.requestRender());

refreshLos();
refreshFogRects();

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
  diagnosticsOverlay?.setEnabled(prefs.showDiagnostics);
  miniMap?.setEnabled(prefs.showMiniMap);
  // losMode toggle: kick a fresh LoS compute so the GM's outline
  // overlay + Spectator's effective fog reflect the preference
  // immediately (no reload needed).
  refreshLos();
});

const inputContext = {
  canvas,
  renderer,
  store,
  selection,
  dragOverlay: dragOverlayRef,
  lassoOverlay: lassoOverlayRef,
  lastPlaced: lastPlacedRef,
  measurementOverlay: measurementOverlayRef,
  aoeOverlay: aoeOverlayRef,
  isSpaceHeld: () => panZoomRef.handle?.isSpaceHeld() ?? false,
  isPinching: () => panZoomRef.handle?.isPinching() ?? false,
  setWheelEnabled: (enabled: boolean) => panZoomRef.handle?.setWheelEnabled(enabled),
};

const toolManager = createToolManager(canvas);
toolManager.register(createSelectTool(inputContext));
toolManager.register(createTokenTool(inputContext));
toolManager.register(createFogTool(inputContext, 'reveal', fogPreviewRef, fogOptionsRef, fogHoverRef));
toolManager.register(createFogTool(inputContext, 'hide', fogPreviewRef, fogOptionsRef, fogHoverRef));
toolManager.register(createBackgroundTool(inputContext));
toolManager.register(
  createNoteTool(inputContext, (a) => annotationEditor.openFor(a)),
);
toolManager.register(
  createMeasureTool({
    ...inputContext,
    rulerOptions: rulerToolOptionsRef,
    getFeetPerSquare: () => preferences.get().feetPerSquare,
    getCellSize: () => store.getState().grid.cellSize,
  }),
);
toolManager.register(createAoeTool(inputContext, aoeToolOptionsRef));
toolManager.register(
  createDrawTool({
    ...inputContext,
    drawOverlay: drawOverlayRef,
    drawOptions: drawToolOptionsRef,
  }),
);
toolManager.register(
  createWallsTool({
    ...inputContext,
    wallsOverlay: wallsOverlayRef,
  }),
);

const toolbarHandle = mountToolbar(
  document.body,
  toolManager,
  [
    { id: 'select', label: 'Select (S)', title: 'Click tokens to select. Drag to move. Right-click to edit.' },
    { id: 'token', label: 'Token (T)', title: 'Click a cell to place a token. Alt+click stamps the last-placed token.' },
    { id: 'fog-reveal', label: 'Reveal (R)', title: 'Drag to reveal cells.' },
    { id: 'fog-hide', label: 'Hide (H)', title: 'Drag to hide cells.' },
    { id: 'background', label: 'Map (M)', title: 'Drag to move the background, wheel to scale.' },
    { id: 'note', label: 'Note (N)', title: 'Click to drop a map annotation.' },
    { id: 'measure', label: 'Ruler (L)', title: 'Drag to measure distance in grid squares.' },
    { id: 'aoe', label: 'AoE (Y)', title: 'Drag to place an area-of-effect template.' },
    { id: 'draw', label: 'Draw (K)', title: 'Freehand ink on the map. Right-click a stroke to delete or toggle visibility.' },
    { id: 'walls', label: 'Walls (W)', title: 'Click to drop wall vertices; Escape / right-click / double-click ends the chain. Walls are GM-only and (in a future update) will block line of sight.' },
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

toolManager.onChange((id) => {
  const label = TOOL_LABELS[id] ?? id;
  announcer.announce(`${label} tool active`);
});

mountFogSettings(document.body, fogOptionsRef, toolManager);
mountAoeSettings(document.body, aoeToolOptionsRef, toolManager);
mountDrawSettings(document.body, drawToolOptionsRef, toolManager);
const rulerSettings = mountRulerSettings(document.body, rulerToolOptionsRef);
rulerSettings.setVisible(toolManager.getActive() === 'measure');
toolManager.onChange((id) => rulerSettings.setVisible(id === 'measure'));

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

function viewportCenterGrid(): { gx: number; gy: number } | null {
  const state = store.getState();
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const world = screenToWorld(
    renderer.camera,
    rect.width / 2,
    rect.height / 2,
  );
  return {
    gx: Math.floor(world.x / state.grid.cellSize),
    gy: Math.floor(world.y / state.grid.cellSize),
  };
}

function clampGridCell(gx: number, gy: number): { gx: number; gy: number } {
  const { grid } = store.getState();
  return {
    gx: Math.max(0, Math.min(grid.cols - 1, gx)),
    gy: Math.max(0, Math.min(grid.rows - 1, gy)),
  };
}

function placeLibraryToken(entry: TokenCatalogEntry) {
  const center = viewportCenterGrid();
  const { gx, gy } = center ? clampGridCell(center.gx, center.gy) : { gx: 0, gy: 0 };
  const token = tokenFromCatalogEntry(entry, gx, gy);
  store.applyPatch({ kind: 'token-add', token });
  lastPlacedRef.current = token;
  selection.ids = new Set([token.id]);
  renderer.requestRender();
}

function placeLibraryTemplate(entry: TemplateCatalogEntry) {
  const center = viewportCenterGrid();
  const { gx, gy } = center ? clampGridCell(center.gx, center.gy) : { gx: 0, gy: 0 };
  const tokens = placeTemplate(entry, gx, gy);
  if (tokens.length === 0) return;
  store.batch(() => {
    for (const t of tokens) {
      store.applyPatch({ kind: 'token-add', token: t });
    }
  });
  selection.ids = new Set(tokens.map((t) => t.id));
  lastPlacedRef.current = tokens[tokens.length - 1] ?? lastPlacedRef.current;
  renderer.requestRender();
}

const tokenLibraryModal = mountTokenLibraryModal({
  onPlace: (entry) => placeLibraryToken(entry),
});
const templateLibraryModal = mountTemplateLibraryModal({
  onPlace: (entry) => placeLibraryTemplate(entry),
});

async function saveSelectionAsTemplate() {
  const sel = selectedTokens();
  if (sel.length < 1) {
    window.alert('Select at least one token to save as a template.');
    return;
  }
  const defaultName = sel.length === 1
    ? sel[0]!.label || 'Template'
    : `Template (${sel.length} tokens)`;
  const name = window.prompt('Template name:', defaultName);
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await saveTemplateToLibrary(trimmed, sel);
  } catch (err) {
    console.error('[gm] save template failed', err);
    window.alert('Could not save the template.');
  }
}

const importOptionsModal = mountImportOptionsModal();
const exportImageModal = mountExportImageModal();

mountSessionMenu(document.body, {
  onNewSession: () => {
    store.resetSession();
    announcer.announce('New session started. All tokens, fog, and background cleared.');
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
      announcer.announce('Session exported to JSON.');
    } catch (err) {
      console.error('[gm] export failed', err);
      window.alert('Failed to export session.');
      announcer.announce('Failed to export session.', 'assertive');
    }
  },
  onExportImage: async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const chosen = await exportImageModal.open({
        scope: 'whole-map',
        mode: 'gm',
        scale: 2,
        filename: `${EXPORT_FILENAME_PREFIX}-${today}`,
      });
      if (!chosen) {
        announcer.announce('Export image cancelled.');
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const result = await renderSnapshot({
        state: store.getState(),
        mode: chosen.mode,
        scope: chosen.scope,
        scale: chosen.scale,
        liveCamera: renderer.camera,
        liveCssWidth: rect.width,
        liveCssHeight: rect.height,
        getImage: (id) => imageLoader.get(id),
        preferences: preferences.get(),
      });
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chosen.filename}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      announcer.announce(
        `Exported image: ${result.pixelWidth} by ${result.pixelHeight} pixels.`,
      );
    } catch (err) {
      console.error('[gm] export image failed', err);
      window.alert(
        err instanceof Error && err.message
          ? `Failed to export image: ${err.message}`
          : 'Failed to export image.',
      );
      announcer.announce('Failed to export image.', 'assertive');
    }
  },
  onImport: async (file) => {
    try {
      const text = await file.text();
      const { state: imported, imageIds } = await importSession(text);
      // Show the options dialog so the user can opt out of categories.
      const selectionChoice = await importOptionsModal.open(imported);
      if (!selectionChoice) {
        announcer.announce('Import cancelled.');
        return;
      }
      for (const id of imageIds) imageLoader.invalidate(id);
      selection.ids = new Set();
      const merged = mergeImportState(store.getState(), imported, selectionChoice);
      store.applyPatch({ kind: 'session-reset', state: merged });
      announcer.announce('Session imported.');
    } catch (err) {
      console.error('[gm] import failed', err);
      window.alert('Failed to import session. Check the file is a valid export.');
      announcer.announce('Failed to import session.', 'assertive');
    }
  },
  onSettings: () => settingsModal.open(),
  onToggleNotes: () => notesPanel.toggle(),
  onShortcuts: () => shortcutOverlay.open(),
  onInitiative: () => initiativeModal.open(),
  onTokenLibrary: () => tokenLibraryModal.open(),
  onTemplateLibrary: () => templateLibraryModal.open(),
  onScenes: () => scenesModal.open(),
  onClearDrawings: () => {
    const state = store.getState();
    if (state.strokes.length === 0) return;
    const count = state.strokes.length;
    const ok = window.confirm(
      `Erase all ${count} drawing${count === 1 ? '' : 's'}? This can be undone.`,
    );
    if (ok) {
      store.applyPatch({ kind: 'strokes-clear' });
      announcer.announce(`${count} drawing${count === 1 ? '' : 's'} cleared.`);
    }
  },
});

const tokenEditor = mountTokenEditor({
  store,
  selection,
  imageLoader,
  feetPerSquare: () => preferences.get().feetPerSquare,
});
const annotationEditor = mountAnnotationEditor({ store });
const damageHealDialog = mountDamageHealDialog({
  store,
  onAnnounce: (msg) => announcer.announce(msg),
});

const notesPanel = mountNotesPanel();
const shortcutOverlay = mountShortcutOverlay('gm');
const initiativeModal = mountInitiativeModal({ store });
mountInitiativeBar(store, 'gm', {
  onOpenTracker: () => initiativeModal.open(),
});
mountHelpOverlay('gm');

// ---- Scenes ------------------------------------------------------------
// The active-scene pointer drives which scene the regular saveState /
// loadPersistedState path operates on (through `ensureActiveScene`).
// Scene switching saves the outgoing scene first, then loads the target.
async function refreshSceneIndicator(): Promise<void> {
  try {
    const [list, activeId] = await Promise.all([
      listScenes(),
      Promise.resolve(getActiveSceneId()),
    ]);
    const active = activeId
      ? list.find((s) => s.id === activeId) ?? null
      : null;
    sceneIndicator.setName(active?.name ?? null, list.length);
  } catch {
    sceneIndicator.setName(null, 0);
  }
}

async function switchToScene(id: string): Promise<void> {
  // Persist the outgoing scene (with a fresh thumbnail) before swapping.
  const outgoingId = getActiveSceneId();
  if (outgoingId) {
    try {
      const thumb = captureThumbnail(canvas);
      await saveScene(outgoingId, store.getState(), {
        thumbnail: thumb ?? undefined,
      });
    } catch (err) {
      console.warn('[scenes] save-outgoing failed', err);
    }
  }

  setActiveSceneId(id);
  try {
    const next = await getSceneState(id);
    if (next) {
      store.loadState(next);
      store.clearHistory();
    }
  } catch (err) {
    console.warn('[scenes] load-incoming failed', err);
  }
  // Full state to the Spectator so it reflects the new scene.
  channel?.send({ type: 'full-state', state: serializeState(store.getState()) });
  await refreshSceneIndicator();
  try {
    const list = await listScenes();
    const active = list.find((s) => s.id === id);
    if (active) announcer.announce(`Switched to scene: ${active.name}`);
  } catch {
    // Indicator refresh failure is not user-facing; skip the announcement.
  }
}

async function handleDeleteActiveScene(): Promise<void> {
  // Called by the modal before it deletes the active scene: pick
  // another scene to become active, or create a blank one.
  const list = await listScenes();
  const activeId = getActiveSceneId();
  const others = list.filter((s) => s.id !== activeId);
  if (others.length > 0) {
    await switchToScene(others[0]!.id);
  } else {
    // Modal disallows deleting the last scene, so this branch only
    // triggers from a race (external delete); fall back to a blank scene.
    const ensured = await ensureActiveScene();
    await switchToScene(ensured);
  }
}

const scenesModal = mountScenesModal({
  getActiveId: () => getActiveSceneId(),
  onSwitch: (id) => switchToScene(id),
  onCreated: (id) => switchToScene(id),
  onDuplicated: async () => {
    await refreshSceneIndicator();
  },
  onDeleteActive: () => handleDeleteActiveScene(),
  onChanged: () => refreshSceneIndicator(),
});

const sceneIndicator = mountSceneIndicator({
  onClick: () => scenesModal.open(),
});

// Kick off the initial hydrate now that store + indicator are both set up.
void loadPersistedState().then(async (persisted) => {
  if (persisted) {
    store.loadState(persisted);
    store.clearHistory();
  }
  await refreshSceneIndicator();
});

const dicePanel = mountDicePanel({
  viewMode: 'gm',
  onLocalRoll: (roll) => {
    channel?.send({ type: 'dice-roll', roll });
    announcer.announce(`You rolled ${roll.source}: ${roll.total}.`);
  },
});

function ping(worldX: number, worldY: number) {
  pingManager.add(worldX, worldY);
  channel?.send({ type: 'ping', x: worldX, y: worldY });
}

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
  const annotHit = hit
    ? null
    : hitTestAnnotation(state.annotations, world.x, world.y);
  const aoeHit = hit || annotHit
    ? null
    : hitTestAoe(state.aoeTemplates, world.x, world.y);
  const strokeHit = hit || annotHit || aoeHit
    ? null
    : hitTestStrokes(state.strokes, world.x, world.y);
  const wallHit = hit || annotHit || aoeHit || strokeHit
    ? null
    : hitTestWalls(state.walls, world.x, world.y);
  const gx = Math.floor(world.x / state.grid.cellSize);
  const gy = Math.floor(world.y / state.grid.cellSize);
  const onGrid =
    gx >= 0 && gy >= 0 && gx < state.grid.cols && gy < state.grid.rows;

  const items: ContextMenuEntry[] = [];
  if (aoeHit) {
    const aoe = aoeHit;
    items.push(
      {
        label:
          aoe.visibility === 'shared'
            ? 'Make AoE GM-only'
            : 'Share AoE with Spectator',
        onClick: () =>
          store.applyPatch({
            kind: 'aoe-update',
            id: aoe.id,
            changes: {
              visibility: aoe.visibility === 'shared' ? 'gm' : 'shared',
            },
          }),
      },
      { kind: 'separator' },
      {
        label: 'Delete AoE',
        variant: 'danger',
        onClick: () =>
          store.applyPatch({ kind: 'aoe-remove', id: aoe.id }),
      },
    );
  } else if (strokeHit) {
    const s = strokeHit;
    items.push(
      {
        label:
          s.visibility === 'shared'
            ? 'Make stroke GM-only'
            : 'Share stroke with Spectator',
        onClick: () =>
          store.applyPatch({
            kind: 'stroke-update',
            id: s.id,
            changes: {
              visibility: s.visibility === 'shared' ? 'gm' : 'shared',
            },
          }),
      },
      { kind: 'separator' },
      {
        label: 'Delete stroke',
        variant: 'danger',
        onClick: () => store.applyPatch({ kind: 'stroke-remove', id: s.id }),
      },
    );
  } else if (wallHit) {
    const w = wallHit;
    // Mirror the token-context-menu pattern: right-clicking a wall
    // that's already in selection keeps the multi-select; clicking a
    // wall that ISN'T selected replaces selection with just this one.
    if (!selection.ids.has(w.id)) {
      selection.ids = new Set([w.id]);
      renderer.requestRender();
    }
    // Build the list of selected walls so group actions affect them all.
    const selectedWalls = state.walls.filter((x) => selection.ids.has(x.id));
    const wallCount = selectedWalls.length;
    const suffix = wallCount > 1 ? ` (${wallCount})` : '';
    // Sight-blocking toggle target: if any selected wall has sight
    // blocking ON, the menu offers to "Disable" all of them; otherwise
    // it offers to "Enable" all of them. Avoids ambiguous mid-state.
    const anyBlocksSight = selectedWalls.some((x) => x.blocksSight);
    items.push(
      {
        label: anyBlocksSight
          ? `Disable sight blocking${suffix}`
          : `Enable sight blocking${suffix}`,
        onClick: () => {
          store.batch(() => {
            for (const sw of selectedWalls) {
              store.applyPatch({
                kind: 'wall-update',
                id: sw.id,
                changes: { blocksSight: !anyBlocksSight },
              });
            }
          });
        },
      },
      { kind: 'separator' },
      {
        label: `Delete wall${suffix}`,
        shortcut: wallCount > 0 ? 'Del' : undefined,
        variant: 'danger',
        onClick: () => {
          store.batch(() => {
            for (const sw of selectedWalls) {
              store.applyPatch({ kind: 'wall-remove', id: sw.id });
            }
          });
          selection.ids = new Set();
        },
      },
    );
  } else if (annotHit) {
    const annot = annotHit;
    items.push(
      {
        label: 'Edit annotation…',
        onClick: () => annotationEditor.openFor(annot),
      },
      {
        label:
          annot.visibility === 'shared'
            ? 'Make GM-only'
            : 'Share with Spectator',
        onClick: () =>
          store.applyPatch({
            kind: 'annotation-update',
            id: annot.id,
            changes: {
              visibility: annot.visibility === 'shared' ? 'gm' : 'shared',
            },
          }),
      },
      { kind: 'separator' },
      {
        label: 'Delete annotation',
        variant: 'danger',
        onClick: () =>
          store.applyPatch({ kind: 'annotation-remove', id: annot.id }),
      },
    );
  } else if (hit) {
    if (!selection.ids.has(hit.id)) {
      selection.ids = new Set([hit.id]);
      renderer.requestRender();
    }
    const count = selection.ids.size;
    const suffix = count > 1 ? ` (${count})` : '';
    const hpTargets = state.tokens
      .filter((t) => selection.ids.has(t.id) && t.hp !== null)
      .map((t) => t.id);

    // When the clicked cell holds two or more tokens, prefix the menu
    // with a "Stack here" section that lets the GM jump selection to any
    // member without digging through with Alt+click.
    const stack = tokensInStackAt(state.tokens, hit.x, hit.y);
    if (stack.length > 1) {
      items.push({
        label: `Stack here (${stack.length}):`,
        disabled: true,
        onClick: () => {},
      });
      // Top-most first so repeat-users' fingers find the commonly-wanted
      // "currently visible" token at the start of the list.
      for (let i = stack.length - 1; i >= 0; i--) {
        const t = stack[i]!;
        const name = t.label || 'Token';
        const marker = t.id === hit.id ? '  → ' : '     ';
        const tail = t.id === hit.id ? ' (current)' : '';
        items.push({
          label: `${marker}${name}${tail}`,
          onClick: () => {
            selection.ids = new Set([t.id]);
            renderer.requestRender();
          },
        });
      }
      items.push({ kind: 'separator' });
    }

    items.push(
      { label: 'Edit token…', onClick: () => tokenEditor.openFor(hit) },
      {
        label: `Damage / Heal${hpTargets.length > 1 ? ` (${hpTargets.length})` : ''}…`,
        disabled: hpTargets.length === 0,
        onClick: () => {
          if (hpTargets.length > 0) damageHealDialog.openFor(hpTargets);
        },
      },
      { label: `Duplicate${suffix}`, shortcut: 'Ctrl+D', onClick: () => duplicateSelection() },
      { label: `Copy${suffix}`, shortcut: 'Ctrl+C', onClick: () => copySelection() },
      { label: `Cut${suffix}`, shortcut: 'Ctrl+X', onClick: () => cutSelection() },
      { kind: 'separator' },
      {
        label: 'Save as template…',
        onClick: () => {
          void saveSelectionAsTemplate();
        },
      },
      { kind: 'separator' },
      {
        label: `Delete${suffix}`,
        shortcut: 'Del',
        variant: 'danger',
        onClick: () => deleteSelection(),
      },
    );
  } else {
    items.push(
      {
        label: 'Place token here',
        disabled: !onGrid,
        onClick: () => placeTokenAt(gx, gy),
      },
      {
        label: 'Paste here',
        shortcut: 'Ctrl+V',
        disabled: tokenClipboard.length === 0 || !onGrid,
        onClick: () => pasteClipboardAt(gx, gy),
      },
      {
        label: 'Place annotation here',
        onClick: () => placeAnnotationAt(world.x, world.y),
      },
      {
        label: 'Ping here',
        onClick: () => ping(world.x, world.y),
      },
      { kind: 'separator' },
      {
        label: 'Reveal 5×5 here',
        disabled: !onGrid,
        onClick: () => setFogArea(gx, gy, 5, 1),
      },
      {
        label: 'Hide 5×5 here',
        disabled: !onGrid,
        onClick: () => setFogArea(gx, gy, 5, 0),
      },
      { kind: 'separator' },
      {
        label: 'Fit to screen',
        shortcut: 'F',
        onClick: () =>
          fitToContent(renderer, store.getState(), (id) => imageLoader.get(id)),
      },
      {
        label: 'Reset camera',
        shortcut: '0',
        onClick: () => resetCamera(renderer),
      },
    );
  }

  const label = aoeHit
    ? 'AoE actions'
    : strokeHit
      ? 'Stroke actions'
      : wallHit
        ? 'Wall actions'
        : annotHit
          ? 'Annotation actions'
          : hit
            ? 'Token actions'
            : 'Map actions';
  showContextMenu({
    x: e.clientX,
    y: e.clientY,
    items,
    label,
  });
});

const channel = createSyncChannel();

// ---- Conflict detection + crash recovery ---------------------------------
// Every GM tab gets a random id + broadcasts it every ~2 s. Two open GMs
// see each other and surface a banner. The dirty flag is atomic: boot
// reads + sets, beforeunload clears. If boot sees it already set, the
// previous session wasn't cleanly closed.
const statusBanners = mountStatusBanners();
const gmTabId = nid();
const conflictDetector = createConflictDetector(gmTabId, { stalenessMs: 6000 });
const HEARTBEAT_INTERVAL_MS = 2000;
let conflictBannerVisible = false;

function checkConflictBanner() {
  const hasConflict = conflictDetector.hasConflict(Date.now());
  if (hasConflict && !conflictBannerVisible) {
    statusBanners.show({
      message:
        'Another GM tab is open — changes from both tabs will overwrite each other. Close the other tab, or switch to Spectator.',
      variant: 'warn',
      dismissible: false,
    });
    announcer.announce(
      'Warning: another GM tab is open. Changes may overwrite each other.',
      'assertive',
    );
    conflictBannerVisible = true;
  } else if (!hasConflict && conflictBannerVisible) {
    statusBanners.hide();
    conflictBannerVisible = false;
  }
}

if (channel) {
  const sendHeartbeat = () => channel.send({ type: 'gm-heartbeat', tabId: gmTabId });
  sendHeartbeat();
  window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  window.setInterval(checkConflictBanner, HEARTBEAT_INTERVAL_MS);
}

// Crash-recovery banner — one-shot on boot.
if (consumeDirtyFlag()) {
  statusBanners.show({
    message:
      "Your last session wasn't closed cleanly. It's been restored from the autosave — no action needed.",
    variant: 'info',
    dismissible: true,
    onDismiss: () => statusBanners.hide(),
  });
}
// Re-mark dirty on every state change (idempotent after the first) so a
// mid-session crash leaves the flag set.
store.subscribe(() => {
  markDirty();
});

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
    } else if (msg.type === 'ping') {
      pingManager.add(msg.x, msg.y, msg.color);
    } else if (msg.type === 'spectator-viewport') {
      spectatorViewportRef.current = msg.viewport;
      spectatorViewportRef.lastUpdate = Date.now();
      if (preferences.get().showSpectatorViewport) renderer.requestRender();
    } else if (msg.type === 'dice-roll') {
      dicePanel.pushRemoteRoll(msg.roll);
      if (msg.roll.from !== 'gm') {
        announcer.announce(`Spectator rolled ${msg.roll.source}: ${msg.roll.total}.`);
      }
    } else if (msg.type === 'gm-heartbeat') {
      conflictDetector.noteHeartbeat(msg.tabId, Date.now());
      checkConflictBanner();
    }
  });
  channel.send({ type: 'hello', from: 'gm' });
  channel.send({ type: 'full-state', state: serializeState(store.getState()) });
}

const broadcastCameraThrottled = rafThrottle(sendCameraIfBroadcasting);
renderer.onCameraChange(broadcastCameraThrottled);

const diagnosticsOverlay = mountDiagnosticsOverlay({
  renderer,
  store,
  viewMode: 'gm',
  getRemoteViewport: () => {
    const vp = spectatorViewportRef.current;
    if (!vp) return null;
    if (Date.now() - spectatorViewportRef.lastUpdate > SPECTATOR_VIEWPORT_TIMEOUT_MS) {
      return null;
    }
    return { width: vp.width, height: vp.height };
  },
});
diagnosticsOverlay.setEnabled(preferences.get().showDiagnostics);

const miniMap = mountMiniMap({
  renderer,
  store,
  viewMode: 'gm',
  getImage: (id) => imageLoader.get(id),
});
miniMap.setEnabled(preferences.get().showMiniMap);

// Async IDB save, fire-and-forget from the debounced path.
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
  // Recompact fog rects off-thread; a no-op when the patch didn't touch fog
  // (the client hashes the buffer + skips the worker round trip on hit).
  refreshFogRects();
  // Re-run LoS whenever state changes — the worker client signatures
  // its inputs + skips the round-trip on unchanged walls+viewers.
  refreshLos();
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
  store.batch(() => {
    for (const token of copies) {
      store.applyPatch({ kind: 'token-add', token });
    }
  });
  selection.ids = new Set(copies.map((t) => t.id));
  lastPlacedRef.current = copies[copies.length - 1] ?? lastPlacedRef.current;
  renderer.requestRender();
  return true;
}

function cutSelection(): boolean {
  if (!copySelection()) return false;
  const ids = Array.from(selection.ids);
  store.batch(() => {
    for (const id of ids) {
      store.applyPatch({ kind: 'token-remove', id });
    }
  });
  selection.ids = new Set();
  renderer.requestRender();
  return true;
}

function duplicateSelection(): boolean {
  const sel = selectedTokens();
  if (sel.length === 0) return false;
  const copies = duplicateTokens(sel);
  store.batch(() => {
    for (const token of copies) {
      store.applyPatch({ kind: 'token-add', token });
    }
  });
  selection.ids = new Set(copies.map((t) => t.id));
  lastPlacedRef.current = copies[copies.length - 1] ?? lastPlacedRef.current;
  renderer.requestRender();
  return true;
}

/**
 * Rotate every selected token by `deltaRad` radians. The result is snapped
 * to the 45° grid (the finer of 45° / 90°) so repeated presses stay aligned
 * even when the starting rotation was off-grid from a freeform editor entry.
 * Returns true if any token actually changed.
 */
function rotateSelection(deltaRad: number): boolean {
  if (selection.ids.size === 0) return false;
  const state = store.getState();
  const ids = Array.from(selection.ids);
  let moved = false;
  store.batch(() => {
    for (const id of ids) {
      const t = state.tokens.find((t) => t.id === id);
      if (!t) continue;
      const next = snapRotation(rotateBy(t.rotation, deltaRad), Math.PI / 4);
      if (next !== t.rotation) {
        store.applyPatch({
          kind: 'token-update',
          id,
          changes: { rotation: next },
        });
        moved = true;
      }
    }
  });
  if (moved) renderer.requestRender();
  return moved;
}

function moveSelection(dx: number, dy: number): boolean {
  if (selection.ids.size === 0) return false;
  const state = store.getState();
  const ids = Array.from(selection.ids);
  let moved = false;
  const cellSize = state.grid.cellSize;
  store.batch(() => {
    for (const id of ids) {
      const t = state.tokens.find((t) => t.id === id);
      if (t) {
        store.applyPatch({
          kind: 'token-update',
          id,
          changes: { x: t.x + dx, y: t.y + dy },
        });
        moved = true;
        continue;
      }
      const a = state.annotations.find((a) => a.id === id);
      if (a) {
        store.applyPatch({
          kind: 'annotation-update',
          id,
          changes: { x: a.x + dx * cellSize, y: a.y + dy * cellSize },
        });
        moved = true;
        continue;
      }
      const w = state.walls.find((w) => w.id === id);
      if (w) {
        // Walls translate by (dx, dy) WORLD pixels (multiply grid-cell
        // delta by cellSize) — both endpoints together.
        const wx = dx * cellSize;
        const wy = dy * cellSize;
        store.applyPatch({
          kind: 'wall-update',
          id,
          changes: {
            x1: w.x1 + wx,
            y1: w.y1 + wy,
            x2: w.x2 + wx,
            y2: w.y2 + wy,
          },
        });
        moved = true;
      }
    }
  });
  if (moved) renderer.requestRender();
  return moved;
}

function deleteSelection(): boolean {
  if (selection.ids.size === 0) return false;
  const ids = Array.from(selection.ids);
  const state = store.getState();
  let tokenCount = 0;
  let annotationCount = 0;
  let wallCount = 0;
  store.batch(() => {
    for (const id of ids) {
      if (state.tokens.some((t) => t.id === id)) {
        store.applyPatch({ kind: 'token-remove', id });
        tokenCount++;
      } else if (state.annotations.some((a) => a.id === id)) {
        store.applyPatch({ kind: 'annotation-remove', id });
        annotationCount++;
      } else if (state.walls.some((w) => w.id === id)) {
        store.applyPatch({ kind: 'wall-remove', id });
        wallCount++;
      }
    }
  });
  selection.ids = new Set();
  renderer.requestRender();
  const parts: string[] = [];
  if (tokenCount > 0) parts.push(`${tokenCount} token${tokenCount === 1 ? '' : 's'}`);
  if (annotationCount > 0) {
    parts.push(`${annotationCount} annotation${annotationCount === 1 ? '' : 's'}`);
  }
  if (wallCount > 0) parts.push(`${wallCount} wall${wallCount === 1 ? '' : 's'}`);
  if (parts.length > 0) announcer.announce(`Deleted ${parts.join(' and ')}.`);
  return true;
}

function placeAnnotationAt(worldX: number, worldY: number) {
  const annotation: Annotation = {
    id: nid(),
    x: worldX,
    y: worldY,
    text: '',
    color: DEFAULT_ANNOTATION_COLOR,
    visibility: 'shared',
  };
  store.applyPatch({ kind: 'annotation-add', annotation });
  annotationEditor.openFor(annotation);
}

function placeTokenAt(gx: number, gy: number) {
  const state = store.getState();
  if (gx < 0 || gy < 0 || gx >= state.grid.cols || gy >= state.grid.rows) return;
  const count = state.tokens.length;
  const token = {
    id: nid(),
    x: gx,
    y: gy,
    label: `Token ${count + 1}`,
    color: nextTokenColor(count),
    imageId: null,
    size: 1,
    borderColor: null,
    hp: null,
    conditions: [],
    rotation: 0,
    losRadius: null,
  };
  store.applyPatch({ kind: 'token-add', token });
  lastPlacedRef.current = token;
  announcer.announce(`${token.label} placed.`);
}

function pasteClipboardAt(gx: number, gy: number): boolean {
  if (tokenClipboard.length === 0) return false;
  const minX = Math.min(...tokenClipboard.map((t) => t.x));
  const minY = Math.min(...tokenClipboard.map((t) => t.y));
  const copies = duplicateTokens(tokenClipboard, gx - minX, gy - minY);
  store.batch(() => {
    for (const token of copies) {
      store.applyPatch({ kind: 'token-add', token });
    }
  });
  selection.ids = new Set(copies.map((t) => t.id));
  lastPlacedRef.current = copies[copies.length - 1] ?? lastPlacedRef.current;
  renderer.requestRender();
  return true;
}

function setFogArea(gx: number, gy: number, size: number, value: 0 | 1) {
  const state = store.getState();
  const half = Math.floor(size / 2);
  const cells: Array<{ x: number; y: number; value: 0 | 1 }> = [];
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = gx + dx;
      const y = gy + dy;
      if (x < 0 || y < 0 || x >= state.grid.cols || y >= state.grid.rows) continue;
      cells.push({ x, y, value });
    }
  }
  if (cells.length > 0) store.applyPatch({ kind: 'fog-set', cells });
}

window.addEventListener('keydown', (e) => {
  if (isEditableFocus(e.target)) return;

  if (e.key === '?') {
    shortcutOverlay.toggle();
    e.preventDefault();
    return;
  }

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

  // Delete / Backspace — remove every selected token, annotation, or
  // wall. Documented in the shortcut overlay since Phase 17 but only
  // wired in Phase 56 (when walls became selectable).
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selection.ids.size > 0) {
      if (deleteSelection()) e.preventDefault();
      return;
    }
  }

  // Ruler preset hotkeys (0–5) — only when the Ruler tool is active so
  // they don't stomp on the camera-reset binding.
  if (
    toolManager.getActive() === 'measure' &&
    !e.altKey &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.shiftKey
  ) {
    const preset = RULER_PRESETS.find((p) => p.shortcut === e.key);
    if (preset) {
      rulerToolOptionsRef.current = {
        ...rulerToolOptionsRef.current,
        targetFeet: preset.feet,
      };
      rulerSettings.sync();
      renderer.requestRender();
      e.preventDefault();
      return;
    }
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

  // Move selected tokens with arrow keys or WASD (shift = 5 cells).
  if (selection.ids.size > 0 && !e.altKey) {
    const step = e.shiftKey ? 5 : 1;
    const key = e.key.toLowerCase();
    if (e.key === 'ArrowUp' || key === 'w') {
      if (moveSelection(0, -step)) e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown' || key === 's') {
      if (moveSelection(0, step)) e.preventDefault();
      return;
    }
    if (e.key === 'ArrowLeft' || key === 'a') {
      if (moveSelection(-step, 0)) e.preventDefault();
      return;
    }
    if (e.key === 'ArrowRight' || key === 'd') {
      if (moveSelection(step, 0)) e.preventDefault();
      return;
    }
  }

  // Rotation shortcuts — `,` / `.` = 45° CCW/CW, Shift+, / Shift+. = 90°.
  // Because Shift maps the physical keys to `<` and `>`, we match on the
  // produced character rather than e.key plus shift.
  if (selection.ids.size > 0 && !e.altKey && !e.ctrlKey && !e.metaKey) {
    if (e.key === ',') {
      if (rotateSelection(-Math.PI / 4)) e.preventDefault();
      return;
    }
    if (e.key === '.') {
      if (rotateSelection(Math.PI / 4)) e.preventDefault();
      return;
    }
    if (e.key === '<') {
      if (rotateSelection(-Math.PI / 2)) e.preventDefault();
      return;
    }
    if (e.key === '>') {
      if (rotateSelection(Math.PI / 2)) e.preventDefault();
      return;
    }
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
    case 'n':
      toolManager.setActive('note');
      e.preventDefault();
      break;
    case 'l':
      toolManager.setActive('measure');
      e.preventDefault();
      break;
    case 'y':
      toolManager.setActive('aoe');
      e.preventDefault();
      break;
    case 'k':
      toolManager.setActive('draw');
      e.preventDefault();
      break;
    case 'w':
      toolManager.setActive('walls');
      e.preventDefault();
      break;
    case 'e': {
      const state = store.getState();
      const firstSelectedToken = state.tokens.find((t) => selection.ids.has(t.id));
      if (firstSelectedToken && !tokenEditor.isOpen()) {
        tokenEditor.openFor(firstSelectedToken);
        e.preventDefault();
      }
      break;
    }
  }
});

// Register the service worker. When a new version is installed and
// ready to take over, surface an "Update available — Reload to update"
// banner and route the click to SKIP_WAITING → controllerchange
// (which reloads the page) inside `registerPwa`.
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
  // Belt-and-suspenders: the async IDB write kicked off by flush()
  // won't complete during unload, so also do a synchronous
  // localStorage backup write. On next load we prefer IDB, but fall
  // back to the LS copy so an unclean shutdown doesn't lose work.
  saveStateSync(store.getState());
  persistCameraDebounced.flush();
  // Signal graceful shutdown. If we crash or force-close instead, this
  // line never runs → next boot sees the dirty flag and shows the
  // "restored from autosave" banner.
  markClean();
});

function applyPrefsToBody(prefs: {
  reducedMotion: boolean;
  highContrast: boolean;
  theme: 'dark' | 'light';
}) {
  document.body.classList.toggle('reduced-motion', prefs.reducedMotion);
  document.body.classList.toggle('high-contrast', prefs.highContrast);
  document.body.classList.toggle('theme-light', prefs.theme === 'light');
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
