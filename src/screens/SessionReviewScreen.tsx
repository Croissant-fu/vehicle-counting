import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
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
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {session.started_at.slice(0, 10)} · {session.intersection_type} ·{' '}
          </Text>
          <Text style={styles.meta}>{session.total_count} vehicles</Text>
        </View>

        <Text style={styles.sectionLabel}>MOVEMENT BREAKDOWN</Text>
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.movement}>{row.from} → {row.to}</Text>
            <Text style={styles.vehicle}>{VEHICLE_LABELS[row.vehicle] ?? row.vehicle}</Text>
            <Text style={styles.count}>{row.count}</Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>EXPORT DATA</Text>
        <View style={styles.exportRow}>
          <TouchableOpacity
            testID="export-csv-btn"
            style={styles.exportBtn}
            onPress={() => exportSession(session, counts, 'csv')}
          >
            <Text style={styles.exportBtnText}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="export-xlsx-btn"
            style={styles.exportBtn}
            onPress={() => exportSession(session, counts, 'xlsx')}
          >
            <Text style={styles.exportBtnText}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="export-json-btn"
            style={styles.exportBtn}
            onPress={() => exportSession(session, counts, 'json')}
          >
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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, marginBottom: 20 },
  meta: { color: '#888', fontSize: 13 },
  sectionLabel: {
    color: '#888', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1, marginTop: 20, marginBottom: 8,
  },
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
