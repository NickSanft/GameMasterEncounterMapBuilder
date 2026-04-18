import type { Renderer, FrameSample } from '../render/renderer.js';
import type { Store } from '../state/store.js';
import type { ViewMode } from '../state/types.js';

export interface DiagnosticsOverlayHandle {
  setEnabled(on: boolean): void;
  destroy(): void;
}

export interface DiagnosticsOverlayOptions {
  renderer: Renderer;
  store: Store;
  viewMode: ViewMode;
  /** Optional: supply a getter for the last-known spectator viewport size. */
  getRemoteViewport?(): { width: number; height: number } | null;
}

/**
 * Floating panel rendering FPS, frame time, token/AoE/annotation counts,
 * fog coverage, and camera info. Intentionally cheap to update.
 */
export function mountDiagnosticsOverlay(
  opts: DiagnosticsOverlayOptions,
): DiagnosticsOverlayHandle {
  const panel = document.createElement('div');
  panel.className = 'diagnostics-overlay';
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'off');
  panel.hidden = true;
  panel.innerHTML = `
    <div class="diag-row"><span class="diag-label">View</span><span class="diag-value" data-field="mode"></span></div>
    <div class="diag-row"><span class="diag-label">FPS</span><span class="diag-value" data-field="fps">—</span></div>
    <div class="diag-row"><span class="diag-label">Frame</span><span class="diag-value" data-field="frame">—</span></div>
    <div class="diag-row"><span class="diag-label">Canvas</span><span class="diag-value" data-field="canvas">—</span></div>
    <div class="diag-row"><span class="diag-label">Camera</span><span class="diag-value" data-field="camera">—</span></div>
    <div class="diag-row"><span class="diag-label">Grid</span><span class="diag-value" data-field="grid">—</span></div>
    <div class="diag-row"><span class="diag-label">Tokens</span><span class="diag-value" data-field="tokens">—</span></div>
    <div class="diag-row"><span class="diag-label">AoE</span><span class="diag-value" data-field="aoe">—</span></div>
    <div class="diag-row"><span class="diag-label">Annots</span><span class="diag-value" data-field="annot">—</span></div>
    <div class="diag-row"><span class="diag-label">Fog</span><span class="diag-value" data-field="fog">—</span></div>
    <div class="diag-row spectator-only" data-field="spectator-row" hidden>
      <span class="diag-label">Spect</span><span class="diag-value" data-field="spectator">—</span>
    </div>
  `;
  document.body.appendChild(panel);

  const $ = (field: string) =>
    panel.querySelector<HTMLSpanElement>(`[data-field="${field}"]`)!;
  const modeEl = $('mode');
  const fpsEl = $('fps');
  const frameEl = $('frame');
  const canvasEl = $('canvas');
  const cameraEl = $('camera');
  const gridEl = $('grid');
  const tokensEl = $('tokens');
  const aoeEl = $('aoe');
  const annotEl = $('annot');
  const fogEl = $('fog');
  const spectatorRow = panel.querySelector<HTMLDivElement>('[data-field="spectator-row"]')!;
  const spectatorEl = $('spectator');

  modeEl.textContent = opts.viewMode === 'gm' ? 'GM' : 'Spectator';

  let enabled = false;
  let unsubscribeFrame: (() => void) | null = null;
  let unsubscribeCamera: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;

  // Rolling FPS window (last N samples).
  const SAMPLES = 30;
  const deltas: number[] = [];
  const renderTimes: number[] = [];

  function refreshStateFields() {
    const state = opts.store.getState();
    tokensEl.textContent = String(state.tokens.length);
    aoeEl.textContent = String(state.aoeTemplates.length);
    annotEl.textContent = String(state.annotations.length);
    const total = state.grid.cols * state.grid.rows;
    let revealed = 0;
    for (let i = 0; i < state.fog.length; i++) if (state.fog[i] === 1) revealed++;
    const pct = total > 0 ? Math.round((revealed / total) * 100) : 0;
    fogEl.textContent = `${pct}% (${revealed}/${total})`;
    gridEl.textContent = `${state.grid.cols}×${state.grid.rows} @${state.grid.cellSize}px`;
  }

  function refreshCameraField() {
    const c = opts.renderer.camera;
    cameraEl.textContent = `(${c.x.toFixed(0)}, ${c.y.toFixed(0)}) ×${c.zoom.toFixed(2)}`;
    canvasEl.textContent = `${Math.round(opts.renderer.cssWidth)}×${Math.round(opts.renderer.cssHeight)}`;
  }

  function refreshSpectatorField() {
    if (opts.viewMode !== 'gm' || !opts.getRemoteViewport) {
      spectatorRow.hidden = true;
      return;
    }
    const vp = opts.getRemoteViewport();
    if (!vp) {
      spectatorRow.hidden = false;
      spectatorEl.textContent = 'offline';
      return;
    }
    spectatorRow.hidden = false;
    spectatorEl.textContent = `${Math.round(vp.width)}×${Math.round(vp.height)} world-px`;
  }

  function onFrame(sample: FrameSample) {
    if (sample.deltaMs > 0) {
      deltas.push(sample.deltaMs);
      if (deltas.length > SAMPLES) deltas.shift();
    }
    renderTimes.push(sample.renderMs);
    if (renderTimes.length > SAMPLES) renderTimes.shift();

    if (deltas.length > 0) {
      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const fps = avgDelta > 0 ? 1000 / avgDelta : 0;
      fpsEl.textContent = fps.toFixed(0);
    }
    if (renderTimes.length > 0) {
      const avgRender = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      frameEl.textContent = `${avgRender.toFixed(1)}ms`;
    }
    refreshCameraField();
    refreshSpectatorField();
  }

  function setEnabled(on: boolean) {
    if (on === enabled) return;
    enabled = on;
    panel.hidden = !on;
    if (on) {
      deltas.length = 0;
      renderTimes.length = 0;
      refreshStateFields();
      refreshCameraField();
      refreshSpectatorField();
      unsubscribeFrame = opts.renderer.onFrame(onFrame);
      unsubscribeCamera = opts.renderer.onCameraChange(() => {
        refreshCameraField();
      });
      unsubscribeStore = opts.store.subscribe(() => {
        refreshStateFields();
      });
      // Kick the renderer so we get at least one frame callback.
      opts.renderer.requestRender();
    } else {
      unsubscribeFrame?.();
      unsubscribeCamera?.();
      unsubscribeStore?.();
      unsubscribeFrame = null;
      unsubscribeCamera = null;
      unsubscribeStore = null;
    }
  }

  return {
    setEnabled,
    destroy() {
      setEnabled(false);
      panel.remove();
    },
  };
}
