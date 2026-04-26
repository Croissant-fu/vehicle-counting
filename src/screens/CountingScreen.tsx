import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
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
  const [total, setTotal] = useState(session.total_count);
  const [elapsed, setElapsed] = useState(0);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(['Moto', 'Car', 'Rickshaw', 'Other']);
  const [manageVisible, setManageVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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
    <>
      <IntersectionDragMap
        legs={session.custom_legs}
        vehicleTypes={vehicleTypes}
        onDrag={handleDrag}
      />
      <UndoBar total={total} onUndo={handleUndo} />
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.locationName} numberOfLines={1}>{session.location_name}</Text>
        <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
        <TouchableOpacity style={styles.manageBtn} onPress={() => setManageVisible(true)}>
          <Text style={styles.manageBtnText}>⚙</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="end-session-btn" style={styles.endBtn} onPress={handleEndSession}>
          <Text style={styles.endBtnText}>■</Text>
        </TouchableOpacity>
      </View>

      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.tabletMain}>{map}</View>
        </View>
      ) : (
        <View style={styles.phoneLayout}>{map}</View>
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
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
  },
  locationName: { flex: 1, color: '#4f8ef7', fontWeight: 'bold', fontSize: 14 },
  timer: { color: '#888', fontSize: 13, marginHorizontal: 8 },
  manageBtn: { padding: 6, marginRight: 6, backgroundColor: '#1e2a3a', borderRadius: 6 },
  manageBtnText: { color: '#aaa', fontSize: 16 },
  endBtn: { padding: 6, backgroundColor: '#3a1a1a', borderRadius: 6 },
  endBtnText: { color: '#f44336', fontSize: 16 },
  phoneLayout: { flex: 1, padding: 16, gap: 12 },
  tabletLayout: { flex: 1 },
  tabletMain: { flex: 1, padding: 16, gap: 12 },
});
