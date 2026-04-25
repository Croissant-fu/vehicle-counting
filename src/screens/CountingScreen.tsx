import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { CounterEngine } from '../modules/counter/CounterEngine';
import { endSession, getSession } from '../modules/session/SessionManager';
import VehicleTypePicker from '../components/VehicleTypePicker';
import UndoBar from '../components/UndoBar';
import IntersectionDragMap from '../components/IntersectionDragMap';
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
  const [vehicleType, setVehicleType] = useState<VehicleType>('moto');
  const [total, setTotal] = useState(session.total_count);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDrag = async (from: string, movement: Movement) => {
    await engineRef.current.record({ from_direction: from, movement, vehicle_type: vehicleType });
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.locationName} numberOfLines={1}>{session.location_name}</Text>
        <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
        <TouchableOpacity testID="end-session-btn" style={styles.endBtn} onPress={handleEndSession}>
          <Text style={styles.endBtnText}>■</Text>
        </TouchableOpacity>
      </View>

      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.tabletSidebar}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>VEHICLE TYPE</Text>
              <VehicleTypePicker selected={vehicleType} onSelect={setVehicleType} />
            </View>
          </View>
          <View style={styles.tabletMain}>
            <IntersectionDragMap legs={session.custom_legs} onDrag={handleDrag} />
            <UndoBar total={total} onUndo={handleUndo} />
          </View>
        </View>
      ) : (
        <View style={styles.phoneLayout}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VEHICLE TYPE</Text>
            <VehicleTypePicker selected={vehicleType} onSelect={setVehicleType} />
          </View>
          <IntersectionDragMap legs={session.custom_legs} onDrag={handleDrag} />
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
  tabletMain: { flex: 1, padding: 16, gap: 12 },
  section: { gap: 6 },
  sectionLabel: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
});
