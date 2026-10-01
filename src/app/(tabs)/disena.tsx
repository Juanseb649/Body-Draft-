import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Chip } from '../../components/atoms/Chip';
import { SectionHeader } from '../../components/molecules/SectionHeader';
import { TattooCard } from '../../components/molecules/TattooCard';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useDesignStore } from '../../controllers/useDesignStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import type { TattooDesign } from '../../models/tattooDesign';
import { type as typo, useTheme } from '../../theme';

const STYLES = ['Línea fina', 'Tradicional', 'Japonés', 'Blackwork', 'Acuarela'];

/** Pestana "Diseña": describir a la IA, subir imagen, o elegir una plantilla. */
export default function DesignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ownerId = useAuthStore((s) => s.user?.id) ?? 'current-user';
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string | null>('Japonés');
  const { designs, isLoading, error, loadDesigns, generateWithAI, uploadDesign } = useDesignStore();
  const selectDesign = useEditorStore((s) => s.selectDesign);

  const styles = createStyles(colors);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const openInEditor = (design: TattooDesign) => {
    selectDesign(design.id);
    router.push('/editor');
  };

  const handleGenerate = async () => {
    const design = await generateWithAI(prompt, style ?? undefined);
    if (design) openInEditor(design);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;

    const design: TattooDesign = {
      id: Crypto.randomUUID(),
      ownerId,
      title: 'Diseño propio',
      imageUrl: result.assets[0].uri,
      source: 'userUpload',
      createdAt: new Date().toISOString(),
    };
    await uploadDesign(design);
    openInEditor(design);
  };

  const templates = designs.filter((d) => d.source === 'artistTemplate');

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      data={templates}
      keyExtractor={(d) => d.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={
        <View style={styles.header}>
          <SectionHeader section="disena" />

          <Text style={[typo.label, { color: colors.textMuted }]}>Describe tu idea</Text>
          <TextInput
            style={styles.input}
            placeholder="Serpiente con flores, estilo japonés, tinta negra"
            value={prompt}
            onChangeText={setPrompt}
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.primary}
            multiline
          />

          <View style={styles.chipRow}>
            {STYLES.map((s) => (
              <Chip key={s} label={s} selected={style === s} onPress={() => setStyle(s)} tone="blue" />
            ))}
          </View>

          {error && <Text style={[typo.caption, { color: colors.danger }]}>{error}</Text>}
          <AppButton label="✦  Generar con IA" isLoading={isLoading} onPress={handleGenerate} />
          <View style={{ height: 12 }} />
          <AppButton label="Subir imagen propia" variant="secondary" onPress={pickFromGallery} />

          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Text style={[typo.sectionTitle, { color: colors.textStrong }]}>Plantillas de artistas</Text>
            <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Ver más</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => <TattooCard design={item} onPress={() => openInEditor(item)} />}
    />
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    content: { paddingHorizontal: 20, paddingBottom: 32 },
    header: { gap: 12, marginBottom: 12 },
    input: {
      ...typo.body,
      color: colors.text,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 18,
      padding: 14,
      minHeight: 88,
      textAlignVertical: 'top',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    row: { gap: 12 },
  });
}
