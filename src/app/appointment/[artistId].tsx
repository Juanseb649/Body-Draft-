import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/atoms/AppButton';
import { useAppointmentStore } from '../../controllers/useAppointmentStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { BODY_ZONE_LABELS } from '../../models/bodyZone';

/**
 * Pantalla "Agendar cita": elige fecha/hora para el tatuador
 * seleccionado, usando la propuesta guardada en useEditorStore.
 */
export default function AppointmentScreen() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const proposal = useEditorStore((s) => s);
  const book = useAppointmentStore((s) => s.book);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showPicker, setShowPicker] = useState(false);

  const handleConfirm = async () => {
    if (!date) return;
    await book({
      userId: proposal.userId,
      artistId,
      dateTime: date.toISOString(),
      proposalId: proposal.id,
    });
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text>Diseno: {proposal.designId}</Text>
      <Text>Zona: {BODY_ZONE_LABELS[proposal.bodyZone]}</Text>

      <AppButton
        label={date ? date.toLocaleString() : 'Elegir fecha y hora'}
        onPress={() => setShowPicker(true)}
      />

      {showPicker && (
        <DateTimePicker
          value={date ?? new Date()}
          mode="datetime"
          minimumDate={new Date()}
          onChange={(_event, selected) => {
            setShowPicker(false);
            if (selected) setDate(selected);
          }}
        />
      )}

      <View style={styles.spacer} />
      <AppButton label="Confirmar cita" onPress={handleConfirm} disabled={!date} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  spacer: { flex: 1 },
});
