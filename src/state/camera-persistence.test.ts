import { describe, it, expect } from 'vitest';
import { saveCamera, loadCamera, clearCamera } from './camera-persistence.js';

describe('camera-persistence', () => {
  it('round-trips a camera per view mode', () => {
    saveCamera('gm', { x: 100, y: 200, zoom: 1.5 });
    saveCamera('spectator', { x: -50, y: -50, zoom: 2 });
    expect(loadCamera('gm')).toEqual({ x: 100, y: 200, zoom: 1.5 });
    expect(loadCamera('spectator')).toEqual({ x: -50, y: -50, zoom: 2 });
  });

  it('returns null when no camera is stored', () => {
    expect(loadCamera('gm')).toBeNull();
  });

  it('rejects cameras with missing fields', () => {
    localStorage.setItem(
      'gm-encounter-maps-camera-gm',
      JSON.stringify({ x: 0, y: 0 }),
    );
    expect(loadCamera('gm')).toBeNull();
  });

  it('rejects cameras with non-finite values', () => {
    localStorage.setItem(
      'gm-encounter-maps-camera-gm',
      JSON.stringify({ x: Number.NaN, y: 0, zoom: 1 }),
    );
    expect(loadCamera('gm')).toBeNull();
  });

  it('rejects cameras with non-positive zoom', () => {
    localStorage.setItem(
      'gm-encounter-maps-camera-gm',
      JSON.stringify({ x: 0, y: 0, zoom: 0 }),
    );
    expect(loadCamera('gm')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    localStorage.setItem('gm-encounter-maps-camera-gm', '{broken');
    expect(loadCamera('gm')).toBeNull();
  });

  it('clearCamera removes only the targeted view', () => {
    saveCamera('gm', { x: 1, y: 2, zoom: 1 });
    saveCamera('spectator', { x: 3, y: 4, zoom: 2 });
    clearCamera('gm');
    expect(loadCamera('gm')).toBeNull();
    expect(loadCamera('spectator')).not.toBeNull();
  });
});
