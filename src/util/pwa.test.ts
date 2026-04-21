import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachUpdateListeners, registerPwa } from './pwa.js';

/**
 * Minimal stand-in for ServiceWorker — just enough surface for the
 * update-listener tests. We implement EventTarget by delegating to a
 * real one so `addEventListener` / `dispatchEvent` work naturally.
 */
// Stand-ins are typed loosely — the real ServiceWorker /
// ServiceWorkerRegistration types declare read-only `state` / `waiting`
// fields, but we want to mutate them in tests to model state
// transitions. Casting to `any` scoped inside these helpers is the
// cleanest way to sidestep that without leaking `any` into the suite.

interface FakeWorker {
  state: ServiceWorkerState;
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: EventTarget['addEventListener'];
  removeEventListener: EventTarget['removeEventListener'];
  dispatchEvent: EventTarget['dispatchEvent'];
  setState(state: ServiceWorkerState): void;
}

function makeFakeWorker(): FakeWorker {
  const target = new EventTarget();
  const sw: FakeWorker = {
    state: 'installing',
    postMessage: vi.fn(),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    setState(state: ServiceWorkerState) {
      sw.state = state;
      target.dispatchEvent(new Event('statechange'));
    },
  };
  return sw;
}

interface FakeRegistration {
  installing: FakeWorker | null;
  waiting: FakeWorker | null;
  addEventListener: EventTarget['addEventListener'];
  removeEventListener: EventTarget['removeEventListener'];
  dispatchEvent: EventTarget['dispatchEvent'];
  update: ReturnType<typeof vi.fn>;
  fireUpdateFound(): void;
  setWaiting(worker: FakeWorker | null): void;
  setInstalling(worker: FakeWorker | null): void;
}

function makeFakeRegistration(
  opts: { installing?: FakeWorker | null; waiting?: FakeWorker | null } = {},
): FakeRegistration {
  const target = new EventTarget();
  const reg: FakeRegistration = {
    installing: opts.installing ?? null,
    waiting: opts.waiting ?? null,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    update: vi.fn(async () => {}),
    fireUpdateFound() {
      target.dispatchEvent(new Event('updatefound'));
    },
    setWaiting(worker) {
      reg.waiting = worker;
    },
    setInstalling(worker) {
      reg.installing = worker;
    },
  };
  return reg;
}

// Bridge our loose fakes to the strict SW types attachUpdateListeners expects.
type SwReg = ServiceWorkerRegistration;
function asReg(reg: FakeRegistration): SwReg {
  return reg as unknown as SwReg;
}

beforeEach(() => {
  // Ensure tests start without a controller (so onOfflineReady paths behave).
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: Object.assign(new EventTarget(), {
      register: vi.fn(),
      ready: new Promise(() => {}),
      controller: null,
      oncontrollerchange: null,
    }),
  });
});

describe('attachUpdateListeners', () => {
  it('fires onUpdateReady immediately when a waiting worker already exists', () => {
    const waiting = makeFakeWorker();
    const reg = makeFakeRegistration({ waiting });
    const handler = vi.fn();

    attachUpdateListeners(asReg(reg), handler);

    expect(handler).toHaveBeenCalledTimes(1);
    // The handler receives a reload() fn that posts SKIP_WAITING.
    const reload = handler.mock.calls[0]?.[0];
    expect(typeof reload).toBe('function');
    reload();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('does nothing when no onUpdateReady handler is supplied', () => {
    const reg = makeFakeRegistration({ waiting: makeFakeWorker() });
    // Should not throw.
    attachUpdateListeners(asReg(reg), undefined);
  });

  it('fires onUpdateReady when an installing worker transitions to installed (with existing controller)', () => {
    // Simulate a page controlled by an older SW so `controller` is truthy.
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: Object.assign(new EventTarget(), {
        register: vi.fn(),
        ready: new Promise(() => {}),
        controller: { scriptURL: 'sw-old.js' } as unknown as ServiceWorker,
      }),
    });
    const installing = makeFakeWorker();
    const reg = makeFakeRegistration({ installing });
    const handler = vi.fn();
    attachUpdateListeners(asReg(reg), handler);

    // Kick off the usual browser sequence: updatefound → statechange.
    reg.fireUpdateFound();
    // The SW will eventually become installed + waiting — mirror that.
    reg.setWaiting(installing);
    installing.setState('installed');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onUpdateReady on the very first install (no prior controller)', () => {
    // `controller` is null — first-ever install, not an update.
    const installing = makeFakeWorker();
    const reg = makeFakeRegistration({ installing });
    const handler = vi.fn();
    attachUpdateListeners(asReg(reg), handler);

    reg.fireUpdateFound();
    reg.setWaiting(installing);
    installing.setState('installed');

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('registerPwa — unsupported environments', () => {
  it('returns a no-op handle when serviceWorker is missing', () => {
    // Delete the SW API and assert the handle reports unregistered.
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });
    const handle = registerPwa();
    expect(handle.isRegistered()).toBe(false);
  });
});
