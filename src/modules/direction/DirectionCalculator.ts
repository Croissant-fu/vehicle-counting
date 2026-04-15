import { Movement } from '../../types';

const CARDINALS: Record<string, Record<Movement, string>> = {
  N: { left: 'W', straight: 'S', right: 'E' },
  S: { left: 'E', straight: 'N', right: 'W' },
  E: { left: 'N', straight: 'W', right: 'S' },
  W: { left: 'S', straight: 'E', right: 'N' },
};

export function computeToDirection(
  from: string,
  movement: Movement,
  legs?: string[]
): string {
  // Custom legs take priority when provided
  if (legs && legs.length > 0) {
    if (legs.length < 3) {
      throw new Error(`computeToDirection: legs must have at least 3 entries, got ${legs.length}`);
    }
    const idx = legs.indexOf(from);
    if (idx === -1) throw new Error(`computeToDirection: "${from}" not found in legs`);
    const n = legs.length;
    if (movement === 'left')     return legs[(idx - 1 + n) % n];
    if (movement === 'right')    return legs[(idx + 1) % n];
    /* straight */               return legs[(idx + Math.floor(n / 2)) % n];
  }
  // Cardinal fallback (no legs provided)
  if (CARDINALS[from]) {
    const result = CARDINALS[from][movement];
    if (result === undefined) {
      throw new Error(`computeToDirection: unknown movement "${movement}"`);
    }
    return result;
  }
  throw new Error(
    `computeToDirection: "${from}" is not a cardinal direction and no custom leg list was provided`
  );
}
