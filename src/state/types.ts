export type ID = string;

export interface GridConfig {
  cols: number;
  rows: number;
  cellSize: number;
  showGridLines: boolean;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type ViewMode = 'gm' | 'spectator';

export const DEFAULT_GRID: GridConfig = {
  cols: 30,
  rows: 20,
  cellSize: 50,
  showGridLines: true,
};

export const DEFAULT_CAMERA: Camera = {
  x: -50,
  y: -50,
  zoom: 1,
};
