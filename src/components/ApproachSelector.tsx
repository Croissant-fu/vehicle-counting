import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CARDINALS = ['N', 'S', 'E', 'W'];

interface Props {
  legs: string[] | null;
  selected: string;
  onSelect: (direction: string) => void;
}

export default function ApproachSelector({ legs, selected, onSelect }: Props) {
  const options = legs ?? CARDINALS;
  return (
    <View style={styles.row}>
      {options.map((leg) => (
        <TouchableOpacity
          key={leg}
          testID={`approach-${leg}`}
          style={[styles.btn, selected === leg && styles.selected]}
          onPress={() => onSelect(leg)}
        >
          <Text style={[styles.label, selected === leg && styles.selectedLabel]}>{leg}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: 8, backgroundColor: '#1e2a3a',
  },
  selected: { backgroundColor: '#4f8ef7' },
  label: { color: '#888', fontWeight: 'bold', fontSize: 16 },
  selectedLabel: { color: '#fff' },
});
