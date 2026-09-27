import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '../../components/atoms/AppButton';
import { TattooCard } from '../../components/molecules/TattooCard';
import { useDesignStore } from '../../controllers/useDesignStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import type { TattooDesign } from '../../models/tattooDesign';

/**
 * Pantalla "Crear diseno": subir imagen, describir a la IA, o elegir
 * un diseno ya existente / una plantilla publicada por un tatuador.
 */
export default function CreateDesignScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const { designs, isLoading, loadDesigns, generateWithAI, uploadDesign } = useDesignStore();
  const selectDesign = useEditorStore((s) => s.selectDesign);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const openInEditor = (design: TattooDesign) => {
    selectDesign(design.id);
    router.push('/editor');
  };

  const handleGenerate = async () => {
    const design = await generateWithAI(prompt);
    if (design) openInEditor(design);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;

    const design: TattooDesign = {
      id: Crypto.randomUUID(),
      ownerId: 'current-user',
      title: 'Diseno propio',
      imageUrl: result.assets[0].uri,
      source: 'userUpload',
      createdAt: new Date().toISOString(),
    };
    await uploadDesign(design);
    openInEditor(design);
  };

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={designs}
      keyExtractor={(d) => d.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={
        <View style={styles.header}>
          <TextInput
            style={styles.input}
            placeholder="Serpiente con flores, estilo japones, tinta negra"
            value={prompt}
            onChangeText={setPrompt}
            multiline
          />
          <AppButton label="Generar con IA" isLoading={isLoading} onPress={handleGenerate} />
          <AppButton label="Subir imagen propia" onPress={pickFromGallery} />
          <Text style={styles.sectionTitle}>Disenos y plantillas disponibles</Text>
        </View>
      }
      renderItem={({ item }) => <TattooCard design={item} onPress={() => openInEditor(item)} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  header: { gap: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#CAC4D0',
    borderRadius: 8,
    padding: 12,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  row: { gap: 12 },
});
