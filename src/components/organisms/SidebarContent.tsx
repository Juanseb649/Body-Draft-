import { usePathname, useRouter } from 'expo-router';
import { DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionIcon } from '../atoms/SectionIcon';
import { Segmented } from '../atoms/Segmented';
import { SECTIONS, type SectionKey } from '../atoms/sectionIcons';
import { BodyDraftLogo } from '../molecules/BodyDraftLogo';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useSettingsStore } from '../../controllers/useSettingsStore';
import { type as typo, useTheme } from '../../theme';

type Entry = { section: SectionKey; href: string };

/** Entradas del menu, agrupadas como en la guia ("CREAR" / "TATUAR"). */
const GROUPS: { title: string; entries: Entry[] }[] = [
  {
    title: 'Crear',
    entries: [
      { section: 'inicio', href: '/' },
      { section: 'disena', href: '/disena' },
      { section: 'crea', href: '/editor' },
      { section: 'explora', href: '/model3d' },
    ],
  },
  {
    title: 'Tatuar',
    entries: [
      { section: 'artistas', href: '/artists' },
      { section: 'agenda', href: '/agenda' },
    ],
  },
];

const SETTINGS_ENTRY: Entry = { section: 'ajustes', href: '/ajustes' };

/**
 * Contenido del menu lateral (guia de diseno, lamina del sidebar): logo,
 * perfil, grupos de secciones con su propio logo, Ajustes, interruptor de
 * tema y cerrar sesion.
 */
export function SidebarContent(props: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const role = useSettingsStore((s) => s.account.role);
  const theme = useSettingsStore((s) => s.appearance.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const styles = createStyles(colors);
  const name = (user?.user_metadata?.name as string | undefined) ?? 'Tu nombre';
  const initial = name.charAt(0).toUpperCase();

  // `navigate` y no `push`: el menu salta entre secciones, no apila una
  // copia nueva cada vez que se toca la misma entrada.
  const go = (href: string) => {
    props.navigation.closeDrawer();
    router.navigate(href as Parameters<typeof router.navigate>[0]);
  };

  const renderEntry = ({ section, href }: Entry) => {
    const active = pathname === href;
    return (
      <Pressable
        key={section}
        onPress={() => go(href)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.item, active && { backgroundColor: colors.primaryTint }]}
      >
        <SectionIcon section={section} size={26} />
        <Text style={[typo.bodyStrong, { color: active ? colors.primaryText : colors.text }]}>
          {SECTIONS[section].label}
        </Text>
      </Pressable>
    );
  };

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: colors.surface }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <BodyDraftLogo variant="inline" size={28} />
        <Pressable onPress={() => props.navigation.closeDrawer()} hitSlop={12} accessibilityLabel="Cerrar menú">
          <Text style={[typo.title, { color: colors.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => go(SETTINGS_ENTRY.href)} style={styles.profile} accessibilityRole="button">
        <View style={[styles.avatar, { borderColor: colors.primaryText }]}>
          <Text style={[typo.bodyStrong, { color: colors.primaryText }]}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typo.bodyStrong, { color: colors.textStrong }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[typo.caption, { color: colors.secondary }]}>{role === 'artist' ? 'Tatuador' : 'Cliente'}</Text>
        </View>
        <Text style={{ color: colors.textMuted }}>›</Text>
      </Pressable>

      {GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={[typo.label, { color: colors.textMuted }]}>{group.title}</Text>
          {group.entries.map(renderEntry)}
        </View>
      ))}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      {renderEntry(SETTINGS_ENTRY)}

      <View style={styles.footer}>
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'Sistema' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
          ]}
        />
        <Pressable
          onPress={() => {
            props.navigation.closeDrawer();
            signOut();
          }}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.signOut}
        >
          <Text style={[typo.bodyStrong, { color: colors.danger }]}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 24, gap: 4 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    profile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceRaised,
      marginBottom: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    group: { marginTop: 12, gap: 2 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
    },
    divider: { height: 1, marginVertical: 14 },
    footer: { marginTop: 24, gap: 16 },
    signOut: { paddingVertical: 4 },
  });
}
