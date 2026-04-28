import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { CounterEngine } from '../modules/counter/CounterEngine';
import { endSession, getSession } from '../modules/session/SessionManager';
import {
  getVehicleTypes, addVehicleType, deleteVehicleType,
} from '../modules/vehicleType/VehicleTypeManager';
import UndoBar from '../components/UndoBar';
import IntersectionDragMap from '../components/IntersectionDragMap';
import ManageVehicleTypesModal from '../components/ManageVehicleTypesModal';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Session, Movement } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { G } from '../theme';

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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const engineRef = useRef(new CounterEngine(session));
  const [total, setTotal] = useState(session.total_count);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(['Moto', 'Car', 'Rickshaw', 'Other']);
  const [manageVisible, setManageVisible] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [paused]);

  const loadVehicleTypes = useCallback(async () => {
    const types = await getVehicleTypes();
    if (types.length > 0) setVehicleTypes(types);
  }, []);

  useEffect(() => { loadVehicleTypes(); }, [loadVehicleTypes]);

  const handleDrag = async (from: string, movement: Movement, vehicleType: string) => {
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

  const handleAddType = async (name: string) => {
    await addVehicleType(name);
    await loadVehicleTypes();
  };

  const handleDeleteType = async (name: string) => {
    await deleteVehicleType(name);
    await loadVehicleTypes();
  };

  const map = (
    <IntersectionDragMap
      legs={session.custom_legs}
      vehicleTypes={vehicleTypes}
      onDrag={handleDrag}
      paused={paused}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <BlurView intensity={G.blurIntensity} tint="dark" style={styles.header}>
        <Text style={styles.locationName} numberOfLines={1}>{session.location_name}</Text>
        <Text style={[styles.timer, paused && styles.timerPaused]}>{formatElapsed(elapsed)}</Text>
        <TouchableOpacity style={styles.pauseBtn} onPress={() => setPaused((p) => !p)}>
          <Text style={styles.pauseBtnText}>{paused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.manageBtn} onPress={() => setManageVisible(true)}>
          <Text style={styles.manageBtnText}>⚙</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="end-session-btn" style={styles.endBtn} onPress={handleEndSession}>
          <Text style={styles.endBtnText}>■</Text>
        </TouchableOpacity>
      </BlurView>

      {isLandscape || isTablet ? (
        <View style={styles.landscapeLayout}>
          <View style={styles.landscapeMap}>{map}</View>
          <View style={styles.landscapeSide}>
            <UndoBar total={total} onUndo={handleUndo} />
          </View>
        </View>
      ) : (
        <View style={styles.phoneLayout}>
          {map}
          <UndoBar total={total} onUndo={handleUndo} />
        </View>
      )}

      <ManageVehicleTypesModal
        visible={manageVisible}
        vehicleTypes={vehicleTypes}
        onAdd={handleAddType}
        onDelete={handleDeleteType}
        onClose={() => setManageVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: G.rim1,
  },
  locationName: { flex: 1, color: G.blue, fontWeight: '700', fontSize: 14 },
  timer: { color: G.textSub, fontSize: 13, marginHorizontal: 8, fontVariant: ['tabular-nums'] },
  timerPaused: { color: G.orange },

  pauseBtn: {
    padding: 7, marginRight: 6,
    backgroundColor: G.glass2, borderRadius: G.radiusXs,
    borderWidth: 1, borderColor: G.rim1,
  },
  pauseBtnText: { color: G.blue, fontSize: 15 },

  manageBtn: {
    padding: 7, marginRight: 6,
    backgroundColor: G.glass2, borderRadius: G.radiusXs,
    borderWidth: 1, borderColor: G.rim1,
  },
  manageBtnText: { color: G.textSub, fontSize: 15 },

  endBtn: {
    padding: 7,
    backgroundColor: G.redGlass, borderRadius: G.radiusXs,
    borderWidth: 1, borderColor: G.redRim,
  },
  endBtnText: { color: G.red, fontSize: 15 },

  phoneLayout: { flex: 1, padding: 16, gap: 12 },

  landscapeLayout: { flex: 1, flexDirection: 'row' },
  landscapeMap: { flex: 1, padding: 12 },
  landscapeSide: {
    width: 160, padding: 12, justifyContent: 'flex-end',
    borderLeftWidth: 1, borderLeftColor: G.rim1,
  },
});
