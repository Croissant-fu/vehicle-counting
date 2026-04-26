import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';
import { getDatabase } from '../../db/database';
import { Session, Count } from '../../types';

type ExportFormat = 'csv' | 'xlsx' | 'json';

const MIME_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  json: 'application/json',
};

const UTIS: Record<ExportFormat, string> = {
  csv: 'public.comma-separated-values-text',
  xlsx: 'com.microsoft.excel.xlsx',
  json: 'public.json',
};

// Module-level cache so we don't query the DB on every export.
let _downloadsDirUri: string | null | undefined = undefined;

async function getDownloadsDirUri(): Promise<string | null> {
  if (_downloadsDirUri !== undefined) return _downloadsDirUri;
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'downloads_dir_uri'",
  );
  _downloadsDirUri = row?.value ?? null;
  return _downloadsDirUri;
}

async function saveDownloadsDirUri(uri: string): Promise<void> {
  _downloadsDirUri = uri;
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('downloads_dir_uri', ?)",
    [uri],
  );
}

async function clearDownloadsDirUri(): Promise<void> {
  _downloadsDirUri = null;
  const db = await getDatabase();
  await db.runAsync("DELETE FROM app_settings WHERE key = 'downloads_dir_uri'");
}

// Attempt to save to user's chosen Downloads folder via Storage Access Framework.
// Returns true if the file was saved successfully.
async function saveToDownloads(
  content: string,
  filename: string,
  format: ExportFormat,
  encoding: typeof FileSystem.EncodingType[keyof typeof FileSystem.EncodingType],
): Promise<boolean> {
  const saf = (FileSystem as any).StorageAccessFramework;
  if (!saf) return false;

  const tryWrite = async (dirUri: string): Promise<boolean> => {
    const fileUri = await saf.createFileAsync(dirUri, filename, MIME_TYPES[format]);
    await FileSystem.writeAsStringAsync(fileUri, content, { encoding });
    return true;
  };

  // Try with stored URI first (no picker needed).
  const stored = await getDownloadsDirUri();
  if (stored) {
    try {
      return await tryWrite(stored);
    } catch {
      // Stored URI may have been revoked — clear it and fall through to re-request.
      await clearDownloadsDirUri();
    }
  }

  // Ask the user to pick the Downloads folder.
  const result = await saf.requestDirectoryPermissionsAsync();
  if (!result.granted) return false;

  await saveDownloadsDirUri(result.directoryUri);
  try {
    return await tryWrite(result.directoryUri);
  } catch {
    return false;
  }
}

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
  format: ExportFormat,
): Promise<void> {
  const filename = buildFilename(session, format);
  const path = `${FileSystem.documentDirectory}${filename}`;

  let content: string;
  let encoding: typeof FileSystem.EncodingType[keyof typeof FileSystem.EncodingType];

  if (format === 'csv') {
    content = buildCsv(session, counts);
    encoding = FileSystem.EncodingType.UTF8;
  } else if (format === 'json') {
    content = JSON.stringify({ session, counts }, null, 2);
    encoding = FileSystem.EncodingType.UTF8;
  } else {
    content = buildXlsx(session, counts);
    encoding = FileSystem.EncodingType.Base64;
  }

  // Write to app documents directory (needed for share sheet).
  await FileSystem.writeAsStringAsync(path, content, { encoding });

  // Save to Downloads folder on Android (prompts folder picker on first use).
  let savedToDownloads = false;
  if (Platform.OS === 'android') {
    savedToDownloads = await saveToDownloads(content, filename, format, encoding);
  }

  // Open share sheet so user can also send/save elsewhere.
  await Sharing.shareAsync(path, { mimeType: MIME_TYPES[format], UTI: UTIS[format] });

  if (savedToDownloads) {
    Alert.alert('Saved to Downloads', `"${filename}" was saved to your Downloads folder.`);
  }
}

export async function getSessionCounts(sessionId: string): Promise<Count[]> {
  const db = await getDatabase();
  return db.getAllAsync<Count>(
    `SELECT * FROM counts WHERE session_id = ? ORDER BY timestamp ASC`,
    [sessionId],
  );
}
