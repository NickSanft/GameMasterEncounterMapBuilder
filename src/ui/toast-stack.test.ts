/**
 * @vitest-environment jsdom
 *
 * Phase 175 — toast stack tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountToastStack } from './toast-stack.js';

describe('mountToastStack (Phase 175)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts a stack container', () => {
    mountToastStack();
    expect(document.querySelector('.toast-stack')).toBeTruthy();
  });

  it('show() appends a toast with the message', () => {
    const handle = mountToastStack();
    handle.show({ message: 'hello' });
    const toast = document.querySelector('.toast');
    expect(toast?.querySelector('.toast-message')?.textContent).toBe('hello');
  });

  it('renders an action button when actionLabel + onAction supplied', () => {
    const handle = mountToastStack();
    const onAction = vi.fn();
    handle.show({ message: 'deleted', actionLabel: 'Undo', onAction });
    const action = document.querySelector<HTMLButtonElement>('.toast-action');
    expect(action?.textContent).toBe('Undo');
    action!.click();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('omits the action button when no actionLabel/onAction', () => {
    const handle = mountToastStack();
    handle.show({ message: 'info-only' });
    expect(document.querySelector('.toast-action')).toBeNull();
  });

  it('auto-dismisses after the default duration', () => {
    const handle = mountToastStack();
    handle.show({ message: 'transient' });
    expect(document.querySelectorAll('.toast').length).toBe(1);
    // Default duration 5000ms; advance just past + the 200ms slide-out.
    vi.advanceTimersByTime(5300);
    expect(document.querySelectorAll('.toast').length).toBe(0);
  });

  it('respects custom durationMs', () => {
    const handle = mountToastStack();
    handle.show({ message: 'short', durationMs: 1000 });
    vi.advanceTimersByTime(1300);
    expect(document.querySelectorAll('.toast').length).toBe(0);
  });

  it('durationMs: 0 produces a sticky toast', () => {
    const handle = mountToastStack();
    handle.show({ message: 'sticky', durationMs: 0 });
    vi.advanceTimersByTime(60_000);
    expect(document.querySelectorAll('.toast').length).toBe(1);
  });

  it('clicking × dismisses the toast', () => {
    const handle = mountToastStack();
    handle.show({ message: 'to dismiss', durationMs: 0 });
    const close = document.querySelector<HTMLButtonElement>('.toast-close');
    close!.click();
    // Slide-out cleanup runs after a short timeout.
    vi.advanceTimersByTime(300);
    expect(document.querySelectorAll('.toast').length).toBe(0);
  });

  it('caps visible toasts at MAX_VISIBLE (5), evicting the oldest', () => {
    const handle = mountToastStack();
    for (let i = 0; i < 7; i++) {
      handle.show({ message: `toast ${i}`, durationMs: 0 });
    }
    // After dismissals settle, advance the slide-out window so
    // evicted toasts are removed from the DOM.
    vi.advanceTimersByTime(300);
    const visible = document.querySelectorAll('.toast');
    expect(visible.length).toBe(5);
    // The newest 5 (toasts 2-6) survive; the oldest 2 were evicted.
    const messages = Array.from(visible).map(
      (t) => t.querySelector('.toast-message')?.textContent ?? '',
    );
    expect(messages).toContain('toast 6');
    expect(messages).toContain('toast 2');
    expect(messages).not.toContain('toast 0');
    expect(messages).not.toContain('toast 1');
  });

  it('clear() dismisses every visible toast', () => {
    const handle = mountToastStack();
    handle.show({ message: 'a', durationMs: 0 });
    handle.show({ message: 'b', durationMs: 0 });
    expect(document.querySelectorAll('.toast').length).toBe(2);
    handle.clear();
    vi.advanceTimersByTime(300);
    expect(document.querySelectorAll('.toast').length).toBe(0);
  });
});
