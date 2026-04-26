/**
 * Phase 100 — drag-and-drop + paste-to-upload background images.
 *
 * Two entry paths:
 *
 *   1. **Drag a file onto the canvas** — the user drags an image
 *      from their desktop / file manager onto the GM map. A
 *      full-canvas overlay appears with "Drop to set as background"
 *      while the drag is over the page; releasing applies the file.
 *
 *   2. **Paste from clipboard** — the user copies an image (e.g.
 *      from a screenshot, browser image, etc.) and presses Ctrl+V
 *      anywhere outside an editable input.
 *
 * Both routes are gated to image MIME types — non-images fall
 * through silently so you can still paste text into Settings or
 * drag files between OS apps without weird side effects.
 *
 * GM-only — Spectator can't author backgrounds.
 *
 * Pure UI / event module. The host wires `onUpload(blob, mimeType)`
 * to the existing `applyBackgroundBlob` path so the IDB write +
 * background-update patch flow is reused.
 */

import { isEditableFocus } from '../util/focus.js';

export interface UploadDropZoneHandle {
  destroy(): void;
}

export interface UploadDropZoneOptions {
  /**
   * Canvas (or any element) that's the visual target for drops. The
   * overlay is positioned over `document.body` so the entire viewport
   * accepts drops — anchoring to a small canvas would be unfriendly
   * if the user releases slightly off-target. Anchor is used only
   * for the visual overlay's position when needed.
   */
  canvas: HTMLElement;
  /** Called once per accepted image; either drag-drop or paste path. */
  onUpload(blob: Blob, mimeType: string): void;
  /**
   * Optional notifier for "the user did something but it wasn't an
   * image." Wires to the announcer for a hint like "Drop or paste
   * an image to set the background — only image files are accepted."
   * Skipped if the dropped item simply isn't a file at all.
   */
  onRejectedNonImage?(): void;
}

export function mountUploadDropZone(
  opts: UploadDropZoneOptions,
): UploadDropZoneHandle {
  const overlay = document.createElement('div');
  overlay.className = 'upload-drop-zone';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="upload-drop-zone-card">
      <p class="upload-drop-zone-icon" aria-hidden="true">↧</p>
      <p class="upload-drop-zone-title">Drop to set as background</p>
      <p class="upload-drop-zone-hint">Releases the image as the new map background.</p>
    </div>
  `;
  document.body.appendChild(overlay);

  // Counter-based dragenter/dragleave tracking. dragenter fires on
  // every child element transition, so a naive "dragenter shows /
  // dragleave hides" toggle flickers as the cursor moves. Counting
  // each enter/leave gives a robust "is the file currently over the
  // window" boolean.
  let dragDepth = 0;

  function show() {
    if (overlay.hidden) overlay.hidden = false;
  }
  function hide() {
    overlay.hidden = true;
    dragDepth = 0;
  }

  function isFileDrag(e: DragEvent): boolean {
    if (!e.dataTransfer) return false;
    // dataTransfer.types is the only reliable cross-browser way to
    // detect file drags during dragenter/dragover (the `files` list
    // is populated only on `drop`).
    return Array.from(e.dataTransfer.types).includes('Files');
  }

  function imageBlobFromDataTransfer(dt: DataTransfer): { blob: Blob; type: string } | null {
    const files = Array.from(dt.files);
    for (const f of files) {
      if (f.type.startsWith('image/')) return { blob: f, type: f.type };
    }
    // Fallback: some clipboard sources expose blobs via `items`.
    if (dt.items) {
      for (const item of Array.from(dt.items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) return { blob, type: blob.type };
        }
      }
    }
    return null;
  }

  function onDragEnter(e: DragEvent) {
    if (!isFileDrag(e)) return;
    dragDepth++;
    e.preventDefault();
    show();
  }

  function onDragOver(e: DragEvent) {
    if (!isFileDrag(e)) return;
    // Required to allow drop. The cursor effect is "copy" since we're
    // creating a new resource (the background image) from the file.
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  function onDragLeave(e: DragEvent) {
    if (!isFileDrag(e)) return;
    dragDepth--;
    if (dragDepth <= 0) hide();
  }

  function onDrop(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    hide();
    const found = imageBlobFromDataTransfer(e.dataTransfer);
    if (found) {
      opts.onUpload(found.blob, found.type);
    } else {
      // The user dropped a file but it wasn't an image. Signal so the
      // host can announce a hint. Non-file drags (e.g. text) get no
      // notification — silent fall-through is the right default there.
      const hadFiles =
        Array.from(e.dataTransfer.types).includes('Files') &&
        e.dataTransfer.files.length > 0;
      if (hadFiles) opts.onRejectedNonImage?.();
    }
  }

  function onPaste(e: ClipboardEvent) {
    // Skip paste targeting an editable element — the user is pasting
    // text into a form field, not setting the background.
    if (isEditableFocus(e.target)) return;
    const dt = e.clipboardData;
    if (!dt) return;
    const found = imageBlobFromDataTransfer(dt);
    if (!found) return;
    e.preventDefault();
    opts.onUpload(found.blob, found.type);
  }

  // Use the WINDOW for drag/drop so the entire viewport is the drop
  // zone. Otherwise a near-miss (releasing slightly off the canvas)
  // would be the browser's default "open this image in a new tab"
  // — surprising + destructive of the in-progress session.
  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);
  window.addEventListener('paste', onPaste);

  // Reference the canvas so unused-binding lint / tree-shaking don't
  // complain; the overlay is full-viewport regardless.
  void opts.canvas;

  return {
    destroy() {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
      overlay.remove();
    },
  };
}
