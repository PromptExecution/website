import castData from '../../cast/characters.json';

export interface CastCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
  voice: string;
  visual_traits: string[];
  sample_image: string;
}

export const CAST: CastCharacter[] = castData as CastCharacter[];

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
