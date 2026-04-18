export interface AnnotationPreset {
  id: string;
  label: string;
  color: string;
}

export const ANNOTATION_PRESETS: readonly AnnotationPreset[] = [
  { id: 'clue', label: 'Clue', color: '#fdd835' },
  { id: 'danger', label: 'Danger', color: '#e53935' },
  { id: 'safe', label: 'Safe', color: '#4caf50' },
  { id: 'info', label: 'Info', color: '#1e88e5' },
  { id: 'magic', label: 'Magic', color: '#8e24aa' },
];

export const DEFAULT_ANNOTATION_COLOR = ANNOTATION_PRESETS[0]!.color;
