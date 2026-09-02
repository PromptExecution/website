import castData from '../../cast/characters.ts';

export interface CastCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
  voice: string;
  visual_traits: string[];
  behaviors?: string[];
  idea_space?: string[];
  drawable_features?: string[];
  sample_image: string;
}

export const CAST: CastCharacter[] = castData.map((character) => ({
  ...character,
  visual_traits: [...character.visual_traits],
}));

export function getCharacterById(id: string): CastCharacter | undefined {
  return CAST.find((character) => character.id === id);
}

export function pickCharacters(rand: () => number, count: number): CastCharacter[] {
  const pool = [...CAST];
  const selected: CastCharacter[] = [];
  const max = Math.max(1, Math.min(count, pool.length));

  for (let i = 0; i < max; i += 1) {
    const idx = Math.floor(rand() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return selected;
}

export function pickCharactersExcluding(rand: () => number, count: number, excludedIds: string[]): CastCharacter[] {
  const pool = CAST.filter((character) => !excludedIds.includes(character.id));
  const selected: CastCharacter[] = [];
  const max = Math.max(0, Math.min(count, pool.length));

  for (let i = 0; i < max; i += 1) {
    const idx = Math.floor(rand() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return selected;
}
