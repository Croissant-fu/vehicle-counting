import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { G } from '../theme';

interface Props {
  total: number;
  onUndo: () => void;
}

export default function UndoBar({ total, onUndo }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity testID="undo-btn" style={styles.undoBtn} onPress={onUndo}>
        <Text style={styles.undoLabel}>↩ Undo</Text>
      </TouchableOpacity>
      <Text style={styles.total}>{total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12,
    backgroundColor: G.glass1, borderRadius: G.radius,
    borderWidth: 1, borderColor: G.rim1,
  },
  undoBtn: {
    paddingVertical: 9, paddingHorizontal: 16,
    backgroundColor: G.redGlass, borderRadius: G.radiusSm,
    borderWidth: 1, borderColor: G.redRim,
  },
  undoLabel: { color: G.red, fontWeight: '600', fontSize: 14 },
  total: { color: G.text, fontSize: 38, fontWeight: '700' },
});
