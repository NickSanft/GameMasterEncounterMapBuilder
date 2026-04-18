export type ID = string;

export interface GridConfig {
  cols: number;
  rows: number;
  cellSize: number;
  showGridLines: boolean;
}

export interface Token {
  id: ID;
  x: number;
  y: number;
  label: string;
  color: string;
  imageId: ID | null;
  size: number;
  borderColor: string | null;
}

export interface Background {
  imageId: ID | null;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

export type AnnotationVisibility = 'gm' | 'shared';

export interface Annotation {
  id: ID;
  x: number;
  y: number;
  text: string;
  color: string;
  visibility: AnnotationVisibility;
}

export interface SessionState {
  version: 1;
  grid: GridConfig;
  background: Background;
  tokens: Token[];
  fog: Uint8Array;
  annotations: Annotation[];
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type ViewMode = 'gm' | 'spectator';

export type StatePatch =
  | { kind: 'token-add'; token: Token }
  | { kind: 'token-update'; id: ID; changes: Partial<Token> }
  | { kind: 'token-remove'; id: ID }
  | { kind: 'fog-set'; cells: Array<{ x: number; y: number; value: 0 | 1 }> }
  | { kind: 'grid-update'; changes: Partial<GridConfig> }
  | { kind: 'background-update'; changes: Partial<Background> }
  | { kind: 'annotation-add'; annotation: Annotation }
  | { kind: 'annotation-update'; id: ID; changes: Partial<Annotation> }
  | { kind: 'annotation-remove'; id: ID }
  | { kind: 'session-reset'; state: SessionState };

export const DEFAULT_GRID: GridConfig = {
  cols: 30,
  rows: 20,
  cellSize: 50,
  showGridLines: true,
};

export const DEFAULT_BACKGROUND: Background = {
  imageId: null,
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
};

export const DEFAULT_CAMERA: Camera = {
  x: -50,
  y: -50,
  zoom: 1,
};

export function createDefaultState(): SessionState {
  const grid = { ...DEFAULT_GRID };
  return {
    version: 1,
    grid,
    background: { ...DEFAULT_BACKGROUND },
    tokens: [],
    fog: new Uint8Array(grid.cols * grid.rows),
    annotations: [],
  };
}
