import type {
  Annotation,
  AoeTemplate,
  Background,
  Camera,
  DrawStroke,
  GridConfig,
  InitiativeState,
  SessionState,
  StatePatch,
  Token,
  TokenHp,
  Wall,
} from '../state/types.js';

function normalizeHp(hp: unknown): TokenHp | null {
  if (!hp || typeof hp !== 'object') return null;
  const h = hp as Partial<TokenHp>;
  if (typeof h.current !== 'number' || typeof h.max !== 'number') return null;
  const max = Math.max(0, Math.floor(h.max));
  const current = Math.max(0, Math.min(max, Math.floor(h.current)));
  const visibility: TokenHp['visibility'] = h.visibility === 'gm' ? 'gm' : 'shared';
  return { current, max, visibility };
}

export interface SerializedSessionState {
  version: 1;
  grid: GridConfig;
  background: Background;
  tokens: Token[];
  fog: number[];
  annotations: Annotation[];
  aoeTemplates: AoeTemplate[];
  initiative: InitiativeState;
  strokes: DrawStroke[];
  walls: Wall[];
}

export type SerializablePatch =
  | Exclude<StatePatch, { kind: 'session-reset' }>
  | { kind: 'session-reset'; state: SerializedSessionState };

export interface ViewportRect {
  /** World-space top-left x. */
  x: number;
  /** World-space top-left y. */
  y: number;
  /** World-space width. */
  width: number;
  /** World-space height. */
  height: number;
}

export interface DiceRollBroadcast {
  /** Source expression as the user typed it. */
  source: string;
  /** Who rolled it — affects the "GM rolled…" / "You rolled…" label. */
  from: 'gm' | 'spectator';
  /** Final total after modifiers. */
  total: number;
  /** Pretty, pre-formatted breakdown (see formatRoll). */
  breakdown: string;
  /** Monotonically-increasing id (timestamp) so duplicate messages can
   * be de-duped by receivers. */
  id: number;
}

export type SyncMessage =
  | { type: 'hello'; from: 'gm' | 'spectator' }
  | { type: 'full-state'; state: SerializedSessionState }
  | { type: 'patch'; patch: SerializablePatch }
  | { type: 'request-full-state' }
  | { type: 'camera'; camera: Camera }
  | { type: 'request-camera' }
  | { type: 'ping'; x: number; y: number; color?: string }
  | { type: 'spectator-viewport'; viewport: ViewportRect }
  | { type: 'dice-roll'; roll: DiceRollBroadcast }
  /**
   * Liveness ping every GM tab broadcasts every few seconds so other
   * GM tabs can detect that they're double-booked. Each tab has a
   * session-random id; two tabs see conflicting ids and can warn.
   */
  | { type: 'gm-heartbeat'; tabId: string };

export function serializeState(s: SessionState): SerializedSessionState {
  return {
    version: s.version,
    grid: { ...s.grid },
    background: { ...s.background },
    tokens: s.tokens.map((t) => ({ ...t })),
    fog: Array.from(s.fog),
    annotations: s.annotations.map((a) => ({ ...a })),
    aoeTemplates: s.aoeTemplates.map((a) => ({ ...a })),
    initiative: {
      order: s.initiative.order.map((e) => ({ ...e })),
      activeId: s.initiative.activeId,
      round: s.initiative.round,
    },
    strokes: s.strokes.map((st) => ({
      ...st,
      points: st.points.map((p) => ({ ...p })),
    })),
    walls: s.walls.map((w) => ({ ...w })),
  };
}

export function deserializeState(s: SerializedSessionState): SessionState {
  const bg = s.background as Background & { scale?: number };
  const scaleX =
    typeof bg.scaleX === 'number' ? bg.scaleX : typeof bg.scale === 'number' ? bg.scale : 1;
  const scaleY =
    typeof bg.scaleY === 'number' ? bg.scaleY : typeof bg.scale === 'number' ? bg.scale : 1;
  return {
    version: s.version,
    grid: { ...s.grid },
    background: {
      imageId: bg.imageId ?? null,
      offsetX: bg.offsetX ?? 0,
      offsetY: bg.offsetY ?? 0,
      scaleX,
      scaleY,
    },
    tokens: s.tokens.map((t) => ({
      ...t,
      borderColor: t.borderColor ?? null,
      hp: normalizeHp(t.hp),
      conditions: Array.isArray(t.conditions)
        ? t.conditions.filter((c): c is string => typeof c === 'string')
        : [],
      rotation: typeof t.rotation === 'number' && Number.isFinite(t.rotation) ? t.rotation : 0,
      losRadius:
        typeof t.losRadius === 'number' && Number.isFinite(t.losRadius) && t.losRadius > 0
          ? t.losRadius
          : null,
    })),
    fog: Uint8Array.from(s.fog),
    annotations: (s.annotations ?? []).map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      text: a.text ?? '',
      color: a.color ?? '#fdd835',
      visibility: a.visibility === 'gm' ? 'gm' : 'shared',
    })),
    aoeTemplates: (s.aoeTemplates ?? []).map((t) => ({
      id: t.id,
      kind: t.kind,
      x: t.x,
      y: t.y,
      length: t.length,
      width: t.width,
      rotation: t.rotation,
      color: t.color,
      visibility: t.visibility === 'gm' ? 'gm' : 'shared',
    })),
    initiative: {
      order: (s.initiative?.order ?? []).map((e) => ({
        id: e.id,
        tokenId: e.tokenId ?? null,
        label: e.label ?? '',
        value: Number(e.value) || 0,
      })),
      activeId: s.initiative?.activeId ?? null,
      round: Number(s.initiative?.round) || 0,
    },
    strokes: Array.isArray(s.strokes)
      ? s.strokes.map((st) => ({
          id: String(st.id ?? ''),
          color: typeof st.color === 'string' ? st.color : '#ffd966',
          width:
            typeof st.width === 'number' && Number.isFinite(st.width) && st.width > 0
              ? st.width
              : 3,
          visibility: st.visibility === 'gm' ? 'gm' : 'shared',
          points: Array.isArray(st.points)
            ? st.points
                .filter(
                  (p): p is { x: number; y: number } =>
                    !!p &&
                    typeof (p as { x?: unknown }).x === 'number' &&
                    typeof (p as { y?: unknown }).y === 'number' &&
                    Number.isFinite((p as { x: number }).x) &&
                    Number.isFinite((p as { y: number }).y),
                )
                .map((p) => ({ x: p.x, y: p.y }))
            : [],
        }))
      : [],
    walls: Array.isArray(s.walls)
      ? s.walls
          .filter((w): w is Wall =>
            !!w &&
            typeof (w as { x1?: unknown }).x1 === 'number' &&
            typeof (w as { y1?: unknown }).y1 === 'number' &&
            typeof (w as { x2?: unknown }).x2 === 'number' &&
            typeof (w as { y2?: unknown }).y2 === 'number',
          )
          .map((w) => ({
            id: String(w.id ?? ''),
            x1: w.x1,
            y1: w.y1,
            x2: w.x2,
            y2: w.y2,
            blocksSight: w.blocksSight !== false,
            blocksMovement: w.blocksMovement !== false,
          }))
      : [],
  };
}

export function toSerializablePatch(p: StatePatch): SerializablePatch {
  if (p.kind === 'session-reset') {
    return { kind: 'session-reset', state: serializeState(p.state) };
  }
  return p;
}

export function fromSerializablePatch(p: SerializablePatch): StatePatch {
  if (p.kind === 'session-reset') {
    return { kind: 'session-reset', state: deserializeState(p.state) };
  }
  return p;
}
