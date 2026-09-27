import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppointmentStore } from '../../controllers/useAppointmentStore';

/** Pantalla "Mis citas": proximas, anteriores y su estado. */
export default function MyAppointmentsScreen() {
  const { appointments, loadAppointments, cancel } = useAppointmentStore();

  useEffect(() => {
    // TODO: usar el id del usuario autenticado.
    loadAppointments('current-user');
  }, [loadAppointments]);

  return (
    <FlatList
      data={appointments}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View>
            <Text>{new Date(item.dateTime).toLocaleString()}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
          {item.status === 'pending' && (
            <Pressable onPress={() => cancel(item)}>
              <Text style={styles.cancel}>Cancelar</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  status: { color: '#666', fontSize: 13, marginTop: 2 },
  cancel: { color: '#B3261E', fontWeight: '600' },
});
