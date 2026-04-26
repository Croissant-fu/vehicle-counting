import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';

interface Props {
  visible: boolean;
  vehicleTypes: string[];
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}

export default function ManageVehicleTypesModal({
  visible, vehicleTypes, onAdd, onDelete, onClose,
}: Props) {
  const [draft, setDraft] = useState('');

  function handleAdd() {
    const name = draft.trim();
    if (!name || vehicleTypes.includes(name)) return;
    onAdd(name);
    setDraft('');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Vehicle Types</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={vehicleTypes}
            keyExtractor={(item) => item}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.typeName}>{item}</Text>
                <TouchableOpacity
                  style={[styles.deleteBtn, vehicleTypes.length <= 1 && styles.deleteBtnDisabled]}
                  onPress={() => vehicleTypes.length > 1 && onDelete(item)}
                  disabled={vehicleTypes.length <= 1}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="New type name…"
              placeholderTextColor="#555"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addBtn, !draft.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!draft.trim()}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#141d27',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2a3a',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  doneBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  doneBtnText: { color: '#4f8ef7', fontWeight: '600', fontSize: 14 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typeName: { flex: 1, color: '#fff', fontSize: 15 },
  separator: { height: 1, backgroundColor: '#1e2a3a', marginLeft: 16 },
  deleteBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: '#3a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnDisabled: { backgroundColor: '#1e2a3a' },
  deleteBtnText: { color: '#f44336', fontSize: 18, lineHeight: 20 },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e2a3a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  addBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#4f8ef7',
    borderRadius: 8,
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: '#2a3a5a' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
