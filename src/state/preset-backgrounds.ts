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
  {
    id: 'tavern',
    name: 'Tavern',
    description: 'Rustic interior with a long bar, scattered tables, and a crackling fireplace.',
    path: 'backgrounds/tavern.svg',
  },
  {
    id: 'sewer',
    name: 'Sewer',
    description: 'Grimy tunnels with a central water channel, side passages, and dim torchlight.',
    path: 'backgrounds/sewer.svg',
  },
  {
    id: 'ship-deck',
    name: 'Ship Deck',
    description: 'Wooden deck with mast, crates, barrels, and a hatchway — surrounded by water.',
    path: 'backgrounds/ship-deck.svg',
  },
  {
    id: 'crossroads',
    name: 'City Crossroads',
    description: 'Cobblestone streets meeting at a plaza with a central fountain and corner buildings.',
    path: 'backgrounds/crossroads.svg',
  },
  {
    id: 'swamp',
    name: 'Swamp',
    description: 'Murky pools dotted with mossy trees, tangled roots, and patches of fog.',
    path: 'backgrounds/swamp.svg',
  },
  {
    id: 'throne-room',
    name: 'Throne Room',
    description: 'Marble hall with a red carpet, gilded throne, pillars, and braziers.',
    path: 'backgrounds/throne-room.svg',
  },
];

export function resolvePresetUrl(preset: PresetBackground): string {
  const base = (import.meta.env.BASE_URL as string | undefined) ?? '/';
  const prefix = base.endsWith('/') ? base : base + '/';
  const path = preset.path.startsWith('/') ? preset.path.slice(1) : preset.path;
  return prefix + path;
}
