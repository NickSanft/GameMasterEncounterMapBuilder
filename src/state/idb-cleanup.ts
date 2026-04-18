import type { ID, SessionState } from './types.js';
import { listImageIds, deleteImage } from '../images/store.js';
import { listLibraryTokens } from './token-catalog.js';
import { listLibraryTemplates } from './template-catalog.js';

export interface ImageUsageReport {
  total: number;
  referenced: number;
  orphans: ID[];
}

/**
 * Collect every image id currently referenced by the session state, token
 * library, and template library. Used for finding orphaned images in IDB.
 */
export async function collectReferencedImageIds(
  state: SessionState,
): Promise<Set<ID>> {
  const ids = new Set<ID>();

  if (state.background.imageId) ids.add(state.background.imageId);
  for (const t of state.tokens) {
    if (t.imageId) ids.add(t.imageId);
  }

  const catalogTokens = await listLibraryTokens();
  for (const e of catalogTokens) {
    if (e.imageId) ids.add(e.imageId);
  }

  const templates = await listLibraryTemplates();
  for (const tmpl of templates) {
    for (const tt of tmpl.tokens) {
      if (tt.imageId) ids.add(tt.imageId);
    }
  }

  return ids;
}

/**
 * Compare every stored image against the referenced set and return a usage
 * report listing orphans.
 */
export async function scanUnusedImages(
  state: SessionState,
): Promise<ImageUsageReport> {
  const stored = await listImageIds();
  const referenced = await collectReferencedImageIds(state);
  const orphans: ID[] = [];
  for (const id of stored) {
    if (!referenced.has(id)) orphans.push(id);
  }
  return {
    total: stored.length,
    referenced: referenced.size,
    orphans,
  };
}

/** Delete every id in `orphans` from the images IDB store. */
export async function removeUnusedImages(orphans: ID[]): Promise<number> {
  let removed = 0;
  for (const id of orphans) {
    try {
      await deleteImage(id);
      removed++;
    } catch (err) {
      console.warn('[idb-cleanup] could not delete image', id, err);
    }
  }
  return removed;
}
