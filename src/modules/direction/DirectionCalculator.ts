import { Movement } from '../../types';

const CARDINALS: Record<string, Record<Movement, string>> = {
  N: { left: 'W', straight: 'S', right: 'E' },
  S: { left: 'E', straight: 'N', right: 'W' },
  E: { left: 'N', straight: 'W', right: 'S' },
  W: { left: 'S', straight: 'E', right: 'N' },
};

// Reverse of CARDINALS: given from + to, return the movement.
const CARDINALS_REVERSE: Record<string, Record<string, Movement>> = {
  N: { W: 'left', S: 'straight', E: 'right' },
  S: { E: 'left', N: 'straight', W: 'right' },
  E: { N: 'left', W: 'straight', S: 'right' },
  W: { S: 'left', E: 'straight', N: 'right' },
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

/**
 * Inverse of computeToDirection — given a from→to pair, derive the Movement.
 * Passing `legs` uses the same circular-index logic as computeToDirection.
 * Without `legs`, falls back to the cardinal reverse lookup.
 */
export function computeMovement(
  from: string,
  to: string,
  legs?: string[]
): Movement {
  if (legs && legs.length > 0) {
    const n = legs.length;
    const fromIdx = legs.indexOf(from);
    const toIdx = legs.indexOf(to);
    if (fromIdx === -1) throw new Error(`computeMovement: "${from}" not found in legs`);
    if (toIdx === -1) throw new Error(`computeMovement: "${to}" not found in legs`);
    if (toIdx === (fromIdx - 1 + n) % n) return 'left';
    if (toIdx === (fromIdx + 1) % n) return 'right';
    return 'straight';
  }
  if (CARDINALS_REVERSE[from]?.[to] !== undefined) {
    return CARDINALS_REVERSE[from][to];
  }
  throw new Error(`computeMovement: no path from "${from}" to "${to}"`);
}
