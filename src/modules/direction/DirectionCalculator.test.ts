import { computeToDirection, computeMovement } from './DirectionCalculator';

describe('cardinal directions', () => {
  test('N + straight = S', () => expect(computeToDirection('N', 'straight')).toBe('S'));
  test('N + left = W',     () => expect(computeToDirection('N', 'left')).toBe('W'));
  test('N + right = E',    () => expect(computeToDirection('N', 'right')).toBe('E'));
  test('S + straight = N', () => expect(computeToDirection('S', 'straight')).toBe('N'));
  test('S + left = E',     () => expect(computeToDirection('S', 'left')).toBe('E'));
  test('S + right = W',    () => expect(computeToDirection('S', 'right')).toBe('W'));
  test('E + straight = W', () => expect(computeToDirection('E', 'straight')).toBe('W'));
  test('E + left = N',     () => expect(computeToDirection('E', 'left')).toBe('N'));
  test('E + right = S',    () => expect(computeToDirection('E', 'right')).toBe('S'));
  test('W + straight = E', () => expect(computeToDirection('W', 'straight')).toBe('E'));
  test('W + left = S',     () => expect(computeToDirection('W', 'left')).toBe('S'));
  test('W + right = N',    () => expect(computeToDirection('W', 'right')).toBe('N'));
});

describe('custom legs', () => {
  const legs = ['Gate A', 'Gate B', 'Gate C', 'Gate D'];
  test('Gate A + right = Gate B',    () => expect(computeToDirection('Gate A', 'right', legs)).toBe('Gate B'));
  test('Gate A + left = Gate D',     () => expect(computeToDirection('Gate A', 'left', legs)).toBe('Gate D'));
  test('Gate A + straight = Gate C', () => expect(computeToDirection('Gate A', 'straight', legs)).toBe('Gate C'));
  test('Gate D + right = Gate A (wraps)', () => expect(computeToDirection('Gate D', 'right', legs)).toBe('Gate A'));
});

describe('error cases', () => {
  test('throws when custom intersection but no legs provided', () => {
    expect(() => computeToDirection('Gate A', 'left')).toThrow('custom leg');
  });
});

describe('computeMovement — cardinal (inverse of computeToDirection)', () => {
  test('N→W = left',     () => expect(computeMovement('N', 'W')).toBe('left'));
  test('N→S = straight', () => expect(computeMovement('N', 'S')).toBe('straight'));
  test('N→E = right',    () => expect(computeMovement('N', 'E')).toBe('right'));
  test('S→E = left',     () => expect(computeMovement('S', 'E')).toBe('left'));
  test('E→N = left',     () => expect(computeMovement('E', 'N')).toBe('left'));
  test('W→S = left',     () => expect(computeMovement('W', 'S')).toBe('left'));

  test('round-trips with computeToDirection (N+right)', () => {
    const to = computeToDirection('N', 'right');        // 'E'
    expect(computeMovement('N', to)).toBe('right');
  });
  test('round-trips with computeToDirection (S+left)', () => {
    const to = computeToDirection('S', 'left');         // 'E'
    expect(computeMovement('S', to)).toBe('left');
  });
});

describe('computeMovement — custom legs (inverse of computeToDirection)', () => {
  const legs = ['Gate A', 'Gate B', 'Gate C', 'Gate D'];

  test('Gate A → Gate B = right', () =>
    expect(computeMovement('Gate A', 'Gate B', legs)).toBe('right'));
  test('Gate A → Gate D = left', () =>
    expect(computeMovement('Gate A', 'Gate D', legs)).toBe('left'));
  test('Gate A → Gate C = straight', () =>
    expect(computeMovement('Gate A', 'Gate C', legs)).toBe('straight'));
  test('Gate D → Gate A = right (wraps)', () =>
    expect(computeMovement('Gate D', 'Gate A', legs)).toBe('right'));

  test('round-trips with computeToDirection (Gate B + left)', () => {
    const to = computeToDirection('Gate B', 'left', legs);
    expect(computeMovement('Gate B', to, legs)).toBe('left');
  });
});

describe('computeMovement — error cases', () => {
  test('throws for unknown cardinal from→to', () =>
    expect(() => computeMovement('N', 'X')).toThrow());
  test('throws when from not in custom legs', () =>
    expect(() => computeMovement('Z', 'Gate A', ['Gate A', 'Gate B', 'Gate C'])).toThrow());
});

describe('edge cases', () => {
  test('custom legs take priority over cardinal name collision', () => {
    const legs = ['N', 'NE', 'SE', 'SW', 'NW'];
    // 'N' is index 0, right → 'NE' (not the cardinal result 'E')
    expect(computeToDirection('N', 'right', legs)).toBe('NE');
  });

  test('throws when custom legs has fewer than 3 entries', () => {
    expect(() => computeToDirection('A', 'right', ['A', 'B'])).toThrow('at least 3');
  });

  test('straight on 3-leg tee: index 0 → index 1', () => {
    const legs = ['North', 'East', 'South'];
    expect(computeToDirection('North', 'straight', legs)).toBe('East');
  });
});
