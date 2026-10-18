import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COMMENT_MAX_LENGTH, relativeTime, type DesignComment } from '../../models/designSocial';
import { flatToneColor, fonts, type as typo, useTheme } from '../../theme';
import { Icon } from '../atoms/Icon';
import { Spinner } from '../atoms/Spinner';

/**
 * Comentarios publicos de un diseno: la lista y el campo para escribir.
 *
 * Solo pinta: que se pueda borrar lo decide quien la usa (`canDelete`),
 * y la base lo vuelve a comprobar con su RLS.
 */
export function DesignComments({
  comments,
  isLoading,
  isPosting,
  error,
  canComment,
  canDelete,
  onSubmit,
  onDelete,
}: {
  comments: DesignComment[];
  isLoading: boolean;
  isPosting: boolean;
  error?: string;
  canComment: boolean;
  canDelete: (comment: DesignComment) => boolean;
  /** Devuelve si se publico, para limpiar el campo solo en ese caso. */
  onSubmit: (body: string) => Promise<boolean>;
  onDelete: (comment: DesignComment) => void;
}) {
  const { colors, scheme } = useTheme();
  const styles = createStyles(colors);
  const [draft, setDraft] = useState('');
  const remaining = COMMENT_MAX_LENGTH - draft.trim().length;
  const brand = flatToneColor(scheme, 'fuchsia');
  const canSend = canComment && draft.trim().length > 0 && remaining >= 0 && !isPosting;

  const submit = async () => {
    if (!canSend) return;
    if (await onSubmit(draft)) setDraft('');
  };

  return (
    <View style={styles.container}>
      <Text style={[typo.sectionTitle, { color: colors.textStrong }]}>
        Comentarios{comments.length > 0 ? ` · ${comments.length}` : ''}
      </Text>

      {isLoading && comments.length === 0 ? (
        // Esqueleto con la forma de un comentario, no un spinner suelto.
        <View style={{ gap: 14 }} accessibilityLabel="Cargando comentarios">
          {[0.9, 0.6].map((w) => (
            <View key={w} style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised, borderWidth: 0 }]} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={[styles.skeletonLine, { width: '35%' }]} />
                <View style={[styles.skeletonLine, { width: `${w * 100}%` }]} />
              </View>
            </View>
          ))}
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="comment" size={28} color={colors.textMuted} />
          <Text style={[typo.body, { color: colors.textMuted, flex: 1 }]}>
            Nadie comentó todavía. Pregunta por el tamaño, la zona o el color: el tatuador lo lee aquí.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.row}>
              <View style={[styles.avatar, { borderColor: colors.secondary }]}>
                <Text style={[styles.avatarLabel, { color: colors.secondary }]}>
                  {comment.authorName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.meta}>
                  <Text style={[typo.bodyStrong, { color: colors.textStrong, fontSize: 14 }]} numberOfLines={1}>
                    {comment.authorName}
                  </Text>
                  <Text style={[typo.caption, { color: colors.textMuted }]}>{relativeTime(comment.createdAt)}</Text>
                </View>
                <Text style={[typo.body, { color: colors.text }]}>{comment.body}</Text>
              </View>
              {canDelete(comment) && (
                <Pressable
                  onPress={() => onDelete(comment)}
                  hitSlop={10}
                  style={styles.deleteButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Borrar el comentario de ${comment.authorName}`}
                >
                  <Icon name="trash" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {canComment && (
        <View style={[styles.composer, { borderColor: draft ? brand : colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe un comentario"
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={COMMENT_MAX_LENGTH + 50}
            style={styles.input}
            accessibilityLabel="Escribe un comentario"
          />
          <Pressable
            onPress={submit}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: canSend ? brand : colors.surfaceRaised },
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Publicar comentario"
            accessibilityState={{ disabled: !canSend }}
          >
            {isPosting ? <Spinner size={18} color="#FFFFFF" /> : <Icon name="send" size={20} color={canSend ? '#FFFFFF' : colors.textMuted} />}
          </Pressable>
        </View>
      )}
      {canComment && remaining < 60 && (
        <Text style={[typo.caption, { color: remaining < 0 ? colors.danger : colors.textMuted, fontVariant: ['tabular-nums'] }]}>
          {remaining < 0 ? `Sobran ${-remaining} caracteres` : `Quedan ${remaining} caracteres`}
        </Text>
      )}
      {error && <Text style={[typo.caption, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { gap: 16 },
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    // Cuadrado redondeado, no circulo: el avatar de un comentario no
    // se confunde con el del tatuador (que si es redondo).
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLabel: { fontFamily: fonts.bodyBold, fontSize: 15 },
    meta: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    deleteButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    skeletonLine: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceRaised },
    empty: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surfaceSunken,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      padding: 6,
      paddingLeft: 16,
      borderRadius: 26,
      borderWidth: 1.5,
      backgroundColor: colors.surface,
    },
    input: { ...typo.body, flex: 1, color: colors.text, minHeight: 40, maxHeight: 120, paddingVertical: 9 },
    send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  });
}
