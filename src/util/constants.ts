export const APP_NAME = 'GM Encounter Maps';

/**
 * Phase 152 — current shipping version. Compared against
 * `localStorage[WHATS_NEW_LAST_SEEN_KEY]` on boot to decide whether
 * to show the "what's new" badge + modal. Bumped manually at every
 * release commit (no auto-injection from package.json — keeps the
 * value visible in source so version drift is reviewable).
 */
export const APP_VERSION = '1.37.0';
export const WHATS_NEW_LAST_SEEN_KEY = 'gm-encounter-maps-last-seen-version';

export const STORAGE_KEY = 'gm-encounter-maps-state';
export const PREFERENCES_KEY = 'gm-encounter-maps-prefs';
export const NOTES_TEXT_KEY = 'gm-encounter-maps-notes';
/**
 * Phase 157 — per-scene notes key prefix. Notes are persisted under
 * `${NOTES_TEXT_KEY_PREFIX}${sceneId}` so each scene gets its own
 * GM scratchpad. Pre-157 sessions kept all notes in `NOTES_TEXT_KEY`;
 * the notes panel uses that as a fallback when a scene's per-key is
 * empty (so legacy notes appear as the "default" until the user
 * authors per-scene content).
 */
export const NOTES_TEXT_KEY_PREFIX = 'gm-encounter-maps-notes:';
export const NOTES_OPEN_KEY = 'gm-encounter-maps-notes-open';
export const BROADCAST_CHANNEL_NAME = 'gm-encounter-maps-session';
export const IDB_DB_NAME = 'gm-encounter-maps';
export const EXPORT_FILENAME_PREFIX = 'gm-encounter-maps';
/**
 * Phase 67 — per-role identity stores. The GM tab and the Spectator
 * tab read independent keys so a single browser running both views
 * can give each its own name + color (the original Phase 63
 * implementation conflated them via a shared preferences blob,
 * fixed in 0.63.1 with per-role fields, and properly extracted
 * here in 0.67.0).
 */
export const IDENTITY_PREFS_GM_KEY = 'gm-encounter-maps-identity-gm';
export const IDENTITY_PREFS_SPECTATOR_KEY = 'gm-encounter-maps-identity-spectator';
