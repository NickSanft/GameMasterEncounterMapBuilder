/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountSaveStatusPill } from './save-status-pill.js';

describe('mountSaveStatusPill', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts hidden in the idle state', () => {
    const pill = mountSaveStatusPill();
    const el = document.querySelector<HTMLElement>('.save-status-pill')!;
    expect(el).toBeTruthy();
    expect(el.hidden).toBe(true);
    expect(pill.getStatus()).toBe('idle');
    pill.destroy();
  });

  it('shows "Saving…" with a spinner glyph on saving', () => {
    const pill = mountSaveStatusPill();
    pill.setStatus('saving');
    const el = document.querySelector<HTMLElement>('.save-status-pill')!;
    expect(el.hidden).toBe(false);
    expect(el.dataset.status).toBe('saving');
    expect(el.textContent).toContain('Saving');
    pill.destroy();
  });

  it('shows "Saved" with a checkmark on saved', () => {
    const pill = mountSaveStatusPill();
    pill.setStatus('saved');
    const el = document.querySelector<HTMLElement>('.save-status-pill')!;
    expect(el.hidden).toBe(false);
    expect(el.dataset.status).toBe('saved');
    expect(el.textContent).toContain('Saved');
    pill.destroy();
  });

  it('shows "Save failed" on error', () => {
    const pill = mountSaveStatusPill();
    pill.setStatus('error');
    const el = document.querySelector<HTMLElement>('.save-status-pill')!;
    expect(el.hidden).toBe(false);
    expect(el.dataset.status).toBe('error');
    expect(el.textContent).toContain('Save failed');
    pill.destroy();
  });

  it('auto-fades from saved → idle after the hold timeout', () => {
    vi.useFakeTimers();
    const pill = mountSaveStatusPill();
    pill.setStatus('saved');
    expect(pill.getStatus()).toBe('saved');
    // Hold + fade ~ 1700ms total. Advance 1800 to be safe.
    vi.advanceTimersByTime(1800);
    expect(pill.getStatus()).toBe('idle');
    pill.destroy();
  });

  it('a fresh saving during the saved-hold preempts the auto-fade', () => {
    vi.useFakeTimers();
    const pill = mountSaveStatusPill();
    pill.setStatus('saved');
    vi.advanceTimersByTime(800); // mid-hold
    pill.setStatus('saving');
    expect(pill.getStatus()).toBe('saving');
    // Advance past the original timer; we should stay on 'saving'
    // because the timer was cleared.
    vi.advanceTimersByTime(2000);
    expect(pill.getStatus()).toBe('saving');
    pill.destroy();
  });

  it('error state is sticky — does NOT auto-fade', () => {
    vi.useFakeTimers();
    const pill = mountSaveStatusPill();
    pill.setStatus('error');
    vi.advanceTimersByTime(5000);
    expect(pill.getStatus()).toBe('error');
    pill.destroy();
  });

  it('moving from error → saving clears the error and shows saving', () => {
    const pill = mountSaveStatusPill();
    pill.setStatus('error');
    pill.setStatus('saving');
    expect(pill.getStatus()).toBe('saving');
    pill.destroy();
  });

  it('destroy removes the element from the DOM', () => {
    const pill = mountSaveStatusPill();
    expect(document.querySelector('.save-status-pill')).toBeTruthy();
    pill.destroy();
    expect(document.querySelector('.save-status-pill')).toBeNull();
  });

  it('two consecutive saved calls reset the auto-fade timer', () => {
    vi.useFakeTimers();
    const pill = mountSaveStatusPill();
    pill.setStatus('saved');
    vi.advanceTimersByTime(1000); // most of the way through the first hold
    pill.setStatus('saved'); // resets the timer
    vi.advanceTimersByTime(1000); // total advance: 2000, but the SECOND hold is mid-way
    expect(pill.getStatus()).toBe('saved');
    vi.advanceTimersByTime(800);
    expect(pill.getStatus()).toBe('idle');
    pill.destroy();
  });
});
