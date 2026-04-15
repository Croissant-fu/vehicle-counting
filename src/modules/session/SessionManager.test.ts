import { __mockDb, __resetMocks } from '../../../__mocks__/expo-sqlite';
import { createSession, getSession, listSessions, endSession } from './SessionManager';
import { CreateSessionInput } from '../../types';

// Force the database module to use the mock.
// We use require() inside the factory to avoid the jest.mock hoisting scope restriction.
jest.mock('../../db/database', () => ({
  getDatabase: jest.fn().mockResolvedValue(
    require('../../../__mocks__/expo-sqlite').__mockDb
  ),
}));

beforeEach(() => {
  __resetMocks();
});

const input: CreateSessionInput = {
  location_name: 'Jl. Sudirman',
  intersection_type: '4way',
  time_period: 'am_peak',
  lat: -6.2088,
  lng: 106.8456,
};

describe('createSession', () => {
  test('inserts a row and returns a Session with correct fields', async () => {
    const session = await createSession(input);
    expect(session.location_name).toBe('Jl. Sudirman');
    expect(session.intersection_type).toBe('4way');
    expect(session.time_period).toBe('am_peak');
    expect(session.lat).toBe(-6.2088);
    expect(session.ended_at).toBeNull();
    expect(session.total_count).toBe(0);
    expect(session.id).toMatch(/^sess_/);
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  test('generates unique IDs for rapid successive calls', async () => {
    const a = await createSession(input);
    await new Promise((r) => setTimeout(r, 2));
    const b = await createSession(input);
    expect(a.id).not.toBe(b.id);
  });

  test('stores custom_legs as JSON string when provided', async () => {
    const withLegs = { ...input, intersection_type: 'roundabout' as const, custom_legs: ['N Gate', 'E Gate', 'S Gate'] };
    await createSession(withLegs);
    const call = (__mockDb.runAsync as jest.Mock).mock.calls[0];
    expect(call[1]).toContain('["N Gate","E Gate","S Gate"]');
  });
});

describe('endSession', () => {
  test('sets ended_at and returns updated session', async () => {
    __mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });
    __mockDb.getFirstAsync.mockResolvedValueOnce({
      id: 'sess_test', location_name: 'X', intersection_type: '4way',
      time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
      started_at: '2026-04-15T08:00:00Z', ended_at: '2026-04-15T09:00:00Z', total_count: 5,
    });
    const session = await endSession('sess_test');
    expect(session.ended_at).not.toBeNull();
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  test('throws when session does not exist', async () => {
    __mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 0 });
    await expect(endSession('nonexistent')).rejects.toThrow('Session not found');
  });
});

describe('listSessions', () => {
  test('returns empty array when no sessions', async () => {
    __mockDb.getAllAsync.mockResolvedValueOnce([]);
    const list = await listSessions();
    expect(list).toEqual([]);
  });

  test('parses custom_legs JSON string to array', async () => {
    __mockDb.getAllAsync.mockResolvedValueOnce([{
      id: 'sess_1', location_name: 'X', intersection_type: 'roundabout',
      time_period: 'pm_peak', lat: null, lng: null,
      custom_legs: '["Leg A","Leg B","Leg C"]',
      started_at: '2026-04-15T08:00:00Z', ended_at: null, total_count: 0,
    }]);
    const list = await listSessions();
    expect(list[0].custom_legs).toEqual(['Leg A', 'Leg B', 'Leg C']);
  });
});
