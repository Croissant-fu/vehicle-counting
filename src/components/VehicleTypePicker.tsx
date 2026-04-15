import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VehicleType } from '../types';

const VEHICLES: { key: VehicleType; label: string }[] = [
  { key: 'moto', label: 'Moto' },
  { key: 'car', label: 'Car' },
  { key: 'rickshaw', label: 'Rickshaw' },
  { key: 'other', label: 'Other' },
];

interface Props {
  selected: VehicleType;
  onSelect: (type: VehicleType) => void;
}

export default function VehicleTypePicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {VEHICLES.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          testID={`vehicle-${key}`}
          style={[styles.pill, selected === key && styles.selected]}
          onPress={() => onSelect(key)}
        >
          <Text style={[styles.label, selected === key && styles.selectedLabel]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pill: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 20, backgroundColor: '#1e2a3a',
  },
  selected: { backgroundColor: '#4f8ef7' },
  label: { color: '#888', fontSize: 12, fontWeight: '600' },
  selectedLabel: { color: '#fff' },
});
