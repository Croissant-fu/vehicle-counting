import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Movement } from '../types';

const BUTTONS: { movement: Movement; label: string; arrow: string }[] = [
  { movement: 'left',     label: 'Left',     arrow: '←' },
  { movement: 'straight', label: 'Straight', arrow: '↑' },
  { movement: 'right',    label: 'Right',    arrow: '→' },
];

interface Props {
  onPress: (movement: Movement) => void;
}

export default function DirectionButtons({ onPress }: Props) {
  return (
    <View style={styles.row}>
      {BUTTONS.map(({ movement, label, arrow }) => (
        <TouchableOpacity
          key={movement}
          testID={`dir-${movement}`}
          style={styles.btn}
          onPress={() => onPress(movement)}
          activeOpacity={0.7}
        >
          <Text style={styles.arrow}>{arrow}</Text>
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 28, alignItems: 'center',
    borderRadius: 12, backgroundColor: '#1e3a5f',
  },
  arrow: { fontSize: 32, color: '#fff' },
  label: { fontSize: 11, color: '#aaa', marginTop: 4 },
});
