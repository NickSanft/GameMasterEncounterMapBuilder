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
  TokenLight,
  Wall,
  WeatherKind,
} from '../state/types.js';
import type { PlayerIdentity } from '../state/player-identity.js';

/**
 * Phase 72 — clamp the (possibly-untrusted) death-save counts to
 * `[0, 3]`. Missing field, non-objects, non-numbers, or any other
 * malformed shape collapses to a fresh `{0, 0}`. Both terminal
 * states (3/x stable, x/3 dead) are valid persisted values.
 */
function normalizeDeathSaves(
  raw: unknown,
): { successes: number; failures: number } {
  if (!raw || typeof raw !== 'object') return { successes: 0, failures: 0 };
  const r = raw as Partial<{ successes: number; failures: number }>;
  const successes =
    typeof r.successes === 'number' && Number.isFinite(r.successes)
      ? Math.max(0, Math.min(3, Math.floor(r.successes)))
      : 0;
  const failures =
    typeof r.failures === 'number' && Number.isFinite(r.failures)
      ? Math.max(0, Math.min(3, Math.floor(r.failures)))
      : 0;
  return { successes, failures };
}

/**
 * Phase 70 — filter a (possibly-untrusted) conditionExpirations map
 * down to positive-integer round numbers. Non-objects and non-finite
 * values are dropped silently so a malformed peer can't blow up the
 * renderer. Keys are preserved as strings.
 */
function normalizeConditionExpirations(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[k] = Math.floor(v);
    }
  }
  return out;
}

function normalizeHp(hp: unknown): TokenHp | null {
  if (!hp || typeof hp !== 'object') return null;
  const h = hp as Partial<TokenHp>;
  if (typeof h.current !== 'number' || typeof h.max !== 'number') return null;
  const max = Math.max(0, Math.floor(h.max));
  const current = Math.max(0, Math.min(max, Math.floor(h.current)));
  const visibility: TokenHp['visibility'] = h.visibility === 'gm' ? 'gm' : 'shared';
  return { current, max, visibility };
}

/**
 * Normalize a (possibly-untrusted) `Token.light` value. Phase 57 added
 * the field — older serialized sessions don't have it, so we default
 * to `null`. We also clamp the radii: `dim` must be >= `bright`, both
 * must be positive finite numbers, otherwise the whole light goes
 * back to `null` (safer than silently rendering garbage).
 */
function normalizeLight(light: unknown): TokenLight | null {
  if (!light || typeof light !== 'object') return null;
  const l = light as Partial<TokenLight>;
  if (
    typeof l.bright !== 'number' ||
    typeof l.dim !== 'number' ||
    !Number.isFinite(l.bright) ||
    !Number.isFinite(l.dim)
  ) {
    return null;
  }
  const bright = Math.max(0, l.bright);
  const dim = Math.max(bright, l.dim);
  if (dim <= 0) return null;
  const color = typeof l.color === 'string' && l.color ? l.color : '#ffe1a4';
  return { bright, dim, color };
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
  /**
   * Phase 79 — atmospheric weather effect for the scene. Optional in
   * the serialized form so pre-79 saves load with `'none'` defaulted
   * by `deserializeState`.
   */
  weather?: WeatherKind;
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
  /**
   * Phase 63 — display name of the player who rolled. Optional /
   * back-compat: pre-Phase-63 receivers ignore it; new receivers
   * use it to render "Alice rolled 1d20" instead of the bland
   * "Spectator rolled 1d20".
   */
  senderName?: string;
  /**
   * Phase 73 — per-group per-die breakdown so remote peers can replay
   * the dice-tray animation with the actual values. Optional +
   * back-compat: pre-73 broadcasts omit this, and pre-73 receivers
   * ignore it. New receivers fall back to "no animation, just a
   * history entry" when it's absent.
   *
   * Shape mirrors `DiceRollResult.groups` minus `subtotal` (which
   * the receiver can recompute from `rolls + kept + sign`).
   */
  groups?: Array<{
    count: number;
    sides: number;
    sign: 1 | -1;
    rolls: number[];
    kept: boolean[];
  }>;
  /**
   * Phase 73 — flat modifier (the `+5` in `1d20+5`). Optional; the
   * receiver falls back to `total - sum(groups)` when absent.
   */
  modifier?: number;
}

/**
 * Phase 66 — wire-format envelope wrapping every `SyncMessage`.
 *
 * Why: Phase 63 added `senderName` to ping + dice-roll as ad-hoc
 * attribution. Phase 64 added the GM heartbeat with its own
 * `tabId`. Future phases (per-Spectator permissions, latency,
 * conflict-merge) all need attribution + timing too. Rather than
 * sprinkle the same fields across every message variant, every
 * message now travels inside an envelope that carries them once.
 *
 * Receivers see `(payload, envelope)` from `channel.onMessage`;
 * the payload is the original `SyncMessage`, the envelope adds:
 *
 *   - `senderId` — the sending tab's `PlayerIdentity.id`. Stable
 *     per tab session, regenerated on reload (matches the
 *     conflict-detector "reload = new session" model).
 *   - `timestamp` — `Date.now()` at the moment of `send()` on the
 *     sending tab. Monotonically meaningful within one tab; can be
 *     used for ordering within a session, RTT measurement, etc.
 *
 * Self-echo guard: the channel drops any incoming envelope whose
 * `senderId` matches the local tab's id. BroadcastChannel doesn't
 * echo (browsers explicitly skip the sender), but a WebRTC peer
 * forwarding our message back over a star topology could in
 * principle deliver it twice — the guard makes the channel robust
 * to that without callers having to think about it.
 */
export interface SyncEnvelope {
  senderId: string;
  timestamp: number;
  payload: SyncMessage;
}

export type SyncMessage =
  | { type: 'hello'; from: 'gm' | 'spectator' }
  | { type: 'full-state'; state: SerializedSessionState }
  | { type: 'patch'; patch: SerializablePatch }
  | { type: 'request-full-state' }
  | { type: 'camera'; camera: Camera }
  | { type: 'request-camera' }
  | {
      type: 'ping';
      x: number;
      y: number;
      color?: string;
      /** Phase 63 — display name of the player who emitted the ping. */
      senderName?: string;
    }
  | { type: 'spectator-viewport'; viewport: ViewportRect }
  | { type: 'dice-roll'; roll: DiceRollBroadcast }
  /**
   * Liveness ping every GM tab broadcasts every few seconds so other
   * GM tabs can detect that they're double-booked. Each tab has a
   * session-random id; two tabs see conflicting ids and can warn.
   */
  | { type: 'gm-heartbeat'; tabId: string }
  /**
   * Phase 63 — broadcast a tab's player identity so the GM can
   * render a "Connected players" panel + so dice / pings can be
   * attributed by name. Sent on connect + whenever the user edits
   * their name or color in Settings. Receivers upsert by `id`.
   *
   * Optional + back-compat: peers that don't send `identity` show
   * up as "Anonymous" / role-default in the GM panel.
   */
  | { type: 'identity'; identity: PlayerIdentity }
  /**
   * Phase 63 — explicit "I'm leaving" signal so the GM panel can
   * remove the entry without waiting for the BroadcastChannel /
   * WebRTC layer to detect the disconnect (which has higher
   * latency, especially on a clean tab close where no ICE timeout
   * fires).
   */
  | { type: 'identity-leave'; id: string }
  /**
   * Phase 77 — broadcast a transient damage / heal effect so remote
   * peers can replay the floating-number animation locally. Emitted
   * by the damage-heal dialog after `Apply` (one per affected token).
   * Receivers queue an effect via their local damage-fx manager.
   *
   * `amount`: positive = damage, negative = heal. Mirrors the
   * `DamageFx.amount` field. `id` is monotonic for de-dup; the
   * receiver should ignore an `id` it has already seen.
   *
   * Optional / back-compat: pre-77 receivers ignore the message.
   */
  | { type: 'damage-fx'; tokenId: string; amount: number; id: number };

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
    weather: s.weather,
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
      light: normalizeLight(t.light),
      // Phase 69 — pre-69 sessions don't have `initiativeMod`; default
      // to 0 (no bonus). Clamp to integer + a sane range so a malformed
      // wire payload can't make a token roll initiative as `+1e308`.
      initiativeMod:
        typeof t.initiativeMod === 'number' && Number.isFinite(t.initiativeMod)
          ? Math.max(-20, Math.min(20, Math.round(t.initiativeMod)))
          : 0,
      // Phase 70 — per-condition round expirations. Pre-70 sessions
      // don't carry this field; default to `{}`. Keep only numeric
      // finite values to shrug off malformed wire payloads (strings,
      // NaN, etc.).
      conditionExpirations: normalizeConditionExpirations(t.conditionExpirations),
      // Phase 72 — death-save tracker. Pre-72 sessions don't carry
      // this field; default to {0, 0}. Counts are clamped to [0, 3]
      // since both states (3 successes = stable, 3 failures = dead)
      // are terminal in the SRD rules.
      deathSaves: normalizeDeathSaves(t.deathSaves),
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
    // Phase 79 — pre-79 saves don't have `weather`; default to 'none'.
    // Defensive: anything outside the known kinds collapses to 'none'.
    weather:
      s.weather === 'rain' ||
      s.weather === 'snow' ||
      s.weather === 'fog' ||
      s.weather === 'none'
        ? s.weather
        : 'none',
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
