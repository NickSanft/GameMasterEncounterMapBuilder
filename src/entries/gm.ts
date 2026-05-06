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
  createEndpointDragRef,
  createBlockResizeRef,
} from '../input/context.js';
import { createToolManager } from '../input/tool-manager.js';
import { createSelectTool } from '../input/tool-select.js';
import { createTokenTool } from '../input/tool-token.js';
import {
  createTilePaintTool,
  createTilePaintOptionsRef,
} from '../input/tool-tile-paint.js';
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
import {
  createTravelTool,
  createTravelToolOptionsRef,
  createTravelOverlayRef,
} from '../input/tool-travel.js';
import {
  createWallsTool,
  createWallsToolOptionsRef,
  createBlockPreviewRef,
} from '../input/tool-walls.js';
import { hitTestWalls } from '../state/walls.js';
import { nextEntityId, describeEntity } from '../state/canvas-nav.js';
import {
  planQuickHpAdjust,
  summarizeQuickHpResults,
} from '../state/quick-hp-adjust.js';
import { DEFAULT_STROKE_COLOR, DEFAULT_STROKE_WIDTH, hitTestStrokes } from '../state/draw.js';
import { mountDrawSettings } from '../ui/draw-settings.js';
import { hitTestAoe } from '../input/hit-test-aoe.js';
import { DEFAULT_AOE_COLOR } from '../state/aoe.js';
import { mountAoeSettings } from '../ui/aoe-settings.js';
import { mountToolbar } from '../ui/toolbar.js';
import { mountSessionMenu } from '../ui/session-menu.js';
import { mountCombatLogPanel } from '../ui/combat-log-panel.js';
import { createCombatLog } from '../state/combat-log.js';
import { createChatHistory } from '../state/chat-history.js';
import { mountChatPanel } from '../ui/chat-panel.js';
import { createAnnotationProposals } from '../state/annotation-proposals.js';
import { mountAnnotationProposalsPanel } from '../ui/annotation-proposals-panel.js';
import { createSceneThumbnailThrottle } from '../state/scene-thumbnails.js';
import { createTokenMoveHistory } from '../state/token-move-history.js';
import { attachCombatLogObserver } from '../state/combat-log-observer.js';
import { mountCommandPalette } from '../ui/command-palette.js';
import { createCommandRegistry } from '../state/command-registry.js';
import {
  advanceInitiative,
  advanceInitiativeSkippingDead,
  retreatInitiative,
} from '../state/initiative.js';
import { createFirstUseHintsStore } from '../state/first-use-hints.js';
import { mountFirstUseHintToast } from '../ui/first-use-hint.js';
import {
  recordSnapshot,
  type Snapshot,
} from '../state/snapshot-history.js';
import { mountSnapshotHistoryModal } from '../ui/snapshot-history-modal.js';
import { mountConflictLoserArchiveModal } from '../ui/conflict-loser-archive-modal.js';
import { mountUploadDropZone } from '../ui/upload-drop-zone.js';
import { exportScene } from '../state/scene-export.js';
import {
  createConflictLoserArchive,
  type LoserSnapshot,
} from '../state/conflict-loser-archive.js';
import { mountTokenEditor } from '../ui/token-editor.js';
import { mountAnnotationEditor } from '../ui/annotation-editor.js';
import { mountWallEditor } from '../ui/wall-editor.js';
import { mountCanvasOutline } from '../ui/canvas-outline.js';
import { mountFogSettings } from '../ui/fog-settings.js';
import { mountWallsSettings } from '../ui/walls-settings.js';
import { mountTilePaintSettings } from '../ui/tile-paint-settings.js';
import { mountSceneLoadingOverlay } from '../ui/scene-loading-overlay.js';
import { mountRecentTokensStrip } from '../ui/recent-tokens-strip.js';
import { recordTokenUse } from '../state/recent-tokens.js';
import { mountWhatsNewModal } from '../ui/whats-new-modal.js';
import { shouldShowWhatsNew } from '../state/whats-new.js';
import { lookupTool } from '../state/keybindings.js';
import { mountSettingsModal } from '../ui/settings-modal.js';
import { mountZoomControls } from '../ui/zoom-controls.js';
import { createSyncChannel } from '../sync/channel.js';
import { serializeState, deserializeState, toSerializablePatch } from '../sync/messages.js';
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
import { putImage, getImageURL, getImage } from '../images/store.js';
import { hitTestToken } from '../input/hit-test.js';
import { screenToWorld } from '../render/coords.js';
import { duplicateTokens } from '../state/token-clipboard.js';
import { nextLabelSuffix } from '../state/token-numbering.js';
import { rotateBy, snapRotation } from '../state/token-rotation.js';
import { tokensInStackAt } from '../state/token-stack.js';
import type { Annotation, Token } from '../state/types.js';
import { DEFAULT_ANNOTATION_COLOR } from '../state/annotation-presets.js';
import { mountPresetBackgroundsModal } from '../ui/preset-backgrounds-modal.js';
import { resolvePresetUrl } from '../state/preset-backgrounds.js';
import { showContextMenu, type ContextMenuEntry } from '../ui/context-menu.js';
import { nid } from '../util/id.js';
import { getOrCreatePlayerId } from '../state/player-id.js';
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
import { createDamageFxManager } from '../state/damage-fx-manager.js';
import { createFogFadeTracker } from '../render/fog-fade-tracker.js';
import { mountNotesPanel } from '../ui/notes-panel.js';
import { mountOnboardingTour } from '../ui/onboarding-tour.js';
import { createTourController, GM_TOUR_STEPS } from '../state/onboarding-tour.js';
import { mountRemotePlayModal } from '../ui/remote-play-modal.js';
import { createRemoteSession } from '../sync/remote-session.js';
import { mountRemoteStatusChip } from '../ui/remote-status-chip.js';
import {
  colorForName,
  createIdentityRegistry,
  resolveName,
  type PlayerIdentity,
} from '../state/player-identity.js';
import { createIdentityPrefs } from '../state/identity-prefs.js';
import { mountConnectedPlayersPanel } from '../ui/connected-players-panel.js';
import { mountShortcutOverlay } from '../ui/shortcut-overlay.js';
import { mountInitiativeBar } from '../ui/initiative-bar.js';
import { mountInitiativeModal } from '../ui/initiative-modal.js';
import { mountDiagnosticsOverlay } from '../ui/diagnostics-overlay.js';
import { mountHelpOverlay } from '../ui/help-overlay.js';
import { mountDamageHealDialog } from '../ui/damage-heal-dialog.js';
import { mountBulkEditModal } from '../ui/bulk-edit-modal.js';
import { mountDicePanel } from '../ui/dice-panel.js';
import { mountSlashCommandInput } from '../ui/slash-command-input.js';
import { rollInitiativeForUnlinkedTokens } from '../state/initiative.js';
import { noteSceneActivated, pickRecent } from '../state/scene-recents.js';
import { mountStatusBanners } from '../ui/status-banners.js';
import { mountSaveStatusPill } from '../ui/save-status-pill.js';
import { mountWeatherOverlay } from '../ui/weather-overlay.js';
import { mountWeatherPicker } from '../ui/weather-picker.js';
import { mountTimeOfDayPicker } from '../ui/time-of-day-picker.js';
import { mountAnimatedTokenOverlay } from '../ui/animated-token-overlay.js';
import { mountPermissionsModal } from '../ui/permissions-modal.js';
import { createSpectatorPermissionsStore } from '../state/spectator-permissions.js';
import {
  createLatencyTracker,
  PROBE_INTERVAL_MS,
} from '../state/latency-tracker.js';
import { mountImportOptionsModal } from '../ui/import-options-modal.js';
import { mergeImportState } from '../state/import-merge.js';
import { mountMiniMap } from '../ui/mini-map.js';
import { mountExportImageModal } from '../ui/export-image-modal.js';
import { renderSnapshot } from '../render/snapshot.js';
import { createConflictDetector } from '../state/conflict-detector.js';
import { mountConflictModal } from '../ui/conflict-modal.js';
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
  tweenCamera,
  cameraFocusedOn,
  cameraToFitBounds,
  tokenSelectionBounds,
  ZOOM_BUTTON_STEP,
} from '../render/camera-controls.js';
import { tokenCenterWorld } from '../state/grid-coords.js';
import { gridDistance, formatDistance } from '../state/distance.js';
import type { PanZoomHandle } from '../input/pan-zoom.js';
import { EXPORT_FILENAME_PREFIX } from '../util/constants.js';
import { isEditableFocus } from '../util/focus.js';
import { createAnnouncer } from '../util/announcer.js';
import { registerPwa } from '../util/pwa.js';
import { mountPwaInstallHint } from '../ui/pwa-install-hint.js';
import { applyTheme } from '../util/theme.js';
import { createFogWorkerClient } from '../render/fog-worker-client.js';
import FogWorker from '../render/fog-worker.js?worker';
import { collectLights, collectSightWalls, collectViewers } from '../state/los-compose.js';
import { cellsToReveal } from '../state/auto-reveal.js';
import {
  clampMoveAgainstWalls,
  clampMoveAgainstWallsHex,
} from '../state/movement.js';
import { detectGridFromBlob } from '../state/grid-detect-blob.js';
import {
  addBookmark,
  forgetScene as forgetSceneBookmarks,
  listBookmarks,
  pickBookmarkSlot,
  removeBookmark,
  updateBookmark,
} from '../state/camera-bookmarks.js';
import { mountCameraBookmarksModal } from '../ui/camera-bookmarks-modal.js';
import {
  attachLongPress,
  dispatchSyntheticContextMenu,
} from '../input/long-press.js';
import {
  recordBackground,
  forgetBackground,
  listRecent,
} from '../state/recent-backgrounds.js';
import { mountRecentBackgroundsModal } from '../ui/recent-backgrounds-modal.js';

const canvasEl = document.getElementById('canvas');
if (!(canvasEl instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element #canvas not found');
}
const canvas: HTMLCanvasElement = canvasEl;

const preferences = createPreferences();
// Phase 67 — per-role identity store, hoisted up here so the
// settings modal + the channel/identity wiring lower in the file
// all share the same instance (in-tab updates propagate via the
// store's subscribe method; the cross-tab `storage` event would
// only catch OTHER tabs).
const identityPrefs = createIdentityPrefs('gm');
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
const endpointDragRef = createEndpointDragRef();
// Phase 116 — block-wall corner-resize in-flight overlay. Set by the
// Select tool when a click lands on a selected block's corner handle;
// cleared on pointerup after the wall-update patch commits.
const blockResizeRef = createBlockResizeRef();
const drawToolOptionsRef = createDrawToolOptionsRef({
  color: DEFAULT_STROKE_COLOR,
  width: DEFAULT_STROKE_WIDTH,
  visibility: 'shared',
});
// Phase 158 — travel-tool overlay + options.
const travelOverlayRef = createTravelOverlayRef();
const travelToolOptionsRef = createTravelToolOptionsRef();
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

// Phase 145 — scene-switch loading overlay. The handle is wired
// after `imageLoader` is built (the loader needs to exist first)
// + after `store` is in scope (so we can subscribe).
let sceneLoadingOverlayUpdate: ((id: string | null) => void) | null = null;
const imageLoader = createImageLoader(() => {
  renderer.requestRender();
  // The image-loader's onReady callback fires when an image
  // finishes loading. Re-evaluate the overlay's visibility so it
  // hides as soon as the background lands.
  sceneLoadingOverlayUpdate?.(store.getState().background.imageId);
});
const pingManager = createPingManager(() => renderer.requestRender());
const damageFxManager = createDamageFxManager(() => renderer.requestRender());
// Phase 78 — fog-reveal fade-in tracker. Updated on every state
// change (the store-subscribe block lower in the file diffs
// state.fog against the previous snapshot + queues fades for
// 0 → 1 transitions). The renderer's `getFogFadeCells` callback
// returns the live queue. The onTick callback drives a
// requestAnimationFrame loop while fades are mid-flight so the
// overlay actually animates between store-subscribe ticks.
const fogFadeTracker = createFogFadeTracker(() => renderer.requestRender());

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
  // Phase 81 (revisit) — return null for animated GIFs so the canvas
  // draws the colored fallback circle. The animated-token-overlay
  // handles the actual GIF render via a positioned DOM <img>, since
  // ctx.drawImage of an animated source only ever reads frame 0.
  getImage: (id) =>
    imageLoader.isAnimated(id) ? null : imageLoader.get(id),
  getPreferences: () => preferences.get(),
  getDragOverlay: () => dragOverlayRef.current,
  getLassoOverlay: () => lassoOverlayRef.current,
  getPings: () => pingManager.getActive(),
  getDamageFx: () => damageFxManager.getActive(),
  getFogFadeCells: () => fogFadeTracker.getActive(performance.now()),
  getReducedMotion: () => preferences.get().reducedMotion,
  getMeasurement: () => measurementOverlayRef.current,
  getAoePreview: () => aoeOverlayRef.current,
  getSpectatorViewport,
  getRulerTargetFeet: () => rulerToolOptionsRef.current.targetFeet,
  getDrawPreview: () => drawOverlayRef.current,
  // Phase 158 — travel-route in-flight preview from the Travel tool.
  getTravelPreview: () => travelOverlayRef.current,
  getFogRects: () => fogWorkerClient.getLatest(),
  getWallsOverlay: () => wallsOverlayRef.current,
  // Phase 112 — block-mode drag preview (Walls tool, GM only).
  getBlockPreview: () => blockPreviewRef.current,
  // Phase 85 — endpoint drag for the in-place wall editor.
  getEndpointDrag: () => endpointDragRef.current,
  // Phase 116 — block-wall corner-resize ghost.
  getBlockResize: () => blockResizeRef.current,
  getLosPolygons: () =>
    preferences.get().losMode === 'off'
      ? null
      : fogWorkerClient.getLatestPolygons(),
  getLightPolygons: () =>
    preferences.get().losMode === 'off'
      ? null
      : fogWorkerClient.getLatestLightPolygons(),
  // Phase 126 — owner-color lookup for the per-token owner-indicator
  // dot. Resolves a Spectator's playerId via the IdentityRegistry.
  getOwnerColor: (ownerId) =>
    identityRegistry.get(ownerId)?.color ?? null,
});

// Whenever the worker has fresh rects, request a re-paint.
fogWorkerClient.onUpdate(() => renderer.requestRender());

// Phase 81 (revisit) — animated-token DOM overlay. Each animated
// token becomes a real `<img>` positioned over the canvas; the
// browser's native GIF playback handles the animation. The canvas
// renderer's `getImage` returns null for animated images (handled
// above), so the colored fallback circle still draws underneath.
// `update()` re-syncs positions; we wire it to `onFrame` so it
// fires after every renderer paint without us tracking each
// trigger (camera change, drag, state mutation) separately.
const animatedTokenOverlay = mountAnimatedTokenOverlay({
  canvas,
  mode: 'gm',
  getState: () => store.getState(),
  getCamera: () => renderer.camera,
  isAnimated: (id) => imageLoader.isAnimated(id),
  getUrl: (id) => imageLoader.getUrl(id),
  getDragOverlay: () => dragOverlayRef.current,
});
renderer.onFrame(() => animatedTokenOverlay.update());

// Phase 87 — visually-hidden ARIA outline of the canvas state. A
// hidden <aside> with one heading + list per entity kind that mirrors
// `state.tokens / walls / aoeTemplates / annotations`. Screen readers
// pick it up via region navigation. Subscribed to `renderer.onFrame`
// (with a 120 ms internal debounce) so it stays in sync with both
// store mutations + selection-only changes — both of which trigger
// a render request — without us having to plumb a separate selection
// subscriber. Mount has no visual surface; safe to mount anywhere
// after the renderer exists.
const canvasOutline = mountCanvasOutline({
  getState: () => store.getState(),
  getSelectedIds: () => selection.ids,
  subscribe: (listener) => renderer.onFrame(listener),
});
// Reference once so the unused-binding lint stays happy; the handle
// lives for the lifetime of the page.
void canvasOutline;

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
    // Phase 112 — cellSize required so block walls can expand to
    // their 4 perimeter LoS segments.
    collectSightWalls(state.walls, state.grid.cellSize),
    // Phase 57 — light sources also follow the drag overlay so a
    // torchbearer's halo doesn't get left behind mid-drag.
    collectLights(state.tokens, state.grid, dragOverlayRef.current),
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

fogWorkerClient.onLosUpdate((polygons) => {
  renderer.requestRender();
  // Phase 58 — "Follow-the-fog": when the user has opted into
  // auto-reveal AND LoS is on, every fresh viewer polygon update
  // also paints `revealed=1` into the manual fog buffer for any
  // cell inside the polygon that wasn't already revealed. The
  // helper short-circuits when the diff is empty, so non-moving
  // viewers don't churn out empty patches.
  maybeAutoRevealFromPolygons(polygons);
});

function maybeAutoRevealFromPolygons(
  polygons: readonly (readonly import('../state/los.js').LosPoint[])[],
): void {
  const prefs = preferences.get();
  if (!prefs.autoRevealFromViewers) return;
  if (prefs.losMode === 'off') return;
  if (polygons.length === 0) return;
  const state = store.getState();
  const cells = cellsToReveal(polygons, state.fog, state.grid);
  if (cells.length === 0) return;
  store.applyPatch({ kind: 'fog-set', cells });
}

refreshLos();
refreshFogRects();

panZoomRef.handle = attachPanZoom(renderer, {
  // Phase 104 — when an AoE preview is in flight, the second finger is
  // claimed by the AoE tool's two-finger rotate gesture instead of
  // engaging pinch-zoom. Predicate is re-evaluated on every
  // pointerdown so the suppression naturally lifts when the AoE
  // commit / cancel clears the preview ref.
  shouldSuppressPinch: () => aoeOverlayRef.current !== null,
});

const persistCameraDebounced = debounce(() => {
  if (preferences.get().persistCamera) saveCamera('gm', renderer.camera);
}, 400);
renderer.onCameraChange(persistCameraDebounced);

let lastAutoRevealPref = preferences.get().autoRevealFromViewers;
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
  // Phase 58 — when the user flips autoRevealFromViewers from off→on,
  // immediately auto-reveal cells under the current viewer polygons
  // (otherwise nothing happens until a viewer next moves, which is
  // a confusing UX — "I turned the toggle on and nothing changed").
  if (prefs.autoRevealFromViewers && !lastAutoRevealPref) {
    const polys = fogWorkerClient.getLatestPolygons();
    if (polys) maybeAutoRevealFromPolygons(polys);
  }
  lastAutoRevealPref = prefs.autoRevealFromViewers;
});

const inputContext = {
  canvas,
  renderer,
  store,
  selection,
  dragOverlay: dragOverlayRef,
  // Phase 85 — endpoint drag for the in-place wall editor.
  endpointDrag: endpointDragRef,
  blockResize: blockResizeRef,
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
toolManager.register(
  createTokenTool(inputContext, {
    // Phase 137 — gate auto-numbering on the user-preference flag.
    autoNumber: () => preferences.get().autoNumberDuplicateTokens,
  }),
);
// Phase 142 — tile-paint tool. Options ref shared with the side
// panel mounted below; the panel mutates `optionsRef.current` so
// changes apply on the next pointerdown.
const tilePaintOptionsRef = createTilePaintOptionsRef();
toolManager.register(
  createTilePaintTool(inputContext, tilePaintOptionsRef, {
    // Phase 150 — gate the wall-coupling behavior on the user
    // preference flag. When ON, painting a 'wall' tile creates a
    // 1×1 block wall on the same cell; erasing removes it.
    coupleWalls: () => preferences.get().coupleTilePaintWalls,
  }),
);
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
  createTravelTool({
    ...inputContext,
    travelOverlay: travelOverlayRef,
    travelOptions: travelToolOptionsRef,
  }),
);
// Phase 112 — Walls tool options (line vs block mode) + the
// drag-time block preview ref. Both passed into the tool + the
// settings panel so the GM can flip between modes mid-session.
const wallsToolOptionsRef = createWallsToolOptionsRef();
const blockPreviewRef = createBlockPreviewRef();
toolManager.register(
  createWallsTool({
    ...inputContext,
    wallsOverlay: wallsOverlayRef,
    wallsToolOptions: wallsToolOptionsRef,
    blockPreview: blockPreviewRef,
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
    { id: 'walls', label: 'Walls (W)', title: 'Click to drop wall vertices; Escape / right-click / double-click ends the chain. Walls are GM-only — sight-blocking walls occlude both viewer line-of-sight and token light sources.' },
    { id: 'tile-paint', label: 'Paint (P)', title: 'Phase 142 — paint colored tiles (floor / wall / water / rough / pit) on the grid. Cosmetic visual layer; doesn\'t affect LoS or movement.' },
    { id: 'travel', label: 'Travel (G)', title: 'Phase 158 — drop waypoints to mark a travel route. Double-click or Enter finishes; Escape / right-click cancels. Routes persist with the scene; right-click an existing route on the canvas to delete it.' },
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
// Phase 145 — scene-switch loading overlay. Mounted on body so it
// can absolutely-position over the canvas. Initial update comes
// from the very next store.subscribe tick + the imageLoader's
// onReady callback hooked above.
const sceneLoadingOverlay = mountSceneLoadingOverlay(
  document.body,
  imageLoader,
);
sceneLoadingOverlayUpdate = sceneLoadingOverlay.update;
sceneLoadingOverlay.update(store.getState().background.imageId);
mountTilePaintSettings(document.body, tilePaintOptionsRef, toolManager, store);
// Phase 112 — Walls tool mode toggle (Lines / Block) shown only
// while the Walls tool is active.
mountWallsSettings(document.body, wallsToolOptionsRef, toolManager);
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
  identityPrefs,
  store,
});

async function applyBackgroundBlob(
  blob: Blob,
  mimeType: string,
  name?: string,
) {
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
  // Phase 108 — record this background as just-applied so the recent-
  // backgrounds picker can re-apply it later without re-uploading.
  recordBackground(id, mimeType, name ? { name } : {});
  // Phase 101 — fire-and-forget grid auto-detection. The detector
  // pulls the blob through a downsampled canvas + autocorrelation
  // pass; on a confident match (and only when the answer differs
  // from the user's current grid), surface a Snap action banner.
  // Detection is async + non-blocking so the upload UX stays
  // identical for users who don't care.
  void runGridDetectionForBackground(blob, width, height);
}

/**
 * Phase 108 — re-apply a background that's already in IDB. Used by
 * the recent-backgrounds picker: the blob already exists, so we
 * skip `putImage` (no duplicate IDB record) and just dispatch the
 * `background-update` patch + bump the recents entry to the front.
 *
 * Returns false when the IDB record is missing (the picker uses this
 * to surface a "broken entry — was it deleted?" hint to the user).
 */
async function applyBackgroundFromIdb(imageId: string): Promise<boolean> {
  const record = await getImage(imageId);
  if (!record) return false;
  const { width, height } = await readBlobImageDimensions(record.blob);
  imageLoader.invalidate(imageId);
  const { grid } = store.getState();
  const gridW = grid.cols * grid.cellSize;
  const gridH = grid.rows * grid.cellSize;
  const scaleX = gridW / width;
  const scaleY = gridH / height;
  store.applyPatch({
    kind: 'background-update',
    changes: { imageId, offsetX: 0, offsetY: 0, scaleX, scaleY },
  });
  // No name override — preserve any name already in the recents entry
  // (the user uploaded "castle.png" originally; we don't want to lose
  // that label just because a re-application doesn't have a file name).
  recordBackground(imageId, record.mimeType);
  return true;
}

/**
 * Phase 101 — opt-in helper that runs the grid detector against an
 * uploaded background image and, if it finds a confident grid that
 * differs from the user's current setting, offers a one-click Snap
 * banner. Failures + low-confidence results are silent — there's no
 * reason to nag the GM about a detector that didn't fire.
 */
async function runGridDetectionForBackground(
  blob: Blob,
  imgWidth: number,
  imgHeight: number,
): Promise<void> {
  try {
    const result = await detectGridFromBlob(blob);
    if (!result) return;
    const detectedCellSize = result.cellSizePx;
    if (detectedCellSize <= 0) return;
    // Compare against the cell size IMPLIED by the current background
    // fit. If we already match (within 1 image-pixel), there's nothing
    // for the user to snap to — silently skip the banner.
    const { grid } = store.getState();
    const currentImgCellW = imgWidth / grid.cols;
    const currentImgCellH = imgHeight / grid.rows;
    if (
      Math.abs(currentImgCellW - detectedCellSize) <= 1 &&
      Math.abs(currentImgCellH - detectedCellSize) <= 1
    ) {
      return;
    }
    const newCols = Math.max(1, Math.round(imgWidth / detectedCellSize));
    const newRows = Math.max(1, Math.round(imgHeight / detectedCellSize));
    // Don't clobber a higher-priority banner (conflict warnings,
    // PWA update notice). Those take precedence; the Snap suggestion
    // is purely an enhancement.
    if (statusBanners.isVisible()) return;
    statusBanners.show({
      message: `Detected a ${detectedCellSize} px grid in this image. Snap the app's grid to match?`,
      variant: 'info',
      dismissible: true,
      onDismiss: () => statusBanners.hide(),
      actionLabel: 'Snap',
      onAction: () => {
        store.batch(() => {
          store.applyPatch({
            kind: 'grid-update',
            changes: {
              cellSize: detectedCellSize,
              cols: newCols,
              rows: newRows,
            },
          });
          store.applyPatch({
            kind: 'background-update',
            changes: { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 },
          });
        });
        statusBanners.hide();
        announcer.announce(
          `Grid snapped to ${detectedCellSize} pixel cells (${newCols} by ${newRows}).`,
        );
      },
    });
    announcer.announce(
      `Detected a ${detectedCellSize} pixel grid in the uploaded image. A Snap action is available in the status banner.`,
    );
  } catch (err) {
    console.warn('[gm] grid auto-detection failed', err);
  }
}

// Phase 100 — drag-and-drop + paste-to-upload for the GM background.
// Wires to the same `applyBackgroundBlob` path the session-menu
// "Upload Map" button uses, so IDB write + background-update patch
// flow + LoS recompute all stay identical. The overlay is full-
// viewport so a near-miss release doesn't trigger the browser's
// default "open image in new tab" — which would destroy the session.
mountUploadDropZone({
  canvas,
  onUpload: async (blob, mimeType) => {
    try {
      // Drag-drop / paste blobs may carry a `name` if they came in
      // as Files; falling back to mimeType-derived extension so the
      // recents list still has SOMETHING readable.
      const name =
        blob instanceof File && blob.name
          ? blob.name
          : friendlyNameFromMime(mimeType);
      await applyBackgroundBlob(blob, mimeType, name);
      announcer.announce('Background image set from drop / paste.');
    } catch (err) {
      console.warn('[upload-drop-zone] failed to apply background', err);
      window.alert('Failed to set background from the dropped / pasted image.');
    }
  },
  onRejectedNonImage: () => {
    announcer.announce(
      'Only image files are accepted as backgrounds. Try a PNG, JPG, or GIF.',
    );
  },
});

const presetBackgroundsModal = mountPresetBackgroundsModal({
  onPick: async (preset) => {
    try {
      const url = resolvePresetUrl(preset);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      // Use the preset's display name as the recents label so the
      // picker shows e.g. "Tavern (Preset)" instead of "(unnamed map)".
      await applyBackgroundBlob(
        blob,
        blob.type || 'image/svg+xml',
        `${preset.name} (Preset)`,
      );
    } catch (err) {
      console.error('[gm] preset background load failed', err);
      window.alert('Failed to load preset map.');
    }
  },
});

// Phase 108 — recent backgrounds quick switcher. Lists the up-to-12
// most recent background images (across upload paths) so the GM can
// re-apply a previously-used map in one click without re-uploading.
const recentBackgroundsModal = mountRecentBackgroundsModal({
  getEntries: () => listRecent(),
  getThumbnailURL: (id) => getImageURL(id),
  onPick: async (entry) => {
    try {
      const ok = await applyBackgroundFromIdb(entry.imageId);
      if (!ok) {
        // The IDB record is gone — the modal already removes the row
        // when its thumbnail load fails, but a click on a stale row
        // could land before that fires. Surface a non-fatal hint and
        // forget the entry so future opens don't show the broken row.
        forgetBackground(entry.imageId);
        announcer.announce(
          'That recent background is no longer in storage.',
          'assertive',
        );
        return;
      }
      announcer.announce(
        `Applied recent background: ${entry.name ?? 'unnamed map'}.`,
      );
    } catch (err) {
      console.error('[gm] re-apply recent background failed', err);
      window.alert('Failed to re-apply that background.');
    }
  },
  onForget: (id) => forgetBackground(id),
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
  // Phase 137 — auto-suffix the library entry's label against the
  // current canvas. Library entries are templates by definition
  // (e.g. "Goblin"), so dropping multiples is exactly the use case.
  if (preferences.get().autoNumberDuplicateTokens) {
    const existing = store.getState().tokens.map((t) => t.label);
    token.label = nextLabelSuffix(existing, token.label);
  }
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
      await applyBackgroundBlob(file, file.type || 'image/png', file.name);
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
  // Phase 141 — Universal VTT import. Lazy-imports the parser
  // module so the (~3 KB) parser doesn't ship in the initial bundle
  // for users who never use the feature.
  onUvttImport: async (file) => {
    try {
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        window.alert('That file is not valid JSON. Expected a .dd2vtt or .uvtt file.');
        announcer.announce('UVTT import failed: not valid JSON.', 'assertive');
        return;
      }
      const { parseUvtt, dataUrlToBlob, gridUpdateFromScene } = await import(
        '../state/uvtt-import.js'
      );
      const scene = parseUvtt(raw);
      const summary = [
        `Background image: ${scene.background.imageDataUrl ? 'yes' : 'no'}`,
        `Walls: ${scene.stats.wallSegments} segments`,
        `Doors: ${scene.stats.portals}`,
        `Lights: ${scene.stats.skippedLights} skipped (not imported in this version)`,
        `Grid: ${scene.grid.cols} × ${scene.grid.rows} @ ${scene.grid.cellSize} px/cell`,
      ];
      if (scene.warnings.length > 0) {
        summary.push('', 'Warnings:');
        for (const w of scene.warnings) summary.push(`- ${w}`);
      }
      summary.push('', 'Import? Walls + grid + background will replace any current values.');
      const ok = window.confirm(summary.join('\n'));
      if (!ok) {
        announcer.announce('UVTT import cancelled.');
        return;
      }
      // Background — write blob to IDB if present, then patch.
      if (scene.background.imageDataUrl) {
        const { blob, mimeType } = dataUrlToBlob(scene.background.imageDataUrl);
        const imageId = await putImage(blob, mimeType);
        imageLoader.invalidate(imageId);
        const w = scene.background.nativeImageWidth ?? scene.grid.cols * scene.grid.cellSize;
        const h = scene.background.nativeImageHeight ?? scene.grid.rows * scene.grid.cellSize;
        store.applyPatch({
          kind: 'background-update',
          changes: {
            imageId,
            offsetX: 0,
            offsetY: 0,
            scaleX: (scene.grid.cols * scene.grid.cellSize) / w,
            scaleY: (scene.grid.rows * scene.grid.cellSize) / h,
            rotation: 0,
            flipX: false,
            flipY: false,
          },
        });
      }
      // Grid update (cols / rows / cellSize).
      const gridUpdate = gridUpdateFromScene(scene, store.getState().grid);
      store.applyPatch({ kind: 'grid-update', changes: gridUpdate });
      // Walls — batched to a single render pass.
      store.batch(() => {
        // Clear any existing walls so the import is a clean state.
        store.applyPatch({ kind: 'walls-clear' });
        for (const wall of scene.walls) {
          store.applyPatch({ kind: 'wall-add', wall });
        }
      });
      announcer.announce(
        `UVTT import complete: ${scene.stats.wallSegments} walls + ${scene.stats.portals} doors.`,
      );
    } catch (err) {
      console.error('[gm] UVTT import failed', err);
      window.alert('UVTT import failed. See console for details.');
      announcer.announce('UVTT import failed.', 'assertive');
    }
  },
  onSettings: () => settingsModal.open(),
  onToggleNotes: () => notesPanel.toggle(),
  // Phase 94 — combat log panel toggle.
  onToggleCombatLog: () => combatLogPanel.toggle(),
  // Phase 97 — snapshot history modal.
  onOpenSnapshotHistory: () => snapshotHistoryModal.open(),
  onShortcuts: () => shortcutOverlay.open(),
  onInitiative: () => initiativeModal.open(),
  onTokenLibrary: () => tokenLibraryModal.open(),
  onTemplateLibrary: () => templateLibraryModal.open(),
  onScenes: () => scenesModal.open(),
  onReplayTour: () => openOnboardingTour(),
  onRemotePlay: () => remotePlayModal?.open(),
  onPermissions: () => permissionsModal.open(),
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
  // Phase 109 — per-Spectator visibility. Callbacks read the lazily-
  // mounted identityRegistry + permissionsStore (both declared lower
  // in the file) via closures, so TDZ doesn't fire at module init —
  // these only execute when the user opens the editor.
  getConnectedSpectators: () =>
    identityRegistry
      .list()
      .filter((p) => p.role === 'spectator')
      .map((p) => ({ id: p.id, name: p.name, color: p.color })),
  isTokenHiddenForSpectator: (playerId, tokenId) =>
    permissionsStore.isTokenHidden(playerId, tokenId),
  setTokenHiddenForSpectator: (playerId, tokenId, hidden) =>
    permissionsStore.setTokenHidden(playerId, tokenId, hidden),
});
const annotationEditor = mountAnnotationEditor({ store });
// Phase 85 — in-place wall editor. Opened from the right-click
// "Edit wall…" entry. The modal calls back here with the edits;
// we wrap them in a `store.batch` so a multi-select edit shows up
// in the undo stack as a single step.
const wallEditor = mountWallEditor({
  getWallById: (id) => store.getState().walls.find((w) => w.id === id) ?? null,
  onChange: (ids, changes) => {
    if (ids.length === 0) return;
    // Phase 113 — `door: null` from the editor means "remove the
    // door promotion entirely." The store does a naive spread so a
    // null value would set `door: null` instead of removing the
    // field. Translate to a per-id wall-update that omits `door`
    // and a separate delete via wall-replace would be ideal — but
    // the simpler path is to apply the non-door changes first, then
    // replace the wall via wall-add (preserving id) for the door
    // removal. To keep the patch model simple we just delete +
    // re-add with a fresh wall object minus `door`.
    const removeDoor = Object.prototype.hasOwnProperty.call(changes, 'door') &&
      (changes as { door?: unknown }).door === null;
    // The store-patch type doesn't accept `door: null`; we already
    // strip it via `delete` below so the runtime spread merge sees a
    // sane object. Cast through `unknown` because TypeScript can't
    // see the delete narrows the union member type.
    const restChanges = { ...changes } as Record<string, unknown>;
    if (removeDoor) {
      delete restChanges.door;
    }
    store.batch(() => {
      for (const id of ids) {
        if (Object.keys(restChanges).length > 0) {
          store.applyPatch({
            kind: 'wall-update',
            id,
            changes: restChanges as Parameters<typeof store.applyPatch>[0] extends {
              kind: 'wall-update';
              changes: infer C;
            }
              ? C
              : never,
          });
        }
        if (removeDoor) {
          // Replace the wall with a fresh copy that has no `door`
          // field. We can't update-to-undefined via spread, so do it
          // via remove + re-add of an explicitly-rebuilt wall.
          const w = store.getState().walls.find((x) => x.id === id);
          if (w && w.kind === 'segment' && w.door !== undefined) {
            const { door: _door, ...rest } = w;
            void _door;
            store.applyPatch({ kind: 'wall-remove', id });
            store.applyPatch({ kind: 'wall-add', wall: rest });
          }
        }
      }
    });
  },
  onDelete: (ids) => {
    store.batch(() => {
      for (const id of ids) {
        store.applyPatch({ kind: 'wall-remove', id });
      }
    });
    selection.ids = new Set();
    renderer.requestRender();
  },
  // Phase 111 — provide the live grid cell size to the wall editor's
  // "Fill cell" preset button. The button snaps the wall's thickness
  // to the current cellSize so a stout interior divider can fill a
  // tile in one click.
  getCellSize: () => store.getState().grid.cellSize,
});
// Phase 94 — combat log + auto-observer. The log is in-memory only
// (per-tab session); on reload it starts empty. The observer
// subscribes to the store + emits `condition-added/removed`,
// `death-save`, and `turn` events automatically. Damage / heal events
// fire EXPLICITLY from the dialog + Phase 92 quick-HP paths so the
// log only records intentional combat damage (not Token Editor
// max-HP edits which would otherwise look like real combat events).
const combatLog = createCombatLog();
const combatLogObserver = attachCombatLogObserver({ store, log: combatLog });
const combatLogPanel = mountCombatLogPanel({ log: combatLog });
// Reference once so the unused-binding lint stays happy; the handle
// lives for the lifetime of the page.
void combatLogObserver;

// Phase 119 — player chat. In-memory ring buffer; messages broadcast
// over the existing sync channel; the GM sees everything (including
// `gm-only`) by design. The panel itself is hidden until the user
// toggles it via the command palette / session menu.
const chatHistory = createChatHistory();
const chatPanel = mountChatPanel({
  history: chatHistory,
  viewMode: 'gm',
  onSend: (text, visibility) => {
    const ownIdent = ownIdentity();
    const msg = {
      id: nid(),
      senderId: playerId,
      senderName: ownIdent.name,
      senderRole: 'gm' as const,
      text,
      visibility,
      timestamp: Date.now(),
    };
    chatHistory.add(msg);
    channel?.send({
      type: 'chat',
      messageId: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      text: msg.text,
      visibility: msg.visibility,
      timestamp: msg.timestamp,
    });
  },
});

// Phase 120 — player-proposed annotations queue. Spectators send
// proposals over the wire; the GM reviews them in this panel and
// approves (fires a real `annotation-add` patch) or dismisses
// (drops locally). The queue is in-memory only — on tab reload the
// pending suggestions are lost (Spectators have to re-suggest).
const annotationProposals = createAnnotationProposals();
const annotationProposalsPanel = mountAnnotationProposalsPanel({
  proposals: annotationProposals,
  onApprove: (p) => {
    const annotation: Annotation = {
      id: nid(),
      x: p.x,
      y: p.y,
      text: p.text,
      color: p.color || DEFAULT_ANNOTATION_COLOR,
      visibility: 'shared',
    };
    store.applyPatch({ kind: 'annotation-add', annotation });
    annotationProposals.remove(p.id);
    announcer.announce(`Approved annotation from ${p.senderName || 'player'}.`);
  },
  onDismiss: (p) => {
    annotationProposals.remove(p.id);
    announcer.announce(`Dismissed annotation suggestion from ${p.senderName || 'player'}.`);
  },
});

// Phase 99 — conflict-loser archive. Captures the about-to-be-
// overwritten state when the GM resolves a Phase 84 conflict by
// adopting the OTHER tab's state (`gm-takeover` apply path). 1-hour
// TTL + 5-entry cap; localStorage-backed for sync access during the
// synchronous gm-takeover handler.
const conflictLoserArchive = createConflictLoserArchive();
const conflictLoserArchiveModal = mountConflictLoserArchiveModal({
  getEntries: () => conflictLoserArchive.listFresh(),
  onRestore: (snap: LoserSnapshot) => {
    try {
      store.loadState(deserializeState(snap.state));
      store.clearHistory();
      void saveState(store.getState());
      // Drop the entry — recovery is one-shot. If the user restored
      // by mistake they can re-trigger the conflict, but there's no
      // way to re-archive automatically.
      conflictLoserArchive.remove(snap.id);
      announcer.announce(
        `Restored conflict-archive state from ${new Date(snap.recordedAt).toLocaleTimeString()}.`,
        'assertive',
      );
    } catch (err) {
      console.warn('[conflict-loser-archive] restore failed', err);
      announcer.announce('Failed to restore archived state.', 'assertive');
    }
  },
  onDiscard: (id) => conflictLoserArchive.remove(id),
  onClearAll: () => conflictLoserArchive.clear(),
});

// Phase 102 — named camera bookmarks. The modal lists per-scene
// bookmarks with Jump / Rename / Delete actions; the host wires
// the data getters + action callbacks to `camera-bookmarks.ts` and
// drives the actual camera move through the renderer. Slot
// numbers (1..9) on the first nine entries match the Alt+N hotkey
// handler below.
const cameraBookmarksModal = mountCameraBookmarksModal({
  getEntries: () => {
    const sceneId = getActiveSceneId();
    return sceneId ? listBookmarks(sceneId) : [];
  },
  getCurrentCamera: () => ({ ...renderer.camera }),
  onSave: (name, camera) => {
    const sceneId = getActiveSceneId();
    if (!sceneId) return;
    addBookmark(sceneId, name, camera);
    announcer.announce(`Saved camera bookmark: ${name}.`);
  },
  onJump: (id) => {
    const sceneId = getActiveSceneId();
    if (!sceneId) return;
    const entry = listBookmarks(sceneId).find((b) => b.id === id);
    if (!entry) return;
    // Phase 166 — tween instead of snap. Reduced-motion users get
    // an instant snap (the helper short-circuits on durationMs <= 0
    // OR `reducedMotion: true`).
    tweenCamera(renderer, entry.camera, {
      durationMs: 250,
      reducedMotion: preferences.get().reducedMotion,
    });
    sendCameraIfBroadcasting();
    renderer.requestRender();
    announcer.announce(`Jumped to bookmark: ${entry.name}.`);
  },
  onRename: (id, name) => updateBookmark(id, { name }),
  onDelete: (id) => removeBookmark(id),
});

/**
 * Phase 102 — Alt+N quick-jump. Looks up the Nth bookmark for the
 * active scene (newest-first, matching the modal's slot column) and
 * snaps the camera to it. Silently no-ops when the slot is empty
 * (e.g. user presses Alt+5 on a scene with two bookmarks).
 */
/**
 * Phase 169 — programmatically open the OS color picker for
 * setting the background fill color. Creates a hidden
 * `<input type="color">` lazily on first call (we keep the
 * element around for subsequent picks so the picker remembers
 * the last value), wires a one-shot `change` listener that
 * dispatches the `background-update` patch, then clicks() the
 * input.
 */
let bgFillColorPicker: HTMLInputElement | null = null;
function pickBackgroundFillColor(initial: string | undefined): void {
  if (!bgFillColorPicker) {
    bgFillColorPicker = document.createElement('input');
    bgFillColorPicker.type = 'color';
    bgFillColorPicker.style.position = 'fixed';
    bgFillColorPicker.style.left = '-9999px';
    bgFillColorPicker.style.opacity = '0';
    document.body.appendChild(bgFillColorPicker);
  }
  bgFillColorPicker.value = initial || '#1a1a1a';
  const onChange = () => {
    bgFillColorPicker!.removeEventListener('change', onChange);
    const next = bgFillColorPicker!.value;
    if (!/^#[0-9a-fA-F]{6}$/.test(next)) return;
    store.applyPatch({
      kind: 'background-update',
      changes: { fillColor: next },
    });
  };
  bgFillColorPicker.addEventListener('change', onChange);
  bgFillColorPicker.click();
}

/**
 * Phase 168 — right-click "Distance to…" measurement. The GM
 * right-clicks token A, picks "Distance to…", then clicks any
 * token B; the distance from A to B is computed and announced.
 * Single-shot: the next pointer-down on the canvas fires the
 * computation regardless of whether a token is hit (a miss
 * cancels). Esc also cancels.
 *
 * Uses the existing `gridDistance` helper + the active
 * `diagonalRule` + `distanceUnit` preference so the readout
 * matches the ruler's units.
 */
function startDistanceFromToken(source: Token): void {
  // Read source data NOW since the user could move/edit the token
  // before clicking the target. We snapshot label + cell coords.
  const sourceLabel = source.label || 'Token';
  const sourceX = source.x;
  const sourceY = source.y;
  announcer.announce(
    `Click another token to measure distance from ${sourceLabel}. Esc to cancel.`,
  );
  canvas.style.cursor = 'crosshair';

  function cleanup(): void {
    canvas.removeEventListener('pointerdown', onPick, true);
    window.removeEventListener('keydown', onCancel, true);
    canvas.style.cursor = '';
  }

  function onCancel(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      cleanup();
      announcer.announce('Distance measurement cancelled.');
      e.preventDefault();
    }
  }

  function onPick(e: PointerEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    cleanup();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const camera = renderer.camera;
    const wx = sx / camera.zoom + camera.x;
    const wy = sy / camera.zoom + camera.y;
    const state = store.getState();
    const cellSize = state.grid.cellSize;
    // Hit-test: which token contains the world point?
    const target = state.tokens.find((t) => {
      const cx = (t.x + t.size / 2) * cellSize;
      const cy = (t.y + t.size / 2) * cellSize;
      const r = (t.size * cellSize) / 2;
      const ddx = wx - cx;
      const ddy = wy - cy;
      return ddx * ddx + ddy * ddy <= r * r;
    });
    if (!target || target.id === source.id) {
      announcer.announce('No target token at that point.');
      return;
    }
    // Cell-distance via the active diagonal rule.
    const dxCells = target.x - sourceX;
    const dyCells = target.y - sourceY;
    const prefs = preferences.get();
    const cells = gridDistance(dxCells, dyCells, prefs.diagonalRule);
    const text = formatDistance(cells, prefs.distanceUnit, prefs.feetPerSquare);
    announcer.announce(
      `${sourceLabel} → ${target.label || 'Token'}: ${text}`,
    );
  }

  canvas.addEventListener('pointerdown', onPick, true);
  window.addEventListener('keydown', onCancel, true);
}

/**
 * Phase 167 — contextual fit. When the user has selected tokens,
 * tween-fit the camera to that selection's bounding box. Empty
 * selection falls through to the pre-167 `fitToContent` (whole-
 * map fit). Same `F` key, smarter behavior.
 *
 * 60 px padding (vs `fitToContent`'s 40) gives selection-fit a
 * bit more breathing room — selecting a single token shouldn't
 * fill the entire viewport with just that one token.
 */
function fitSelectionOrContent(): void {
  const state = store.getState();
  const bounds = tokenSelectionBounds(state, selection.ids);
  if (bounds) {
    const target = cameraToFitBounds(renderer, bounds, 60);
    if (target) {
      tweenCamera(renderer, target, {
        durationMs: 250,
        reducedMotion: preferences.get().reducedMotion,
      });
      sendCameraIfBroadcasting();
      renderer.requestRender();
      return;
    }
  }
  fitToContent(renderer, state, (id) => imageLoader.get(id));
}

function jumpToBookmarkSlot(slot: number): void {
  const sceneId = getActiveSceneId();
  if (!sceneId) return;
  const entry = pickBookmarkSlot(sceneId, slot);
  if (!entry) {
    announcer.announce(`No camera bookmark in slot ${slot}.`);
    return;
  }
  // Phase 166 — same tween treatment as the modal's Jump button.
  tweenCamera(renderer, entry.camera, {
    durationMs: 250,
    reducedMotion: preferences.get().reducedMotion,
  });
  sendCameraIfBroadcasting();
  renderer.requestRender();
  announcer.announce(`Jumped to bookmark: ${entry.name}.`);
}

// Phase 97 — restore-from-snapshot modal. Surfaces the rotating
// per-scene snapshot history captured by the persist debounce
// (see `recordSnapshot` invocation lower down). On Restore, swap
// the store's state to the snapshot + flush a save so the change
// survives a reload race.
const snapshotHistoryModal = mountSnapshotHistoryModal({
  getActiveSceneId: () => getActiveSceneId(),
  onRestore: (snap: Snapshot) => {
    try {
      store.loadState(deserializeState(snap.state));
      store.clearHistory();
      void saveState(store.getState());
      announcer.announce(
        `Restored snapshot from ${new Date(snap.takenAt).toLocaleTimeString()}.`,
        'assertive',
      );
    } catch (err) {
      console.warn('[snapshot-history] restore failed', err);
      announcer.announce('Failed to restore snapshot.', 'assertive');
    }
  },
});

const damageHealDialog = mountDamageHealDialog({
  store,
  onAnnounce: (msg) => announcer.announce(msg),
  // Phase 77 — emit one damage-fx event per affected token. We
  // queue it locally (so the GM sees the floating number on their
  // own canvas) AND broadcast it so the Spectator's tab plays the
  // same animation. Monotonic id from `Date.now()` for de-dup.
  //
  // Phase 94 — also record into the combat log. We look up the
  // up-to-date token by id (the dialog passes the id, not the
  // post-update Token) so `hpAfter` reflects the patched HP.
  onDamageFx: (tokenId, amount) => {
    damageFxManager.add(tokenId, amount);
    channel?.send({
      type: 'damage-fx',
      tokenId,
      amount,
      id: Date.now() + Math.floor(Math.random() * 1000),
    });
    const token = store.getState().tokens.find((t) => t.id === tokenId);
    if (token) combatLogObserver.recordDamage(token, amount);
  },
});

// Phase 157 — pass the active-scene-id source so notes are
// persisted per-scene under `gm-encounter-maps-notes:<sceneId>`.
// `switchToScene` calls `notesPanel.notifySceneSwitched()` after
// the pointer flip so the panel saves outgoing + loads incoming.
const notesPanel = mountNotesPanel({
  preferences,
  getActiveSceneId,
});

// Phase 123 — bulk-edit modal. Opens via the command palette
// (group "Tokens"). Operates on the current selection at open time;
// each Apply button runs inside store.batch() so the bulk action
// shows up as a single undo step.
const bulkEditModal = mountBulkEditModal({
  store,
  selection,
  onAnnounce: (msg) => announcer.announce(msg),
});

// ─── Phase 61 — Onboarding tour ──────────────────────────────────
// `openOnboardingTour` constructs a fresh controller every time so
// each replay starts at step 1. The controller's `onComplete` /
// `onSkip` callbacks both flip `onboardingComplete=true` so the
// tour doesn't auto-show again on subsequent boots; the user can
// still replay it from the session-menu "Take the tour" entry.
function openOnboardingTour(): void {
  const controller = createTourController({
    steps: GM_TOUR_STEPS,
    onComplete: () => preferences.update({ onboardingComplete: true }),
    onSkip: () => preferences.update({ onboardingComplete: true }),
  });
  const tour = mountOnboardingTour(controller);
  tour.open();
}
// Auto-show the tour on first boot. Deferred via setTimeout so it
// runs AFTER the initial render — the popover layout needs the
// toolbar / canvas to have non-zero bounding rects to anchor against.
if (!preferences.get().onboardingComplete) {
  window.setTimeout(() => openOnboardingTour(), 250);
}
const shortcutOverlay = mountShortcutOverlay('gm');

// Phase 155 — shared "next turn" handler that auto-skips past dead
// tokens (when the preference is on) and emits a `'turn-skip'`
// combat-log event for each skipped entry. Used by the initiative
// bar, the initiative modal, and the command-palette
// "Initiative — next turn" action — all three share one
// implementation so the GM gets identical behavior everywhere.
function advanceTurnWithSkip(): void {
  const stateNow = store.getState();
  const useSkip = preferences.get().autoSkipDeadInInitiative;
  const result = useSkip
    ? advanceInitiativeSkippingDead(stateNow.initiative, stateNow.tokens)
    : { ...advanceInitiative(stateNow.initiative), skipped: [] };
  // Log each skipped entry BEFORE the patch fires, so the timeline
  // reads "Round 3 — Goblin's turn skipped (dead) → Round 3 —
  // Cleric's turn." Round number on each skip is the round AT THE
  // TIME the skip happened — wrap-induced bumps are reflected as
  // they happen, mirroring the natural turn ordering.
  for (const entry of result.skipped) {
    combatLog.add({
      kind: 'turn-skip',
      round: result.round,
      tokenId: entry.tokenId,
      tokenLabel: entry.label,
      reason: 'dead',
    });
  }
  store.applyPatch({
    kind: 'initiative-set-active',
    activeId: result.activeId,
    round: result.round,
  });
}

const initiativeModal = mountInitiativeModal({
  store,
  onAdvanceTurn: advanceTurnWithSkip,
});
mountInitiativeBar(store, 'gm', {
  onOpenTracker: () => initiativeModal.open(),
  onAdvanceTurn: advanceTurnWithSkip,
  // Phase 93 — turn-timer plumbing.
  getTurnTimerSeconds: () => preferences.get().turnTimerSeconds,
  onTimerExpired: (label) => {
    // Single short message — Phase 90's repeat-suppress prevents the
    // "Time" announcement from re-firing if the GM lingers on the
    // expired turn for a while.
    announcer.announce(`Time — ${label}`, 'assertive');
  },
});
mountHelpOverlay('gm');

// Phase 152 — "What's new" badge + modal. Mounted once per GM
// boot. If the user's last-seen version (in localStorage) is older
// than APP_VERSION, the modal auto-opens on first paint cycle so
// the user sees the new-feature highlights without having to dig
// into a menu.
const whatsNewModal = mountWhatsNewModal();
if (shouldShowWhatsNew()) {
  // Defer to the next animation frame so it doesn't race the
  // initial render + onboarding-tour mount above.
  requestAnimationFrame(() => whatsNewModal.open());
}

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
    // Phase 84 — keep the conflict-merge summary in sync so the modal
    // shows the right scene name when it opens.
    localSceneName = active?.name ?? '';
  } catch {
    sceneIndicator.setName(null, 0);
    localSceneName = '';
  }
}

async function switchToScene(id: string): Promise<void> {
  // Persist the outgoing scene (with a fresh thumbnail) before swapping.
  // 0.72.2 — skip the outgoing save when the initial hydrate hasn't
  // resolved yet. Same class of bug as the beforeunload handler: if
  // the user opens the scenes modal + clicks a scene (including the
  // currently-active one) before `loadPersistedState` has populated
  // the store, `store.getState()` here is the EMPTY default. Writing
  // that over the outgoing scene record silently wipes it while
  // leaving the scene catalog intact.
  const outgoingId = getActiveSceneId();
  if (outgoingId && initialLoadComplete) {
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
  // Phase 157 — flush the outgoing scene's notes textarea to its
  // per-scene key + load the incoming scene's notes. Called AFTER
  // `setActiveSceneId(id)` so the panel reads the new pointer for
  // the incoming load. The panel also reads `lastSceneId` from its
  // own internal cache for the outgoing save target.
  notesPanel.notifySceneSwitched();
  // Phase 75 — record the activation timestamp so the Ctrl+N
  // quick-switch hotkey can rank scenes by recency. Done BEFORE the
  // async getSceneState so the Nth-recent ordering is correct even
  // if the load takes a moment (Ctrl+N reads from localStorage,
  // not from in-flight promises).
  noteSceneActivated(id);
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

/**
 * Phase 75 — fire the Nth Ctrl-N quick-switch. Reads the live scenes
 * catalog + the recents map, picks the Nth most-recently-active
 * scene that ISN'T the current one, and switches to it. Silently
 * no-ops when the slot is empty (e.g. user only has 2 scenes and
 * pressed Ctrl+9).
 */
async function quickSwitchToRecent(slot: number): Promise<void> {
  let scenes;
  try {
    scenes = await listScenes();
  } catch (err) {
    console.warn('[scenes] Ctrl+N quick-switch: list failed', err);
    return;
  }
  if (scenes.length <= 1) return;
  const target = pickRecent(scenes, slot, getActiveSceneId());
  if (!target) {
    announcer.announce(`No recent scene in slot ${slot}.`);
    return;
  }
  await switchToScene(target.id);
}

async function handleDeleteActiveScene(): Promise<void> {
  // Called by the modal before it deletes the active scene: pick
  // another scene to become active, or create a blank one.
  const list = await listScenes();
  const activeId = getActiveSceneId();
  // Phase 102 — drop the deleted scene's camera bookmarks now that
  // it's gone. The per-scene cap would eventually evict orphans
  // anyway, but cleaning up explicitly keeps localStorage tidy +
  // avoids ghost bookmarks reappearing if a scene id ever recurs
  // (e.g. via JSON-import round trips).
  if (activeId) {
    forgetSceneBookmarks(activeId);
    // Phase 121 — drop the throttle's last-capture record for the
    // deleted id so a future scene with a recycled id starts fresh.
    sceneThumbnailThrottle.forget(activeId);
  }
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
// 0.57.1 — `broadcastInitial()` is deferred until AFTER load completes so
// the GM never blasts an empty `full-state` to a Spectator tab during
// the pre-load window (that race silently destroyed the active scene
// when both tabs were open; see the long comment near the channel
// handler block below for the failure mode).
void loadPersistedState().then(async (persisted) => {
  if (persisted) {
    store.loadState(persisted);
    store.clearHistory();
  }
  await refreshSceneIndicator();
  // Phase 157 — at mount time the notes panel may have read with a
  // null active scene id (the IDB hydrate is async). Now that the
  // scene pointer is settled, notify the panel so it loads notes
  // for the actually-active scene (with legacy fallback).
  notesPanel.notifySceneSwitched();
  initialLoadComplete = true;
  broadcastInitial();
});

const dicePanel = mountDicePanel({
  viewMode: 'gm',
  // Phase 73 — wire the reduced-motion pref into the dice tray so
  // users who opted out of animations get a quick "flash the result"
  // variant instead of the full tumble.
  getReducedMotion: () => preferences.get().reducedMotion,
  onLocalRoll: (roll) => {
    // Phase 63 — stamp the roll with our display name so remote
    // panels can render "Alice rolled 1d20" instead of generic
    // "GM rolled 1d20".
    const stamped = { ...roll, senderName: ownIdentity().name };
    channel?.send({ type: 'dice-roll', roll: stamped });
    announcer.announce(`You rolled ${roll.source}: ${roll.total}.`);
  },
});

// Phase 74 — slash-command input. Press `/` (when no input is
// focused) to type a slash command. The dispatcher routes:
//   /r <expr> + /dN [+mod] → dicePanel.roll() (history + tray + sync)
//   /init                  → roll initiative for unlinked tokens
//   /help                  → open the keyboard-shortcut overlay
const slashInput = mountSlashCommandInput({
  onCommand: (action) => {
    if (action.kind === 'roll') {
      const ok = dicePanel.roll(action.expression);
      // The panel's executeExpression already calls showError when
      // the parse fails, but the panel might not be open — surface
      // a copy in the slash input too so the user sees something.
      return ok ? undefined : `Couldn't parse: ${action.expression}`;
    }
    if (action.kind === 'init') {
      const state = store.getState();
      const fresh = rollInitiativeForUnlinkedTokens(
        state.tokens,
        state.initiative,
      );
      if (fresh.length === 0) {
        return 'No tokens to roll for (every token is already in the order).';
      }
      store.batch(() => {
        for (const entry of fresh) {
          store.applyPatch({ kind: 'initiative-add', entry });
        }
      });
      announcer.announce(
        `Rolled initiative for ${fresh.length} ${fresh.length === 1 ? 'token' : 'tokens'}.`,
      );
      return undefined;
    }
    if (action.kind === 'help') {
      shortcutOverlay.open();
      return undefined;
    }
    return undefined;
  },
});

function ping(worldX: number, worldY: number) {
  // Phase 146 — local pings now carry the GM's identity name + color
  // so the floating sender pill rendered in `layer-pings.ts` shows
  // attribution even on the local canvas (not just the broadcast
  // copy on remote peers).
  const identity = ownIdentity();
  pingManager.add(worldX, worldY, identity.color, identity.name);
  channel?.send({
    type: 'ping',
    x: worldX,
    y: worldY,
    color: identity.color,
    senderName: identity.name,
  });
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
    : hitTestWalls(state.walls, world.x, world.y, state.grid.cellSize);
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
    // Phase 113 — door quick-toggle. If EVERY selected wall is a door,
    // surface an "Open door(s)" / "Close door(s)" entry above the
    // sight-blocking toggle. The label flips based on whether any
    // currently-open door is in the selection (mirrors the
    // sight-blocking toggle's any-on logic).
    const allDoors =
      selectedWalls.length > 0 &&
      selectedWalls.every((x) => x.kind === 'segment' && x.door !== undefined);
    const anyOpenDoor = selectedWalls.some(
      (x) => x.kind === 'segment' && x.door?.open === true,
    );
    items.push(
      // Phase 85 — open the full wall editor for property + thickness +
      // visibility editing. Kept as the first action so it's the
      // discoverable entry point; the legacy quick toggles stay below
      // for muscle-memory users.
      {
        label: `Edit wall${suffix}…`,
        shortcut: 'E',
        onClick: () => wallEditor.openFor(selectedWalls),
      },
    );
    if (allDoors) {
      items.push(
        { kind: 'separator' },
        {
          label: anyOpenDoor
            ? `Close door${wallCount > 1 ? 's' : ''}`
            : `Open door${wallCount > 1 ? 's' : ''}`,
          onClick: () => {
            const target = !anyOpenDoor;
            store.batch(() => {
              for (const sw of selectedWalls) {
                if (sw.kind !== 'segment' || sw.door === undefined) continue;
                store.applyPatch({
                  kind: 'wall-update',
                  id: sw.id,
                  changes: { door: { open: target } },
                });
              }
            });
            announcer.announce(
              target
                ? `Door${wallCount > 1 ? 's' : ''} opened.`
                : `Door${wallCount > 1 ? 's' : ''} closed.`,
            );
          },
        },
      );
    }
    items.push(
      { kind: 'separator' },
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
        label: 'Distance to…',
        onClick: () => startDistanceFromToken(hit),
      },
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
    // Phase 140 — background orientation items, only meaningful when
    // a background image is actually placed.
    const bg = store.getState().background;
    if (bg.imageId) {
      items.push(
        { kind: 'separator' },
        {
          label: 'Rotate map 90°',
          onClick: () => {
            const next =
              ((bg.rotation ?? 0) + Math.PI / 2) % (Math.PI * 2);
            store.applyPatch({
              kind: 'background-update',
              changes: { rotation: next },
            });
          },
        },
        {
          label: bg.flipX ? 'Unflip horizontal' : 'Flip horizontal',
          onClick: () => {
            store.applyPatch({
              kind: 'background-update',
              changes: { flipX: !bg.flipX },
            });
          },
        },
        {
          label: bg.flipY ? 'Unflip vertical' : 'Flip vertical',
          onClick: () => {
            store.applyPatch({
              kind: 'background-update',
              changes: { flipY: !bg.flipY },
            });
          },
        },
        {
          label: 'Reset orientation',
          disabled:
            (bg.rotation ?? 0) === 0 && !bg.flipX && !bg.flipY,
          onClick: () => {
            store.applyPatch({
              kind: 'background-update',
              changes: { rotation: 0, flipX: false, flipY: false },
            });
          },
        },
      );
    }
    // Phase 169 — fill color always available, even when no
    // background image is set (the primary use case is empty
    // scenes wanting a custom backdrop). Uses a hidden
    // `<input type="color">` element clicked programmatically
    // so the user gets the OS-native color picker.
    items.push(
      { kind: 'separator' },
      {
        label: bg.fillColor
          ? `Change fill color (${bg.fillColor})…`
          : 'Set fill color…',
        onClick: () => pickBackgroundFillColor(bg.fillColor),
      },
    );
    if (bg.fillColor) {
      items.push({
        label: 'Clear fill color',
        onClick: () => {
          store.applyPatch({
            kind: 'background-update',
            changes: { fillColor: undefined },
          });
        },
      });
    }
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

// Phase 103 — touch long-press → synthetic contextmenu. Tablet GMs
// don't have a right-click affordance; holding a finger on the
// canvas for ~500 ms now opens the same context menu desktop GMs
// reach via right-click. The detector cancels if the user starts
// to pan / draw (move past 10 px) or if a second finger lands
// (gesture upgraded to pinch). When the timer expires we just
// dispatch a synthetic `contextmenu` event at the touchdown point —
// the existing canvas listener above does the rest.
attachLongPress(canvas, {
  onLongPress: (x, y) => {
    dispatchSyntheticContextMenu(canvas, x, y);
  },
});

// Phase 66 — `createSyncChannel` now takes the tab's player id so
// every outgoing envelope is stamped with the sender. We hoist the
// `playerId` generation here (was just below) so it's available
// when the channel is constructed; the rest of the identity wiring
// (registry, `ownIdentity()`, `broadcastIdentity()`) stays where it
// was, just referencing this earlier-declared id.
//
// Phase 110 — sessionStorage-backed so reloads keep the SAME id.
// Pre-110 every reload minted a fresh id, which made the GM
// reappear in the spectator's connected-players list as a new
// participant (with default permissions / no scoping carried over).
// Stable across reloads, fresh per tab.
const playerId = getOrCreatePlayerId('gm');
const channel = createSyncChannel(playerId);

// Phase 62 — Remote Play modal. Only mounted when BroadcastChannel
// is available (same prereq as the channel itself); `onRemotePlay`
// in the session-menu wiring above becomes a no-op otherwise.
// Phase 64 — shared `RemoteSession` holds the active peer so the
// status chip + the full-state-rebroadcast logic can observe.
const remoteSession = createRemoteSession();
const remotePlayModal = channel
  ? mountRemotePlayModal({ channel, viewLabel: 'GM', session: remoteSession })
  : null;
// Phase 64 — persistent status chip. Hidden while `remoteSession`
// is idle; clicking it reopens the Remote Play modal so the user
// can Disconnect / Reconnect without hunting through the menu.
// Phase 83 — latency tracker passed in so the chip can show RTT.
const latencyTracker = createLatencyTracker();
if (channel) {
  mountRemoteStatusChip({
    session: remoteSession,
    onClick: () => remotePlayModal?.open(),
    latency: latencyTracker,
  });
}

// Phase 83 — RTT probe loop. Sends a `latency-probe` every
// PROBE_INTERVAL_MS while a remote peer is connected; the receiver
// echoes it back via `latency-probe-reply`. We track sent timestamps
// in a Map keyed by probe id so a reply can be matched + the RTT
// computed. The map is pruned of probes older than 60 s so a flaky
// network doesn't grow it unbounded.
const inflightProbes = new Map<number, number>();
let probeIntervalId = 0;
let probeIdSeq = 1;
const PROBE_TIMEOUT_MS = 60_000;
function sendProbe() {
  if (!channel) return;
  if (remoteSession.getState() !== 'connected') return;
  const id = probeIdSeq++;
  inflightProbes.set(id, performance.now());
  // Prune stale entries — a missing reply (peer disconnect mid-probe)
  // shouldn't keep the map growing.
  const now = performance.now();
  for (const [k, t] of inflightProbes) {
    if (now - t > PROBE_TIMEOUT_MS) inflightProbes.delete(k);
  }
  channel.send({ type: 'latency-probe', id });
}
remoteSession.subscribe(({ state }) => {
  if (state === 'connected') {
    if (probeIntervalId === 0) {
      // Fire one immediately so the chip lights up the RTT suffix
      // within the first second of connect, not 5 s later.
      sendProbe();
      probeIntervalId = window.setInterval(sendProbe, PROBE_INTERVAL_MS);
    }
  } else {
    if (probeIntervalId !== 0) {
      window.clearInterval(probeIntervalId);
      probeIntervalId = 0;
    }
    inflightProbes.clear();
    latencyTracker.reset();
  }
});
// Phase 64 — when a remote peer transitions to 'connected' (fresh
// handshake OR a reconnect), immediately re-broadcast the full
// state + the GM's identity so the peer starts from a clean sync
// point. Cross-tab BroadcastChannel peers already received
// `broadcastInitial()` at load; this handles the WebRTC arrival
// case where a peer hooks in long after the GM booted.
let lastRemotePeerState: string = 'idle';
remoteSession.subscribe(({ state }) => {
  if (state === 'connected' && lastRemotePeerState !== 'connected' && initialLoadComplete) {
    channel?.send({
      type: 'full-state',
      state: serializeState(store.getState()),
    });
    broadcastIdentity();
  }
  lastRemotePeerState = state;
});

// ─── Phase 63 — Player identity ────────────────────────────────────
// `playerId` is declared earlier (Phase 66 — needed for the channel
// envelope sender id); the rest of the identity wiring follows here.
const identityRegistry = createIdentityRegistry();

// Phase 67 — `identityPrefs` is declared earlier (right after
// `preferences`); `ownIdentity()` reads from it instead of the
// prefs blob; `broadcastIdentity()` re-fires when the user edits
// name / color via Settings.
function ownIdentity(): PlayerIdentity {
  const id = identityPrefs.get();
  const displayName = resolveName(id.name, 'gm');
  const color = id.color || colorForName(displayName);
  return { id: playerId, name: displayName, color, role: 'gm' };
}

function broadcastIdentity(): void {
  if (!channel) return;
  const id = ownIdentity();
  // Track our own identity in the local registry too so the
  // Connected Players panel includes us in the list.
  identityRegistry.update(id);
  channel.send({ type: 'identity', identity: id });
}

// Mount the Connected Players panel — the GM's at-a-glance view of
// every Spectator currently in the room. Hidden when nobody else is
// connected (one entry = just the GM = no panel). The returned
// handle goes unused (we never explicitly destroy it — the lifetime
// is tied to the page) but we still call the factory for its side
// effect of mounting the DOM element.
void mountConnectedPlayersPanel({
  registry: identityRegistry,
  selfId: playerId,
});

// Phase 82 — per-Spectator permissions. The store holds GM-side
// overrides (default = full permissions for everyone); the modal
// surfaces them as togglable checkboxes per connected Spectator.
// `onChange` broadcasts the new permissions to the affected
// Spectator over the existing sync wire so their UI updates
// immediately. The GM-side enforcement (drop unauthorized `ping`
// / `dice-roll` messages) reads `permissionsStore.get(senderId)`
// in the channel handler.
const permissionsStore = createSpectatorPermissionsStore();
const permissionsModal = mountPermissionsModal({
  registry: identityRegistry,
  store: permissionsStore,
  onChange: (targetId, perms) => {
    channel?.send({ type: 'permissions', targetId, permissions: perms });
  },
});

// Phase 109 — when ANY permissions change (the modal's `onChange`
// fires for the modal's edits, but the token editor mutates the
// store directly via `setTokenHidden`), broadcast the resulting
// permissions to EVERY connected Spectator. Cheap: a single
// snapshot iteration; no-op when no permissions exist; the
// Spectator-side handler ignores messages whose targetId doesn't
// match its own playerId.
//
// We re-broadcast EVERY player's permissions on every change rather
// than diffing because:
//   1. The store's subscribe doesn't tell us WHICH playerId changed.
//   2. A `forgetToken` call from a token-remove fires once for ALL
//      affected players — broadcasting the full set keeps each
//      Spectator's view in sync without us tracking which ones lost
//      a hidden id.
permissionsStore.subscribe(() => {
  if (!channel) return;
  const snap = permissionsStore.snapshot();
  for (const [targetId, perms] of Object.entries(snap)) {
    channel.send({ type: 'permissions', targetId, permissions: perms });
  }
});

// Re-broadcast identity when the user edits name / color. Phase 67
// switched the source from `preferences` to `identityPrefs`; the
// signature-cache guard (`lastBroadcastIdentity`) still ensures
// no-op edits don't fire empty broadcasts.
let lastBroadcastIdentity = '';
identityPrefs.subscribe(() => {
  const id = ownIdentity();
  const sig = `${id.name}|${id.color}`;
  if (sig === lastBroadcastIdentity) return;
  lastBroadcastIdentity = sig;
  broadcastIdentity();
});

// Polite "I'm leaving" on tab close so the remote panel updates fast.
window.addEventListener('beforeunload', () => {
  channel?.send({ type: 'identity-leave', id: playerId });
});

// ---- Conflict detection + crash recovery ---------------------------------
// Every GM tab gets a random id + broadcasts it every ~2 s. Two open GMs
// see each other and surface a banner. The dirty flag is atomic: boot
// reads + sets, beforeunload clears. If boot sees it already set, the
// previous session wasn't cleanly closed.
//
// Phase 84 — heartbeats now also carry an optional state summary
// (lastModified ms, token count, scene name) so the conflict-merge
// modal can show a meaningful side-by-side comparison. The banner
// gets a "Resolve…" action that opens the modal; from there the GM
// picks "Keep this tab" (push our state to the peer via `gm-takeover`)
// or "Use other tab" (request the peer's state via `gm-state-request`).
const statusBanners = mountStatusBanners();
const gmTabId = nid();
const conflictDetector = createConflictDetector(gmTabId, { stalenessMs: 6000 });
const HEARTBEAT_INTERVAL_MS = 2000;
let conflictBannerVisible = false;

// Phase 84 — track when local state last changed so the heartbeat
// summary carries an accurate "last edit" timestamp. Bumped from the
// store-subscribe block lower in the file (see the existing markDirty
// + persist invocations).
let localLastModified = Date.now();
// Mirror the active scene name for the summary. Updated whenever
// `refreshSceneIndicator` resolves; defaults to '' which the modal
// renders as "(untitled)".
let localSceneName = '';
// Hoisted up here from its original (post-channel) position so the
// Phase 84 conflict-modal callbacks + heartbeat closure can reference
// it without hitting a TDZ ReferenceError on module init. The flag
// flips true inside the `loadPersistedState().then()` block lower
// down (search "broadcastInitial").
let initialLoadComplete = false;

function buildLocalSummary() {
  return {
    lastModified: localLastModified,
    tokenCount: store.getState().tokens.length,
    sceneName: localSceneName,
  };
}

const conflictModal = mountConflictModal({
  getLocalSummary: () => ({
    label: 'This tab',
    ...buildLocalSummary(),
  }),
  onTakeOver: (targetTabId) => {
    // "Keep this tab" — push our state to the peer. Not gated by the
    // initialLoadComplete flag because:
    //   - The modal can only be opened after we detected a peer, which
    //     in turn requires we've been answering the channel for a beat.
    //     If we're still in the pre-load window, the peer is the one
    //     with the real state — the GM should pick "Use other tab"
    //     instead, not push our empty default.
    // We still defensively log if the GM clicks "Keep" while empty.
    if (!initialLoadComplete) {
      console.warn(
        '[conflict] onTakeOver fired before initial load — refusing to push empty state',
      );
      return;
    }
    channel?.send({
      type: 'gm-takeover',
      targetTabId,
      state: serializeState(store.getState()),
    });
    statusBanners.hide();
    conflictBannerVisible = false;
    conflictModal.close();
    announcer.announce('Pushed this tab’s state to the other GM tab.', 'assertive');
  },
  onAdoptPeer: (targetTabId) => {
    // "Use other tab" — request their state. They reply with a
    // `gm-takeover { targetTabId: us, state }` which our channel
    // handler applies via `store.loadState`.
    channel?.send({ type: 'gm-state-request', targetTabId, fromTabId: gmTabId });
    announcer.announce('Requested the other tab’s state — adopting it now.', 'assertive');
    // Don't pre-emptively close the modal; we'll close it from the
    // takeover handler once the state actually lands. That way if the
    // peer is unreachable the modal stays open + the user can retry.
  },
});

function checkConflictBanner() {
  const hasConflict = conflictDetector.hasConflict(Date.now());
  if (hasConflict && !conflictBannerVisible) {
    statusBanners.show({
      message:
        'Another GM tab is open — changes from both tabs will overwrite each other.',
      variant: 'warn',
      dismissible: false,
      actionLabel: 'Resolve…',
      onAction: () => {
        conflictModal.setPeers(conflictDetector.freshPeers(Date.now()));
        conflictModal.open();
      },
    });
    announcer.announce(
      'Warning: another GM tab is open. Click Resolve to merge.',
      'assertive',
    );
    conflictBannerVisible = true;
  } else if (!hasConflict && conflictBannerVisible) {
    statusBanners.hide();
    conflictBannerVisible = false;
    // If the modal is still open when the peer goes away, refresh its
    // peer list so the empty-state copy ("conflict has cleared") shows.
    if (conflictModal.isOpen()) {
      conflictModal.setPeers([]);
    }
  } else if (conflictModal.isOpen()) {
    // Keep the open modal in sync with the latest summaries even when
    // the conflict was already detected on a previous tick.
    conflictModal.setPeers(conflictDetector.freshPeers(Date.now()));
  }
}

if (channel) {
  const sendHeartbeat = () =>
    channel.send({
      type: 'gm-heartbeat',
      tabId: gmTabId,
      // Only attach the summary once initial load has resolved —
      // otherwise a peer would see our token count = 0 + a stale
      // lastModified and might pick the wrong winner. Pre-load we
      // send the bare heartbeat (back-compat shape).
      summary: initialLoadComplete ? buildLocalSummary() : undefined,
    });
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
// mid-session crash leaves the flag set. Phase 84 — also bump the
// local-modified clock so the next outgoing heartbeat carries an
// accurate "last edit" timestamp for the conflict-merge modal.
store.subscribe(() => {
  markDirty();
  localLastModified = Date.now();
  // Phase 145 — re-evaluate the scene-loading overlay on every state
  // change (covers scene switch, fresh background upload, session
  // import, etc.). The image-loader's onReady callback hides it
  // when the image actually finishes; this subscribe shows it as
  // soon as a new background id appears.
  sceneLoadingOverlay.update(store.getState().background.imageId);
});

// Phase 148 — record every newly-added token as a "recently used"
// template. Catches every drop / Alt+stamp / paste / duplicate /
// library-drop in one hook (they all funnel through `token-add`).
// Skipped for `session-reset` patches (the tokens loaded from a
// scene aren't "uses" — those tokens already existed).
store.subscribe((patch) => {
  if (patch?.kind === 'token-add') {
    recordTokenUse(patch.token);
  }
});

// Phase 148 — recently-used tokens strip. Mounted on body so it
// can absolute-position near the canvas. The strip reads
// recent-tokens via its own subscribe; the GM-side store-subscribe
// above feeds it via `recordTokenUse` from every token-add patch.
mountRecentTokensStrip(document.body, lastPlacedRef);

// Phase 165 — auto-pan camera to the active initiative token. We
// subscribe specifically to `initiative-set-active` patches (and
// `session-reset`, which can flip activeId implicitly via the
// loaded state). The pref is read each tick so toggling Settings
// applies on the next turn-set without a re-subscribe. Tween
// duration is 250 ms with ease-out cubic; reduced-motion users
// get an instant snap (no animation).
let lastAutoPannedToTokenId: string | null = null;
store.subscribe((patch) => {
  if (!preferences.get().autoPanToActiveTurn) return;
  if (
    patch?.kind !== 'initiative-set-active' &&
    patch?.kind !== 'session-reset'
  ) {
    return;
  }
  const s = store.getState();
  const activeEntry = s.initiative.order.find(
    (e) => e.id === s.initiative.activeId,
  );
  if (!activeEntry || !activeEntry.tokenId) {
    lastAutoPannedToTokenId = null;
    return;
  }
  const token = s.tokens.find((t) => t.id === activeEntry.tokenId);
  if (!token) return;
  // Don't re-tween when the active token id didn't actually change
  // (e.g. a session-reset that re-loads the same active id).
  if (token.id === lastAutoPannedToTokenId) return;
  lastAutoPannedToTokenId = token.id;
  const center = tokenCenterWorld(token, s.grid);
  const target = cameraFocusedOn(renderer, center.x, center.y);
  tweenCamera(renderer, target, {
    durationMs: 250,
    reducedMotion: preferences.get().reducedMotion,
  });
});

function sendCameraIfBroadcasting() {
  if (channel && preferences.get().broadcastCamera) {
    channel.send({ type: 'camera', camera: renderer.camera });
  }
}

/**
 * 0.57.1 — guard outbound full-state sends behind the initial-load flag.
 *
 * Pre-fix bug: this block ran synchronously at module init — at which
 * point `loadPersistedState()` (kicked off in the void-Promise above)
 * hadn't resolved yet, so `store.getState()` returned the EMPTY default
 * state. Any Spectator tab open in another window would receive the
 * empty `full-state`, call `store.loadState(empty)`, and 200ms later
 * persist that empty state to the SHARED active scene record in
 * IndexedDB. The GM's own load would then resolve and read back the
 * blanked scene. Result: opening + reloading a GM tab with the
 * Spectator open in another tab silently destroyed the active scene
 * (other saved scenes survived because saveState only writes to the
 * active one).
 *
 * Fix: wait for `loadPersistedState()` to resolve before broadcasting,
 * AND ignore Spectator hellos / request-full-state until then. Once
 * load completes, the .then() handler below calls `broadcastInitial()`
 * which sends both messages with the LOADED state. Spectators that
 * connected mid-load receive the broadcast and load it correctly.
 *
 * Phase 84 — the actual `let initialLoadComplete = false;` declaration
 * was hoisted up to the conflict-detection block above (the heartbeat
 * + modal closures need to read it at module-init time, which would
 * otherwise hit a TDZ ReferenceError).
 */

if (channel) {
  channel.onMessage((msg, env) => {
    if (msg.type === 'hello' && msg.from === 'spectator') {
      if (!initialLoadComplete) return;
      channel.send({ type: 'full-state', state: serializeState(store.getState()) });
      sendCameraIfBroadcasting();
      // Phase 63 — re-broadcast our identity whenever a new
      // spectator joins so they immediately see who's hosting.
      broadcastIdentity();
    } else if (msg.type === 'request-full-state') {
      if (!initialLoadComplete) return;
      channel.send({ type: 'full-state', state: serializeState(store.getState()) });
      sendCameraIfBroadcasting();
    } else if (msg.type === 'request-camera') {
      sendCameraIfBroadcasting();
    } else if (msg.type === 'ping') {
      // Spectators don't currently emit pings (GM-only mechanic), but
      // any incoming `ping` message is honored — a future per-
      // Spectator `canPing` permission would gate it here.
      pingManager.add(msg.x, msg.y, msg.color, msg.senderName);
      if (msg.senderName) {
        announcer.announce(`${msg.senderName} pinged the map.`);
      }
    } else if (msg.type === 'spectator-viewport') {
      spectatorViewportRef.current = msg.viewport;
      spectatorViewportRef.lastUpdate = Date.now();
      if (preferences.get().showSpectatorViewport) renderer.requestRender();
    } else if (msg.type === 'dice-roll') {
      // Phase 82 — drop rolls from Spectators whose canRoll has been
      // revoked. Same belt-and-suspenders as the ping check above.
      if (
        msg.roll.from === 'spectator' &&
        env &&
        !permissionsStore.get(env.senderId).canRoll
      ) {
        return;
      }
      dicePanel.pushRemoteRoll(msg.roll);
      if (msg.roll.from !== 'gm') {
        const who = msg.roll.senderName ?? 'Spectator';
        announcer.announce(`${who} rolled ${msg.roll.source}: ${msg.roll.total}.`);
      }
    } else if (msg.type === 'gm-heartbeat') {
      // Phase 84 — capture the optional summary so the conflict-merge
      // modal can show "you vs them" stats. Pre-84 senders omit it,
      // in which case the detector records summary: null + the modal
      // shows "(no info)" + disables the "Use other tab" button.
      conflictDetector.noteHeartbeat(msg.tabId, Date.now(), msg.summary ?? null);
      checkConflictBanner();
    } else if (msg.type === 'gm-state-request') {
      // Phase 84 — peer is asking us to be the source of truth so they
      // can adopt our state. Reply with a `gm-takeover` ONLY if we're
      // the addressee + we have real state to send. Refusing pre-load
      // is critical: otherwise we'd push the empty default and wipe
      // their session.
      if (msg.targetTabId !== gmTabId) return;
      if (!initialLoadComplete) return;
      channel.send({
        type: 'gm-takeover',
        targetTabId: msg.fromTabId,
        state: serializeState(store.getState()),
      });
    } else if (msg.type === 'gm-takeover') {
      // Phase 84 — peer is pushing us their state (either because they
      // picked "Keep this tab" on their side, or because we asked
      // them to with a `gm-state-request`). Apply it locally + persist
      // immediately so a beforeunload race doesn't blow it away.
      //
      // Phase 99 — BEFORE replacing local state, snapshot the
      // about-to-be-overwritten state into the conflict-loser archive
      // so the GM can recover if they realize they picked the wrong
      // winner. The archive is TTL'd to 1 hour + capped to 5 entries
      // so it doesn't grow unbounded.
      if (msg.targetTabId !== gmTabId) return;
      try {
        // Capture loser BEFORE the load so we have the right state.
        // Wrapped in its own try because a serialize failure shouldn't
        // block the takeover apply — the user already picked their
        // winner; archive is opportunistic.
        try {
          conflictLoserArchive.record(serializeState(store.getState()));
        } catch (archiveErr) {
          console.warn('[conflict] loser-archive capture failed', archiveErr);
        }
        store.loadState(deserializeState(msg.state));
        store.clearHistory();
        // Persist synchronously off the debounce path — we want the new
        // state on disk before the user does anything else.
        void saveState(store.getState());
        announcer.announce(
          'Adopted state from the other GM tab. Previous state archived for 1 hour — Ctrl+K → "conflict" to recover.',
          'assertive',
        );
        // The conflict logically resolves once both tabs share state.
        // Hide the banner + close the modal optimistically; a fresh
        // heartbeat on the next tick will re-open the banner if the
        // peer kept editing AFTER sending the takeover (vanishingly
        // rare, but the existing `checkConflictBanner` tick handles it).
        statusBanners.hide();
        conflictBannerVisible = false;
        conflictModal.close();
      } catch (err) {
        console.warn('[conflict] gm-takeover apply failed', err);
      }
    } else if (msg.type === 'identity') {
      identityRegistry.update(msg.identity);
      // Phase 82 — push the new Spectator their effective permissions
      // so their UI gates can apply before they try to ping or roll.
      // GM identities skip — the GM doesn't gate themselves.
      if (msg.identity.role === 'spectator') {
        const perms = permissionsStore.get(msg.identity.id);
        channel?.send({
          type: 'permissions',
          targetId: msg.identity.id,
          permissions: perms,
        });
      }
    } else if (msg.type === 'identity-leave') {
      identityRegistry.forget(msg.id);
    } else if (msg.type === 'damage-fx') {
      // Phase 77 — replay the floating-number animation locally
      // when the GM applies damage in the OTHER tab role (the
      // Spectator). Phase 66's envelope handler already drops
      // self-echoes via senderId, so we don't need a second dedup
      // layer here.
      damageFxManager.add(msg.tokenId, msg.amount);
    } else if (msg.type === 'chat') {
      // Phase 119 — chat from another peer. The GM sees EVERY chat
      // message regardless of visibility (gm-only messages are
      // private notes / whispers the GM is meant to see). The
      // history's id-dedupe guard makes a re-broadcast a no-op.
      chatHistory.add({
        id: msg.messageId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        text: msg.text,
        visibility: msg.visibility,
        timestamp: msg.timestamp,
      });
      // Polite-announce so screen readers + GMs not currently looking
      // at the panel know a message arrived.
      announcer.announce(`${msg.senderName || 'Player'} said: ${msg.text}`);
    } else if (msg.type === 'annotation-proposal') {
      // Phase 120 — Spectator-proposed annotation. Add to the GM's
      // review queue + auto-open the panel so a busy GM doesn't miss
      // a fresh suggestion. The queue's id-dedupe makes a re-broadcast
      // a silent no-op.
      annotationProposals.add({
        id: msg.proposalId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        x: msg.x,
        y: msg.y,
        text: msg.text,
        color: msg.color,
        timestamp: msg.timestamp,
      });
      annotationProposalsPanel.open();
      announcer.announce(
        `${msg.senderName || 'Player'} suggested an annotation: ${msg.text}`,
      );
    } else if (msg.type === 'token-claim-update') {
      // Phase 128 — Spectator updating HP / conditions on a token
      // they own. Same authoritative-source pattern as Phase 127:
      // validate ownership, then allowlist-filter `changes` to just
      // {hp, conditions, conditionExpirations} before applying as a
      // normal token-update patch. Anything outside the allowlist
      // (label, color, x/y, ownerId, etc.) is dropped silently —
      // defense against a tampered spectator client trying to rename
      // / recolor a token or reassign its ownership.
      const stateNow = store.getState();
      const claimedToken = stateNow.tokens.find((t) => t.id === msg.tokenId);
      if (!claimedToken) return;
      if (claimedToken.ownerId !== env.senderId) return;
      const filtered: Partial<typeof claimedToken> = {};
      if (msg.changes.hp !== undefined) filtered.hp = msg.changes.hp;
      if (msg.changes.conditions !== undefined) {
        filtered.conditions = msg.changes.conditions;
      }
      if (msg.changes.conditionExpirations !== undefined) {
        filtered.conditionExpirations = msg.changes.conditionExpirations;
      }
      if (Object.keys(filtered).length === 0) return;
      store.applyPatch({
        kind: 'token-update',
        id: msg.tokenId,
        changes: filtered,
      });
    } else if (msg.type === 'token-claim-move') {
      // Phase 127 — Spectator dragging a token they own. We're the
      // authoritative source: validate ownership against the envelope's
      // senderId (defense against tampered peers claiming someone
      // else's token), clamp the move against blocksMovement walls
      // (Phase 114) so spectator drags can't tunnel either, then
      // apply a normal `token-update` patch. The patch rebroadcasts
      // to every peer (including the originating spectator) via the
      // existing patch loop, so all tabs converge on the GM-
      // authoritative position.
      const state = store.getState();
      const token = state.tokens.find((t) => t.id === msg.tokenId);
      if (!token) return;
      if (token.ownerId !== env.senderId) {
        // Tampered or stale claim. Drop silently — the originating
        // spectator's local overlay clears on pointerup regardless,
        // so they don't see ghost movement; on the next render the
        // unchanged state.tokens position takes over.
        return;
      }
      // Clamp against blocksMovement walls. Phase 131 — pick the
      // hex-aware all-or-nothing clamp on hex grids; the square
      // path keeps the Phase 114 Bresenham + per-cell clamp.
      const startCellX = Math.round(token.x);
      const startCellY = Math.round(token.y);
      const endCellX = Math.round(msg.x);
      const endCellY = Math.round(msg.y);
      const isHexGrid = state.grid.gridShape === 'hex';
      const clamped = isHexGrid
        ? clampMoveAgainstWallsHex(
            startCellX,
            startCellY,
            endCellX,
            endCellY,
            state.walls,
            state.grid.cellSize,
          )
        : clampMoveAgainstWalls(
            startCellX,
            startCellY,
            endCellX,
            endCellY,
            state.walls,
            state.grid.cellSize,
          );
      const finalX = clamped.cellX;
      const finalY = clamped.cellY;
      if (finalX === token.x && finalY === token.y) return;
      store.applyPatch({
        kind: 'token-update',
        id: msg.tokenId,
        changes: { x: finalX, y: finalY },
      });
    } else if (msg.type === 'latency-probe') {
      // Phase 83 — peer is asking for an RTT measurement; echo back
      // immediately. We pass the probe id verbatim so the original
      // sender can match the reply against its inflight map.
      channel.send({ type: 'latency-probe-reply', id: msg.id });
    } else if (msg.type === 'latency-probe-reply') {
      // Phase 83 — our probe came back; compute RTT + feed the tracker.
      // A reply for an id we don't recognize (e.g. the probe was
      // pruned for staleness) is silently ignored.
      const sentAt = inflightProbes.get(msg.id);
      if (sentAt !== undefined) {
        inflightProbes.delete(msg.id);
        latencyTracker.note(performance.now() - sentAt);
      }
    }
  });
}

function broadcastInitial(): void {
  if (!channel) return;
  channel.send({ type: 'hello', from: 'gm' });
  channel.send({ type: 'full-state', state: serializeState(store.getState()) });
  // Phase 63 — also broadcast our identity so any listening
  // Spectator immediately sees who's hosting the session.
  broadcastIdentity();
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

// Phase 76 — auto-save indicator pill. Top-left, after the scene
// indicator. Updated as the persist debounce fires.
const saveStatusPill = mountSaveStatusPill();

// Phase 79 — atmospheric weather overlay + GM picker. Picker
// dispatches a `weather-set` patch on change; the overlay
// re-syncs from `state.weather` via the store-subscribe block.
// Spectators get the same overlay (no picker) by mirroring state.
const weatherOverlay = mountWeatherOverlay({
  getReducedMotion: () => preferences.get().reducedMotion,
});
const weatherPicker = mountWeatherPicker({
  onChange: (kind) => {
    store.applyPatch({ kind: 'weather-set', weather: kind });
  },
});

// Phase 80 — time-of-day picker. Same shape as the weather picker;
// dispatches a `time-set` patch on change. Tint is rendered by the
// renderer's `drawSceneTint` pass (see renderer.ts), AFTER the
// existing user-pref scene-light tint so they compose.
const timeOfDayPicker = mountTimeOfDayPicker({
  onChange: (time) => {
    store.applyPatch({ kind: 'time-set', timeOfDay: time });
  },
});

// Async IDB save, fire-and-forget from the debounced path.
// Phase 76 — wraps the save in status updates so the pill reflects
// the persist lifecycle ('saving' → 'saved' or 'error'). Failures
// don't propagate (callers `void` the promise).
//
// Phase 97 — after each successful save, push a snapshot into the
// rotating per-scene history. The snapshot module enforces its own
// 30 s rate-limit + state-dedup, so calling it on every persist is
// cheap; most calls are no-ops. Snapshot failures are swallowed
// with a console warning — a missed snapshot doesn't block the user.
// Phase 121 — throttle gate so the auto-save loop captures a fresh
// thumbnail at most once per 10 s per scene. The first call for a
// brand-new scene returns true so a freshly-created scene gets a
// thumbnail right away (instead of showing "(no thumbnail)" until
// the user switches scenes for the first time).
const sceneThumbnailThrottle = createSceneThumbnailThrottle();

// Phase 122 — token-move-only undo, parallel to the store's whole-
// state undo. `Z` (no Ctrl) reverts just the most recent token move
// without rewinding the unrelated state changes (fog, conditions,
// initiative, etc.) that happened between then and now. The history
// is fed off the store-subscribe stream below; `lastKnownPositions`
// gives us the from-coords each move (the patch only carries
// to-coords). `skipNextTokenMoveRecord` suppresses the recursive
// record when we apply the inverse patch ourselves.
const tokenMoveHistory = createTokenMoveHistory();
const lastKnownPositions = new Map<string, { x: number; y: number }>();
let skipNextTokenMoveRecord = false;
function rebuildLastKnownPositions(): void {
  lastKnownPositions.clear();
  for (const t of store.getState().tokens) {
    lastKnownPositions.set(t.id, { x: t.x, y: t.y });
  }
}
function undoLastTokenMove(): boolean {
  const last = tokenMoveHistory.popLast();
  if (!last) {
    announcer.announce('No token move to undo.');
    return false;
  }
  const token = store.getState().tokens.find((t) => t.id === last.tokenId);
  if (!token) {
    announcer.announce('Cannot undo: token no longer exists.');
    return false;
  }
  skipNextTokenMoveRecord = true;
  store.applyPatch({
    kind: 'token-update',
    id: last.tokenId,
    changes: { x: last.fromX, y: last.fromY },
  });
  announcer.announce(
    `Reverted ${token.label || 'token'} to its previous position.`,
  );
  return true;
}

const persist = debounce(async () => {
  saveStatusPill.setStatus('saving');
  try {
    const ok = await saveState(store.getState());
    saveStatusPill.setStatus(ok ? 'saved' : 'error');
    if (ok) {
      const sceneId = getActiveSceneId();
      if (sceneId) {
        try {
          await recordSnapshot(sceneId, serializeState(store.getState()));
        } catch (snapErr) {
          console.warn('[snapshot-history] record failed', snapErr);
        }
        // Phase 121 — auto-thumbnail. The throttle gate caps captures
        // at one per 10 s per scene; cheap when it returns false (just
        // a Map lookup). A successful capture re-saves the scene with
        // ONLY the thumbnail field updated; the state blob is the
        // same one we just wrote.
        if (sceneThumbnailThrottle.shouldCapture(sceneId)) {
          try {
            const thumb = captureThumbnail(canvas);
            if (thumb) {
              await saveScene(sceneId, store.getState(), { thumbnail: thumb });
            }
          } catch (thumbErr) {
            console.warn('[thumbnail] auto-capture failed', thumbErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[persist] save threw unexpectedly', err);
    saveStatusPill.setStatus('error');
  }
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
  // Phase 122 — feed the token-move-only undo history. We watch
  // `token-update` patches with x/y changes and diff against the
  // `lastKnownPositions` cache so we have both ends of the move
  // (the patch only carries the new coords). On every patch the
  // cache rebuilds from the post-patch state — covers token-add
  // / token-remove / session-reset / scene-switch in one place.
  if (
    patch?.kind === 'token-update' &&
    (patch.changes.x !== undefined || patch.changes.y !== undefined)
  ) {
    if (skipNextTokenMoveRecord) {
      skipNextTokenMoveRecord = false;
    } else {
      const prev = lastKnownPositions.get(patch.id);
      const cur = store.getState().tokens.find((t) => t.id === patch.id);
      if (prev && cur && (prev.x !== cur.x || prev.y !== cur.y)) {
        tokenMoveHistory.record({
          tokenId: patch.id,
          fromX: prev.x,
          fromY: prev.y,
          toX: cur.x,
          toY: cur.y,
        });
      }
    }
  }
  // Session-reset / scene-switch wipes the move history — undoing
  // across scene boundaries would reference token ids that don't
  // exist in the new scene (or worse, recycle to a different token).
  if (patch?.kind === 'session-reset' || patch === null) {
    tokenMoveHistory.clear();
  }
  rebuildLastKnownPositions();

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
  // Phase 78 — diff the fog buffer against the previous snapshot so
  // newly-revealed cells get queued for the bloom-in overlay. Skipped
  // for non-fog patches via the buffer-equality fast path inside
  // observe(); a session-reset (null patch) reseeds the baseline so
  // the destination scene's already-revealed cells don't all flash in.
  if (patch?.kind === 'session-reset' || patch === null) {
    fogFadeTracker.reset();
  }
  const s = store.getState();
  fogFadeTracker.observe(
    s.fog,
    s.grid.cols,
    s.grid.rows,
    performance.now(),
  );
  // Phase 79 — keep the weather overlay + picker in sync with the
  // store's current scene weather. Cheap: both setters are no-ops
  // when the value is unchanged. Covers session-reset, scene-switch,
  // and the explicit weather-set patch in one shared block.
  weatherOverlay.setWeather(s.weather);
  weatherPicker.setWeather(s.weather);
  // Phase 80 — same idempotent sync for the time-of-day picker.
  // The renderer reads `state.timeOfDay` directly during draw, so
  // there's no separate "overlay" to update — just the picker UI.
  timeOfDayPicker.setTime(s.timeOfDay);
  // Phase 109 — when a token is removed (delete, scene-reset, sync-
  // applied remote remove), drop its id from every Spectator's
  // hidden-list so the persisted blob doesn't accumulate ghost ids
  // of long-gone tokens. forgetToken is a no-op when no Spectator
  // hides that id, so the cost is negligible.
  if (patch?.kind === 'token-remove') {
    permissionsStore.forgetToken(patch.id);
  } else if (patch?.kind === 'session-reset') {
    // A full reset wipes every token; clear every Spectator's hidden
    // list rather than walking the now-empty token list per id.
    for (const [pid, perms] of Object.entries(permissionsStore.snapshot())) {
      if (perms.hiddenTokenIds.length === 0) continue;
      permissionsStore.set(pid, { ...perms, hiddenTokenIds: [] });
    }
  }
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
  // Phase 137 — auto-suffix labels among the copies. Each new copy
  // looks at the canvas state PLUS the labels of preceding copies in
  // this batch (so pasting 3 "Goblin"s onto a board with an existing
  // "Goblin" produces "Goblin 2", "Goblin 3", "Goblin 4" — not 3
  // copies of "Goblin 2"). Existing token labels are read once before
  // the batch begins; the in-flight copies' labels are appended as we
  // go.
  if (preferences.get().autoNumberDuplicateTokens) {
    const labels = store.getState().tokens.map((t) => t.label);
    for (const copy of copies) {
      copy.label = nextLabelSuffix(labels, copy.label);
      labels.push(copy.label);
    }
  }
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
  // Phase 137 — auto-suffix labels among the duplicates. Same
  // accumulator pattern as pasteClipboard so duplicating 3 "Goblin"s
  // (each in selection) onto a board with one existing "Goblin"
  // yields "Goblin 2/3/4", not 3 copies of "Goblin 2".
  if (preferences.get().autoNumberDuplicateTokens) {
    const labels = store.getState().tokens.map((t) => t.label);
    for (const copy of copies) {
      copy.label = nextLabelSuffix(labels, copy.label);
      labels.push(copy.label);
    }
  }
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
        // Phase 114 — clamp arrow-key nudges against walls too. A
        // single-cell nudge into a closed wall becomes a silent no-op
        // (the clamp returns the start cell), matching the drag path.
        const clamped = clampMoveAgainstWalls(
          t.x,
          t.y,
          t.x + dx,
          t.y + dy,
          state.walls,
          cellSize,
        );
        if (clamped.cellX !== t.x || clamped.cellY !== t.y) {
          store.applyPatch({
            kind: 'token-update',
            id,
            changes: { x: clamped.cellX, y: clamped.cellY },
          });
          moved = true;
        }
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
        if (w.kind === 'segment') {
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
        } else {
          // Phase 112 — block walls translate by INTEGER cell deltas
          // (their geometry is already in cell coords). Clamp to >= 0
          // so a nudge can't produce negative cell coords.
          store.applyPatch({
            kind: 'wall-update',
            id,
            changes: {
              cellX: Math.max(0, w.cellX + dx),
              cellY: Math.max(0, w.cellY + dy),
            },
          });
        }
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
  let aoeCount = 0;
  let wallCount = 0;
  store.batch(() => {
    for (const id of ids) {
      if (state.tokens.some((t) => t.id === id)) {
        store.applyPatch({ kind: 'token-remove', id });
        tokenCount++;
      } else if (state.annotations.some((a) => a.id === id)) {
        store.applyPatch({ kind: 'annotation-remove', id });
        annotationCount++;
      } else if (state.aoeTemplates.some((a) => a.id === id)) {
        store.applyPatch({ kind: 'aoe-remove', id });
        aoeCount++;
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
  if (aoeCount > 0) {
    parts.push(`${aoeCount} AoE template${aoeCount === 1 ? '' : 's'}`);
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
    light: null,
    initiativeMod: 0,
    conditionExpirations: {},
    deathSaves: { successes: 0, failures: 0 },
    ownerId: null,
    auras: [],
    speedFt: 30,
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
  // Phase 137 — same auto-number pattern as pasteClipboard.
  if (preferences.get().autoNumberDuplicateTokens) {
    const labels = store.getState().tokens.map((t) => t.label);
    for (const copy of copies) {
      copy.label = nextLabelSuffix(labels, copy.label);
      labels.push(copy.label);
    }
  }
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

/**
 * Phase 86 — keyboard cycle through canvas entities + Esc clear.
 *
 * Tab / Shift+Tab call into `nextEntityId` (a pure helper over the
 * current state) and replace `selection.ids` with a single-entity
 * set. The new selection is announced via the existing aria-live
 * announcer so screen-reader users hear what they just landed on
 * without needing to read the canvas pixel data.
 *
 * Esc with a non-empty selection clears it (and announces). Esc
 * with an empty selection falls through to whatever tool / modal
 * had its own Esc handler — important for "Esc closes the open
 * modal" and "Esc ends the walls chain" not to break.
 *
 * Wired BEFORE the `?` / `/` global shortcuts because Tab is also
 * a normal browser focus key and we want to claim it on the canvas
 * before the browser moves focus to the next focusable element.
 *
 * Skipped when an editable input has focus (the early-return below)
 * so Tab still navigates form fields normally.
 */
function cycleCanvasSelection(direction: 'next' | 'prev'): boolean {
  const state = store.getState();
  const id = nextEntityId(state, selection.ids, direction);
  if (!id) {
    announcer.announce('Canvas is empty.');
    return false;
  }
  selection.ids = new Set([id]);
  renderer.requestRender();
  const desc = describeEntity(state, id);
  if (desc) announcer.announce(`Selected: ${desc}.`);
  return true;
}

/**
 * Phase 92 — quick-HP adjust on selected HP-bearing tokens.
 *
 * Bound to `+` / `-` (and the bracket-less variants of `=` / `-`).
 * `Shift` modifier multiplies by 5 — fast nudge for big hits without
 * opening the Damage / Heal dialog. Skipped when no HP-bearing token
 * is in selection (silent no-op).
 *
 * Convention: `+` heals (positive delta), `-` damages (negative delta).
 *
 * Re-uses the dialog's death-save automation via the shared
 * `planQuickHpAdjust` helper, so a heal that wakes a downed token
 * resets the saves tracker just like the dialog does.
 *
 * Fires the same Phase 77 damage-fx broadcast (local + remote) so
 * the floating number animation appears on both GM and Spectator.
 */
function quickHpAdjust(delta: number): boolean {
  if (delta === 0) return false;
  const state = store.getState();
  const targets = state.tokens.filter(
    (t) => selection.ids.has(t.id) && t.hp !== null,
  );
  if (targets.length === 0) return false;
  const { patches, results } = planQuickHpAdjust(targets, delta);
  if (patches.length === 0) {
    // All targets already at the clamp — give a hint instead of silence.
    announcer.announce(
      delta > 0 ? 'Already at full HP.' : 'Already at 0 HP.',
    );
    return true;
  }
  store.batch(() => {
    for (const p of patches) {
      store.applyPatch({ kind: 'token-update', id: p.id, changes: p.changes });
    }
  });
  // Phase 77 — fire the floating-number effect for every result.
  // Convention there is positive-amount = damage, so flip our delta.
  // Phase 94 — also record into the combat log. The token returned
  // by `planQuickHpAdjust` is the PRE-update snapshot; look up the
  // post-update token so `hpAfter` reflects the new HP.
  const updatedTokens = store.getState().tokens;
  for (const r of results) {
    const fxAmount = -r.delta;
    damageFxManager.add(r.token.id, fxAmount);
    channel?.send({
      type: 'damage-fx',
      tokenId: r.token.id,
      amount: fxAmount,
      id: Date.now() + Math.floor(Math.random() * 1000),
    });
    const updated = updatedTokens.find((t) => t.id === r.token.id);
    if (updated) combatLogObserver.recordDamage(updated, fxAmount);
  }
  const summary = summarizeQuickHpResults(results);
  if (summary) announcer.announce(summary);
  return true;
}

function clearCanvasSelectionFromEsc(): boolean {
  if (selection.ids.size === 0) return false;
  const count = selection.ids.size;
  selection.ids = new Set();
  renderer.requestRender();
  announcer.announce(
    count === 1 ? 'Selection cleared.' : `Selection cleared (${count} items).`,
  );
  return true;
}

/**
 * Phase 95 — searchable command palette (Ctrl+K / Cmd+K).
 *
 * Registers an action per major surface — tool switches, modal opens,
 * camera resets, scene jumps, initiative steps. The user opens with
 * Ctrl+K, types a few letters of what they want, picks with Enter.
 *
 * The registry + palette are mounted unconditionally; the actions
 * registered here are static (don't change per session). Dynamic
 * actions (e.g. "Switch to scene <name>" per scene) re-register on
 * demand inside their callbacks via the lazy refresh path: every
 * `palette.open()` re-snapshots `registry.match()`, so adding
 * commands at any time picks up on the next open.
 */
const commandRegistry = createCommandRegistry();
const commandPalette = mountCommandPalette({ registry: commandRegistry });

// Phase 98 — small helpers for the per-scene export palette command.
async function currentSceneName(): Promise<string> {
  const id = getActiveSceneId();
  if (!id) return 'Untitled scene';
  try {
    const list = await listScenes();
    return list.find((x) => x.id === id)?.name ?? 'Untitled scene';
  } catch {
    return 'Untitled scene';
  }
}
function slugForFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'scene';
}

(function registerStaticCommands() {
  const reg = commandRegistry;

  // Tools.
  const tools: Array<{ id: string; label: string; tool: string }> = [
    { id: 'tool-select', label: 'Switch to Select tool', tool: 'select' },
    { id: 'tool-token', label: 'Switch to Token tool', tool: 'token' },
    { id: 'tool-fog-reveal', label: 'Switch to Reveal tool', tool: 'fog-reveal' },
    { id: 'tool-fog-hide', label: 'Switch to Hide tool', tool: 'fog-hide' },
    { id: 'tool-background', label: 'Switch to Map tool', tool: 'background' },
    { id: 'tool-note', label: 'Switch to Note tool', tool: 'note' },
    { id: 'tool-measure', label: 'Switch to Ruler tool', tool: 'measure' },
    { id: 'tool-aoe', label: 'Switch to AoE tool', tool: 'aoe' },
    { id: 'tool-draw', label: 'Switch to Draw tool', tool: 'draw' },
    { id: 'tool-walls', label: 'Switch to Walls tool', tool: 'walls' },
    { id: 'tool-travel', label: 'Switch to Travel tool', tool: 'travel' },
  ];
  for (const t of tools) {
    reg.register({
      id: t.id,
      label: t.label,
      group: 'Tools',
      run: () => toolManager.setActive(t.tool),
    });
  }

  // Modals + side panels.
  reg.register({
    id: 'open-settings',
    label: 'Open Settings',
    group: 'Modals',
    run: () => settingsModal.open(),
  });
  reg.register({
    id: 'open-scenes',
    label: 'Open Scenes',
    group: 'Modals',
    run: () => scenesModal.open(),
  });
  reg.register({
    id: 'open-token-library',
    label: 'Open Token Library',
    group: 'Modals',
    run: () => tokenLibraryModal.open(),
  });
  reg.register({
    id: 'open-template-library',
    label: 'Open Template Library',
    group: 'Modals',
    run: () => templateLibraryModal.open(),
  });
  reg.register({
    id: 'open-initiative',
    label: 'Open Initiative tracker',
    group: 'Modals',
    run: () => initiativeModal.open(),
  });
  reg.register({
    id: 'open-permissions',
    label: 'Open Permissions',
    group: 'Modals',
    run: () => permissionsModal.open(),
  });
  reg.register({
    id: 'open-snapshot-history',
    label: 'Restore from snapshot…',
    hint: 'Auto-saved scene history',
    group: 'Modals',
    run: () => snapshotHistoryModal.open(),
  });
  reg.register({
    id: 'open-conflict-archive',
    label: 'Open conflict-merge archive…',
    hint: 'Recover state lost to a takeover (1-hour TTL)',
    group: 'Modals',
    run: () => conflictLoserArchiveModal.open(),
  });
  // Phase 108 — recent backgrounds. Lists the up-to-12 most recently
  // applied background images for one-click re-application.
  reg.register({
    id: 'open-recent-backgrounds',
    label: 'Open recent backgrounds…',
    hint: 'Re-apply a recent map without re-uploading',
    group: 'Backgrounds',
    run: () => recentBackgroundsModal.open(),
  });
  // Phase 102 — camera bookmarks. Two palette entries: one to open
  // the modal (manage / rename / delete) and one to save the live
  // camera in one shot without going through the modal.
  reg.register({
    id: 'open-camera-bookmarks',
    label: 'Open camera bookmarks…',
    hint: 'Named viewpoints for the current scene (Alt+1..9)',
    group: 'Camera',
    run: () => cameraBookmarksModal.open(),
  });
  reg.register({
    id: 'save-camera-bookmark',
    label: 'Save current camera as bookmark…',
    hint: 'Capture the live x / y / zoom under a name',
    group: 'Camera',
    run: () => {
      const sceneId = getActiveSceneId();
      if (!sceneId) {
        announcer.announce('Cannot save a bookmark — no active scene.');
        return;
      }
      const name = window.prompt('Name for this bookmark:', '');
      if (name === null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      addBookmark(sceneId, trimmed, { ...renderer.camera });
      announcer.announce(`Saved camera bookmark: ${trimmed}.`);
    },
  });
  // Phase 98 — per-scene JSON export / import. The export reads the
  // CURRENTLY-ACTIVE scene's name + state; the import opens the
  // scenes modal where the user can drop a file (centralizes the
  // file picker rather than spinning one up here).
  reg.register({
    id: 'export-current-scene',
    label: 'Export current scene as JSON',
    group: 'Scenes',
    run: async () => {
      const sceneId = getActiveSceneId();
      if (!sceneId) return;
      const state = await getSceneState(sceneId);
      if (!state) return;
      const name = await currentSceneName();
      const json = await exportScene(name, state);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slugForFilename(name)}.scene.json`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        anchor.remove();
      }, 200);
    },
  });
  reg.register({
    id: 'import-scene',
    label: 'Import scene from JSON…',
    group: 'Scenes',
    run: () => scenesModal.open(),
  });
  reg.register({
    id: 'toggle-notes',
    label: 'Toggle Notes panel',
    group: 'Panels',
    run: () => notesPanel.toggle(),
  });
  reg.register({
    id: 'toggle-combat-log',
    label: 'Toggle Combat Log panel',
    group: 'Panels',
    run: () => combatLogPanel.toggle(),
  });
  // Phase 119 — player chat panel (toggle).
  reg.register({
    id: 'toggle-chat',
    label: 'Toggle Chat panel',
    hint: 'Text chat over the sync channel',
    group: 'Panels',
    run: () => chatPanel.toggle(),
  });
  // Phase 120 — player annotation suggestions panel (toggle).
  reg.register({
    id: 'toggle-annotation-proposals',
    label: 'Toggle Player Suggestions panel',
    hint: 'Review pending annotation suggestions from spectators',
    group: 'Panels',
    run: () => annotationProposalsPanel.toggle(),
  });
  // Phase 123 — bulk-edit modal for the current selection. Always
  // listed so users can discover it; the modal shows the active
  // selection count up-front and each Apply button is a no-op when
  // it doesn't affect any of the selected tokens.
  reg.register({
    id: 'bulk-edit-tokens',
    label: 'Bulk edit selected tokens…',
    hint: 'Set HP max, add / remove conditions across the selection',
    group: 'Tokens',
    run: () => bulkEditModal.open(),
  });
  reg.register({
    id: 'open-shortcuts',
    label: 'Show keyboard shortcuts',
    group: 'Help',
    shortcut: '?',
    run: () => shortcutOverlay.open(),
  });
  reg.register({
    id: 'replay-tour',
    label: 'Replay onboarding tour',
    group: 'Help',
    run: () => openOnboardingTour(),
  });

  // Camera.
  reg.register({
    id: 'camera-fit',
    label: 'Fit content to screen',
    group: 'Camera',
    shortcut: 'F',
    // Phase 167 — palette command also routes through the
    // contextual helper. With selection: fit to selection. Empty
    // selection: fit to whole content.
    run: () => fitSelectionOrContent(),
  });
  reg.register({
    id: 'camera-fit-selection',
    label: 'Fit selection to screen',
    group: 'Camera',
    hint: 'F (with tokens selected)',
    run: () => fitSelectionOrContent(),
  });
  reg.register({
    id: 'camera-reset',
    label: 'Reset camera',
    group: 'Camera',
    shortcut: '0',
    run: () => resetCamera(renderer),
  });

  // Initiative steps.
  reg.register({
    id: 'initiative-next',
    label: 'Initiative — next turn',
    group: 'Initiative',
    // Phase 155 — palette also routes through `advanceTurnWithSkip`
    // so the auto-skip-dead behavior is identical no matter which
    // surface the GM uses to step the round.
    run: advanceTurnWithSkip,
  });
  reg.register({
    id: 'initiative-prev',
    label: 'Initiative — previous turn',
    group: 'Initiative',
    run: () => {
      const next = retreatInitiative(store.getState().initiative);
      store.applyPatch({
        kind: 'initiative-set-active',
        activeId: next.activeId,
        round: next.round,
      });
    },
  });

  // Session.
  reg.register({
    id: 'new-session',
    label: 'New session (clear everything)',
    group: 'Session',
    run: () => {
      const ok = window.confirm(
        'Start a new session? All current tokens, fog, and background will be cleared.',
      );
      if (ok) {
        store.resetSession();
        announcer.announce('New session started.');
      }
    },
  });

  // Phase 158 — clear-all-routes palette command. Per-route delete
  // is deferred (no canvas hit-test for routes in v158); clearing
  // everything is the v1 escape hatch.
  reg.register({
    id: 'clear-travel-routes',
    label: 'Clear all travel routes',
    group: 'Tools',
    run: () => {
      const count = store.getState().travelRoutes.length;
      if (count === 0) return;
      const ok = window.confirm(
        `Erase all ${count} travel route${count === 1 ? '' : 's'}? This can be undone.`,
      );
      if (ok) {
        store.applyPatch({ kind: 'travel-routes-clear' });
        announcer.announce(
          `${count} travel route${count === 1 ? '' : 's'} cleared.`,
        );
      }
    },
  });
})();

/**
 * Phase 96 — first-use hints. One-at-a-time toast surfaced when a
 * user first hits a feature surface. Each hint shows AT MOST ONCE
 * per install (state persisted to localStorage); dismissing with
 * "Got it" or Esc marks it shown.
 *
 * Today's hints:
 *   - `palette-intro` — fires ~6 s after boot when the user has
 *     completed the onboarding tour. Introduces Ctrl+K.
 *   - `combat-log-intro` — fires the first time damage is recorded
 *     (via the combat log observer). Mentions the new panel.
 *   - `wall-editor-intro` — fires the first time the GM draws a
 *     wall, mentioning the in-place editor + Edit shortcut.
 *
 * The hints don't fire while the onboarding tour is open
 * (`onboardingComplete === false` guard) so first-time users finish
 * the tour without competing surfaces.
 */
const firstUseHints = createFirstUseHintsStore();
const firstUseHintToast = mountFirstUseHintToast({
  onDismiss: (id) => firstUseHints.markShown(id),
});

function maybeShowHint(
  id: string,
  message: string,
  detail?: string,
  durationMs?: number,
) {
  if (firstUseHints.wasShown(id)) return;
  if (!preferences.get().onboardingComplete) return;
  const hint = { id, message, ...(detail !== undefined ? { detail } : {}), ...(durationMs !== undefined ? { durationMs } : {}) };
  firstUseHintToast.show(hint);
}

// Palette intro — give the boot a beat to settle, then surface
// the Ctrl+K hint. Skipped if the user dismissed it before, or
// the onboarding tour is still showing.
window.setTimeout(() => {
  maybeShowHint(
    'palette-intro',
    'New: press Ctrl+K to find any action.',
    'Tools, modals, scenes, initiative — type a few letters to filter.',
  );
}, 6000);

// Combat log intro — fire after the first damage event is logged.
// Subscribe to the log; unsub once the hint is shown (or known shown).
if (!firstUseHints.wasShown('combat-log-intro')) {
  const unsubCombatLog = combatLog.subscribe(() => {
    if (firstUseHints.wasShown('combat-log-intro')) {
      unsubCombatLog();
      return;
    }
    // Only fire on damage-kind entries (skip turn / condition events
    // that may pre-date any actual combat damage).
    const last = combatLog.entries().at(-1);
    if (!last || last.event.kind !== 'damage') return;
    unsubCombatLog();
    maybeShowHint(
      'combat-log-intro',
      'Combat log is recording every event.',
      'Open it any time from the session menu — "Combat Log".',
    );
  });
}

// Wall-editor intro — fire after the first wall is committed. Same
// observe-and-unsub pattern as the combat log hint.
if (!firstUseHints.wasShown('wall-editor-intro')) {
  let lastWallCount = store.getState().walls.length;
  const unsubWalls = store.subscribe(() => {
    if (firstUseHints.wasShown('wall-editor-intro')) {
      unsubWalls();
      return;
    }
    const nextWallCount = store.getState().walls.length;
    if (nextWallCount > lastWallCount) {
      unsubWalls();
      maybeShowHint(
        'wall-editor-intro',
        'New in 0.85: drag wall endpoints to reshape.',
        'Right-click a wall + pick "Edit wall…" (or press E) for sight, thickness, and visibility.',
      );
    }
    lastWallCount = nextWallCount;
  });
}

window.addEventListener('keydown', (e) => {
  if (isEditableFocus(e.target)) return;

  // Phase 86 — Tab / Shift+Tab cycle the canvas selection. Done here
  // rather than in the Select tool because the cycle works regardless
  // of which tool is active (a screen-reader user shouldn't have to
  // first activate a tool to "find their place" on the canvas).
  // Ctrl/Alt/Meta+Tab are reserved for browser / OS shortcuts — we
  // pass them through unchanged.
  if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
    if (cycleCanvasSelection(e.shiftKey ? 'prev' : 'next')) {
      e.preventDefault();
      return;
    }
  }

  // Phase 86 — Esc with a non-empty selection clears it. Skipped when
  // something else already claimed the Esc this tick — checked via
  // `e.defaultPrevented`. Examples that prevent ahead of us:
  //   - Open context menu's Esc handler (closes the menu)
  //   - Open modal's Esc handler (closes the dialog)
  //   - Walls-tool mid-chain Esc (ends the chain)
  //   - Measurement-tool Esc (cancels the measurement)
  // Without this guard, pressing Esc to dismiss a wall context menu
  // would ALSO wipe the multi-wall selection mid-flow — exactly the
  // regression the existing `walls-selection.spec.ts` Shift+click +
  // Delete test caught on the original Phase 86 commit. Empty-selection
  // Esc still falls through so unhandled Escs are a true no-op.
  if (
    e.key === 'Escape' &&
    !e.defaultPrevented &&
    !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey
  ) {
    if (clearCanvasSelectionFromEsc()) {
      e.preventDefault();
      return;
    }
  }

  if (e.key === '?') {
    shortcutOverlay.toggle();
    e.preventDefault();
    return;
  }

  // Phase 122 — plain `Z` (no Ctrl) reverts just the most recent
  // token move. Distinct from Ctrl+Z (whole-state undo, which rewinds
  // every kind of patch). Skipped when modifiers are held so we
  // don't intercept Ctrl+Z / Cmd+Z / Shift+Z (the Ctrl branch below
  // owns those).
  if (
    (e.key === 'z' || e.key === 'Z') &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.shiftKey
  ) {
    if (undoLastTokenMove()) {
      e.preventDefault();
      return;
    }
  }

  // Phase 74 — `/` opens the slash-command input. Skipped when an
  // editable field is already focused (handled above) so the user
  // can still type a literal `/` in the dice / token / scenes
  // inputs without hijacking it.
  if (e.key === '/') {
    slashInput.open();
    e.preventDefault();
    return;
  }

  // Phase 102 — Alt+1..9 jumps to the Nth camera bookmark for the
  // current scene (newest-first). Bookmarks are scene-scoped so the
  // target changes when the user switches scenes. We pick Alt over
  // Ctrl because Ctrl+1..9 is already taken by the Phase 75
  // recent-scenes quick-switch — same ergonomic family ("hop to a
  // remembered place") but a different axis (place WITHIN a scene
  // vs ACROSS scenes).
  if (
    e.altKey &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.shiftKey &&
    /^[1-9]$/.test(e.key)
  ) {
    const slot = parseInt(e.key, 10);
    e.preventDefault();
    jumpToBookmarkSlot(slot);
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    // Phase 95 — Ctrl+K / Cmd+K opens the searchable command palette.
    // Wired before the other Ctrl shortcuts so the palette claims
    // K even if some future action wanted it (none today; Ctrl+K is
    // a near-universal convention for "show me actions").
    if (key === 'k' && !e.shiftKey) {
      commandPalette.toggle();
      e.preventDefault();
      return;
    }
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
    // Phase 75 — Ctrl+1..9 quick-switches to the Nth most-recently-
    // active OTHER scene (excluding the current one — pressing
    // Ctrl+1 should always move you somewhere, not no-op on the
    // active scene). Skipped when no scene catalog has loaded yet.
    if (/^[1-9]$/.test(e.key) && !e.shiftKey && !e.altKey) {
      const slot = parseInt(e.key, 10);
      e.preventDefault();
      void quickSwitchToRecent(slot);
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

  // Phase 92 — `+` / `-` adjust HP on selected HP-bearing tokens
  // BEFORE the zoom shortcut takes them. Shift modifier = ±5. With no
  // HP-bearing token selected, fall through to the zoom binding so the
  // pre-92 behavior is preserved when the keys are pressed without a
  // selection.
  if (
    (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') &&
    !e.ctrlKey && !e.altKey && !e.metaKey
  ) {
    const isHeal = e.key === '+' || e.key === '=';
    const magnitude = e.shiftKey ? 5 : 1;
    const delta = isHeal ? magnitude : -magnitude;
    if (quickHpAdjust(delta)) {
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
    // Phase 167 — contextual `F`: when the user has selected
    // tokens, tween-fit to those tokens. Empty selection falls
    // through to the existing fit-to-content (whole map). Same
    // key, smarter behavior.
    fitSelectionOrContent();
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

  // Phase 153 — tool-activation shortcuts route through the
  // keybindings helper so user-overridden keys in
  // `preferences.keybindings` take effect. Modifier-key shortcuts
  // (handled below this switch) stay hardcoded.
  const lowered = e.key.toLowerCase();
  const remappedTool = lookupTool(lowered, preferences.get().keybindings);
  if (remappedTool) {
    toolManager.setActive(remappedTool);
    e.preventDefault();
    return;
  }

  switch (lowered) {
    case 'e': {
      const state = store.getState();
      const firstSelectedToken = state.tokens.find((t) => selection.ids.has(t.id));
      if (firstSelectedToken && !tokenEditor.isOpen()) {
        tokenEditor.openFor(firstSelectedToken);
        e.preventDefault();
        break;
      }
      // Phase 85 — same shortcut opens the wall editor when one or
      // more walls (and no tokens) are in selection.
      const selectedWalls = state.walls.filter((w) => selection.ids.has(w.id));
      if (selectedWalls.length > 0 && !wallEditor.isOpen()) {
        wallEditor.openFor(selectedWalls);
        e.preventDefault();
      }
      break;
    }
  }
});

// Phase 172 — install-as-app hint + offline banner. Listens for
// `beforeinstallprompt` (Chromium-only, no-op elsewhere) and the
// `online` / `offline` events; the hint card auto-shows on the
// install-prompt event and stays dismissible.
mountPwaInstallHint();

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
  // 0.72.2 — guard the save path behind `initialLoadComplete`. If
  // the tab is reloaded BEFORE the initial hydrate resolves, `store`
  // still holds the default empty state. Flushing a save at that
  // point would overwrite the real active-scene record in IDB + the
  // LS backup with blank data. Without the guard, a fast reload
  // (< ~200ms from first paint, typical during Vite dev-mode cold
  // compiles) silently wipes the current scene while leaving the
  // scene catalog intact — the exact symptom reported mid-Phase-72.
  //
  // Related: the 0.57.1 fix guarded outbound `full-state` broadcasts
  // behind the same flag. This is the local persistence half of the
  // same race: if a Spectator tab doesn't receive the empty broadcast
  // (because no Spectator is open), the race still manifests via the
  // local beforeunload save.
  if (!initialLoadComplete) {
    // Still clear the dirty flag so the next boot doesn't show the
    // spurious "last session wasn't closed cleanly" banner — we
    // haven't modified anything, so from the user's perspective this
    // WAS a clean close.
    markClean();
    return;
  }
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
  theme: import('../state/preferences.js').Theme;
}) {
  document.body.classList.toggle('reduced-motion', prefs.reducedMotion);
  document.body.classList.toggle('high-contrast', prefs.highContrast);
  applyTheme(prefs.theme);
}

/**
 * Phase 108 — derive a readable label from a MIME type when no
 * filename is available. The drag-drop / paste path receives
 * `Blob` not `File` for clipboard pastes, so we substitute a
 * timestamped pseudo-name that's still meaningfully unique in the
 * recents list ("Pasted PNG · 4:32 PM").
 */
function friendlyNameFromMime(mimeType: string): string {
  const subtype = mimeType.split('/')[1]?.toUpperCase() ?? 'IMAGE';
  const time = new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Pasted ${subtype} · ${time}`;
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
