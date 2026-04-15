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
      encoding: 'utf8' as any,
    });
  } else if (format === 'json') {
    await FileSystem.writeAsStringAsync(
      path,
      JSON.stringify({ session, counts }, null, 2),
      { encoding: 'utf8' as any }
    );
  } else {
    await FileSystem.writeAsStringAsync(path, buildXlsx(session, counts), {
      encoding: 'base64' as any,
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
