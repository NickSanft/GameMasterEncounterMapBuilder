import type {
  Annotation,
  AoeTemplate,
  Aura,
  Background,
  TilePaint,
  TilePaintKind,
  Camera,
  DrawStroke,
  GridConfig,
  InitiativeState,
  SessionState,
  StatePatch,
  Token,
  TokenHp,
  TokenLight,
  TimeOfDay,
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
/**
 * Phase 139 — defensive parser for the optional `auras: Aura[]`
 * field. Returns `[]` for any non-array input (covers `undefined` on
 * pre-139 saves + malformed wire payloads). Each entry must have a
 * non-empty string `id`, finite positive `radius`, and string
 * `color`; bad entries are dropped (not the whole array). Visibility
 * defaults to `'shared'` when missing or unknown.
 */
function normalizeAuras(raw: unknown): Aura[] {
  if (!Array.isArray(raw)) return [];
  const out: Aura[] = [];
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const a = v as Partial<Aura>;
    if (typeof a.id !== 'string' || a.id.length === 0) continue;
    if (typeof a.radius !== 'number' || !Number.isFinite(a.radius) || a.radius <= 0) continue;
    if (typeof a.color !== 'string' || a.color.length === 0) continue;
    const visibility: 'gm' | 'shared' = a.visibility === 'gm' ? 'gm' : 'shared';
    const entry: Aura = {
      id: a.id,
      radius: a.radius,
      color: a.color,
      visibility,
    };
    if (typeof a.label === 'string' && a.label.length > 0) entry.label = a.label;
    out.push(entry);
  }
  return out;
}

/**
 * Phase 142 — defensive parser for `tilePaints: TilePaint[]`. Returns
 * `[]` for non-array input. Drops entries with malformed shape, bad
 * coords, or unknown `kind`. Called from `deserializeState`.
 */
const VALID_TILE_KINDS: ReadonlySet<TilePaintKind> = new Set<TilePaintKind>([
  'floor',
  'wall',
  'water',
  'rough',
  'pit',
]);

function normalizeTilePaints(raw: unknown): TilePaint[] {
  if (!Array.isArray(raw)) return [];
  const out: TilePaint[] = [];
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const t = v as Partial<TilePaint>;
    if (typeof t.id !== 'string' || t.id.length === 0) continue;
    if (typeof t.cellX !== 'number' || !Number.isFinite(t.cellX)) continue;
    if (typeof t.cellY !== 'number' || !Number.isFinite(t.cellY)) continue;
    if (typeof t.kind !== 'string') continue;
    if (!VALID_TILE_KINDS.has(t.kind as TilePaintKind)) continue;
    out.push({
      id: t.id,
      cellX: Math.round(t.cellX),
      cellY: Math.round(t.cellY),
      kind: t.kind as TilePaintKind,
    });
  }
  return out;
}

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
  /**
   * Phase 80 — time-of-day tint for the scene. Optional + back-compat
   * the same way as `weather`.
   */
  timeOfDay?: TimeOfDay;
  /**
   * Phase 142 — tile-paint layer. Optional in the serialized form so
   * pre-142 saves load with `[]` defaulted by `deserializeState`.
   */
  tilePaints?: TilePaint[];
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
   *
   * Phase 84 — heartbeats now also carry an optional `summary` (last
   * edit timestamp + token count + scene name) so the conflict-merge
   * modal can show a meaningful "yours vs theirs" comparison without
   * a separate round-trip. Optional + back-compat — pre-84 senders
   * omit the field; the receiver displays "(no info)" for that peer.
   */
  | {
      type: 'gm-heartbeat';
      tabId: string;
      summary?: {
        lastModified: number;
        tokenCount: number;
        sceneName: string;
      };
    }
  /**
   * Phase 84 — directed message: "I'm becoming the source of truth;
   * replace your state with this." Sent by a GM tab from the conflict-
   * merge modal when the user picks "Keep this tab's version" or in
   * response to a `gm-state-request` from another tab. Receivers
   * compare `targetTabId` against their own `gmTabId` and ignore any
   * takeover not addressed to them — so a third tab in the room
   * doesn't accidentally adopt a takeover meant for the second tab.
   */
  | {
      type: 'gm-takeover';
      targetTabId: string;
      state: SerializedSessionState;
    }
  /**
   * Phase 84 — directed message: "I want to adopt your state; please
   * send it back as a `gm-takeover`." Sent when the user picks "Use
   * other tab's version" in the conflict-merge modal. The recipient
   * matches `targetTabId` against their own `gmTabId` and replies
   * with `gm-takeover { targetTabId: msg.fromTabId, state }`.
   */
  | {
      type: 'gm-state-request';
      targetTabId: string;
      fromTabId: string;
    }
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
  | { type: 'damage-fx'; tokenId: string; amount: number; id: number }
  /**
   * Phase 82 — GM broadcasts a Spectator's effective permissions to
   * the (one) Spectator the message targets. Other peers ignore the
   * message via the `targetId` filter. Sent on:
   *   - Spectator identity arrival (so they get permissions before
   *     their first ping / roll).
   *   - Whenever the GM mutates that Spectator's entry in the
   *     permissions modal.
   *
   * The Spectator stores the value in a local ref + uses it to gate
   * UI actions. The GM ALSO drops incoming `ping` / `dice-roll`
   * messages that violate the senderId's permissions, so a Spectator
   * with a tampered build can't bypass the gate by sending them
   * anyway.
   */
  | {
      type: 'permissions';
      targetId: string;
      /**
       * Phase 109 — `hiddenTokenIds` now travels with the permissions
       * payload so the targeted Spectator can filter its render path
       * accordingly. Pre-109 senders omitted it; the Spectator-side
       * handler defaults missing arrays to `[]` so back-compat holds.
       */
      permissions: { canRoll: boolean; hiddenTokenIds?: string[] };
    }
  /**
   * Phase 83 — round-trip-time probe. The local entry sends one of
   * these every ~5s while a remote peer is connected; the receiver
   * immediately echoes back via `latency-probe-reply` carrying the
   * same `id`. The sender computes RTT = `now - sentAt` on reply
   * receipt + feeds it to the latency tracker that drives the chip.
   *
   * `id` is monotonic per sender so reply matching is unambiguous;
   * the BroadcastChannel self-echo guard prevents the sender from
   * receiving their own probe back.
   */
  | { type: 'latency-probe'; id: number }
  | { type: 'latency-probe-reply'; id: number }
  /**
   * Phase 119 — player chat. Pure broadcast: every connected peer
   * receives the message + filters on visibility. The sender adds
   * the message to its own `chatHistory` BEFORE sending so it shows
   * immediately + the BroadcastChannel self-echo guard prevents
   * doubling. Spectator-side filtering of `gm-only` is good-faith
   * (a tampered build can read gm-only off the wire); the GM-side
   * doesn't filter — they see everything by design.
   */
  | {
      type: 'chat';
      messageId: string;
      senderId: string;
      senderName: string;
      senderRole: 'gm' | 'spectator';
      text: string;
      visibility: 'shared' | 'gm-only';
      timestamp: number;
    }
  /**
   * Phase 120 — Spectator-proposed annotation. Spectators can't write
   * to authoritative state directly, so they SUGGEST an annotation at
   * a world point + the GM decides whether to approve (which fires a
   * normal `annotation-add` patch, making it visible to all peers) or
   * dismiss (drops the suggestion locally; nothing crosses the wire).
   *
   * Receiver behavior:
   *   - GM adds to their local `annotationProposals` queue. The panel
   *     re-renders + an announcer message fires.
   *   - Spectators ignore the message entirely (nothing to do — only
   *     the GM acts on suggestions).
   *
   * The `proposalId` is sender-generated (Phase 110 stable id seed
   * via `nid()`). Re-broadcasts with the same id are deduped on the
   * GM side, so an out-of-order WebRTC delivery doesn't clone.
   */
  | {
      type: 'annotation-proposal';
      proposalId: string;
      senderId: string;
      senderName: string;
      x: number;
      y: number;
      text: string;
      color: string;
      timestamp: number;
    }
  /**
   * Phase 127 — Spectator-side claim-and-move on a token they own.
   *
   * Pre-127 every token-update came from the GM (single-writer). v1.2
   * carves out a narrow exception: a Spectator can broadcast a
   * positional change for a token whose `ownerId` matches their own
   * playerId. The GM tab is still authoritative — when it receives
   * this message, it:
   *   1. Validates `tokenId` exists.
   *   2. Validates `token.ownerId === envelope.senderId` (defense
   *      against a tampered Spectator claiming a token they don't own).
   *   3. Optionally clamps the new position via the existing Phase 114
   *      `clampMoveAgainstWalls` (so blocksMovement is enforced
   *      uniformly — Spectator drags can't tunnel through walls
   *      either).
   *   4. Applies a normal `token-update` patch via `store.applyPatch`.
   *
   * The resulting patch broadcasts to ALL peers (including back to
   * the originating Spectator) via the existing patch-rebroadcast
   * loop, so every tab converges on the GM-authoritative position.
   */
  | {
      type: 'token-claim-move';
      tokenId: string;
      x: number;
      y: number;
    }
  /**
   * Phase 128 — Spectator-side claim-and-update for HP / conditions
   * on a token they own. Same single-writer carve-out as the Phase 127
   * `token-claim-move`, but for non-positional fields. The GM tab is
   * still authoritative — when it receives this:
   *   1. Validates `tokenId` exists.
   *   2. Validates `token.ownerId === envelope.senderId`.
   *   3. **Enforces the allowlist** — only `hp`, `conditions`, and
   *      `conditionExpirations` fields make it into the resulting
   *      `token-update` patch. Anything else (label, color, x/y,
   *      ownerId, light, losRadius, etc.) is dropped silently. This
   *      is the v1.3 contract — a spectator can heal / damage their
   *      token + manage its conditions, but can't rename it, change
   *      its color, hand ownership over to themselves, etc.
   *   4. Applies a normal `token-update` patch via `store.applyPatch`,
   *      which then rebroadcasts as a regular patch so all peers
   *      converge.
   *
   * The shape mirrors `StatePatch`'s `token-update.changes` but is
   * constrained to the allowlisted fields. The wire format carries
   * a Partial<Token> for forward-compat — if a future phase widens
   * the allowlist, peers don't need to update their parsers.
   */
  | {
      type: 'token-claim-update';
      tokenId: string;
      changes: Partial<Token>;
    };

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
    timeOfDay: s.timeOfDay,
    // Phase 142 — only emit `tilePaints` when non-empty so the
    // serialized form for pre-142 saves stays minimal (the field
    // is optional in `SerializedSessionState`).
    ...(s.tilePaints.length > 0
      ? { tilePaints: s.tilePaints.map((t) => ({ ...t })) }
      : {}),
  };
}

export function deserializeState(s: SerializedSessionState): SessionState {
  const bg = s.background as Background & { scale?: number };
  const scaleX =
    typeof bg.scaleX === 'number' ? bg.scaleX : typeof bg.scale === 'number' ? bg.scale : 1;
  const scaleY =
    typeof bg.scaleY === 'number' ? bg.scaleY : typeof bg.scale === 'number' ? bg.scale : 1;
  // Phase 124 — `gridShape` is optional in pre-124 blobs; default
  // missing / unknown values to 'square' so back-compat holds.
  const rawShape = (s.grid as { gridShape?: unknown }).gridShape;
  const gridShape: 'square' | 'hex' = rawShape === 'hex' ? 'hex' : 'square';
  return {
    version: s.version,
    grid: { ...s.grid, gridShape },
    background: {
      imageId: bg.imageId ?? null,
      offsetX: bg.offsetX ?? 0,
      offsetY: bg.offsetY ?? 0,
      scaleX,
      scaleY,
      // Phase 140 — rotation in radians (pre-140 saves default to 0);
      // flipX / flipY booleans (default false). Defensive: clamp
      // rotation to a finite number so a malformed `rotation: NaN`
      // can't break the renderer's transform.
      rotation:
        typeof bg.rotation === 'number' && Number.isFinite(bg.rotation)
          ? bg.rotation
          : 0,
      flipX: bg.flipX === true,
      flipY: bg.flipY === true,
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
      // Phase 126 — owning player's id (a Spectator playerId), or
      // null when GM-controlled. Pre-126 sessions don't have the
      // field; default to null. We accept any non-empty string —
      // ownership is GM-authored, so a malformed peer can't create
      // ownership records the GM didn't approve. Empty strings
      // collapse to null so a stray "" doesn't ghost-claim a token.
      ownerId:
        typeof t.ownerId === 'string' && t.ownerId.length > 0
          ? t.ownerId
          : null,
      // Phase 139 — colored emanation rings centered on this token.
      // Pre-139 sessions don't carry the field; default to []. Each
      // entry is defensively validated by `normalizeAuras` so a
      // malformed peer can't sneak `radius: NaN` past the renderer.
      auras: normalizeAuras((t as { auras?: unknown }).auras),
      // Phase 149 — movement speed in feet per round. Pre-149 saves
      // default to 30 (SRD humanoid base). Defensive: clamp to a
      // non-negative finite number so a malformed peer can't make
      // the HUD divide by NaN.
      speedFt:
        typeof (t as { speedFt?: unknown }).speedFt === 'number' &&
        Number.isFinite((t as { speedFt: number }).speedFt) &&
        (t as { speedFt: number }).speedFt >= 0
          ? (t as { speedFt: number }).speedFt
          : 30,
      // Phase 154 — drag-lock flag. Optional in wire format; pre-154
      // sessions and freshly-created tokens have no value (treated as
      // unlocked). We accept ONLY a literal `true` to enable the lock,
      // so a malformed `"true"` string (or any other truthy non-bool)
      // collapses to undefined → unlocked.
      locked:
        (t as { locked?: unknown }).locked === true ? true : undefined,
      // Phase 156 — vehicle / parent relationship. Optional; pre-156
      // sessions and unparented tokens carry no field (the in-memory
      // shape uses `undefined` for "no parent" so the type matches
      // existing `Token` instances that don't set the optional). We
      // accept only non-empty strings on the wire; everything else
      // (null, missing, malformed) collapses to `undefined`. Cycles
      // are NOT detected at deserialize time — validation happens
      // authoring-side; the runtime descent helpers use a visited
      // set defensively against malformed cycles on the wire.
      parentId:
        typeof (t as { parentId?: unknown }).parentId === 'string' &&
        (t as { parentId: string }).parentId.length > 0
          ? (t as { parentId: string }).parentId
          : undefined,
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
          // Phase 112 — accept either a segment wall (x1/y1/x2/y2) OR a
          // block wall (kind:'block' + cellX/Y/cellsWide/Tall). Pre-112
          // peers + freshly-drawn lines are normalized to kind:'segment'.
          .filter((w): w is Wall => {
            if (!w) return false;
            const k = (w as { kind?: unknown }).kind;
            if (k === 'block') {
              return (
                typeof (w as { cellX?: unknown }).cellX === 'number' &&
                typeof (w as { cellY?: unknown }).cellY === 'number' &&
                typeof (w as { cellsWide?: unknown }).cellsWide === 'number' &&
                typeof (w as { cellsTall?: unknown }).cellsTall === 'number'
              );
            }
            // Default = segment (back-compat with pre-112 / pre-kind blobs).
            return (
              typeof (w as { x1?: unknown }).x1 === 'number' &&
              typeof (w as { y1?: unknown }).y1 === 'number' &&
              typeof (w as { x2?: unknown }).x2 === 'number' &&
              typeof (w as { y2?: unknown }).y2 === 'number'
            );
          })
          .map((w): Wall => {
            const k = (w as { kind?: unknown }).kind;
            const vis = (w as { visibility?: unknown }).visibility;
            const visibility: 'shared' | 'gm' | undefined =
              vis === 'gm' ? 'gm' : vis === 'shared' ? 'shared' : undefined;
            if (k === 'block') {
              const wb = w as Partial<import('../state/types.js').WallBlock>;
              const out: import('../state/types.js').WallBlock = {
                kind: 'block',
                id: String(w.id ?? ''),
                cellX: Math.max(0, Math.floor(Number(wb.cellX) || 0)),
                cellY: Math.max(0, Math.floor(Number(wb.cellY) || 0)),
                cellsWide: Math.max(1, Math.floor(Number(wb.cellsWide) || 1)),
                cellsTall: Math.max(1, Math.floor(Number(wb.cellsTall) || 1)),
                blocksSight: w.blocksSight !== false,
                blocksMovement: w.blocksMovement !== false,
              };
              if (visibility !== undefined) out.visibility = visibility;
              // Phase 131 — `shape` is optional; pre-131 saves omit it
              // and load as 'rect'. Anything outside the known set
              // collapses to 'rect' for safety.
              const rawShape = (w as { shape?: unknown }).shape;
              if (rawShape === 'hex') out.shape = 'hex';
              return out;
            }
            // Segment wall (explicit or pre-112 default).
            const ws = w as Partial<import('../state/types.js').WallSegment>;
            const out: import('../state/types.js').WallSegment = {
              kind: 'segment',
              id: String(w.id ?? ''),
              x1: Number(ws.x1),
              y1: Number(ws.y1),
              x2: Number(ws.x2),
              y2: Number(ws.y2),
              blocksSight: w.blocksSight !== false,
              blocksMovement: w.blocksMovement !== false,
            };
            // Phase 85 — optional thickness. Pre-85 walls omit it;
            // keep absent on roundtrip so the renderer's default kicks in.
            if (
              typeof (w as { thickness?: unknown }).thickness === 'number' &&
              Number.isFinite((w as { thickness: number }).thickness)
            ) {
              out.thickness = (w as { thickness: number }).thickness;
            }
            if (visibility !== undefined) out.visibility = visibility;
            // Phase 113 — optional `door` field. Defensive: only
            // honor it if the shape matches `{open: boolean}`. Pre-
            // 113 peers omit it; receivers default to "not a door".
            const doorRaw = (w as { door?: unknown }).door;
            if (
              doorRaw &&
              typeof doorRaw === 'object' &&
              typeof (doorRaw as { open?: unknown }).open === 'boolean'
            ) {
              out.door = { open: (doorRaw as { open: boolean }).open };
            }
            return out;
          })
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
    // Phase 80 — same defaulting + clamping as `weather`.
    timeOfDay:
      s.timeOfDay === 'dawn' ||
      s.timeOfDay === 'day' ||
      s.timeOfDay === 'dusk' ||
      s.timeOfDay === 'night' ||
      s.timeOfDay === 'none'
        ? s.timeOfDay
        : 'none',
    // Phase 142 — pre-142 saves don't carry `tilePaints`; default
    // to []. Each entry defensively validated via `normalizeTilePaints`.
    tilePaints: normalizeTilePaints(
      (s as { tilePaints?: unknown }).tilePaints,
    ),
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
