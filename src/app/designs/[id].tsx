import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Icon } from '../../components/atoms/Icon';
import { LikeButton } from '../../components/molecules/LikeButton';
import { DesignComments } from '../../components/organisms/DesignComments';
import { designRepository, type ArtistFeedItem } from '../../core/services';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useDesignSocialStore } from '../../controllers/useDesignSocialStore';
import type { DesignComment } from '../../models/designSocial';
import { flatToneColor, fonts, type as typo, useResponsive, useTheme } from '../../theme';

/**
 * Detalle de un diseno publicado: la foto grande, el tatuador, el me
 * gusta, los comentarios y "Agendar este diseño".
 *
 * En telefono va todo apilado y "Agendar" queda fijo abajo, siempre a
 * mano. En tableta y web la foto y el panel van lado a lado, y el boton
 * vive dentro del panel (una barra fija en una pantalla ancha flota
 * lejos de todo lo demas).
 */
export default function DesignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const layout = useResponsive();
  const userId = useAuthStore((s) => s.user?.id);

  const [item, setItem] = useState<ArtistFeedItem | null | undefined>(undefined);
  const summary = useDesignSocialStore((s) => s.summaries[id]);
  const comments = useDesignSocialStore((s) => s.comments[id]) ?? [];
  const { isLoadingComments, isPosting, error, loadSummaries, loadComments, toggleLike, addComment, deleteComment } =
    useDesignSocialStore();

  const styles = createStyles(colors);

  useEffect(() => {
    designRepository
      .getArtistDesign(id)
      .then((found) => setItem(found ?? null))
      .catch(() => setItem(null));
    loadSummaries([id], userId);
    loadComments(id);
  }, [id, userId, loadSummaries, loadComments]);

  const isOwner = Boolean(item && userId && item.design.artistId === userId);
  const canDelete = (comment: DesignComment) => comment.userId === userId || isOwner;
  const book = () => item && router.push(`/appointment/${item.design.artistId}?designId=${item.design.id}`);

  const back = (
    <Pressable
      onPress={() => router.back()}
      style={[styles.backButton, { top: insets.top + 8, left: layout.gutter - 4 }]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Volver"
    >
      <Text style={[typo.title, { color: '#FFFFFF', marginTop: -2 }]}>‹</Text>
    </Pressable>
  );

  if (item === undefined) {
    return <View style={[styles.fill, { backgroundColor: colors.background }]}>{back}</View>;
  }

  if (item === null) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background, padding: layout.gutter }]}>
        <Icon name="image" size={40} color={colors.textMuted} />
        <Text style={[typo.sectionTitle, { color: colors.textStrong, textAlign: 'center' }]}>
          Este diseño ya no está publicado
        </Text>
        <Text style={[typo.body, { color: colors.textMuted, textAlign: 'center' }]}>
          Puede que el tatuador lo haya quitado de su portafolio.
        </Text>
        <AppButton label="Volver" variant="secondary" size="M" onPress={() => router.back()} />
      </View>
    );
  }

  const { design, artistName } = item;
  const likes = summary ?? { likeCount: 0, commentCount: 0, likedByMe: false };

  const info = (
    <View style={styles.info}>
      {design.style && (
        <Text style={[styles.styleLabel, { color: flatToneColor(scheme, 'blue') }]}>{design.style}</Text>
      )}
      <Text style={styles.title}>{design.title}</Text>
      <Pressable
        onPress={() => router.push(`/artists/${design.artistId}`)}
        style={({ pressed }) => [styles.artistRow, pressed && { opacity: 0.7 }]}
        accessibilityRole="link"
        accessibilityLabel={`Ver el perfil de ${artistName}`}
      >
        <View style={[styles.artistAvatar, { borderColor: flatToneColor(scheme, 'fuchsia') }]}>
          <Text style={[styles.artistInitial, { color: flatToneColor(scheme, 'fuchsia') }]}>{artistName.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>{artistName}</Text>
          <Text style={[typo.caption, { color: colors.textMuted }]}>Ver perfil y portafolio</Text>
        </View>
        <Text style={[typo.title, { color: colors.textMuted }]}>›</Text>
      </Pressable>
      {design.description && <Text style={[typo.body, styles.description]}>{design.description}</Text>}

      <View style={styles.actions}>
        <LikeButton
          liked={likes.likedByMe}
          count={likes.likeCount}
          disabled={!userId}
          onPress={() => userId && toggleLike(design.id, userId)}
        />
        {!isOwner && layout.splitDetail && (
          <View style={{ flex: 1 }}>
            <AppButton label="Agendar este diseño" onPress={book} />
          </View>
        )}
      </View>
      {isOwner && (
        <Text style={[typo.caption, { color: colors.textMuted }]}>
          Es tu diseño: puedes borrar los comentarios que no quieras debajo de tu trabajo.
        </Text>
      )}
    </View>
  );

  const commentsBlock = (
    <DesignComments
      comments={comments}
      isLoading={isLoadingComments}
      isPosting={isPosting}
      error={error}
      canComment={Boolean(userId)}
      canDelete={canDelete}
      onSubmit={(body) => (userId ? addComment(design.id, userId, body) : Promise.resolve(false))}
      onDelete={deleteComment}
    />
  );

  if (layout.splitDetail) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.split,
            { maxWidth: layout.contentMaxWidth, paddingHorizontal: layout.gutter, paddingTop: insets.top + 64 },
          ]}
        >
          <View style={styles.splitMedia}>
            <Image source={{ uri: design.imageUrl }} style={styles.splitImage} resizeMode="cover" accessibilityLabel={design.title} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 28, paddingBottom: insets.bottom + 32 }}>
            {info}
            {commentsBlock}
          </ScrollView>
        </View>
        {back}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Image
          source={{ uri: design.imageUrl }}
          style={[styles.heroImage, { height: Math.min(layout.width * 1.15, layout.height * 0.62) }]}
          resizeMode="cover"
          accessibilityLabel={design.title}
        />
        {/* El panel se monta un poco sobre la foto: capa, no corte seco. */}
        <View style={[styles.sheet, { paddingHorizontal: layout.gutter }]}>
          {info}
          {commentsBlock}
        </View>
      </ScrollView>
      {back}
      {!isOwner && (
        <View style={[styles.bookBar, { paddingBottom: insets.bottom + 12, paddingHorizontal: layout.gutter }]}>
          <AppButton label="Agendar este diseño" onPress={book} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    fill: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
    backButton: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(14,12,16,0.5)',
    },
    heroImage: { width: '100%', backgroundColor: colors.surfaceRaised },
    sheet: {
      marginTop: -28,
      paddingTop: 24,
      gap: 28,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.background,
    },
    split: { flex: 1, width: '100%', alignSelf: 'center', flexDirection: 'row', gap: 40 },
    splitMedia: { flex: 1.15, paddingBottom: 32 },
    splitImage: { width: '100%', aspectRatio: 4 / 5, borderRadius: 28, backgroundColor: colors.surfaceRaised },
    info: { gap: 14 },
    styleLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
    title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.5, color: colors.textStrong, marginTop: -6 },
    description: { color: colors.text, maxWidth: 560 },
    artistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    artistAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    artistInitial: { fontFamily: fonts.logo, fontSize: 26, lineHeight: 34 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bookBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 12,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
}
