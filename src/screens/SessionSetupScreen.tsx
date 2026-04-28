import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createSession } from '../modules/session/SessionManager';
import { requestAndGetLocation } from '../modules/location/LocationService';
import {
  getVehicleTypes, addVehicleType, deleteVehicleType,
} from '../modules/vehicleType/VehicleTypeManager';
import { IntersectionType, TimePeriod } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { G } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SessionSetup'>;

const INTERSECTION_TYPES: { key: IntersectionType; label: string }[] = [
  { key: '4way',       label: '4-Way Crossroad' },
  { key: 'tee',        label: 'T-Intersection' },
  { key: 'midblock',   label: 'Mid-Block' },
  { key: 'roundabout', label: 'Roundabout / Custom' },
];

const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
  { key: 'am_peak',  label: 'AM Peak' },
  { key: 'pm_peak',  label: 'PM Peak' },
  { key: 'off_peak', label: 'Off-Peak' },
];

export default function SessionSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [locationName, setLocationName] = useState('');
  const [intersectionType, setIntersectionType] = useState<IntersectionType>('4way');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('am_peak');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customLegs, setCustomLegs] = useState<string[]>(['', '', '']);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [draftType, setDraftType] = useState('');

  useEffect(() => {
    requestAndGetLocation().then(setCoords);
    getVehicleTypes().then((types) => { if (types.length > 0) setVehicleTypes(types); });
  }, []);

  const isCustom = intersectionType === 'roundabout' || intersectionType === 'custom';
  const validLegs = isCustom ? customLegs.filter((l) => l.trim().length > 0) : [];
  const isValid = locationName.trim().length > 0 && (!isCustom || validLegs.length >= 3);

  const handleAddType = async () => {
    const name = draftType.trim();
    if (!name || vehicleTypes.includes(name)) return;
    await addVehicleType(name);
    setVehicleTypes(await getVehicleTypes());
    setDraftType('');
  };

  const handleDeleteType = async (name: string) => {
    if (vehicleTypes.length <= 1) {
      Alert.alert('Cannot delete', 'At least one vehicle type is required.');
      return;
    }
    await deleteVehicleType(name);
    setVehicleTypes(await getVehicleTypes());
  };

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
          placeholderTextColor={G.textMute}
          value={locationName}
          onChangeText={setLocationName}
        />

        <Text style={styles.label}>INTERSECTION TYPE</Text>
        <View style={styles.chipRow}>
          {INTERSECTION_TYPES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, intersectionType === key && styles.chipSelected]}
              onPress={() => setIntersectionType(key)}
            >
              <Text style={[styles.chipText, intersectionType === key && styles.chipTextSelected]}>
                {label}
              </Text>
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
                placeholderTextColor={G.textMute}
                value={leg}
                onChangeText={(val) => {
                  const updated = [...customLegs];
                  updated[i] = val;
                  if (i === customLegs.length - 1 && val && customLegs.length < 6) updated.push('');
                  setCustomLegs(updated);
                }}
              />
            ))}
          </>
        )}

        <Text style={styles.label}>TIME PERIOD</Text>
        <View style={styles.chipRow}>
          {TIME_PERIODS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, timePeriod === key && styles.chipSelected]}
              onPress={() => setTimePeriod(key)}
            >
              <Text style={[styles.chipText, timePeriod === key && styles.chipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>VEHICLE TYPES</Text>
        <View style={styles.vtList}>
          {vehicleTypes.map((vt, i) => (
            <View key={vt} style={[styles.vtRow, i < vehicleTypes.length - 1 && styles.vtRowBorder]}>
              <Text style={styles.vtName}>{vt}</Text>
              <TouchableOpacity
                style={[styles.vtDeleteBtn, vehicleTypes.length <= 1 && styles.vtDeleteBtnDisabled]}
                onPress={() => handleDeleteType(vt)}
                disabled={vehicleTypes.length <= 1}
              >
                <Text style={styles.vtDeleteBtnText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.vtAddRow}>
          <TextInput
            style={styles.vtInput}
            placeholder="New type…"
            placeholderTextColor={G.textMute}
            value={draftType}
            onChangeText={setDraftType}
            onSubmitEditing={handleAddType}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.vtAddBtn, !draftType.trim() && styles.vtAddBtnDisabled]}
            onPress={handleAddType}
            disabled={!draftType.trim()}
          >
            <Text style={styles.vtAddBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>GPS</Text>
        <View style={styles.gpsBox}>
          <Text style={styles.gpsText}>
            {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Fetching location…'}
          </Text>
        </View>

        <TouchableOpacity
          testID="start-counting-btn"
          style={[styles.startBtn, !isValid && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!isValid}
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={[styles.startBtnText, !isValid && styles.startBtnTextDisabled]}>
            Start Counting →
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },
  content: { padding: 20, gap: 8 },

  label: {
    color: G.textMute, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginTop: 18, marginBottom: 6,
  },

  input: {
    backgroundColor: G.glass1, color: G.text,
    padding: 14, borderRadius: G.radiusSm,
    fontSize: 14, borderWidth: 1, borderColor: G.rim1, marginBottom: 4,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 9, paddingHorizontal: 16,
    backgroundColor: G.glass1, borderRadius: 50,
    borderWidth: 1, borderColor: G.rim1,
  },
  chipSelected: { backgroundColor: G.blueGlass, borderColor: G.blueRim },
  chipText: { color: G.textSub, fontSize: 13 },
  chipTextSelected: { color: G.blue, fontWeight: '600' },

  vtList: {
    backgroundColor: G.glass1, borderRadius: G.radiusSm,
    borderWidth: 1, borderColor: G.rim1, overflow: 'hidden',
  },
  vtRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  vtRowBorder: { borderBottomWidth: 1, borderBottomColor: G.rim0 },
  vtName: { flex: 1, color: G.text, fontSize: 14 },
  vtDeleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: G.redGlass, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: G.redRim,
  },
  vtDeleteBtnDisabled: { backgroundColor: G.glass0, borderColor: G.rim0 },
  vtDeleteBtnText: { color: G.red, fontSize: 18, lineHeight: 20 },

  vtAddRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  vtInput: {
    flex: 1, backgroundColor: G.glass1, color: G.text,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: G.radiusSm, fontSize: 14,
    borderWidth: 1, borderColor: G.rim1,
  },
  vtAddBtn: {
    paddingHorizontal: 18, paddingVertical: 11,
    backgroundColor: G.blueGlass, borderRadius: G.radiusSm,
    borderWidth: 1, borderColor: G.blueRim, justifyContent: 'center',
  },
  vtAddBtnDisabled: { backgroundColor: G.glass0, borderColor: G.rim0 },
  vtAddBtnText: { color: G.blue, fontWeight: '700', fontSize: 14 },

  gpsBox: {
    backgroundColor: G.glass1, borderRadius: G.radiusSm,
    borderWidth: 1, borderColor: G.rim1, padding: 12,
  },
  gpsText: { color: G.blue, fontSize: 13 },

  startBtn: {
    marginTop: 36, padding: 18,
    backgroundColor: G.blueGlass, borderRadius: G.radius,
    borderWidth: 1, borderColor: G.blueRim, alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: G.glass0, borderColor: G.rim0 },
  startBtnText: { color: G.blue, fontWeight: '700', fontSize: 16 },
  startBtnTextDisabled: { color: G.textMute },
});
