/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatClock, mountConflictModal } from './conflict-modal.js';
import type { PeerEntry } from '../state/conflict-detector.js';

const peerWithSummary = (id: string, lastModified: number): PeerEntry => ({
  tabId: id,
  lastSeen: lastModified,
  summary: { lastModified, tokenCount: 4, sceneName: 'Goblin Cave' },
});

const peerWithoutSummary = (id: string, lastSeen = 1000): PeerEntry => ({
  tabId: id,
  lastSeen,
  summary: null,
});

describe('mountConflictModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('starts closed', () => {
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: 1000,
        tokenCount: 1,
        sceneName: 'A',
      }),
      onTakeOver: vi.fn(),
      onAdoptPeer: vi.fn(),
    });
    expect(handle.isOpen()).toBe(false);
    handle.destroy();
  });

  it('open() shows the empty state when no peers are set', () => {
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: 1000,
        tokenCount: 1,
        sceneName: 'A',
      }),
      onTakeOver: vi.fn(),
      onAdoptPeer: vi.fn(),
    });
    handle.open();
    expect(handle.isOpen()).toBe(true);
    const empty = document.querySelector<HTMLElement>('[data-field="empty"]')!;
    expect(empty.hidden).toBe(false);
    handle.destroy();
  });

  it('renders one row per fresh peer with both columns + actions', () => {
    const onTakeOver = vi.fn();
    const onAdoptPeer = vi.fn();
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: new Date(2024, 0, 1, 14, 32, 8).getTime(),
        tokenCount: 12,
        sceneName: 'Throne Room',
      }),
      onTakeOver,
      onAdoptPeer,
    });

    const peerTime = new Date(2024, 0, 1, 14, 30, 51).getTime();
    handle.setPeers([peerWithSummary('peer-abc', peerTime)]);
    handle.open();

    const rows = document.querySelectorAll('.conflict-row');
    expect(rows).toHaveLength(1);

    const cols = rows[0]!.querySelectorAll('.conflict-col');
    expect(cols).toHaveLength(2);
    expect(cols[0]!.textContent).toContain('This tab');
    expect(cols[0]!.textContent).toContain('14:32:08');
    expect(cols[0]!.textContent).toContain('12');
    expect(cols[0]!.textContent).toContain('Throne Room');

    expect(cols[1]!.textContent).toContain('Other tab');
    expect(cols[1]!.textContent).toContain('peer-a'); // shortened tabId
    expect(cols[1]!.textContent).toContain('14:30:51');
    expect(cols[1]!.textContent).toContain('Goblin Cave');

    handle.destroy();
  });

  it('"Keep this tab" calls onTakeOver(peerTabId)', () => {
    const onTakeOver = vi.fn();
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: 2000,
        tokenCount: 5,
        sceneName: 'A',
      }),
      onTakeOver,
      onAdoptPeer: vi.fn(),
    });
    handle.setPeers([peerWithSummary('peer-XY', 1000)]);
    handle.open();

    const keep = document.querySelector<HTMLButtonElement>(
      '.conflict-row [data-action="keep"]',
    )!;
    keep.click();

    expect(onTakeOver).toHaveBeenCalledTimes(1);
    expect(onTakeOver).toHaveBeenCalledWith('peer-XY');
    handle.destroy();
  });

  it('"Use other tab" calls onAdoptPeer(peerTabId)', () => {
    const onAdoptPeer = vi.fn();
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: 1000,
        tokenCount: 5,
        sceneName: 'A',
      }),
      onTakeOver: vi.fn(),
      onAdoptPeer,
    });
    handle.setPeers([peerWithSummary('peer-XY', 2000)]);
    handle.open();

    const adopt = document.querySelector<HTMLButtonElement>(
      '.conflict-row [data-action="adopt"]',
    )!;
    adopt.click();

    expect(onAdoptPeer).toHaveBeenCalledTimes(1);
    expect(onAdoptPeer).toHaveBeenCalledWith('peer-XY');
    handle.destroy();
  });

  it('disables "Use other tab" when the peer has no summary (pre-84 GM)', () => {
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: 1000,
        tokenCount: 5,
        sceneName: 'A',
      }),
      onTakeOver: vi.fn(),
      onAdoptPeer: vi.fn(),
    });
    handle.setPeers([peerWithoutSummary('legacy-peer')]);
    handle.open();

    const adopt = document.querySelector<HTMLButtonElement>(
      '.conflict-row [data-action="adopt"]',
    )!;
    expect(adopt.disabled).toBe(true);

    const noinfo = document.querySelector<HTMLElement>('.conflict-col-noinfo');
    expect(noinfo).toBeTruthy();
    expect(noinfo!.textContent).toContain('no info');
    handle.destroy();
  });

  it('setPeers([]) while open shows the empty / cleared state', () => {
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: 1000,
        tokenCount: 5,
        sceneName: 'A',
      }),
      onTakeOver: vi.fn(),
      onAdoptPeer: vi.fn(),
    });
    handle.setPeers([peerWithSummary('peer-XY', 1500)]);
    handle.open();
    expect(document.querySelectorAll('.conflict-row')).toHaveLength(1);

    handle.setPeers([]);
    expect(document.querySelectorAll('.conflict-row')).toHaveLength(0);
    const empty = document.querySelector<HTMLElement>('[data-field="empty"]')!;
    expect(empty.hidden).toBe(false);
    handle.destroy();
  });

  it('Escape closes the open modal', () => {
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: 1000,
        tokenCount: 5,
        sceneName: 'A',
      }),
      onTakeOver: vi.fn(),
      onAdoptPeer: vi.fn(),
    });
    handle.open();
    expect(handle.isOpen()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handle.isOpen()).toBe(false);
    handle.destroy();
  });

  it('reads the local summary lazily — late edits update the displayed value', () => {
    let tokenCount = 4;
    const handle = mountConflictModal({
      getLocalSummary: () => ({
        label: 'This tab',
        lastModified: 1000,
        tokenCount,
        sceneName: 'A',
      }),
      onTakeOver: vi.fn(),
      onAdoptPeer: vi.fn(),
    });
    handle.setPeers([peerWithSummary('peer', 2000)]);
    handle.open();
    let local = document.querySelector<HTMLElement>('.conflict-col-local')!;
    expect(local.textContent).toContain('4');

    // GM keeps editing; refreshing peers re-renders + re-reads the
    // local summary.
    tokenCount = 9;
    handle.setPeers([peerWithSummary('peer', 2000)]);
    local = document.querySelector<HTMLElement>('.conflict-col-local')!;
    expect(local.textContent).toContain('9');
    handle.destroy();
  });
});

describe('formatClock', () => {
  it('renders HH:MM:SS in 24-hour format', () => {
    const t = new Date(2024, 0, 1, 9, 5, 7).getTime();
    expect(formatClock(t)).toBe('09:05:07');
  });

  it('renders single-digit components zero-padded', () => {
    const t = new Date(2024, 0, 1, 0, 0, 0).getTime();
    expect(formatClock(t)).toBe('00:00:00');
  });

  it('returns "—" for non-finite or non-positive timestamps', () => {
    expect(formatClock(0)).toBe('—');
    expect(formatClock(-1)).toBe('—');
    expect(formatClock(NaN)).toBe('—');
    expect(formatClock(Infinity)).toBe('—');
  });
});
