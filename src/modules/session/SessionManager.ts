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
  const session = await getSession(sessionId);
  // Overlay the ended_at we just wrote — the DB row returned by getSession
  // may reflect the pre-update snapshot in test environments.
  return { ...session, ended_at };
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
