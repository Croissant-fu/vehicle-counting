# Vehicle Counter App (fu-count) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native + Expo mobile app for live field vehicle counting at intersections, with direction-of-travel tracking, vehicle classification, and CSV/Excel/JSON export.

**Architecture:** Lean local-only app — SQLite on-device, no backend, fully offline. Eight business-logic modules with clean interfaces sit below four screens; components are kept small and focused. All modules are tested with Jest; screens tested with React Native Testing Library.

**Tech Stack:** React Native + Expo (TypeScript, managed workflow), expo-sqlite, expo-location, expo-sharing, expo-file-system, SheetJS (xlsx), React Navigation native-stack, Jest + React Native Testing Library

**Spec:** `docs/superpowers/specs/2026-04-15-vehicle-counter-design.md`

---

## File Map

```
fu-count/
├── App.tsx
├── app.json
├── babel.config.js
├── tsconfig.json
├── jest.config.js
├── __mocks__/
│   ├── expo-sqlite.ts
│   ├── expo-location.ts
│   ├── expo-sharing.ts
│   └── expo-file-system.ts
├── src/
│   ├── types.ts
│   ├── db/
│   │   └── database.ts
│   ├── modules/
│   │   ├── direction/
│   │   │   ├── DirectionCalculator.ts
│   │   │   └── DirectionCalculator.test.ts
│   │   ├── session/
│   │   │   ├── SessionManager.ts
│   │   │   └── SessionManager.test.ts
│   │   ├── counter/
│   │   │   ├── CounterEngine.ts
│   │   │   └── CounterEngine.test.ts
│   │   ├── location/
│   │   │   ├── LocationService.ts
│   │   │   └── LocationService.test.ts
│   │   └── export/
│   │       ├── ExportEngine.ts
│   │       └── ExportEngine.test.ts
│   ├── hooks/
│   │   └── useResponsiveLayout.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── screens/
│   │   ├── SessionsListScreen.tsx
│   │   ├── SessionSetupScreen.tsx
│   │   ├── CountingScreen.tsx
│   │   └── SessionReviewScreen.tsx
│   └── components/
│       ├── ApproachSelector.tsx
│       ├── VehicleTypePicker.tsx
│       ├── DirectionButtons.tsx
│       └── UndoBar.tsx
└── docs/
    └── superpowers/
        ├── specs/2026-04-15-vehicle-counter-design.md
        └── plans/2026-04-15-vehicle-counter.md  ← copy of this file
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `App.tsx`, `app.json`, `babel.config.js`, `tsconfig.json`, `jest.config.js`, `package.json`

- [ ] **Step 1: Initialise Expo project**

```bash
cd /Users/sethisaksan/Projects/fu-count
npx create-expo-app@latest . --template blank-typescript
```

Expected: Expo project created with TypeScript template.

- [ ] **Step 2: Install runtime dependencies**

```bash
npx expo install expo-sqlite expo-location expo-sharing expo-file-system
npm install xlsx @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 4: Configure jest.config.js**

Create `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|react-native-screens|react-native-safe-area-context)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
```

- [ ] **Step 5: Verify Jest runs**

```bash
npx jest --listTests
```

Expected: no errors (no tests yet).

- [ ] **Step 6: Initialise git and commit**

```bash
git init
echo "node_modules/\n.expo/\ndist/\n.superpowers/" > .gitignore
git add .
git commit -m "chore: scaffold expo typescript project"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/types.ts

export type IntersectionType = '4way' | 'tee' | 'midblock' | 'roundabout' | 'custom';
export type TimePeriod = 'am_peak' | 'pm_peak' | 'off_peak';
export type VehicleType = 'moto' | 'car' | 'rickshaw' | 'other';
export type Movement = 'left' | 'straight' | 'right';

export interface Session {
  id: string;                        // "sess_YYYYMMDD_HHmmss_mmm"
  location_name: string;
  intersection_type: IntersectionType;
  time_period: TimePeriod;
  lat: number | null;
  lng: number | null;
  custom_legs: string[] | null;      // up to 6 leg names; null for standard types
  started_at: string;                // ISO 8601
  ended_at: string | null;
  total_count: number;
}

export interface Count {
  id: number;
  session_id: string;
  from_direction: string;
  movement: Movement;
  to_direction: string;              // computed and stored — never re-derived
  vehicle_type: VehicleType;
  timestamp: string;                 // ISO 8601
}

export interface CreateSessionInput {
  location_name: string;
  intersection_type: IntersectionType;
  time_period: TimePeriod;
  lat: number | null;
  lng: number | null;
  custom_legs?: string[];
}

export interface RecordCountInput {
  from_direction: string;
  movement: Movement;
  vehicle_type: VehicleType;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: DirectionCalculator

**Files:**
- Create: `src/modules/direction/DirectionCalculator.ts`
- Create: `src/modules/direction/DirectionCalculator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/direction/DirectionCalculator.test.ts
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
```

- [ ] **Step 2: Run — verify all fail**

```bash
npx jest src/modules/direction/DirectionCalculator.test.ts
```

Expected: FAIL — "Cannot find module './DirectionCalculator'"

- [ ] **Step 3: Implement**

```typescript
// src/modules/direction/DirectionCalculator.ts
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
  if (CARDINALS[from]) {
    return CARDINALS[from][movement];
  }
  if (!legs || legs.length === 0) {
    throw new Error(
      `computeToDirection: "${from}" is not a cardinal direction and no custom leg list was provided`
    );
  }
  const idx = legs.indexOf(from);
  if (idx === -1) throw new Error(`computeToDirection: "${from}" not found in legs`);
  const n = legs.length;
  if (movement === 'left')     return legs[(idx - 1 + n) % n];
  if (movement === 'right')    return legs[(idx + 1) % n];
  /* straight */               return legs[(idx + Math.floor(n / 2)) % n];
}
```

- [ ] **Step 4: Run — verify all pass**

```bash
npx jest src/modules/direction/DirectionCalculator.test.ts
```

Expected: PASS — 16 tests

- [ ] **Step 5: Commit**

```bash
git add src/modules/direction/
git commit -m "feat: add DirectionCalculator with cardinal and custom-leg support"
```

---

## Task 4: Database Layer + Native Mocks

**Files:**
- Create: `src/db/database.ts`
- Create: `__mocks__/expo-sqlite.ts`
- Create: `__mocks__/expo-location.ts`
- Create: `__mocks__/expo-sharing.ts`
- Create: `__mocks__/expo-file-system.ts`

- [ ] **Step 1: Create expo-sqlite mock**

```typescript
// __mocks__/expo-sqlite.ts
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
  Object.values(mockDb).forEach((fn) => (fn as jest.Mock).mockClear());
  (openDatabaseAsync as jest.Mock).mockClear();
};
```

- [ ] **Step 2: Create remaining native mocks**

```typescript
// __mocks__/expo-location.ts
export const requestForegroundPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getCurrentPositionAsync = jest.fn().mockResolvedValue({
  coords: { latitude: -6.2088, longitude: 106.8456 },
});
export const Accuracy = { High: 4 };
```

```typescript
// __mocks__/expo-sharing.ts
export const isAvailableAsync = jest.fn().mockResolvedValue(true);
export const shareAsync = jest.fn().mockResolvedValue(undefined);
```

```typescript
// __mocks__/expo-file-system.ts
export const documentDirectory = '/mock/documents/';
export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined);
export const deleteAsync = jest.fn().mockResolvedValue(undefined);
export const EncodingType = { UTF8: 'utf8', Base64: 'base64' };
```

- [ ] **Step 3: Implement database module**

```typescript
// src/db/database.ts
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('fucount.db');
    await _initSchema(_db);
  }
  return _db;
}

// Call this in tests to force a fresh db instance
export function _resetDbInstance(): void {
  _db = null;
}

async function _initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id             TEXT PRIMARY KEY,
      location_name  TEXT NOT NULL,
      intersection_type TEXT NOT NULL,
      time_period    TEXT NOT NULL,
      lat            REAL,
      lng            REAL,
      custom_legs    TEXT,
      started_at     TEXT NOT NULL,
      ended_at       TEXT,
      total_count    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS counts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id     TEXT NOT NULL REFERENCES sessions(id),
      from_direction TEXT NOT NULL,
      movement       TEXT NOT NULL,
      to_direction   TEXT NOT NULL,
      vehicle_type   TEXT NOT NULL,
      timestamp      TEXT NOT NULL
    );
  `);
}
```

- [ ] **Step 4: Verify mock is picked up**

```bash
npx jest --testPathPattern=NOMATCH --verbose 2>&1 | head -5
```

Expected: runs without "Cannot find module 'expo-sqlite'" errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/ __mocks__/
git commit -m "feat: add SQLite database layer and native module mocks"
```

---

## Task 5: SessionManager

**Files:**
- Create: `src/modules/session/SessionManager.ts`
- Create: `src/modules/session/SessionManager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/session/SessionManager.test.ts
import { __mockDb, __resetMocks } from '../../../__mocks__/expo-sqlite';
import { createSession, getSession, listSessions, endSession } from './SessionManager';
import { CreateSessionInput } from '../../types';

// Force the database module to use the mock
jest.mock('../../db/database', () => ({
  getDatabase: jest.fn().mockResolvedValue(__mockDb),
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
    __mockDb.getFirstAsync.mockResolvedValueOnce({
      id: 'sess_test', location_name: 'X', intersection_type: '4way',
      time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
      started_at: '2026-04-15T08:00:00Z', ended_at: null, total_count: 5,
    });
    const session = await endSession('sess_test');
    expect(session.ended_at).not.toBeNull();
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(1);
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
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/modules/session/SessionManager.test.ts
```

Expected: FAIL — "Cannot find module './SessionManager'"

- [ ] **Step 3: Implement**

```typescript
// src/modules/session/SessionManager.ts
import { getDatabase } from '../../db/database';
import { Session, CreateSessionInput } from '../../types';

function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  return `sess_${date}_${ms}`;
}

function deserializeSession(row: Record<string, unknown>): Session {
  return {
    ...(row as Omit<Session, 'custom_legs'>),
    custom_legs: row.custom_legs
      ? JSON.parse(row.custom_legs as string)
      : null,
  };
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const db = await getDatabase();
  const session: Session = {
    id: generateSessionId(),
    location_name: input.location_name,
    intersection_type: input.intersection_type,
    time_period: input.time_period,
    lat: input.lat,
    lng: input.lng,
    custom_legs: input.custom_legs ?? null,
    started_at: new Date().toISOString(),
    ended_at: null,
    total_count: 0,
  };
  await db.runAsync(
    `INSERT INTO sessions
      (id, location_name, intersection_type, time_period, lat, lng, custom_legs, started_at, ended_at, total_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id, session.location_name, session.intersection_type,
      session.time_period, session.lat, session.lng,
      session.custom_legs ? JSON.stringify(session.custom_legs) : null,
      session.started_at, session.ended_at, session.total_count,
    ]
  );
  return session;
}

export async function endSession(sessionId: string): Promise<Session> {
  const db = await getDatabase();
  const ended_at = new Date().toISOString();
  await db.runAsync(
    `UPDATE sessions SET ended_at = ? WHERE id = ?`,
    [ended_at, sessionId]
  );
  return getSession(sessionId);
}

export async function getSession(sessionId: string): Promise<Session> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM sessions WHERE id = ?`, [sessionId]
  );
  if (!row) throw new Error(`Session not found: ${sessionId}`);
  return deserializeSession(row);
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sessions ORDER BY started_at DESC`
  );
  return rows.map(deserializeSession);
}

export async function incrementSessionCount(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sessions SET total_count = total_count + 1 WHERE id = ?`,
    [sessionId]
  );
}

export async function decrementSessionCount(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sessions SET total_count = MAX(0, total_count - 1) WHERE id = ?`,
    [sessionId]
  );
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/modules/session/SessionManager.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/session/ 
git commit -m "feat: add SessionManager with create/end/list/get"
```

---

## Task 6: CounterEngine

**Files:**
- Create: `src/modules/counter/CounterEngine.ts`
- Create: `src/modules/counter/CounterEngine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/counter/CounterEngine.test.ts
import { __mockDb, __resetMocks } from '../../../__mocks__/expo-sqlite';

jest.mock('../../db/database', () => ({
  getDatabase: jest.fn().mockResolvedValue(__mockDb),
}));
jest.mock('../session/SessionManager', () => ({
  incrementSessionCount: jest.fn().mockResolvedValue(undefined),
  decrementSessionCount: jest.fn().mockResolvedValue(undefined),
}));

import { CounterEngine } from './CounterEngine';
import { Session } from '../../types';

const mockSession: Session = {
  id: 'sess_test', location_name: 'X', intersection_type: '4way',
  time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
  started_at: '2026-04-15T08:00:00Z', ended_at: null, total_count: 0,
};

beforeEach(() => {
  __resetMocks();
  __mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 42, changes: 1 });
});

describe('record', () => {
  test('inserts a count with computed to_direction and returns the Count', async () => {
    const engine = new CounterEngine(mockSession);
    const count = await engine.record({ from_direction: 'N', movement: 'right', vehicle_type: 'moto' });
    expect(count.to_direction).toBe('E');
    expect(count.from_direction).toBe('N');
    expect(count.vehicle_type).toBe('moto');
    expect(count.id).toBe(42);
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  test('uses custom legs when session is roundabout type', async () => {
    const roundaboutSession: Session = {
      ...mockSession,
      intersection_type: 'roundabout',
      custom_legs: ['North Gate', 'East Gate', 'South Gate', 'West Gate'],
    };
    const engine = new CounterEngine(roundaboutSession);
    const count = await engine.record({ from_direction: 'North Gate', movement: 'right', vehicle_type: 'car' });
    expect(count.to_direction).toBe('East Gate');
  });
});

describe('undo', () => {
  test('deletes last inserted count and returns true when a count existed', async () => {
    const engine = new CounterEngine(mockSession);
    await engine.record({ from_direction: 'N', movement: 'straight', vehicle_type: 'car' });
    __mockDb.runAsync.mockResolvedValueOnce({ changes: 1 });
    const undone = await engine.undo();
    expect(undone).toBe(true);
  });

  test('returns false when there is nothing to undo', async () => {
    const engine = new CounterEngine(mockSession);
    __mockDb.runAsync.mockResolvedValueOnce({ changes: 0 });
    const undone = await engine.undo();
    expect(undone).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/modules/counter/CounterEngine.test.ts
```

Expected: FAIL — "Cannot find module './CounterEngine'"

- [ ] **Step 3: Implement**

```typescript
// src/modules/counter/CounterEngine.ts
import { getDatabase } from '../../db/database';
import { incrementSessionCount, decrementSessionCount } from '../session/SessionManager';
import { computeToDirection } from '../direction/DirectionCalculator';
import { Session, Count, RecordCountInput } from '../../types';

export class CounterEngine {
  private session: Session;
  private lastCountId: number | null = null;

  constructor(session: Session) {
    this.session = session;
  }

  async record(input: RecordCountInput): Promise<Count> {
    const to_direction = computeToDirection(
      input.from_direction,
      input.movement,
      this.session.custom_legs ?? undefined
    );
    const timestamp = new Date().toISOString();
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO counts (session_id, from_direction, movement, to_direction, vehicle_type, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [this.session.id, input.from_direction, input.movement, to_direction, input.vehicle_type, timestamp]
    );
    this.lastCountId = result.lastInsertRowId;
    await incrementSessionCount(this.session.id);
    return {
      id: result.lastInsertRowId,
      session_id: this.session.id,
      from_direction: input.from_direction,
      movement: input.movement,
      to_direction,
      vehicle_type: input.vehicle_type,
      timestamp,
    };
  }

  async undo(): Promise<boolean> {
    if (this.lastCountId === null) return false;
    const db = await getDatabase();
    const result = await db.runAsync(
      `DELETE FROM counts WHERE id = ?`,
      [this.lastCountId]
    );
    if (result.changes > 0) {
      this.lastCountId = null;
      await decrementSessionCount(this.session.id);
      return true;
    }
    return false;
  }
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/modules/counter/CounterEngine.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/counter/
git commit -m "feat: add CounterEngine with record and undo"
```

---

## Task 7: LocationService

**Files:**
- Create: `src/modules/location/LocationService.ts`
- Create: `src/modules/location/LocationService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/location/LocationService.test.ts
jest.mock('expo-location');
import * as Location from 'expo-location';
import { requestAndGetLocation } from './LocationService';

describe('requestAndGetLocation', () => {
  test('returns coordinates when permission granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: -6.2088, longitude: 106.8456 },
    });
    const result = await requestAndGetLocation();
    expect(result).toEqual({ lat: -6.2088, lng: 106.8456 });
  });

  test('returns null when permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const result = await requestAndGetLocation();
    expect(result).toBeNull();
  });

  test('returns null when location fetch throws', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('timeout'));
    const result = await requestAndGetLocation();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/modules/location/LocationService.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/modules/location/LocationService.ts
import * as Location from 'expo-location';

export interface Coordinates {
  lat: number;
  lng: number;
}

export async function requestAndGetLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/modules/location/LocationService.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/location/
git commit -m "feat: add LocationService with permission handling"
```

---

## Task 8: ExportEngine

**Files:**
- Create: `src/modules/export/ExportEngine.ts`
- Create: `src/modules/export/ExportEngine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/export/ExportEngine.test.ts
jest.mock('expo-sharing');
jest.mock('expo-file-system');
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportSession } from './ExportEngine';
import { Session, Count } from '../../types';

const session: Session = {
  id: 'sess_20260415_0830_000',
  location_name: 'Jl. Sudirman',
  intersection_type: '4way',
  time_period: 'am_peak',
  lat: -6.2088,
  lng: 106.8456,
  custom_legs: null,
  started_at: '2026-04-15T08:30:00Z',
  ended_at: '2026-04-15T09:00:00Z',
  total_count: 2,
};

const counts: Count[] = [
  { id: 1, session_id: session.id, from_direction: 'N', movement: 'straight', to_direction: 'S', vehicle_type: 'moto', timestamp: '2026-04-15T08:31:00Z' },
  { id: 2, session_id: session.id, from_direction: 'S', movement: 'left', to_direction: 'E', vehicle_type: 'car', timestamp: '2026-04-15T08:31:05Z' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

test('CSV export writes a file with correct headers and 2 data rows', async () => {
  await exportSession(session, counts, 'csv');
  const written = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
  const csv: string = written[1];
  expect(csv).toContain('session_id,location_name');
  expect(csv.split('\n').filter(Boolean)).toHaveLength(3); // header + 2 rows
});

test('JSON export writes valid JSON with session and counts', async () => {
  await exportSession(session, counts, 'json');
  const written = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
  const parsed = JSON.parse(written[1]);
  expect(parsed.session.id).toBe(session.id);
  expect(parsed.counts).toHaveLength(2);
});

test('export filename follows convention', async () => {
  await exportSession(session, counts, 'csv');
  const filePath: string = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][0];
  expect(filePath).toMatch(/fucount_jl-sudirman_20260415_0830\.csv$/);
});

test('triggers share sheet after writing file', async () => {
  await exportSession(session, counts, 'csv');
  expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/modules/export/ExportEngine.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/modules/export/ExportEngine.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';
import { getDatabase } from '../../db/database';
import { Session, Count } from '../../types';

type ExportFormat = 'csv' | 'xlsx' | 'json';

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildFilename(session: Session, format: ExportFormat): string {
  const dateStr = session.started_at.slice(0, 10).replace(/-/g, '');
  const timeStr = session.started_at.slice(11, 16).replace(':', '');
  const loc = slugify(session.location_name);
  return `fucount_${loc}_${dateStr}_${timeStr}.${format}`;
}

function buildCsv(session: Session, counts: Count[]): string {
  const header = 'session_id,location_name,intersection_type,time_period,lat,lng,session_started_at,from_direction,movement,to_direction,vehicle_type,timestamp';
  const rows = counts.map((c) =>
    [
      session.id, session.location_name, session.intersection_type,
      session.time_period, session.lat ?? '', session.lng ?? '',
      session.started_at,
      c.from_direction, c.movement, c.to_direction, c.vehicle_type, c.timestamp,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

function buildXlsx(session: Session, counts: Count[]): string {
  const rawRows = counts.map((c) => ({
    session_id: session.id, location_name: session.location_name,
    intersection_type: session.intersection_type, time_period: session.time_period,
    lat: session.lat, lng: session.lng, session_started_at: session.started_at,
    from_direction: c.from_direction, movement: c.movement, to_direction: c.to_direction,
    vehicle_type: c.vehicle_type, timestamp: c.timestamp,
  }));

  const summaryData: Record<string, number> = {};
  counts.forEach((c) => {
    const key = `${c.from_direction}→${c.to_direction} (${c.vehicle_type})`;
    summaryData[key] = (summaryData[key] ?? 0) + 1;
  });
  const summaryRows = Object.entries(summaryData).map(([movement, count]) => ({ movement, count }));

  const wb = utils.book_new();
  utils.book_append_sheet(wb, utils.json_to_sheet(summaryRows), 'Summary');
  utils.book_append_sheet(wb, utils.json_to_sheet(rawRows), 'Raw');
  return write(wb, { type: 'base64', bookType: 'xlsx' });
}

export async function exportSession(
  session: Session,
  counts: Count[],
  format: ExportFormat
): Promise<void> {
  const filename = buildFilename(session, format);
  const path = `${FileSystem.documentDirectory}${filename}`;

  if (format === 'csv') {
    await FileSystem.writeAsStringAsync(path, buildCsv(session, counts), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } else if (format === 'json') {
    await FileSystem.writeAsStringAsync(
      path,
      JSON.stringify({ session, counts }, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
  } else {
    await FileSystem.writeAsStringAsync(path, buildXlsx(session, counts), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  await Sharing.shareAsync(path);
}

export async function getSessionCounts(sessionId: string): Promise<Count[]> {
  const db = await getDatabase();
  return db.getAllAsync<Count>(
    `SELECT * FROM counts WHERE session_id = ? ORDER BY timestamp ASC`,
    [sessionId]
  );
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/modules/export/ExportEngine.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/export/
git commit -m "feat: add ExportEngine for CSV, Excel, and JSON export"
```

---

## Task 9: Screen Stubs + AppNavigator

**Files:**
- Create: `src/screens/SessionsListScreen.tsx` (stub)
- Create: `src/screens/SessionSetupScreen.tsx` (stub)
- Create: `src/screens/CountingScreen.tsx` (stub)
- Create: `src/screens/SessionReviewScreen.tsx` (stub)
- Create: `src/navigation/AppNavigator.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Create screen stubs**

```typescript
// src/screens/SessionsListScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
export default function SessionsListScreen() {
  return <View><Text>Sessions List</Text></View>;
}
```

```typescript
// src/screens/SessionSetupScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
export default function SessionSetupScreen() {
  return <View><Text>Session Setup</Text></View>;
}
```

```typescript
// src/screens/CountingScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
export default function CountingScreen() {
  return <View><Text>Counting</Text></View>;
}
```

```typescript
// src/screens/SessionReviewScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
export default function SessionReviewScreen() {
  return <View><Text>Session Review</Text></View>;
}
```

- [ ] **Step 2: Create AppNavigator**

```typescript
// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SessionsListScreen from '../screens/SessionsListScreen';
import SessionSetupScreen from '../screens/SessionSetupScreen';
import CountingScreen from '../screens/CountingScreen';
import SessionReviewScreen from '../screens/SessionReviewScreen';
import { Session } from '../types';

export type RootStackParamList = {
  SessionsList: undefined;
  SessionSetup: undefined;
  Counting: { session: Session };
  SessionReview: { sessionId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SessionsList">
        <Stack.Screen name="SessionsList" component={SessionsListScreen} options={{ title: 'My Sessions' }} />
        <Stack.Screen name="SessionSetup" component={SessionSetupScreen} options={{ title: 'New Session' }} />
        <Stack.Screen name="Counting" component={CountingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SessionReview" component={SessionReviewScreen} options={{ title: 'Session Review' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 3: Wire into App.tsx**

```typescript
// App.tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ src/navigation/ App.tsx
git commit -m "feat: add navigation stack with screen stubs"
```

---

## Task 10: ApproachSelector Component

**Files:**
- Create: `src/components/ApproachSelector.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/ApproachSelector.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ApproachSelector from './ApproachSelector';

describe('ApproachSelector - cardinal', () => {
  test('renders N S E W buttons', () => {
    const { getByText } = render(
      <ApproachSelector legs={null} selected="N" onSelect={jest.fn()} />
    );
    expect(getByText('N')).toBeTruthy();
    expect(getByText('S')).toBeTruthy();
    expect(getByText('E')).toBeTruthy();
    expect(getByText('W')).toBeTruthy();
  });

  test('calls onSelect with tapped direction', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ApproachSelector legs={null} selected="N" onSelect={onSelect} />
    );
    fireEvent.press(getByText('S'));
    expect(onSelect).toHaveBeenCalledWith('S');
  });

  test('highlights the selected direction', () => {
    const { getByTestId } = render(
      <ApproachSelector legs={null} selected="E" onSelect={jest.fn()} />
    );
    expect(getByTestId('approach-E')).toHaveStyle({ backgroundColor: expect.stringContaining('#') });
  });
});

describe('ApproachSelector - custom legs', () => {
  const legs = ['North Gate', 'East Gate', 'South Gate'];
  test('renders custom leg buttons instead of N S E W', () => {
    const { getByText, queryByText } = render(
      <ApproachSelector legs={legs} selected="North Gate" onSelect={jest.fn()} />
    );
    expect(getByText('North Gate')).toBeTruthy();
    expect(queryByText('N')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/components/ApproachSelector.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/components/ApproachSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CARDINALS = ['N', 'S', 'E', 'W'];

interface Props {
  legs: string[] | null;
  selected: string;
  onSelect: (direction: string) => void;
}

export default function ApproachSelector({ legs, selected, onSelect }: Props) {
  const options = legs ?? CARDINALS;
  return (
    <View style={styles.row}>
      {options.map((leg) => (
        <TouchableOpacity
          key={leg}
          testID={`approach-${leg}`}
          style={[styles.btn, selected === leg && styles.selected]}
          onPress={() => onSelect(leg)}
        >
          <Text style={[styles.label, selected === leg && styles.selectedLabel]}>{leg}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: 8, backgroundColor: '#1e2a3a',
  },
  selected: { backgroundColor: '#4f8ef7' },
  label: { color: '#888', fontWeight: 'bold', fontSize: 16 },
  selectedLabel: { color: '#fff' },
});
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/components/ApproachSelector.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ApproachSelector.tsx src/components/ApproachSelector.test.tsx
git commit -m "feat: add ApproachSelector component"
```

---

## Task 11: VehicleTypePicker Component

**Files:**
- Create: `src/components/VehicleTypePicker.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/VehicleTypePicker.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import VehicleTypePicker from './VehicleTypePicker';

test('renders all 4 vehicle types', () => {
  const { getByText } = render(<VehicleTypePicker selected="moto" onSelect={jest.fn()} />);
  expect(getByText('Moto')).toBeTruthy();
  expect(getByText('Car')).toBeTruthy();
  expect(getByText('Rickshaw')).toBeTruthy();
  expect(getByText('Other')).toBeTruthy();
});

test('calls onSelect with the vehicle type key', () => {
  const onSelect = jest.fn();
  const { getByText } = render(<VehicleTypePicker selected="moto" onSelect={onSelect} />);
  fireEvent.press(getByText('Car'));
  expect(onSelect).toHaveBeenCalledWith('car');
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/components/VehicleTypePicker.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/components/VehicleTypePicker.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VehicleType } from '../types';

const VEHICLES: { key: VehicleType; label: string }[] = [
  { key: 'moto', label: 'Moto' },
  { key: 'car', label: 'Car' },
  { key: 'rickshaw', label: 'Rickshaw' },
  { key: 'other', label: 'Other' },
];

interface Props {
  selected: VehicleType;
  onSelect: (type: VehicleType) => void;
}

export default function VehicleTypePicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {VEHICLES.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          testID={`vehicle-${key}`}
          style={[styles.pill, selected === key && styles.selected]}
          onPress={() => onSelect(key)}
        >
          <Text style={[styles.label, selected === key && styles.selectedLabel]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pill: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 20, backgroundColor: '#1e2a3a',
  },
  selected: { backgroundColor: '#4f8ef7' },
  label: { color: '#888', fontSize: 12, fontWeight: '600' },
  selectedLabel: { color: '#fff' },
});
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/components/VehicleTypePicker.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/VehicleTypePicker.tsx src/components/VehicleTypePicker.test.tsx
git commit -m "feat: add VehicleTypePicker component"
```

---

## Task 12: DirectionButtons + UndoBar Components

**Files:**
- Create: `src/components/DirectionButtons.tsx`
- Create: `src/components/UndoBar.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/DirectionButtons.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DirectionButtons from './DirectionButtons';

test('renders Left, Straight, Right buttons', () => {
  const { getByTestId } = render(<DirectionButtons onPress={jest.fn()} />);
  expect(getByTestId('dir-left')).toBeTruthy();
  expect(getByTestId('dir-straight')).toBeTruthy();
  expect(getByTestId('dir-right')).toBeTruthy();
});

test('calls onPress with correct movement', () => {
  const onPress = jest.fn();
  const { getByTestId } = render(<DirectionButtons onPress={onPress} />);
  fireEvent.press(getByTestId('dir-right'));
  expect(onPress).toHaveBeenCalledWith('right');
});
```

```typescript
// src/components/UndoBar.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UndoBar from './UndoBar';

test('displays the total count', () => {
  const { getByText } = render(<UndoBar total={42} onUndo={jest.fn()} />);
  expect(getByText('42')).toBeTruthy();
});

test('calls onUndo when undo pressed', () => {
  const onUndo = jest.fn();
  const { getByTestId } = render(<UndoBar total={5} onUndo={onUndo} />);
  fireEvent.press(getByTestId('undo-btn'));
  expect(onUndo).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/components/DirectionButtons.test.tsx src/components/UndoBar.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement DirectionButtons**

```typescript
// src/components/DirectionButtons.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Movement } from '../types';

const BUTTONS: { movement: Movement; label: string; arrow: string }[] = [
  { movement: 'left',     label: 'Left',     arrow: '←' },
  { movement: 'straight', label: 'Straight', arrow: '↑' },
  { movement: 'right',    label: 'Right',    arrow: '→' },
];

interface Props {
  onPress: (movement: Movement) => void;
}

export default function DirectionButtons({ onPress }: Props) {
  return (
    <View style={styles.row}>
      {BUTTONS.map(({ movement, label, arrow }) => (
        <TouchableOpacity
          key={movement}
          testID={`dir-${movement}`}
          style={styles.btn}
          onPress={() => onPress(movement)}
          activeOpacity={0.7}
        >
          <Text style={styles.arrow}>{arrow}</Text>
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 28, alignItems: 'center',
    borderRadius: 12, backgroundColor: '#1e3a5f',
  },
  arrow: { fontSize: 32, color: '#fff' },
  label: { fontSize: 11, color: '#aaa', marginTop: 4 },
});
```

- [ ] **Step 4: Implement UndoBar**

```typescript
// src/components/UndoBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  total: number;
  onUndo: () => void;
}

export default function UndoBar({ total, onUndo }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity testID="undo-btn" style={styles.undoBtn} onPress={onUndo}>
        <Text style={styles.undoLabel}>↩ Undo</Text>
      </TouchableOpacity>
      <Text style={styles.total}>{total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  undoBtn: {
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: '#3a1a1a', borderRadius: 8,
  },
  undoLabel: { color: '#f44336', fontWeight: '600', fontSize: 14 },
  total: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
});
```

- [ ] **Step 5: Run — verify passes**

```bash
npx jest src/components/DirectionButtons.test.tsx src/components/UndoBar.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/DirectionButtons.tsx src/components/DirectionButtons.test.tsx src/components/UndoBar.tsx src/components/UndoBar.test.tsx
git commit -m "feat: add DirectionButtons and UndoBar components"
```

---

## Task 13: useResponsiveLayout Hook

**Files:**
- Create: `src/hooks/useResponsiveLayout.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/useResponsiveLayout.test.ts
import { renderHook } from '@testing-library/react-native';
import { useResponsiveLayout } from './useResponsiveLayout';

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.useWindowDimensions = jest.fn().mockReturnValue({ width: 390, height: 844 });
  return rn;
});

test('isTablet is false for phone-width (390px)', () => {
  const { result } = renderHook(() => useResponsiveLayout());
  expect(result.current.isTablet).toBe(false);
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/hooks/useResponsiveLayout.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/hooks/useResponsiveLayout.ts
import { useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  return { isTablet: width >= TABLET_BREAKPOINT };
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/hooks/useResponsiveLayout.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useResponsiveLayout hook"
```

---

## Task 14: SessionsListScreen

**Files:**
- Modify: `src/screens/SessionsListScreen.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/screens/SessionsListScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionsListScreen from './SessionsListScreen';

jest.mock('../modules/session/SessionManager', () => ({
  listSessions: jest.fn().mockResolvedValue([
    {
      id: 'sess_1', location_name: 'Jl. Sudirman', intersection_type: '4way',
      time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
      started_at: '2026-04-15T08:30:00Z', ended_at: '2026-04-15T09:00:00Z', total_count: 42,
    },
  ]),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => (() => void) | void) => { cb(); },
}));

test('displays session location name', async () => {
  const { findByText } = render(<SessionsListScreen />);
  expect(await findByText('Jl. Sudirman')).toBeTruthy();
});

test('navigates to SessionSetup when New Session pressed', async () => {
  const { findByTestId } = render(<SessionsListScreen />);
  fireEvent.press(await findByTestId('new-session-btn'));
  expect(mockNavigate).toHaveBeenCalledWith('SessionSetup');
});

test('navigates to SessionReview when a session is tapped', async () => {
  const { findByText } = render(<SessionsListScreen />);
  fireEvent.press(await findByText('Jl. Sudirman'));
  expect(mockNavigate).toHaveBeenCalledWith('SessionReview', { sessionId: 'sess_1' });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/screens/SessionsListScreen.test.tsx
```

Expected: FAIL (stub doesn't have the expected behaviour)

- [ ] **Step 3: Implement**

```typescript
// src/screens/SessionsListScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listSessions } from '../modules/session/SessionManager';
import { Session } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SessionsList'>;

const PERIOD_LABELS: Record<string, string> = {
  am_peak: 'AM Peak', pm_peak: 'PM Peak', off_peak: 'Off-Peak',
};

export default function SessionsListScreen() {
  const navigation = useNavigation<Nav>();
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      listSessions().then(setSessions);
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={<Text style={styles.empty}>No sessions yet. Tap + to start.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('SessionReview', { sessionId: item.id })}
          >
            <View>
              <Text style={styles.location}>{item.location_name}</Text>
              <Text style={styles.meta}>
                {item.started_at.slice(0, 10)} · {PERIOD_LABELS[item.time_period]} · {item.total_count} vehicles
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        testID="new-session-btn"
        style={styles.fab}
        onPress={() => navigation.navigate('SessionSetup')}
      >
        <Text style={styles.fabLabel}>+ New Session</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
  },
  location: { color: '#fff', fontSize: 16, fontWeight: '600' },
  meta: { color: '#888', fontSize: 12, marginTop: 2 },
  arrow: { color: '#4f8ef7', fontSize: 20 },
  empty: { color: '#888', textAlign: 'center', marginTop: 60, fontSize: 14 },
  fab: {
    margin: 16, padding: 16, backgroundColor: '#4f8ef7',
    borderRadius: 12, alignItems: 'center',
  },
  fabLabel: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/screens/SessionsListScreen.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/SessionsListScreen.tsx src/screens/SessionsListScreen.test.tsx
git commit -m "feat: implement SessionsListScreen"
```

---

## Task 15: SessionSetupScreen

**Files:**
- Modify: `src/screens/SessionSetupScreen.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/screens/SessionSetupScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionSetupScreen from './SessionSetupScreen';

const mockCreateSession = jest.fn().mockResolvedValue({
  id: 'sess_test', location_name: 'Test', intersection_type: '4way',
  time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
  started_at: '2026-04-15T08:00:00Z', ended_at: null, total_count: 0,
});

jest.mock('../modules/session/SessionManager', () => ({
  createSession: mockCreateSession,
}));
jest.mock('../modules/location/LocationService', () => ({
  requestAndGetLocation: jest.fn().mockResolvedValue({ lat: -6.2088, lng: 106.8456 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockNavigate }),
}));

test('shows GPS coordinates after mount', async () => {
  const { findByText } = render(<SessionSetupScreen />);
  expect(await findByText(/-6.2088/)).toBeTruthy();
});

test('disables Start Counting when location name is empty', async () => {
  const { getByTestId } = render(<SessionSetupScreen />);
  const btn = getByTestId('start-counting-btn');
  expect(btn.props.accessibilityState?.disabled).toBe(true);
});

test('navigates to Counting after valid form submitted', async () => {
  const { getByTestId, getByPlaceholderText } = render(<SessionSetupScreen />);
  fireEvent.changeText(getByPlaceholderText('e.g. Jl. Sudirman / Jl. Thamrin'), 'Test Location');
  await waitFor(() => expect(getByTestId('start-counting-btn').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('start-counting-btn'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Counting', expect.objectContaining({ session: expect.any(Object) })));
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/screens/SessionSetupScreen.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/screens/SessionSetupScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createSession } from '../modules/session/SessionManager';
import { requestAndGetLocation } from '../modules/location/LocationService';
import { IntersectionType, TimePeriod } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SessionSetup'>;

const INTERSECTION_TYPES: { key: IntersectionType; label: string }[] = [
  { key: '4way', label: '4-Way Crossroad' },
  { key: 'tee', label: 'T-Intersection' },
  { key: 'midblock', label: 'Mid-Block' },
  { key: 'roundabout', label: 'Roundabout / Custom' },
];

const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
  { key: 'am_peak', label: 'AM Peak' },
  { key: 'pm_peak', label: 'PM Peak' },
  { key: 'off_peak', label: 'Off-Peak' },
];

export default function SessionSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [locationName, setLocationName] = useState('');
  const [intersectionType, setIntersectionType] = useState<IntersectionType>('4way');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('am_peak');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customLegs, setCustomLegs] = useState<string[]>(['', '', '']);

  useEffect(() => {
    requestAndGetLocation().then(setCoords);
  }, []);

  const isCustom = intersectionType === 'roundabout' || intersectionType === 'custom';
  const validLegs = isCustom ? customLegs.filter((l) => l.trim().length > 0) : [];
  const isValid = locationName.trim().length > 0 && (!isCustom || validLegs.length >= 3);

  const handleStart = async () => {
    const session = await createSession({
      location_name: locationName.trim(),
      intersection_type: intersectionType,
      time_period: timePeriod,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      custom_legs: isCustom ? validLegs : undefined,
    });
    navigation.navigate('Counting', { session });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>LOCATION NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Jl. Sudirman / Jl. Thamrin"
          placeholderTextColor="#555"
          value={locationName}
          onChangeText={setLocationName}
        />

        <Text style={styles.label}>INTERSECTION TYPE</Text>
        <View style={styles.row}>
          {INTERSECTION_TYPES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, intersectionType === key && styles.chipSelected]}
              onPress={() => setIntersectionType(key)}
            >
              <Text style={[styles.chipText, intersectionType === key && styles.chipTextSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isCustom && (
          <>
            <Text style={styles.label}>LEG NAMES (min. 3, max. 6)</Text>
            {customLegs.map((leg, i) => (
              <TextInput
                key={i}
                style={styles.input}
                placeholder={`Leg ${i + 1} name`}
                placeholderTextColor="#555"
                value={leg}
                onChangeText={(val) => {
                  const updated = [...customLegs];
                  updated[i] = val;
                  if (i === customLegs.length - 1 && val && customLegs.length < 6) {
                    updated.push('');
                  }
                  setCustomLegs(updated);
                }}
              />
            ))}
          </>
        )}

        <Text style={styles.label}>TIME PERIOD</Text>
        <View style={styles.row}>
          {TIME_PERIODS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, timePeriod === key && styles.chipSelected]}
              onPress={() => setTimePeriod(key)}
            >
              <Text style={[styles.chipText, timePeriod === key && styles.chipTextSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>GPS</Text>
        <Text style={styles.gpsText}>
          {coords ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Fetching location...'}
        </Text>

        <TouchableOpacity
          testID="start-counting-btn"
          style={[styles.startBtn, !isValid && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!isValid}
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.startBtnText}>Start Counting →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  content: { padding: 20, gap: 8 },
  label: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: 16, marginBottom: 4 },
  input: {
    backgroundColor: '#1e2a3a', color: '#fff', padding: 12,
    borderRadius: 8, fontSize: 14, marginBottom: 4,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: '#1e2a3a', borderRadius: 20,
  },
  chipSelected: { backgroundColor: '#4f8ef7' },
  chipText: { color: '#888', fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  gpsText: { color: '#4f8ef7', fontSize: 13, padding: 10, backgroundColor: '#1e2a3a', borderRadius: 8 },
  startBtn: {
    marginTop: 32, padding: 18, backgroundColor: '#4f8ef7',
    borderRadius: 12, alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: '#2a2a4a' },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/screens/SessionSetupScreen.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/SessionSetupScreen.tsx src/screens/SessionSetupScreen.test.tsx
git commit -m "feat: implement SessionSetupScreen with GPS and custom legs"
```

---

## Task 16: CountingScreen

**Files:**
- Modify: `src/screens/CountingScreen.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/screens/CountingScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CountingScreen from './CountingScreen';

const mockRecord = jest.fn().mockResolvedValue({ id: 1, to_direction: 'S' });
const mockUndo   = jest.fn().mockResolvedValue(true);

jest.mock('../modules/counter/CounterEngine', () => ({
  CounterEngine: jest.fn().mockImplementation(() => ({
    record: mockRecord,
    undo: mockUndo,
  })),
}));
jest.mock('../modules/session/SessionManager', () => ({
  endSession: jest.fn().mockResolvedValue({}),
  getSession: jest.fn().mockResolvedValue({ total_count: 1 }),
}));

const mockSession = {
  id: 'sess_test', location_name: 'Test', intersection_type: '4way',
  time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
  started_at: new Date().toISOString(), ended_at: null, total_count: 0,
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockNavigate }),
  useRoute: () => ({ params: { session: mockSession } }),
}));

beforeEach(() => { jest.clearAllMocks(); });

test('records a count when Straight is pressed', async () => {
  const { getByTestId } = render(<CountingScreen />);
  fireEvent.press(getByTestId('dir-straight'));
  await waitFor(() => expect(mockRecord).toHaveBeenCalledWith({
    from_direction: 'N',
    movement: 'straight',
    vehicle_type: 'moto',
  }));
});

test('calls undo when undo button pressed', async () => {
  const { getByTestId } = render(<CountingScreen />);
  fireEvent.press(getByTestId('undo-btn'));
  await waitFor(() => expect(mockUndo).toHaveBeenCalledTimes(1));
});

test('shows End Session confirmation and navigates on confirm', async () => {
  const { getByTestId } = render(<CountingScreen />);
  fireEvent.press(getByTestId('end-session-btn'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('SessionReview', { sessionId: 'sess_test' }));
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/screens/CountingScreen.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/screens/CountingScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { CounterEngine } from '../modules/counter/CounterEngine';
import { endSession, getSession } from '../modules/session/SessionManager';
import ApproachSelector from '../components/ApproachSelector';
import VehicleTypePicker from '../components/VehicleTypePicker';
import DirectionButtons from '../components/DirectionButtons';
import UndoBar from '../components/UndoBar';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Session, Movement, VehicleType } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Counting'>;
type Route = RouteProp<RootStackParamList, 'Counting'>;

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function CountingScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const session: Session = params.session;
  const { isTablet } = useResponsiveLayout();

  const engineRef = useRef(new CounterEngine(session));
  const [fromDirection, setFromDirection] = useState(
    session.custom_legs?.[0] ?? 'N'
  );
  const [vehicleType, setVehicleType] = useState<VehicleType>('moto');
  const [total, setTotal] = useState(session.total_count);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDirection = async (movement: Movement) => {
    await engineRef.current.record({ from_direction: fromDirection, movement, vehicle_type: vehicleType });
    const updated = await getSession(session.id);
    setTotal(updated.total_count);
  };

  const handleUndo = async () => {
    const undone = await engineRef.current.undo();
    if (undone) {
      const updated = await getSession(session.id);
      setTotal(updated.total_count);
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session?',
      `You have counted ${total} vehicles. End this session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session', style: 'destructive',
          onPress: async () => {
            await endSession(session.id);
            navigation.replace('SessionReview', { sessionId: session.id });
          },
        },
      ]
    );
  };

  const controls = (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FROM DIRECTION</Text>
        <ApproachSelector
          legs={session.custom_legs}
          selected={fromDirection}
          onSelect={setFromDirection}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>VEHICLE TYPE</Text>
        <VehicleTypePicker selected={vehicleType} onSelect={setVehicleType} />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.locationName} numberOfLines={1}>{session.location_name}</Text>
        <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
        <TouchableOpacity testID="end-session-btn" style={styles.endBtn} onPress={handleEndSession}>
          <Text style={styles.endBtnText}>■</Text>
        </TouchableOpacity>
      </View>

      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.tabletSidebar}>{controls}</View>
          <View style={styles.tabletMain}>
            <DirectionButtons onPress={handleDirection} />
            <UndoBar total={total} onUndo={handleUndo} />
          </View>
        </View>
      ) : (
        <View style={styles.phoneLayout}>
          {controls}
          <View style={styles.directionArea}>
            <DirectionButtons onPress={handleDirection} />
          </View>
          <UndoBar total={total} onUndo={handleUndo} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
  },
  locationName: { flex: 1, color: '#4f8ef7', fontWeight: 'bold', fontSize: 14 },
  timer: { color: '#888', fontSize: 13, marginHorizontal: 8 },
  endBtn: { padding: 6, backgroundColor: '#3a1a1a', borderRadius: 6 },
  endBtnText: { color: '#f44336', fontSize: 16 },
  phoneLayout: { flex: 1, padding: 16, gap: 12 },
  tabletLayout: { flex: 1, flexDirection: 'row' },
  tabletSidebar: { width: 260, padding: 16, borderRightWidth: 1, borderRightColor: '#1e2a3a', gap: 12 },
  tabletMain: { flex: 1, padding: 16, justifyContent: 'flex-end', gap: 12 },
  section: { gap: 6 },
  sectionLabel: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  directionArea: { flex: 1, justifyContent: 'center' },
});
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/screens/CountingScreen.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/CountingScreen.tsx src/screens/CountingScreen.test.tsx
git commit -m "feat: implement CountingScreen with phone and tablet layouts"
```

---

## Task 17: SessionReviewScreen

**Files:**
- Modify: `src/screens/SessionReviewScreen.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/screens/SessionReviewScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionReviewScreen from './SessionReviewScreen';

jest.mock('../modules/session/SessionManager', () => ({
  getSession: jest.fn().mockResolvedValue({
    id: 'sess_test', location_name: 'Test St', intersection_type: '4way',
    time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
    started_at: '2026-04-15T08:00:00Z', ended_at: '2026-04-15T09:00:00Z', total_count: 2,
  }),
}));
jest.mock('../modules/export/ExportEngine', () => ({
  getSessionCounts: jest.fn().mockResolvedValue([
    { id: 1, session_id: 'sess_test', from_direction: 'N', movement: 'straight', to_direction: 'S', vehicle_type: 'moto', timestamp: '...' },
    { id: 2, session_id: 'sess_test', from_direction: 'S', movement: 'left', to_direction: 'E', vehicle_type: 'car', timestamp: '...' },
  ]),
  exportSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { sessionId: 'sess_test' } }),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

test('displays location name and total count', async () => {
  const { findByText } = render(<SessionReviewScreen />);
  expect(await findByText('Test St')).toBeTruthy();
  expect(await findByText('2 vehicles')).toBeTruthy();
});

test('shows movement breakdown rows', async () => {
  const { findByText } = render(<SessionReviewScreen />);
  expect(await findByText('N → S')).toBeTruthy();
});

test('export button triggers exportSession for csv', async () => {
  const { findByTestId } = render(<SessionReviewScreen />);
  const { exportSession } = require('../modules/export/ExportEngine');
  fireEvent.press(await findByTestId('export-csv-btn'));
  await waitFor(() => expect(exportSession).toHaveBeenCalledWith(expect.any(Object), expect.any(Array), 'csv'));
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest src/screens/SessionReviewScreen.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/screens/SessionReviewScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native-stack';
import { getSession } from '../modules/session/SessionManager';
import { getSessionCounts, exportSession } from '../modules/export/ExportEngine';
import { Session, Count } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Route = RouteProp<RootStackParamList, 'SessionReview'>;

type MovementRow = { key: string; from: string; to: string; vehicle: string; count: number };

function buildMovementRows(counts: Count[]): MovementRow[] {
  const map: Record<string, MovementRow> = {};
  counts.forEach((c) => {
    const key = `${c.from_direction}→${c.to_direction}|${c.vehicle_type}`;
    if (!map[key]) {
      map[key] = { key, from: c.from_direction, to: c.to_direction, vehicle: c.vehicle_type, count: 0 };
    }
    map[key].count++;
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
}

const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto', car: 'Car', rickshaw: 'Rickshaw', other: 'Other',
};

export default function SessionReviewScreen() {
  const { params } = useRoute<Route>();
  const [session, setSession] = useState<Session | null>(null);
  const [counts, setCounts] = useState<Count[]>([]);

  useEffect(() => {
    Promise.all([
      getSession(params.sessionId),
      getSessionCounts(params.sessionId),
    ]).then(([s, c]) => { setSession(s); setCounts(c); });
  }, [params.sessionId]);

  if (!session) return null;

  const rows = buildMovementRows(counts);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.location}>{session.location_name}</Text>
        <Text style={styles.meta}>
          {session.started_at.slice(0, 10)} · {session.intersection_type} · {session.total_count} vehicles
        </Text>

        <Text style={styles.sectionLabel}>MOVEMENT BREAKDOWN</Text>
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.movement}>{row.from} → {row.to}</Text>
            <Text style={styles.vehicle}>{VEHICLE_LABELS[row.vehicle]}</Text>
            <Text style={styles.count}>{row.count}</Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>EXPORT DATA</Text>
        <View style={styles.exportRow}>
          <TouchableOpacity testID="export-csv-btn" style={styles.exportBtn} onPress={() => exportSession(session, counts, 'csv')}>
            <Text style={styles.exportBtnText}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="export-xlsx-btn" style={styles.exportBtn} onPress={() => exportSession(session, counts, 'xlsx')}>
            <Text style={styles.exportBtnText}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="export-json-btn" style={styles.exportBtn} onPress={() => exportSession(session, counts, 'json')}>
            <Text style={styles.exportBtnText}>JSON</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  content: { padding: 20 },
  location: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  meta: { color: '#888', fontSize: 13, marginTop: 4, marginBottom: 20 },
  sectionLabel: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: '#1e2a3a', borderRadius: 8, marginBottom: 6,
  },
  movement: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  vehicle: { color: '#888', fontSize: 12, marginRight: 12 },
  count: { color: '#4f8ef7', fontSize: 18, fontWeight: 'bold', width: 36, textAlign: 'right' },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1, padding: 14, backgroundColor: '#4f8ef7',
    borderRadius: 10, alignItems: 'center',
  },
  exportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
```

- [ ] **Step 4: Run — verify passes**

```bash
npx jest src/screens/SessionReviewScreen.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/SessionReviewScreen.tsx src/screens/SessionReviewScreen.test.tsx
git commit -m "feat: implement SessionReviewScreen with export buttons"
```

---

## Task 18: Full Test Suite + Smoke Test

**Files:**
- Modify: `docs/superpowers/plans/2026-04-15-vehicle-counter.md` (copy this file here)

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --coverage
```

Expected: All tests pass. Coverage report generated.

- [ ] **Step 2: Start the dev build on a simulator**

```bash
npx expo start
```

Press `i` for iOS Simulator or `a` for Android Emulator.

- [ ] **Step 3: Smoke test checklist — verify in simulator**

Walk through each item manually:

```
[ ] App launches — Sessions List shows empty state with "+ New Session"
[ ] Tap New Session — setup form appears, GPS auto-fetches
[ ] Type a location name — "Start Counting" button becomes enabled
[ ] Select 4-Way, AM Peak → tap Start Counting
[ ] Counting screen — FROM buttons N/S/E/W visible, Moto selected, timer running
[ ] Tap S (FROM) then tap Straight → total increments to 1
[ ] Tap Undo → total returns to 0
[ ] Switch vehicle type to Car → tap Left from N → verify count recorded
[ ] Switch to E (FROM) → tap Right → total = 2 (expect to_direction = S for E+right)
[ ] Tap End Session (■) → confirm dialog appears
[ ] Confirm → SessionReview screen shows movement breakdown
[ ] Tap CSV → share sheet opens
[ ] Back to home → session appears in list
```

- [ ] **Step 4: Save plan copy to docs**

```bash
mkdir -p docs/superpowers/plans
cp /Users/sethisaksan/.claude/plans/glimmering-giggling-hearth.md docs/superpowers/plans/2026-04-15-vehicle-counter.md
```

- [ ] **Step 5: Final commit**

```bash
git add docs/
git commit -m "docs: add implementation plan"
```

---

## Verification Checklist

Cross-reference against spec `docs/superpowers/specs/2026-04-15-vehicle-counter-design.md`:

- [x] Session metadata: location + intersection type + time period + GPS + timestamp
- [x] All intersection types: 4way, tee, midblock, roundabout, custom (up to 6 legs)
- [x] Core gesture: approach selector → vehicle type → left/straight/right
- [x] to_direction computed and stored (never re-derived)
- [x] Undo removes last count record
- [x] CSV export with correct columns
- [x] Excel export with Summary + Raw sheets
- [x] JSON export with session + counts structure
- [x] Export filename convention: `fucount_[location-slug]_[YYYYMMDD]_[HHmm].[ext]`
- [x] Phone layout: portrait, thumb-reachable buttons
- [x] Tablet layout: side panel at ≥768px width
- [x] Fully offline: no network calls
- [x] End Session button with confirmation dialog
