export interface PresetBackground {
  id: string;
  name: string;
  description: string;
  path: string;
}

export const PRESET_BACKGROUNDS: readonly PresetBackground[] = [
  {
    id: 'forest',
    name: 'Forest',
    description: 'Dense wooded area with a winding dirt path.',
    path: 'backgrounds/forest.svg',
  },
  {
    id: 'dungeon',
    name: 'Dungeon',
    description: 'Stone chambers connected by narrow corridors and pillars.',
    path: 'backgrounds/dungeon.svg',
  },
  {
    id: 'cavern',
    name: 'Cavern',
    description: 'Damp underground cave with stalagmites and a water pool.',
    path: 'backgrounds/cavern.svg',
  },
  {
    id: 'grassland',
    name: 'Grassland',
    description: 'Open plains with a river crossing and scattered boulders.',
    path: 'backgrounds/grassland.svg',
  },
];

export function resolvePresetUrl(preset: PresetBackground): string {
  const base = (import.meta.env.BASE_URL as string | undefined) ?? '/';
  const prefix = base.endsWith('/') ? base : base + '/';
  const path = preset.path.startsWith('/') ? preset.path.slice(1) : preset.path;
  return prefix + path;
}
