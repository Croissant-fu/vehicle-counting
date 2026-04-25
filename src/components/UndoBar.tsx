import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  undoBtn: {
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: '#3a1a1a', borderRadius: 8,
  },
  undoLabel: { color: '#f44336', fontWeight: '600', fontSize: 14 },
  total: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
});
