import type {
  Background,
  GridConfig,
  SessionState,
  StatePatch,
  Token,
} from '../state/types.js';

export interface SerializedSessionState {
  version: 1;
  grid: GridConfig;
  background: Background;
  tokens: Token[];
  fog: number[];
}

export type SerializablePatch =
  | Exclude<StatePatch, { kind: 'session-reset' }>
  | { kind: 'session-reset'; state: SerializedSessionState };

export type SyncMessage =
  | { type: 'hello'; from: 'gm' | 'spectator' }
  | { type: 'full-state'; state: SerializedSessionState }
  | { type: 'patch'; patch: SerializablePatch }
  | { type: 'request-full-state' };

export function serializeState(s: SessionState): SerializedSessionState {
  return {
    version: s.version,
    grid: { ...s.grid },
    background: { ...s.background },
    tokens: s.tokens.map((t) => ({ ...t })),
    fog: Array.from(s.fog),
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
    tokens: s.tokens.map((t) => ({ ...t, borderColor: t.borderColor ?? null })),
    fog: Uint8Array.from(s.fog),
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
