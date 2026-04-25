const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
};

export const openDatabaseAsync = jest.fn().mockResolvedValue(mockDb);

// Test helper to access the mock db instance
export const __mockDb = mockDb;
// Test helper to reset all mock call history
export const __resetMocks = () => {
  Object.values(mockDb).forEach((fn) => (fn as jest.Mock).mockReset());
  (openDatabaseAsync as jest.Mock).mockReset();
  // Re-apply default implementations after reset
  mockDb.execAsync.mockResolvedValue(undefined);
  mockDb.getAllAsync.mockResolvedValue([]);
  mockDb.getFirstAsync.mockResolvedValue(null);
  mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
};
