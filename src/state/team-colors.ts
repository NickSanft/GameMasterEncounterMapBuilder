export type TeamName = 'ally' | 'enemy' | 'neutral' | 'party' | 'boss';

export interface TeamPreset {
  id: TeamName;
  label: string;
  color: string;
  shape: MarkerShape;
}

export type MarkerShape = 'triangle' | 'square' | 'diamond' | 'circle' | 'pentagon';

export const TEAM_PRESETS: TeamPreset[] = [
  { id: 'ally', label: 'Ally', color: '#4caf50', shape: 'triangle' },
  { id: 'enemy', label: 'Enemy', color: '#e53935', shape: 'square' },
  { id: 'neutral', label: 'Neutral', color: '#fdd835', shape: 'diamond' },
  { id: 'party', label: 'Party', color: '#1e88e5', shape: 'circle' },
  { id: 'boss', label: 'Boss', color: '#8e24aa', shape: 'pentagon' },
];

const SHAPE_BY_COLOR = new Map<string, MarkerShape>(
  TEAM_PRESETS.map((p) => [p.color.toLowerCase(), p.shape]),
);

export function shapeForBorderColor(color: string | null): MarkerShape | null {
  if (!color) return null;
  return SHAPE_BY_COLOR.get(color.toLowerCase()) ?? null;
}
