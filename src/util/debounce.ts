export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  flush(): void;
  cancel(): void;
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): Debounced<Args> {
  let handle: number | null = null;
  let pending: Args | null = null;

  const debounced = ((...args: Args) => {
    pending = args;
    if (handle !== null) window.clearTimeout(handle);
    handle = window.setTimeout(() => {
      handle = null;
      const next = pending;
      pending = null;
      if (next) fn(...next);
    }, ms);
  }) as Debounced<Args>;

  debounced.flush = () => {
    if (handle !== null) {
      window.clearTimeout(handle);
      handle = null;
    }
    if (pending) {
      const next = pending;
      pending = null;
      fn(...next);
    }
  };

  debounced.cancel = () => {
    if (handle !== null) {
      window.clearTimeout(handle);
      handle = null;
    }
    pending = null;
  };

  return debounced;
}

export function rafThrottle(fn: () => void): () => void {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn();
    });
  };
}
