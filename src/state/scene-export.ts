/**
 * Phase 98 — per-scene JSON export / import.
 *
 * Lets the GM share a single encounter without bundling the whole
 * session. Format mirrors `exportSession` / `importSession` (Phase 41)
 * but scopes the document to ONE scene + carries the scene's display
 * name so the recipient sees a meaningful "imported as: …" entry.
 *
 * Wire format:
 *   {
 *     version: 1,
 *     kind: 'scene',
 *     exportedAt: ISO string,
 *     name: 'Goblin Cave',
 *     state: SerializedSessionState,
 *     images: [{ id, mimeType, dataUrl }, …]
 *   }
 *
 * `kind: 'scene'` distinguishes this from a full-session export
 * (`kind: 'session'`, implicit when absent for backwards compat) so a
 * future "smart import" UI can detect which kind of file the user
 * dropped without trial-and-error. The current import paths are
 * separate functions — pick the right one at the call site.
 */

import type { ID, SessionState } from './types.js';
import {
  deserializeState,
  serializeState,
  type SerializedSessionState,
} from '../sync/messages.js';
import {
  blobToDataURL,
  dataURLToBlob,
  getImage,
  putImageAs,
} from '../images/store.js';

interface ExportedImage {
  id: ID;
  mimeType: string;
  dataUrl: string;
}

export interface ExportedScene {
  version: 1;
  kind: 'scene';
  exportedAt: string;
  /** Display name of the scene at export time. */
  name: string;
  state: SerializedSessionState;
  images: ExportedImage[];
}

/**
 * Build a JSON string for a single scene + its referenced images.
 * The shape is symmetric with `exportSession` so callers can share
 * the file-download pipeline.
 */
export async function exportScene(
  name: string,
  state: SessionState,
): Promise<string> {
  const serialized = serializeState(state);
  const imageIds = new Set<ID>();
  if (state.background.imageId) imageIds.add(state.background.imageId);
  for (const t of state.tokens) if (t.imageId) imageIds.add(t.imageId);

  const images: ExportedImage[] = [];
  for (const id of imageIds) {
    const record = await getImage(id);
    if (!record) continue;
    const dataUrl = await blobToDataURL(record.blob, record.mimeType);
    images.push({ id, mimeType: record.mimeType, dataUrl });
  }

  const doc: ExportedScene = {
    version: 1,
    kind: 'scene',
    exportedAt: new Date().toISOString(),
    name: name.trim() || 'Imported scene',
    state: serialized,
    images,
  };
  return JSON.stringify(doc);
}

export interface ImportedScene {
  /** Suggested display name (caller can override). */
  name: string;
  /** Hydrated session state ready to feed into `saveScene`. */
  state: SessionState;
  /** Image ids written to IDB by the import; useful for cleanup on cancel. */
  imageIds: ID[];
}

/**
 * Parse + validate a scene-export JSON string. Restores referenced
 * images into IDB (under their original ids — collisions silently
 * overwrite, same as `importSession`). Returns the hydrated state +
 * the suggested name. The caller is responsible for creating the
 * actual scene record (typically via `saveScene(nid(), state, { name })`).
 *
 * Throws on:
 *   - Invalid JSON
 *   - Wrong `kind` (e.g. a session export sent here)
 *   - Unsupported `version`
 *   - Missing `state`
 */
export async function importScene(json: string): Promise<ImportedScene> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Not valid JSON');
  }
  const doc = parsed as Partial<ExportedScene> & { kind?: string };
  if (doc.kind !== 'scene') {
    throw new Error(
      `Not a scene export (kind: ${String(doc.kind ?? 'session')}). Use the regular Import for full sessions.`,
    );
  }
  if (doc.version !== 1) {
    throw new Error(`Unsupported scene-export version: ${String(doc.version)}`);
  }
  if (!doc.state) throw new Error('Scene export is missing state');

  const imageIds: ID[] = [];
  for (const img of doc.images ?? []) {
    try {
      const blob = await dataURLToBlob(img.dataUrl);
      await putImageAs(img.id, blob, img.mimeType);
      imageIds.push(img.id);
    } catch (err) {
      // One bad image shouldn't doom the whole import. Skip + log.
      console.warn('[scene-export] image import failed', img.id, err);
    }
  }

  const state = deserializeState(doc.state);
  const name = (doc.name ?? '').trim() || 'Imported scene';
  return { name, state, imageIds };
}
