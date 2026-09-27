import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Artist } from '../../models/artist';

/** Molecula: fila de tatuador en la pantalla "Tatuadores". */
export function ArtistCard({ artist, onPress }: { artist: Artist; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLabel}>{artist.name.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{artist.name}</Text>
        <Text style={styles.specialty}>{artist.specialty}</Text>
      </View>
      {artist.rating != null && <Text style={styles.rating}>★ {artist.rating}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8DEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontWeight: '700', color: '#6750A4' },
  info: { flex: 1 },
  name: { fontWeight: '600', fontSize: 15 },
  specialty: { color: '#666', fontSize: 13 },
  rating: { color: '#B08600', fontWeight: '600' },
});
