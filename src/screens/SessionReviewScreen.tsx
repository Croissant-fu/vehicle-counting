import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSession } from '../modules/session/SessionManager';
import { getSessionCounts, exportSession, exportPdf, ReportStats } from '../modules/export/ExportEngine';
import { Session, Count } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { G } from '../theme';

type Route = RouteProp<RootStackParamList, 'SessionReview'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'SessionReview'>;

// ── Pure stat helpers ─────────────────────────────────────────────────────────

function computeStats(session: Session, counts: Count[]): ReportStats {
  const byVehicle:  Record<string, number> = {};
  const byMovement: Record<string, number> = {};
  const byApproach: Record<string, number> = {};

  counts.forEach((c) => {
    byVehicle[c.vehicle_type]    = (byVehicle[c.vehicle_type]    ?? 0) + 1;
    byMovement[c.movement]       = (byMovement[c.movement]       ?? 0) + 1;
    byApproach[c.from_direction] = (byApproach[c.from_direction] ?? 0) + 1;
  });

  return { byVehicle, byMovement, byApproach, duration: formatDuration(session) };
}

function formatDuration(session: Session): string {
  if (!session.ended_at) return '—';
  const ms = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
  const s  = Math.floor(ms / 1000);
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

function topEntry(rec: Record<string, number>): string {
  const entries = Object.entries(rec);
  if (!entries.length) return '—';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const MOVEMENT_ICON: Record<string, string> = {
  left: '←', straight: '↑', right: '→',
};

const PERIOD_LABELS: Record<string, string> = {
  am_peak: 'AM Peak', pm_peak: 'PM Peak', off_peak: 'Off-Peak',
};

// ── Bar chart component ───────────────────────────────────────────────────────

function BarChart({
  title, data, color,
}: {
  title: string;
  data: Record<string, number>;
  color: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  if (!entries.length) return null;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {entries.map(([label, value]) => {
        const pct = (value / max) * 100;
        const display = MOVEMENT_ICON[label]
          ? `${MOVEMENT_ICON[label]}  ${cap(label)}`
          : label;
        return (
          <View key={label} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{display}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(pct, value > 0 ? 2 : 0)}%` as any, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SessionReviewScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const [session, setSession]   = useState<Session | null>(null);
  const [counts,  setCounts]    = useState<Count[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getSession(params.sessionId),
      getSessionCounts(params.sessionId),
    ]).then(([s, c]) => { setSession(s); setCounts(c); });
  }, [params.sessionId]);

  // "Sessions" shortcut in the header
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.popToTop()}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={hdrBtn.text}>⌂ Sessions</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (!session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={G.blue} />
      </View>
    );
  }

  const stats = computeStats(session, counts);
  const { byVehicle, byMovement, byApproach, duration } = stats;
  const topVehicle  = topEntry(byVehicle);
  const topMovement = topEntry(byMovement);

  const doExport = async (format: 'csv' | 'xlsx' | 'json' | 'pdf') => {
    if (exporting) return;
    setExporting(format);
    try {
      if (format === 'pdf') {
        await exportPdf(session, stats);
      } else {
        await exportSession(session, counts, format);
      }
    } finally {
      setExporting(null);
    }
  };

  const exportBtns: { id: 'csv' | 'xlsx' | 'json' | 'pdf'; label: string }[] = [
    { id: 'csv',  label: 'CSV'   },
    { id: 'xlsx', label: 'Excel' },
    { id: 'json', label: 'JSON'  },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Session header ─────────────────────────────────────────────── */}
        <Text style={styles.location}>{session.location_name}</Text>
        <Text style={styles.meta}>
          {session.started_at.slice(0, 10)} · {session.intersection_type} · {PERIOD_LABELS[session.time_period] ?? session.time_period}
        </Text>

        {/* ── Summary card ───────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{session.total_count}</Text>
              <Text style={styles.statLabel}>Total Vehicles</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{duration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, styles.statValueSm]} numberOfLines={1}>{topVehicle}</Text>
              <Text style={styles.statLabel}>Top Vehicle</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, styles.statValueSm]} numberOfLines={1}>{cap(topMovement)}</Text>
              <Text style={styles.statLabel}>Dominant Move</Text>
            </View>
          </View>
        </View>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <BarChart title="BY VEHICLE TYPE" data={byVehicle}  color={G.blue}   />
        <BarChart title="BY MOVEMENT"     data={byMovement} color={G.purple} />
        <BarChart title="BY APPROACH"     data={byApproach} color={G.green}  />

        {/* ── Export ─────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>EXPORT DATA</Text>

        <View style={styles.exportRow}>
          {exportBtns.map(({ id, label }) => (
            <TouchableOpacity
              key={id}
              testID={`export-${id}-btn`}
              style={styles.exportBtn}
              onPress={() => doExport(id)}
              disabled={!!exporting}
            >
              {exporting === id
                ? <ActivityIndicator color={G.blue} size="small" />
                : <Text style={styles.exportBtnText}>{label}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          testID="export-pdf-btn"
          style={styles.pdfBtn}
          onPress={() => doExport('pdf')}
          disabled={!!exporting}
        >
          {exporting === 'pdf'
            ? <ActivityIndicator color={G.blue} size="small" />
            : (
              <>
                <Text style={styles.pdfBtnText}>↓  Download PDF Report</Text>
                <Text style={styles.pdfBtnSub}>Charts + summary as a shareable PDF</Text>
              </>
            )}
        </TouchableOpacity>

        {/* ── Go to Home ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.homeBtnText}>⌂  Go to Home</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const hdrBtn = StyleSheet.create({
  text: { color: G.blue, fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },
  loading:   { flex: 1, backgroundColor: G.bg, justifyContent: 'center', alignItems: 'center' },
  content:   { padding: 20, gap: 12, paddingBottom: 32 },

  location: { color: G.text, fontSize: 22, fontWeight: '700' },
  meta:     { color: G.textSub, fontSize: 13, marginBottom: 4 },

  // Summary card
  summaryCard: {
    backgroundColor: G.glass1, borderRadius: G.radius,
    borderWidth: 1, borderColor: G.rim1, padding: 14,
  },
  summaryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statCell: {
    flex: 1, minWidth: '40%',
    backgroundColor: G.glass2, borderRadius: G.radiusSm,
    borderWidth: 1, borderColor: G.rim0,
    padding: 14, alignItems: 'center',
  },
  statValue:   { color: G.blue, fontSize: 26, fontWeight: '700' },
  statValueSm: { fontSize: 18 },
  statLabel:   { color: G.textMute, fontSize: 11, marginTop: 3 },

  // Section label (shared with charts)
  sectionLabel: {
    color: G.textMute, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 2,
  },

  // Bar chart card
  chartCard: {
    backgroundColor: G.glass1, borderRadius: G.radius,
    borderWidth: 1, borderColor: G.rim1,
    padding: 16, gap: 10,
  },
  barRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  barLabel: {
    width: 88, color: G.text, fontSize: 13, fontWeight: '500',
  },
  barTrack: {
    flex: 1, height: 22, backgroundColor: G.glass2,
    borderRadius: 6, overflow: 'hidden',
    borderWidth: 1, borderColor: G.rim0,
  },
  barFill: {
    height: '100%', borderRadius: 6,
  },
  barValue: {
    width: 32, color: G.textSub, fontSize: 13,
    fontWeight: '600', textAlign: 'right',
  },

  // Export
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1, padding: 13, alignItems: 'center',
    backgroundColor: G.glass1, borderRadius: G.radiusSm,
    borderWidth: 1, borderColor: G.rim1,
    minHeight: 46, justifyContent: 'center',
  },
  exportBtnText: { color: G.text, fontWeight: '600', fontSize: 14 },

  pdfBtn: {
    padding: 16, alignItems: 'center',
    backgroundColor: G.blueGlass, borderRadius: G.radius,
    borderWidth: 1, borderColor: G.blueRim,
    minHeight: 62, justifyContent: 'center', gap: 3,
  },
  pdfBtnText: { color: G.blue, fontWeight: '700', fontSize: 15 },
  pdfBtnSub:  { color: G.textMute, fontSize: 12 },

  // Go to Home
  homeBtn: {
    marginTop: 8, padding: 16, alignItems: 'center',
    backgroundColor: G.glass1, borderRadius: G.radius,
    borderWidth: 1, borderColor: G.rim1,
  },
  homeBtnText: { color: G.textSub, fontWeight: '600', fontSize: 15 },
});
