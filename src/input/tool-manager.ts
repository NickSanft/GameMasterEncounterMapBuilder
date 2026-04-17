export interface Tool {
  readonly name: string;
  readonly cursor?: string;
  activate(): void;
  deactivate(): void;
}

export interface ToolManager {
  register(tool: Tool): void;
  setActive(name: string): void;
  getActive(): string | null;
  onChange(listener: (name: string) => void): () => void;
  destroy(): void;
}

export function createToolManager(canvas: HTMLCanvasElement): ToolManager {
  const tools = new Map<string, Tool>();
  let active: Tool | null = null;
  const listeners = new Set<(name: string) => void>();

  function setActive(name: string) {
    const next = tools.get(name);
    if (!next || next === active) return;
    if (active) active.deactivate();
    active = next;
    active.activate();
    canvas.style.cursor = next.cursor ?? '';
    for (const l of listeners) l(name);
  }

  return {
    register(tool: Tool) {
      tools.set(tool.name, tool);
    },
    setActive,
    getActive() {
      return active?.name ?? null;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      if (active) active.deactivate();
      active = null;
      tools.clear();
      listeners.clear();
    },
  };
}
