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

interface ExportedSession {
  version: 1;
  exportedAt: string;
  state: SerializedSessionState;
  images: ExportedImage[];
}

export async function exportSession(state: SessionState): Promise<string> {
  const serialized = serializeState(state);
  const imageIds = new Set<ID>();
  if (state.background.imageId) imageIds.add(state.background.imageId);
  for (const t of state.tokens) if (t.imageId) imageIds.add(t.imageId);

  const images: ExportedImage[] = [];
  for (const id of imageIds) {
    const record = await getImage(id);
    if (!record) continue;
    const dataUrl = await blobToDataURL(record.blob);
    images.push({ id, mimeType: record.mimeType, dataUrl });
  }

  const doc: ExportedSession = {
    version: 1,
    exportedAt: new Date().toISOString(),
    state: serialized,
    images,
  };
  return JSON.stringify(doc);
}

export async function importSession(
  json: string,
): Promise<{ state: SessionState; imageIds: ID[] }> {
  const doc = JSON.parse(json) as ExportedSession;
  if (doc.version !== 1) {
    throw new Error(`Unsupported export version: ${doc.version}`);
  }
  if (!doc.state) throw new Error('Missing state in export');

  const imageIds: ID[] = [];
  for (const img of doc.images ?? []) {
    const blob = await dataURLToBlob(img.dataUrl);
    await putImageAs(img.id, blob, img.mimeType);
    imageIds.push(img.id);
  }

  const state = deserializeState(doc.state);
  return { state, imageIds };
}
