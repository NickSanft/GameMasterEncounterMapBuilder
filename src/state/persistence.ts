import type { SessionState } from './types.js';
import {
  deserializeState,
  serializeState,
  type SerializedSessionState,
} from '../sync/messages.js';
import { STORAGE_KEY } from '../util/constants.js';

export function saveState(state: SessionState): void {
  try {
    const json = JSON.stringify(serializeState(state));
    localStorage.setItem(STORAGE_KEY, json);
  } catch (err) {
    console.warn('[persistence] save failed', err);
  }
}

export function loadPersistedState(): SessionState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const raw = JSON.parse(json) as SerializedSessionState | null;
    if (!raw || raw.version !== 1) return null;
    return deserializeState(raw);
  } catch (err) {
    console.warn('[persistence] load failed', err);
    return null;
  }
}

export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[persistence] clear failed', err);
  }
}
