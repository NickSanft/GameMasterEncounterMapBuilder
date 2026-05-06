/**
 * @vitest-environment jsdom
 *
 * Phase 157 — per-scene notes storage + scene-switch flow.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mountNotesPanel } from './notes-panel.js';
import {
  NOTES_TEXT_KEY,
  NOTES_TEXT_KEY_PREFIX,
  NOTES_OPEN_KEY,
  NOTES_OPEN_KEY_PREFIX,
} from '../util/constants.js';

describe('mountNotesPanel — Phase 157 per-scene notes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('legacy mode (no getActiveSceneId) reads + writes the global key', () => {
    localStorage.setItem(NOTES_TEXT_KEY, 'old global notes');
    const handle = mountNotesPanel();
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    expect(ta.value).toBe('old global notes');
    expect(typeof handle.toggle).toBe('function');
  });

  it('per-scene mode reads scene-1 key when active scene is scene-1', () => {
    localStorage.setItem(`${NOTES_TEXT_KEY_PREFIX}scene-1`, 'scene one notes');
    mountNotesPanel({ getActiveSceneId: () => 'scene-1' });
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    expect(ta.value).toBe('scene one notes');
  });

  it('falls back to the legacy global key when the per-scene key is missing', () => {
    localStorage.setItem(NOTES_TEXT_KEY, 'legacy notes');
    mountNotesPanel({ getActiveSceneId: () => 'scene-fresh' });
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    // No per-scene record yet → falls back to the global one so a
    // pre-157 user's notes appear in the first scene they open.
    expect(ta.value).toBe('legacy notes');
  });

  it('falls back to empty when neither key is present', () => {
    mountNotesPanel({ getActiveSceneId: () => 'scene-fresh' });
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    expect(ta.value).toBe('');
  });

  it('per-scene key wins over legacy global when BOTH are present', () => {
    localStorage.setItem(NOTES_TEXT_KEY, 'legacy notes');
    localStorage.setItem(
      `${NOTES_TEXT_KEY_PREFIX}scene-x`,
      'authored per-scene',
    );
    mountNotesPanel({ getActiveSceneId: () => 'scene-x' });
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    expect(ta.value).toBe('authored per-scene');
  });

  it('treats an explicitly empty per-scene record as "saved nothing" (no fallback)', () => {
    localStorage.setItem(NOTES_TEXT_KEY, 'legacy notes');
    localStorage.setItem(`${NOTES_TEXT_KEY_PREFIX}scene-cleared`, '');
    mountNotesPanel({ getActiveSceneId: () => 'scene-cleared' });
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    // The user explicitly emptied the per-scene scratchpad — don't
    // resurrect the legacy fallback.
    expect(ta.value).toBe('');
  });

  it('notifySceneSwitched saves the outgoing + loads the incoming', () => {
    let activeId: string | null = 'scene-a';
    localStorage.setItem(`${NOTES_TEXT_KEY_PREFIX}scene-a`, 'A initial');
    localStorage.setItem(`${NOTES_TEXT_KEY_PREFIX}scene-b`, 'B initial');

    const handle = mountNotesPanel({ getActiveSceneId: () => activeId });
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    expect(ta.value).toBe('A initial');

    // User edits scene-a's notes.
    ta.value = 'A edited';
    // Switch to scene-b.
    activeId = 'scene-b';
    handle.notifySceneSwitched();

    // Outgoing (scene-a) saved.
    expect(localStorage.getItem(`${NOTES_TEXT_KEY_PREFIX}scene-a`)).toBe(
      'A edited',
    );
    // Incoming (scene-b) loaded.
    expect(ta.value).toBe('B initial');
  });

  it('notifySceneSwitched is a no-op when getActiveSceneId is unsupplied (legacy callers)', () => {
    localStorage.setItem(NOTES_TEXT_KEY, 'legacy');
    const handle = mountNotesPanel(); // no getActiveSceneId
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    ta.value = 'edited';
    handle.notifySceneSwitched();
    // Legacy mode: no scene tracking, the call is a no-op (storage
    // wasn't written by the no-op + the textarea wasn't reloaded).
    // The persist debounce is the legacy behavior; we don't write
    // through `notifySceneSwitched`.
    expect(localStorage.getItem(NOTES_TEXT_KEY)).toBe('legacy');
    expect(ta.value).toBe('edited');
  });

  it('handles a transition from null sceneId (boot) to a real id (post-hydrate)', () => {
    let activeId: string | null = null;
    localStorage.setItem(NOTES_TEXT_KEY, 'pre-hydrate legacy');
    localStorage.setItem(
      `${NOTES_TEXT_KEY_PREFIX}scene-real`,
      'real scene notes',
    );

    const handle = mountNotesPanel({ getActiveSceneId: () => activeId });
    const ta = document.querySelector<HTMLTextAreaElement>(
      '.notes-panel-textarea',
    )!;
    // Mount with null id → reads legacy key.
    expect(ta.value).toBe('pre-hydrate legacy');

    // Hydrate completes — sceneId becomes real, host calls
    // notifySceneSwitched.
    activeId = 'scene-real';
    handle.notifySceneSwitched();
    expect(ta.value).toBe('real scene notes');
  });
});

describe('mountNotesPanel — Phase 171 per-scene open state', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('reads the per-scene open key when getActiveSceneId is supplied', () => {
    localStorage.setItem(`${NOTES_OPEN_KEY_PREFIX}scene-1`, 'true');
    mountNotesPanel({ getActiveSceneId: () => 'scene-1' });
    const panel = document.querySelector<HTMLElement>('.notes-panel')!;
    expect(panel.hidden).toBe(false);
  });

  it('falls back to the legacy global key when per-scene is unset', () => {
    localStorage.setItem(NOTES_OPEN_KEY, 'true');
    mountNotesPanel({ getActiveSceneId: () => 'scene-fresh' });
    const panel = document.querySelector<HTMLElement>('.notes-panel')!;
    expect(panel.hidden).toBe(false);
  });

  it('open state distinct per scene survives notifySceneSwitched', () => {
    let activeId: string = 'scene-a';
    localStorage.setItem(`${NOTES_OPEN_KEY_PREFIX}scene-a`, 'true');
    localStorage.setItem(`${NOTES_OPEN_KEY_PREFIX}scene-b`, 'false');

    const handle = mountNotesPanel({ getActiveSceneId: () => activeId });
    const panel = document.querySelector<HTMLElement>('.notes-panel')!;
    expect(panel.hidden).toBe(false);

    activeId = 'scene-b';
    handle.notifySceneSwitched();
    expect(panel.hidden).toBe(true);

    // Switching back picks up the per-scene "open" state.
    activeId = 'scene-a';
    handle.notifySceneSwitched();
    expect(panel.hidden).toBe(false);
  });

  it('saves the outgoing scene\'s open state on switch', () => {
    let activeId: string = 'scene-a';
    const handle = mountNotesPanel({ getActiveSceneId: () => activeId });
    handle.open();
    activeId = 'scene-b';
    handle.notifySceneSwitched();
    // Outgoing (scene-a) should now have its open state saved.
    expect(localStorage.getItem(`${NOTES_OPEN_KEY_PREFIX}scene-a`)).toBe('true');
  });
});
