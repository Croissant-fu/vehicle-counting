import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createSession } from '../modules/session/SessionManager';
import { requestAndGetLocation } from '../modules/location/LocationService';
import { IntersectionType, TimePeriod } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SessionSetup'>;

const INTERSECTION_TYPES: { key: IntersectionType; label: string }[] = [
  { key: '4way', label: '4-Way Crossroad' },
  { key: 'tee', label: 'T-Intersection' },
  { key: 'midblock', label: 'Mid-Block' },
  { key: 'roundabout', label: 'Roundabout / Custom' },
];

const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
  { key: 'am_peak', label: 'AM Peak' },
  { key: 'pm_peak', label: 'PM Peak' },
  { key: 'off_peak', label: 'Off-Peak' },
];

export default function SessionSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [locationName, setLocationName] = useState('');
  const [intersectionType, setIntersectionType] = useState<IntersectionType>('4way');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('am_peak');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customLegs, setCustomLegs] = useState<string[]>(['', '', '']);

  useEffect(() => {
    requestAndGetLocation().then(setCoords);
  }, []);

  const isCustom = intersectionType === 'roundabout' || intersectionType === 'custom';
  const validLegs = isCustom ? customLegs.filter((l) => l.trim().length > 0) : [];
  const isValid = locationName.trim().length > 0 && (!isCustom || validLegs.length >= 3);

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
          placeholderTextColor="#555"
          value={locationName}
          onChangeText={setLocationName}
        />

        <Text style={styles.label}>INTERSECTION TYPE</Text>
        <View style={styles.row}>
          {INTERSECTION_TYPES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, intersectionType === key && styles.chipSelected]}
              onPress={() => setIntersectionType(key)}
            >
              <Text style={[styles.chipText, intersectionType === key && styles.chipTextSelected]}>{label}</Text>
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
                placeholderTextColor="#555"
                value={leg}
                onChangeText={(val) => {
                  const updated = [...customLegs];
                  updated[i] = val;
                  if (i === customLegs.length - 1 && val && customLegs.length < 6) {
                    updated.push('');
                  }
                  setCustomLegs(updated);
                }}
              />
            ))}
          </>
        )}

        <Text style={styles.label}>TIME PERIOD</Text>
        <View style={styles.row}>
          {TIME_PERIODS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, timePeriod === key && styles.chipSelected]}
              onPress={() => setTimePeriod(key)}
            >
              <Text style={[styles.chipText, timePeriod === key && styles.chipTextSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>GPS</Text>
        <Text style={styles.gpsText}>
          {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Fetching location...'}
        </Text>

        <TouchableOpacity
          testID="start-counting-btn"
          style={[styles.startBtn, !isValid && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!isValid}
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.startBtnText}>Start Counting →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  content: { padding: 20, gap: 8 },
  label: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: 16, marginBottom: 4 },
  input: {
    backgroundColor: '#1e2a3a', color: '#fff', padding: 12,
    borderRadius: 8, fontSize: 14, marginBottom: 4,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: '#1e2a3a', borderRadius: 20,
  },
  chipSelected: { backgroundColor: '#4f8ef7' },
  chipText: { color: '#888', fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  gpsText: { color: '#4f8ef7', fontSize: 13, padding: 10, backgroundColor: '#1e2a3a', borderRadius: 8 },
  startBtn: {
    marginTop: 32, padding: 18, backgroundColor: '#4f8ef7',
    borderRadius: 12, alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: '#2a2a4a' },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
