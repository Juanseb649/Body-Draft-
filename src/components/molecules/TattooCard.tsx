import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayImageUrl, isArtistTemplate, type TattooDesign } from '../../models/tattooDesign';

/**
 * Molecula: tarjeta de diseno usada en "Crear diseno", "Mis disenos" y
 * en el catalogo de plantillas de un tatuador.
 */
export function TattooCard({ design, onPress }: { design: TattooDesign; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: displayImageUrl(design) }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {design.title}
        </Text>
        {isArtistTemplate(design) && <Text style={styles.badge}>Plantilla de tatuador</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3EDF7',
  },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#E0E0E0' },
  body: { padding: 8 },
  title: { fontWeight: '600', fontSize: 14 },
  badge: { fontSize: 11, color: '#6750A4', marginTop: 2 },
});
