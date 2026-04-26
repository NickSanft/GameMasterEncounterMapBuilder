import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach } from 'vitest';

// Reset IndexedDB between tests so each test starts with a clean DB.
beforeEach(() => {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

// Provide a minimal BroadcastChannel polyfill for jsdom environments that
// don't include one. The app's own channel wrapper checks for BroadcastChannel
// existence before using it, so this ensures code paths that poke at it don't
// blow up in unit tests.
if (typeof (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel === 'undefined') {
  class MockBroadcastChannel {
    readonly name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    constructor(name: string) {
      this.name = name;
    }
    postMessage(): void {}
    close(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
      return true;
    }
  }
  (globalThis as unknown as { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel =
    MockBroadcastChannel;
}

// Ensure localStorage is clean between tests so persisted state from one test
// doesn't leak into the next.
beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

// jsdom doesn't ship `ImageData` (Phase 101 grid-detect tests + any
// future image-pipeline code that builds an ImageData by hand needs
// it). Minimal polyfill: a constructor that captures the passed
// pixel buffer + dimensions so consumers can read .data / .width /
// .height. Real jsdom builds may eventually ship this — the typeof
// guard keeps the polyfill from clobbering a real implementation.
if (typeof (globalThis as { ImageData?: unknown }).ImageData === 'undefined') {
  class MockImageData {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      maybeHeight?: number,
    ) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = maybeHeight ?? Math.floor(dataOrWidth.length / (4 * widthOrHeight));
      }
    }
  }
  (globalThis as unknown as { ImageData: typeof MockImageData }).ImageData =
    MockImageData;
}

// jsdom doesn't ship PointerEvent (Phase 103 long-press detector tests
// + any future pointer-pipeline code that synthesizes PointerEvents in
// unit tests needs it). Minimal polyfill: a subclass of MouseEvent that
// captures the pointer-specific fields the detector reads
// (`pointerId`, `pointerType`). Real jsdom builds may eventually ship
// this — the typeof guard keeps the polyfill from clobbering a real
// implementation.
if (typeof (globalThis as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
  class MockPointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? '';
    }
  }
  (globalThis as unknown as { PointerEvent: typeof MockPointerEvent }).PointerEvent =
    MockPointerEvent;
}

// jsdom doesn't implement URL.createObjectURL. The app uses it for image
// previews, so we provide a minimal polyfill that produces unique fake URLs
// and a matching revoker.
if (typeof URL !== 'undefined') {
  const urlCtor = URL as unknown as {
    createObjectURL?: (obj: unknown) => string;
    revokeObjectURL?: (url: string) => void;
  };
  if (typeof urlCtor.createObjectURL !== 'function') {
    urlCtor.createObjectURL = () =>
      `blob:mock/${Math.random().toString(36).slice(2)}`;
  }
  if (typeof urlCtor.revokeObjectURL !== 'function') {
    urlCtor.revokeObjectURL = () => {};
  }
}
