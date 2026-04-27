import { createRenderer } from '../render/renderer.js';
import { attachPanZoom } from '../input/pan-zoom.js';
import { createStore } from '../state/store.js';
import { DEFAULT_CAMERA } from '../state/types.js';
import { createSyncChannel } from '../sync/channel.js';
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
import { getOrCreatePlayerId } from '../state/player-id.js';
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
import { mountSlashCommandInput } from '../ui/slash-command-input.js';
import {
  createChatHistory,
  spectatorShouldRenderChat,
} from '../state/chat-history.js';
import { mountChatPanel } from '../ui/chat-panel.js';
import { nid } from '../util/id.js';
import { mountMiniMap } from '../ui/mini-map.js';
import { createPingManager } from '../state/ping-manager.js';
import { createDamageFxManager } from '../state/damage-fx-manager.js';
import { createFogFadeTracker } from '../render/fog-fade-tracker.js';
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
import { mountSaveStatusPill } from '../ui/save-status-pill.js';
import { mountWeatherOverlay } from '../ui/weather-overlay.js';
import { mountAnimatedTokenOverlay } from '../ui/animated-token-overlay.js';
import {
  createLatencyTracker,
  PROBE_INTERVAL_MS,
} from '../state/latency-tracker.js';
import { applyTheme } from '../util/theme.js';
import { createFogWorkerClient } from '../render/fog-worker-client.js';
import FogWorker from '../render/fog-worker.js?worker';
import {
  collectLights,
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
// Phase 67 — per-role identity store, hoisted up here so the
// settings modal + the channel/identity wiring lower in the file
// share the same instance.
const identityPrefs = createIdentityPrefs('spectator');
applyPrefsToBody(preferences.get());

const announcer = createAnnouncer();

const fogWorkerClient = createFogWorkerClient({
  workerFactory: () => new FogWorker(),
});

// Start with default state; hydrate from IDB (with LS fallback) as
// soon as the async load resolves. Spectator typically receives a
// full-state message from the GM shortly after, but this lets a
// standalone Spectator tab preserve its last-seen state across reloads.
//
// 0.57.1 — guard the local hydrate behind `remoteStateReceived` so that
// when the GM is online + pushes a fresh full-state BEFORE our async
// IDB read resolves, we don't immediately overwrite the GM's
// authoritative state with our older local snapshot. (Saw this happen
// alongside the GM-side empty-broadcast bug — both contributed to
// active-scene corruption when the user reloaded a GM tab while a
// Spectator tab was already open.)
const store = createStore();
let remoteStateReceived = false;
void loadPersistedState().then((persisted) => {
  if (persisted && !remoteStateReceived) store.loadState(persisted);
});

const imageLoader = createImageLoader(() => renderer.requestRender());
const pingManager = createPingManager(() => renderer.requestRender());
const damageFxManager = createDamageFxManager(() => renderer.requestRender());
// Phase 78 — fog-reveal fade-in tracker. Diffs the fog buffer on
// every state change (including incoming patches from the GM) so
// reveals that arrive over the wire animate in for the player.
// The onTick callback drives a requestAnimationFrame loop while
// fades are in flight so the overlay actually animates.
const fogFadeTracker = createFogFadeTracker(() => renderer.requestRender());

// Phase 79 — atmospheric weather overlay (Spectator side). No
// picker; the Spectator just mirrors the GM-set weather via the
// state-sync wire. Re-synced from the store-subscribe block below.
const weatherOverlay = mountWeatherOverlay({
  getReducedMotion: () => preferences.get().reducedMotion,
});
const measurementOverlayRef = createMeasurementOverlayRef();

const initialCamera = (preferences.get().persistCamera && loadCamera('spectator')) || { ...DEFAULT_CAMERA };

const panZoomRef: { handle: PanZoomHandle | null } = { handle: null };

const renderer = createRenderer({
  canvas,
  mode: 'spectator',
  camera: initialCamera,
  // Phase 109 — filter tokens hidden from this Spectator before the
  // renderer + every layer that reads state.tokens (token glyphs,
  // initiative-active outline, drag overlays) sees them. The other
  // state slices (fog, walls, AoEs, annotations) pass through
  // unchanged. Returning the same object identity when no tokens are
  // hidden keeps perf parity with pre-109 for the common case.
  getState: () => {
    const raw = store.getState();
    if (permissions.hiddenTokenIds.size === 0) return raw;
    return { ...raw, tokens: filterVisibleTokens(raw.tokens) };
  },
  // Phase 81 (revisit) — animated GIFs handled by the DOM overlay
  // (mounted below); canvas falls back to the colored circle for them.
  getImage: (id) =>
    imageLoader.isAnimated(id) ? null : imageLoader.get(id),
  getPreferences: () => preferences.get(),
  getPings: () => pingManager.getActive(),
  getDamageFx: () => damageFxManager.getActive(),
  getFogFadeCells: () => fogFadeTracker.getActive(performance.now()),
  getReducedMotion: () => preferences.get().reducedMotion,
  getMeasurement: () => measurementOverlayRef.current,
  getRulerTargetFeet: () => rulerToolOptionsRef.current.targetFeet,
  getFogRects: () => fogWorkerClient.getLatest(),
});

// Phase 81 (revisit) — animated-token DOM overlay. Mounted AFTER
// the renderer so we can subscribe to onFrame. Spectator also
// hides imgs for tokens whose footprint touches any un-revealed
// cell (matches the canvas-side fog masking that the spectator
// sees).
//
// 0.84.1 — `getEffectiveFog` plumbs through the LoS-AND-light masked
// fog (`spectatorEffectiveFog`) so a token in a GM-revealed cell that
// the player can't actually see (no nearby viewer / no light) hides
// its GIF too. Pre-0.84.1 the overlay only checked raw `state.fog`,
// causing GIF tokens to leak through the LoS fog overlay.
const animatedTokenOverlay = mountAnimatedTokenOverlay({
  canvas,
  mode: 'spectator',
  getState: () => store.getState(),
  getCamera: () => renderer.camera,
  isAnimated: (id) => imageLoader.isAnimated(id),
  getUrl: (id) => imageLoader.getUrl(id),
  getEffectiveFog: () => {
    const state = store.getState();
    const losOn = preferences.get().losMode !== 'off';
    const polygons = fogWorkerClient.getLatestPolygons();
    const lightPolygons = fogWorkerClient.getLatestLightPolygons();
    return spectatorEffectiveFog(state, polygons, losOn, lightPolygons);
  },
});
renderer.onFrame(() => animatedTokenOverlay.update());

fogWorkerClient.onUpdate(() => renderer.requestRender());

// Phase 82 — own permissions, pushed by the GM via the `permissions`
// SyncMessage. Default = full permissions (matches the GM-side
// store's behavior for never-restricted Spectators); overrides
// arrive on identity broadcast + on subsequent GM toggles.
//
// Phase 109 — `hiddenTokenIds` carries the set of tokens the GM has
// hidden from THIS Spectator. The renderer + LoS / light collectors
// below filter against it so the affected tokens never enter the
// Spectator's render path (no glyph, no sight halo, no torch).
//
// Hoisted to the top of the entry so the LoS / fog functions below
// can read it without hitting TDZ on first invocation (`refreshLos()`
// fires immediately after the function declarations land).
const permissions: { canRoll: boolean; hiddenTokenIds: Set<string> } = {
  canRoll: true,
  hiddenTokenIds: new Set(),
};

function refreshLos(): void {
  const state = store.getState();
  if (preferences.get().losMode === 'off') return;
  // Phase 109 — drop tokens hidden from this Spectator before
  // collecting viewers + lights. So a hidden NPC's vision doesn't
  // illuminate cells for this player + a hidden torchbearer's
  // light halo doesn't betray its existence.
  const visibleTokens = filterVisibleTokens(state.tokens);
  fogWorkerClient.requestLos(
    collectViewers(visibleTokens, state.grid),
    // Phase 112 — cellSize required for block-wall perimeter expansion.
    collectSightWalls(state.walls, state.grid.cellSize),
    // Phase 57 — lights compose with viewer polygons in the spectator
    // fog mask: a cell only shows if some viewer can see it AND some
    // light reaches it (when any lights are configured on the map).
    collectLights(visibleTokens, state.grid),
  );
}

/**
 * Phase 109 — drop tokens hidden from this Spectator. Returns the
 * input array unchanged when no tokens are hidden (common case) so
 * we don't allocate a new array every frame for the no-restriction
 * majority of sessions.
 */
function filterVisibleTokens<T extends { id: string }>(tokens: readonly T[]): T[] {
  if (permissions.hiddenTokenIds.size === 0) return tokens as T[];
  return tokens.filter((t) => !permissions.hiddenTokenIds.has(t.id));
}

function refreshFogRects(): void {
  const state = store.getState();
  const losOn = preferences.get().losMode !== 'off';
  const polygons = fogWorkerClient.getLatestPolygons();
  const lightPolygons = fogWorkerClient.getLatestLightPolygons();
  const fog = spectatorEffectiveFog(state, polygons, losOn, lightPolygons);
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
  identityPrefs,
  store,
});

const shortcutOverlay = mountShortcutOverlay('spectator');
mountInitiativeBar(store, 'spectator');
mountHelpOverlay('spectator');
const dicePanel = mountDicePanel({
  viewMode: 'spectator',
  // Phase 73 — same reduced-motion wiring as the GM side.
  getReducedMotion: () => preferences.get().reducedMotion,
  onLocalRoll: (roll) => {
    // Phase 82 — when the GM has revoked our canRoll permission, we
    // still let the local animation play (so the user gets visual
    // feedback that their click did something) but skip the
    // broadcast. The GM-side enforcement drops it anyway, so this
    // is mostly to avoid noise in the wire + the GM's roll history.
    if (!permissions.canRoll) {
      announcer.announce(
        `Roll suppressed — the GM has restricted your dice rolls.`,
      );
      return;
    }
    // Phase 63 — stamp the roll with our display name so the GM's
    // panel + announcer say "Alice rolled 1d20" instead of just
    // "Spectator rolled 1d20". `ownIdentity` is declared later in
    // the module but only called when the user rolls (runtime lookup
    // is fine; TypeScript is happy with the lexical reference).
    const stamped = { ...roll, senderName: ownIdentity().name };
    channel?.send({ type: 'dice-roll', roll: stamped });
    announcer.announce(`You rolled ${roll.source}: ${roll.total}.`);
  },
});

// Phase 119 — Spectator chat panel. Per-message visibility lets a
// player whisper to the GM (gm-only on the wire); other Spectators
// filter those out via `spectatorShouldRenderChat`. Toggle with `c`.
const chatHistory = createChatHistory();
const chatPanel = mountChatPanel({
  history: chatHistory,
  viewMode: 'spectator',
  onSend: (text, visibility) => {
    const ownIdent = ownIdentity();
    const msg = {
      id: nid(),
      senderId: playerId,
      senderName: ownIdent.name,
      senderRole: 'spectator' as const,
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

// Phase 74 — slash-command input (Spectator). Same `/` hotkey as
// the GM side. `/init` is GM-only (the Spectator can't author
// initiative entries); the dispatcher returns an inline error.
const slashInput = mountSlashCommandInput({
  onCommand: (action) => {
    if (action.kind === 'roll') {
      // Phase 82 — surface the restriction inline rather than letting
      // the dice-panel quietly suppress the broadcast.
      if (!permissions.canRoll) {
        return 'The GM has restricted your dice rolls.';
      }
      const ok = dicePanel.roll(action.expression);
      return ok ? undefined : `Couldn't parse: ${action.expression}`;
    }
    if (action.kind === 'init') {
      return 'Initiative rolls are GM-only.';
    }
    if (action.kind === 'help') {
      shortcutOverlay.open();
      return undefined;
    }
    return undefined;
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

// Late-bound reference — `remotePlayModal` is constructed below
// (after `channel` is created). The menu lambda runs on click, by
// which time the ref is populated. Using a box instead of directly
// referencing the const dodges the TDZ diagnostic.
const remotePlayRef: { current: (() => void) | null } = { current: null };
mountSpectatorMenu({
  onSettings: () => settingsModal.open(),
  onShortcuts: () => shortcutOverlay.open(),
  onRemotePlay: () => remotePlayRef.current?.(),
});

mountZoomControls(document.body, {
  onZoomIn: () => zoomBy(renderer, ZOOM_BUTTON_STEP),
  onZoomOut: () => zoomBy(renderer, 1 / ZOOM_BUTTON_STEP),
  onFit: () => fitToContent(renderer, store.getState(), (id) => imageLoader.get(id)),
  onReset: () => resetCamera(renderer),
});

// Phase 76 — auto-save indicator pill (Spectator side). The Spectator
// persists its OWN local snapshot (used for offline-after-disconnect),
// not the GM's authoritative state — but the user still benefits from
// knowing whether the local backup is intact.
const saveStatusPill = mountSaveStatusPill();

const persist = debounce(async () => {
  saveStatusPill.setStatus('saving');
  try {
    const ok = await saveState(store.getState());
    saveStatusPill.setStatus(ok ? 'saved' : 'error');
  } catch (err) {
    console.warn('[persist] save threw unexpectedly', err);
    saveStatusPill.setStatus('error');
  }
}, 200);

function updateCanvasLabel() {
  if (!canvas) return;
  const state = store.getState();
  // Phase 109 — drop tokens hidden from this Spectator before counting
  // so the aria-label doesn't betray a hidden NPC's existence ("3 tokens
  // visible, 5 total" with only 2 actually-visible tokens would be a leak).
  const visibleSet = filterVisibleTokens(state.tokens);
  const tokenCount = visibleSet.length;
  const total = state.grid.cols * state.grid.rows;
  let revealed = 0;
  for (let i = 0; i < state.fog.length; i++) if (state.fog[i] === 1) revealed++;
  const pct = total > 0 ? Math.round((revealed / total) * 100) : 0;
  const visibleTokens = visibleSet.filter((t) => {
    const gx = Math.floor(t.x);
    const gy = Math.floor(t.y);
    if (gx < 0 || gy < 0 || gx >= state.grid.cols || gy >= state.grid.rows) return false;
    return state.fog[gy * state.grid.cols + gx] === 1;
  }).length;
  const tokenLabel = visibleTokens === 1 ? '1 token' : `${visibleTokens} tokens`;
  canvas.setAttribute(
    'aria-label',
    `Spectator battle map. ${tokenLabel} visible. ${pct} percent of map revealed. ${tokenCount} total tokens in session.`,
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
  // Phase 78 — diff fog buffer for the bloom-in overlay. session-reset
  // / null-patch (e.g. full-state from the GM at boot) reseeds so the
  // initial fog snapshot doesn't all flash in.
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
  // Phase 79 — mirror the GM-set weather effect locally. Idempotent
  // when unchanged; runs cheap on every patch.
  weatherOverlay.setWeather(s.weather);
});

// Phase 66 — `createSyncChannel` takes the tab's player id so every
// outgoing envelope is stamped + the channel can drop self-echoes.
// `playerId` was declared further down in Phase 63; hoist it here.
//
// Phase 110 — the id is now sessionStorage-backed so a page reload
// (F5, browser-restore) keeps the SAME id, and the GM's per-player
// state (Phase 82 permissions, Phase 109 hidden tokens) survives the
// reload. A brand-new tab still mints a fresh id — sessionStorage is
// per-tab, not per-browser.
const playerId = getOrCreatePlayerId('spectator');
const channel = createSyncChannel(playerId);

// Phase 62 — Remote Play modal (Spectator side). Populate the
// late-bound ref the session menu uses so the button works.
// Phase 64 — same shared-session + status-chip setup as the GM
// side. The session tracks the active WebRTC peer; the chip
// surfaces its state outside the modal; a status-banner warns
// the Spectator when the connection drops.
const remoteSession = createRemoteSession();
const remotePlayModal = channel
  ? mountRemotePlayModal({ channel, viewLabel: 'Spectator', session: remoteSession })
  : null;
if (remotePlayModal) {
  remotePlayRef.current = () => remotePlayModal.open();
}
// Phase 83 — latency tracker passed to the chip so it can render
// the RTT suffix when connected. The probe loop below feeds it.
const latencyTracker = createLatencyTracker();
if (channel) {
  mountRemoteStatusChip({
    session: remoteSession,
    onClick: () => remotePlayModal?.open(),
    latency: latencyTracker,
  });
}

// Phase 83 — same RTT probe loop as the GM side. Spectator initiates
// probes when its remote peer is connected; the GM (or other side)
// echoes back via `latency-probe-reply`. See gm.ts for the
// architecture rationale.
const inflightProbes = new Map<number, number>();
let probeIntervalId = 0;
let probeIdSeq = 1;
const PROBE_TIMEOUT_MS = 60_000;
function sendProbe() {
  if (!channel) return;
  if (remoteSession.getState() !== 'connected') return;
  const id = probeIdSeq++;
  inflightProbes.set(id, performance.now());
  const now = performance.now();
  for (const [k, t] of inflightProbes) {
    if (now - t > PROBE_TIMEOUT_MS) inflightProbes.delete(k);
  }
  channel.send({ type: 'latency-probe', id });
}
remoteSession.subscribe(({ state }) => {
  if (state === 'connected') {
    if (probeIntervalId === 0) {
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
// Phase 64 — when the Spectator's connection to a remote GM drops,
// surface a banner so the user knows they're no longer mirroring
// a live session. Clicking the chip (top-left) or opening Remote
// Play from the menu brings up the reconnect flow.
let lastRemoteState: string = 'idle';
remoteSession.subscribe(({ state }) => {
  if (
    (state === 'disconnected' || state === 'failed' || state === 'closed') &&
    lastRemoteState === 'connected'
  ) {
    statusBanners.show({
      message:
        'Remote connection lost. Your local view is still usable; open Remote Play from the menu to reconnect.',
      variant: 'warn',
      dismissible: true,
      onDismiss: () => statusBanners.hide(),
    });
  } else if (state === 'connected' && lastRemoteState !== 'connected') {
    // Clear any stale "connection lost" banner on successful
    // reconnect.
    statusBanners.hide();
  }
  lastRemoteState = state;
});

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

// ─── Phase 63 — Player identity (Spectator) ─────────────────────
// `playerId` declared earlier (Phase 66 — needed for the channel
// envelope sender id); the rest of the identity wiring follows here.
const identityRegistry = createIdentityRegistry();

// Phase 67 — `identityPrefs` is declared earlier (right after
// `preferences`); same per-role store on both views.
function ownIdentity(): PlayerIdentity {
  const id = identityPrefs.get();
  const displayName = resolveName(id.name, 'spectator');
  const color = id.color || colorForName(displayName);
  return { id: playerId, name: displayName, color, role: 'spectator' };
}

function broadcastIdentity(): void {
  if (!channel) return;
  const id = ownIdentity();
  identityRegistry.update(id);
  channel.send({ type: 'identity', identity: id });
}

// Phase 67 — identity edits arrive via the dedicated identityPrefs
// store now, not the shared preferences blob.
let lastBroadcastIdentity = '';
identityPrefs.subscribe(() => {
  const id = ownIdentity();
  const sig = `${id.name}|${id.color}`;
  if (sig === lastBroadcastIdentity) return;
  lastBroadcastIdentity = sig;
  broadcastIdentity();
});

window.addEventListener('beforeunload', () => {
  channel?.send({ type: 'identity-leave', id: playerId });
});

if (channel) {
  channel.onMessage((msg) => {
    if (msg.type === 'full-state') {
      remoteStateReceived = true;
      store.loadState(deserializeState(msg.state));
    } else if (msg.type === 'patch') {
      remoteStateReceived = true;
      store.applyPatch(fromSerializablePatch(msg.patch));
    } else if (msg.type === 'camera') {
      applyRemoteCamera(msg.camera);
    } else if (msg.type === 'ping') {
      pingManager.add(msg.x, msg.y, msg.color);
      if (msg.senderName) announcer.announce(`${msg.senderName} pinged the map.`);
    } else if (msg.type === 'hello' && msg.from === 'gm') {
      // GM just loaded — (re)announce our viewport so the indicator appears.
      broadcastViewportThrottled();
      // Phase 63 — also re-broadcast our identity so the GM's
      // Connected Players panel updates for reload scenarios.
      broadcastIdentity();
    } else if (msg.type === 'dice-roll') {
      dicePanel.pushRemoteRoll(msg.roll);
      if (msg.roll.from !== 'spectator') {
        const who = msg.roll.senderName ?? 'GM';
        announcer.announce(`${who} rolled ${msg.roll.source}: ${msg.roll.total}.`);
      }
    } else if (msg.type === 'identity') {
      identityRegistry.update(msg.identity);
    } else if (msg.type === 'identity-leave') {
      identityRegistry.forget(msg.id);
    } else if (msg.type === 'damage-fx') {
      // Phase 77 — replay the GM's damage / heal floating-number
      // animation locally. Self-echo dropped at the envelope layer.
      damageFxManager.add(msg.tokenId, msg.amount);
    } else if (msg.type === 'chat') {
      // Phase 119 — chat from another peer. Spectators FILTER
      // gm-only messages (private notes / whispers); everything else
      // gets added to the local history (id-dedupe makes re-broadcasts
      // a no-op).
      const chatMsg = {
        id: msg.messageId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        text: msg.text,
        visibility: msg.visibility,
        timestamp: msg.timestamp,
      };
      if (spectatorShouldRenderChat(chatMsg)) {
        chatHistory.add(chatMsg);
        announcer.announce(`${msg.senderName || 'GM'} said: ${msg.text}`);
      }
    } else if (msg.type === 'permissions') {
      // Phase 82 — only act on permissions broadcasts targeted at
      // our own playerId; messages for other Spectators are
      // ignored. (The GM broadcasts to all peers; the targetId
      // filter narrows it.)
      if (msg.targetId === playerId) {
        permissions.canRoll = msg.permissions.canRoll;
        // Phase 109 — pre-109 senders omit `hiddenTokenIds`; default
        // to "no tokens hidden" so back-compat holds and the renderer
        // sees everything. Subsequent GM toggles arrive as full lists.
        const ids = msg.permissions.hiddenTokenIds ?? [];
        permissions.hiddenTokenIds = new Set(ids);
        // Re-collect LoS + re-render + re-derive the canvas aria-label
        // now that the visible token set may have changed. The aria-
        // label refresh normally rides on store-subscribe (only fires
        // on state patches); permissions live outside the store, so
        // we have to nudge it explicitly here.
        refreshLos();
        refreshFogRects();
        renderer.requestRender();
        updateCanvasLabel();
      }
    } else if (msg.type === 'latency-probe') {
      // Phase 83 — peer is asking for an RTT measurement; echo
      // back immediately. See gm.ts for the round-trip math.
      channel.send({ type: 'latency-probe-reply', id: msg.id });
    } else if (msg.type === 'latency-probe-reply') {
      const sentAt = inflightProbes.get(msg.id);
      if (sentAt !== undefined) {
        inflightProbes.delete(msg.id);
        latencyTracker.note(performance.now() - sentAt);
      }
    }
  });
  channel.send({ type: 'hello', from: 'spectator' });
  broadcastViewportThrottled();
  // Phase 63 — broadcast our identity on boot so the GM knows
  // who just connected without waiting for a ping / dice roll.
  broadcastIdentity();
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
  // Phase 74 — `/` pops the slash-command input. Skipped when an
  // editable field is already focused (handled above).
  if (e.key === '/') {
    slashInput.open();
    e.preventDefault();
    return;
  }
  // Phase 119 — `c` toggles the chat panel.
  if (e.key === 'c' && !e.shiftKey && !e.altKey) {
    chatPanel.toggle();
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

function mountSpectatorMenu(actions: {
  onSettings: () => void;
  onShortcuts: () => void;
  onRemotePlay?: () => void;
}) {
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

  // Phase 62 — optional Remote Play entry on the Spectator side so
  // a player can join a remote GM's session across the internet.
  let remotePlayBtn: HTMLButtonElement | null = null;
  if (actions.onRemotePlay) {
    const handler = actions.onRemotePlay;
    remotePlayBtn = document.createElement('button');
    remotePlayBtn.type = 'button';
    remotePlayBtn.textContent = 'Remote play…';
    remotePlayBtn.title = 'Connect to a remote GM via WebRTC (beta)';
    remotePlayBtn.addEventListener('click', () => {
      remotePlayBtn?.blur();
      handler();
    });
  }

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.textContent = 'Settings';
  settingsBtn.title = 'Open settings panel';
  settingsBtn.addEventListener('click', () => {
    settingsBtn.blur();
    actions.onSettings();
  });

  menu.appendChild(shortcutsBtn);
  if (remotePlayBtn) menu.appendChild(remotePlayBtn);
  menu.appendChild(settingsBtn);
  document.body.appendChild(menu);
}

function applyPrefsToBody(prefs: {
  reducedMotion: boolean;
  highContrast: boolean;
  theme: import('../state/preferences.js').Theme;
}) {
  document.body.classList.toggle('reduced-motion', prefs.reducedMotion);
  document.body.classList.toggle('high-contrast', prefs.highContrast);
  applyTheme(prefs.theme);
}

function showSyncWarning() {
  const banner = document.createElement('div');
  banner.className = 'sync-warning';
  banner.textContent =
    'Live sync unavailable in this browser (likely private mode). Refresh to see updates.';
  document.body.appendChild(banner);
}
