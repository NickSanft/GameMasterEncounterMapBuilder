import type { ID, Token } from './types.js';
import { nid } from '../util/id.js';
import { runTx, TEMPLATE_CATALOG_STORE } from './idb.js';

/**
 * A single token within a template. Positions are *relative*: after
 * normalization, the minimum dx/dy across all members is 0.
 */
export interface TemplateToken {
  dx: number;
  dy: number;
  label: string;
  color: string;
  size: number;
  borderColor: string | null;
  imageId: ID | null;
  /**
   * Phase 69 — initiative bonus carried into placed tokens. Optional +
   * back-compat: pre-Phase-69 templates don't have this field; placed
   * tokens default to `0` when it's absent.
   */
  initiativeMod?: number;
}

export interface TemplateCatalogEntry {
  id: ID;
  name: string;
  tokens: TemplateToken[];
  createdAt: number;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return runTx<T>(TEMPLATE_CATALOG_STORE, mode, fn);
}

/**
 * Normalize a group of tokens so the minimum x/y is 0. Preserves relative
 * layout; strips token-level identity (id, absolute x/y).
 */
export function normalizeTokensForTemplate(tokens: Token[]): TemplateToken[] {
  if (tokens.length === 0) return [];
  const minX = Math.min(...tokens.map((t) => t.x));
  const minY = Math.min(...tokens.map((t) => t.y));
  return tokens.map((t) => ({
    dx: t.x - minX,
    dy: t.y - minY,
    label: t.label,
    color: t.color,
    size: t.size,
    borderColor: t.borderColor,
    imageId: t.imageId,
    initiativeMod: t.initiativeMod,
  }));
}

/**
 * Place a template at the given anchor grid cell. Each template token is
 * materialized with a fresh id, positioned at anchor + relative offset.
 */
export function placeTemplate(
  entry: TemplateCatalogEntry,
  anchorGx: number,
  anchorGy: number,
): Token[] {
  return entry.tokens.map((tt) => ({
    id: nid(),
    x: anchorGx + tt.dx,
    y: anchorGy + tt.dy,
    label: tt.label,
    color: tt.color,
    size: tt.size,
    borderColor: tt.borderColor,
    imageId: tt.imageId,
    hp: null,
    conditions: [],
    rotation: 0,
    losRadius: null,
    light: null,
    initiativeMod: tt.initiativeMod ?? 0,
    // Templates don't carry round timers — those are transient per-
    // combat state, not part of the layout definition.
    conditionExpirations: {},
  }));
}

export async function saveTemplateToLibrary(
  name: string,
  tokens: Token[],
): Promise<ID> {
  const entry: TemplateCatalogEntry = {
    id: nid(),
    name,
    tokens: normalizeTokensForTemplate(tokens),
    createdAt: Date.now(),
  };
  await run('readwrite', (s) => s.put(entry));
  return entry.id;
}

export async function putTemplateCatalogEntry(
  entry: TemplateCatalogEntry,
): Promise<void> {
  await run('readwrite', (s) => s.put(entry));
}

export async function listLibraryTemplates(): Promise<TemplateCatalogEntry[]> {
  const all = await run<TemplateCatalogEntry[]>('readonly', (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLibraryTemplate(
  id: ID,
): Promise<TemplateCatalogEntry | null> {
  const entry = await run<TemplateCatalogEntry | undefined>('readonly', (s) => s.get(id));
  return entry ?? null;
}

export async function deleteLibraryTemplate(id: ID): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}
