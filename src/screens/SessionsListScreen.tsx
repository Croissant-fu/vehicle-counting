import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
