import { computeToDirection } from './DirectionCalculator';

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
