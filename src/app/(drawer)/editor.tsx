import Slider from '@react-native-community/slider';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Chip } from '../../components/atoms/Chip';
import { Icon, type IconName } from '../../components/atoms/Icon';
import { MenuButton } from '../../components/atoms/MenuButton';
import { SectionIcon } from '../../components/atoms/SectionIcon';
import { Segmented } from '../../components/atoms/Segmented';
import { Spinner } from '../../components/atoms/Spinner';
import { BodyModelViewer } from '../../components/organisms/BodyModelViewer';
import { CameraOverlay } from '../../components/organisms/CameraOverlay';
import { AiPhotoConsentModal } from '../../components/organisms/AiPhotoConsentModal';
import { CreateIntroModal } from '../../components/organisms/CreateIntroModal';
import { ZoneScanStage } from '../../components/organisms/ZoneScanStage';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useBodyModel } from '../../controllers/useBodyModel';
import { useCameraController } from '../../controllers/useCameraController';
import { useDataUri } from '../../controllers/useDataUri';
import { useDesignStore } from '../../controllers/useDesignStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { useSettingsStore } from '../../controllers/useSettingsStore';
import { useZoneScanStore, type ScanTool } from '../../controllers/useZoneScanStore';
import {
  BODY_SILHOUETTES,
  BODY_ZONES,
  BODY_ZONE_LABELS,
  bodyZoneLabel,
  type BodySilhouette,
  type BodyZone,
} from '../../models/bodyZone';
import { displayImageUrl, type TattooDesign } from '../../models/tattooDesign';
import { AXIS_RANGE, CURVATURE_RANGE, WIDTH_SCALE_RANGE, type InkMode } from '../../models/skinWrap';
import { scanFrameFor, type Size } from '../../models/zoneScan';
import { saveDataUriToDocuments } from '../../services/imageFileCache';
import { type as typo, useTheme } from '../../theme';

type Mode = 'camera' | 'mannequin';

const SILHOUETTE_LABEL: Record<BodySilhouette, string> = {
  masculine: 'Masculino',
  feminine: 'Femenino',
};

const INK_OPTIONS: { value: InkMode; label: string }[] = [
  { value: 'tinta', label: 'Tinta negra' },
  { value: 'color', label: 'Color' },
  { value: 'original', label: 'Original' },
];

const SCAN_TOOLS: { value: ScanTool; label: string }[] = [
  { value: 'boceto', label: 'Boceto' },
  { value: 'ampliar', label: 'Ampliar' },
  { value: 'perfilar', label: 'Perfilar' },
];

const SCAN_TOOL_HINT: Record<ScanTool, string> = {
  boceto: 'Mueve, gira y escala el boceto sobre la foto.',
  ampliar: 'Pellizca para acercar y arrastra para recorrer la zona. Doble toque: x2,5 o la foto entera.',
  perfilar: 'Con un dedo dibuja el perfil del tatuaje sobre la piel; con dos, acerca para afinar el detalle.',
};

const MODES: { value: Mode; label: string; hint: string; icon: IconName }[] = [
  { value: 'camera', label: 'Cámara', hint: 'Sobre tu piel', icon: 'camera' },
  { value: 'mannequin', label: 'Maniquí', hint: 'Modelo 3D', icon: 'body' },
];

/**
 * Pantalla "Crea": el boceto colocado sobre tu propia piel con la
 * camara, o sobre un maniquin 3D que se gira con el dedo.
 *
 * Arranca en camara a proposito: es lo que la gente viene a hacer
 * aqui, y el maniquin es la alternativa para quien no quiera dar
 * permiso de camara o no tenga el cuerpo a mano (p. ej. la espalda).
 */
export default function TattooEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { permission, requestPermission, cameraRef, capture } = useCameraController();
  const ownerId = useAuthStore((s) => s.user?.id) ?? 'current-user';
  const { designs, loadDesigns, uploadDesign, removeBackground, restoreBackground, isProcessingImage, error } =
    useDesignStore();
  const proposal = useEditorStore((s) => s);
  const design = designs.find((d) => d.id === proposal.designId);
  const hasCutout = Boolean(design?.processedImageUrl);

  const seenIntro = useSettingsStore((s) => s.onboarding.seenCreateIntro);
  const markIntroSeen = useSettingsStore((s) => s.markCreateIntroSeen);

  const allowAiPhoto = useSettingsStore((s) => s.privacy.allowAiPhotoUpload);
  const setAllowAiPhoto = useSettingsStore((s) => s.setAllowAiPhotoUpload);

  const [mode, setMode] = useState<Mode>('camera');
  const [stageSize, setStageSize] = useState<Size>({ width: 0, height: 0 });
  const scan = useZoneScanStore();
  // El recuadro guia cambia de forma con la zona elegida en la hoja.
  const scanFrame = useMemo(
    () => (stageSize.width > 0 ? scanFrameFor(stageSize, proposal.bodyZone) : undefined),
    [stageSize, proposal.bodyZone],
  );
  const scanLabel = proposal.bodyZone
    ? `Encuadra tu ${bodyZoneLabel(proposal.bodyZone).toLowerCase()}`
    : 'Encuadra la zona del tatuaje';
  const [exportRequest, setExportRequest] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [skinError, setSkinError] = useState<string | undefined>(undefined);
  const { resetSkinFor } = scan;

  // Cada zona parte con su curvatura (un antebrazo es casi un
  // cilindro, una espalda casi plana); el usuario la ajusta despues.
  useEffect(() => {
    resetSkinFor(proposal.bodyZone);
  }, [proposal.bodyZone, resetSkinFor]);
  const [consentOpen, setConsentOpen] = useState(false);
  // La primera vez se abre solo. Despues queda a un toque del boton (i).
  const [introOpen, setIntroOpen] = useState(!seenIntro);

  const model = useBodyModel(proposal.silhouette);
  // El WebView no puede abrir el file:// que devuelve el selector de
  // imagenes, asi que el boceto viaja convertido a data URI.
  const sketchDataUri = useDataUri(design ? displayImageUrl(design) : null);
  const styles = createStyles(colors);

  // La pantalla se puede abrir directo desde el menu lateral, sin pasar
  // por "Diseña": sin esto el boceto ya elegido no se encontraria.
  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const closeIntro = () => {
    setIntroOpen(false);
    markIntroSeen();
  };

  const attachSketch = async () => {
    const granted = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;

    const sketch: TattooDesign = {
      id: Crypto.randomUUID(),
      ownerId,
      title: 'Boceto',
      imageUrl: result.assets[0].uri,
      source: 'userUpload',
      createdAt: new Date().toISOString(),
    };
    await uploadDesign(sketch);
    proposal.selectDesign(sketch.id);
  };

  /**
   * Dispara la foto: a partir de aqui se revisa sobre la captura. La
   * foto se abre ya acercada al recuadro guia, que es la zona que se
   * encuadro: se trabaja sobre la piel, no sobre todo lo que entro en
   * cuadro. "Ver la foto entera" deshace ese acercamiento.
   */
  const takePhoto = async () => {
    const uri = await capture();
    if (!uri) return;
    scan.reset();
    proposal.attachCameraSnapshot(uri);
    scan.focusZone(stageSize, proposal.bodyZone);
  };

  const retakePhoto = () => {
    scan.reset();
    proposal.discardCameraSnapshot();
  };

  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStageSize({ width, height });
  };

  /** Pide al WebView la foto con el tatuaje ya aplicado (ver onSkinExported). */
  const applyToPhoto = () => {
    setSkinError(undefined);
    setIsApplying(true);
    setExportRequest((n) => n + 1);
  };

  const onSkinExported = (dataUri: string) => {
    try {
      proposal.applySkinComposite(saveDataUriToDocuments(dataUri, 'en-la-piel', 'propuesta'));
    } catch (e) {
      setSkinError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsApplying(false);
    }
  };

  const onSkinError = (message: string) => {
    setIsApplying(false);
    setSkinError(message);
  };

  const composeWithAI = async () => {
    if (!design) return;
    // El consentimiento se pide una vez y queda guardado; sin el, ni
    // se llega a construir la peticion.
    if (!allowAiPhoto) {
      setConsentOpen(true);
      return;
    }
    await proposal.renderWithAI(displayImageUrl(design), bodyZoneLabel(proposal.bodyZone));
  };

  const acceptConsent = async () => {
    setAllowAiPhoto(true);
    setConsentOpen(false);
    if (design) {
      await proposal.renderWithAI(displayImageUrl(design), bodyZoneLabel(proposal.bodyZone));
    }
  };

  const handleSave = async () => {
    await proposal.save();
    router.push('/artists');
  };

  const renderStage = () => {
    if (mode === 'camera') {
      // Con una foto tomada se revisa sobre ella, no sobre el vivo:
      // es lo que se va a componer y lo que se va a guardar.
      if (proposal.cameraSnapshotUrl) {
        return (
          <View style={{ flex: 1 }}>
            {/* Sobre el resultado de la IA el boceto ya esta dentro
                de la imagen: volver a superponerlo lo duplicaria. La
                foto va en "cover", igual que la camara en vivo, para
                que el boceto quede donde se vio al disparar. */}
            <ZoneScanStage
              uri={proposal.renderedImageUrl ?? proposal.cameraSnapshotUrl}
              design={design}
              showDesign={!proposal.renderedImageUrl}
              fit={proposal.renderedImageUrl ? 'contain' : 'cover'}
              frame={scanFrame}
              exportRequest={exportRequest}
              onExported={onSkinExported}
              onError={onSkinError}
            />
            {proposal.isRendering && (
              <View style={styles.rendering}>
                <Spinner color="#FFFFFF" />
                <Text style={[typo.bodyStrong, { color: '#FFFFFF' }]}>Componiendo sobre tu piel…</Text>
              </View>
            )}
          </View>
        );
      }
      if (permission?.granted) {
        return <CameraOverlay cameraRef={cameraRef} design={design} scanFrame={scanFrame} scanLabel={scanLabel} />;
      }
      return (
        <View style={styles.center}>
          <Icon name="camera" size={44} color={colors.textMuted} />
          <Text style={[typo.bodyStrong, { color: colors.text, textAlign: 'center' }]}>
            Necesitamos la cámara para probarlo sobre tu piel
          </Text>
          <Text style={[typo.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            La vista previa ocurre dentro de tu teléfono.
          </Text>
          <AppButton label="Permitir cámara" size="M" onPress={requestPermission} />
          <Pressable onPress={() => setMode('mannequin')} hitSlop={8}>
            <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Usar el maniquí</Text>
          </Pressable>
        </View>
      );
    }

    if (model.uri) {
      // Sin DesignOverlay encima: aqui el tatuaje va proyectado
      // sobre la malla, dentro de la escena 3D, para que siga la
      // curvatura del cuerpo.
      return (
        <BodyModelViewer
          modelUrl={model.uri}
          silhouette={proposal.silhouette}
          textureUrl={sketchDataUri}
          zone={proposal.bodyZone}
          size={proposal.placement.scale}
          rotationDegrees={proposal.placement.rotationDegrees}
          opacity={proposal.placement.opacity}
          cutout={proposal.hideBackground}
          onSizeChange={(scale) => proposal.setPlacement({ scale })}
        />
      );
    }

    return (
      <View style={[styles.center, { backgroundColor: '#131015' }]}>
        {model.loading && <Spinner color={colors.primaryText} />}
        {model.error && <Text style={[typo.body, { color: '#FFFFFF' }]}>{model.error}</Text>}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.stage} onLayout={onStageLayout}>
        {renderStage()}

        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <MenuButton />
          <View style={styles.titleGroup}>
            <SectionIcon section="crea" size={30} />
            <Text style={[typo.logoSection, styles.title]}>Crea</Text>
          </View>
          <Pressable
            onPress={() => setIntroOpen(true)}
            style={styles.roundButton}
            hitSlop={8}
            accessibilityLabel="Cómo funciona"
          >
            <Icon name="info" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {!design && (
          <View style={[styles.emptyHint, { bottom: 16 }]}>
            <Text style={[typo.caption, { color: '#FFFFFF' }]}>Adjunta un boceto para verlo sobre el cuerpo</Text>
          </View>
        )}

        {mode === 'camera' && permission?.granted && !proposal.cameraSnapshotUrl && (
          <Pressable
            onPress={takePhoto}
            style={[styles.shutter, { bottom: 24 }]}
            accessibilityLabel="Tomar foto"
            accessibilityHint="Captura para ver el resultado realista"
          >
            <Icon name="shutter" size={64} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={[styles.sheet, { backgroundColor: colors.surface }]}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 10 }}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />

        <View style={styles.modeRow}>
          {MODES.map((option) => {
            const active = mode === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setMode(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.modeCard,
                  { borderColor: active ? colors.primary : colors.border },
                  active && { backgroundColor: colors.primaryTint },
                ]}
              >
                <Icon name={option.icon} size={24} color={active ? colors.primaryText : colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[typo.bodyStrong, { color: active ? colors.primaryText : colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[typo.caption, { color: colors.textMuted }]}>{option.hint}</Text>
                </View>
              </Pressable>
            );
          })}

          {/* Icono y no texto: "Cambiar boceto" ocupaba una fila entera
              para una accion que se usa una vez. Que hace lo cuenta el
              modal de "Cómo funciona". */}
          <Pressable
            onPress={attachSketch}
            style={[styles.sketchButton, { borderColor: design ? colors.secondary : colors.border }]}
            accessibilityLabel={design ? 'Cambiar boceto' : 'Adjuntar boceto'}
            accessibilityHint="Abre tus fotos para elegir el diseño"
          >
            <Icon name="image" size={24} color={design ? colors.secondary : colors.textMuted} />
          </Pressable>
        </View>

        {mode === 'camera' && design && !proposal.renderedImageUrl && (
          <>
            <Text style={styles.label}>Sobre la piel</Text>
            <Segmented
              value={scan.onSkin ? 'piel' : 'plano'}
              onChange={(v) => scan.setOnSkin(v === 'piel')}
              options={[
                { value: 'piel', label: 'En la piel' },
                { value: 'plano', label: 'Plano' },
              ]}
            />
            {scan.onSkin && (
              <>
                <Text style={styles.hint}>
                  El recuadro es tu {proposal.bodyZone ? bodyZoneLabel(proposal.bodyZone).toLowerCase() : 'zona'}:
                  el diseño se envuelve en su curva y toma la luz de tu piel. Encuádralo para que el recuadro
                  abrace el miembro.
                </Text>
                <Segmented value={scan.skin.ink} onChange={(ink) => scan.setSkin({ ink })} options={INK_OPTIONS} />

                <View style={styles.sliderLabel}>
                  <Text style={[typo.bodyStrong, { color: colors.text }]}>Curvatura</Text>
                  <Text style={styles.sliderValue}>{Math.round(scan.skin.curvature * 100)} %</Text>
                </View>
                <Slider
                  minimumValue={CURVATURE_RANGE.min}
                  maximumValue={CURVATURE_RANGE.max}
                  value={scan.skin.curvature}
                  onSlidingComplete={(curvature) => scan.setSkin({ curvature })}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                  accessibilityLabel="Curvatura de la zona"
                />

                <View style={styles.sliderLabel}>
                  <Text style={[typo.bodyStrong, { color: colors.text }]}>Grosor de la zona</Text>
                  <Text style={styles.sliderValue}>{Math.round(scan.skin.widthScale * 100)} %</Text>
                </View>
                <Slider
                  minimumValue={WIDTH_SCALE_RANGE.min}
                  maximumValue={WIDTH_SCALE_RANGE.max}
                  value={scan.skin.widthScale}
                  onSlidingComplete={(widthScale) => scan.setSkin({ widthScale })}
                  minimumTrackTintColor={colors.secondary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.secondary}
                  accessibilityLabel="Grosor del miembro"
                />

                <View style={styles.sliderLabel}>
                  <Text style={[typo.bodyStrong, { color: colors.text }]}>Inclinación</Text>
                  <Text style={styles.sliderValue}>{Math.round(scan.skin.axisDegrees)}°</Text>
                </View>
                <Slider
                  minimumValue={AXIS_RANGE.min}
                  maximumValue={AXIS_RANGE.max}
                  step={1}
                  value={scan.skin.axisDegrees}
                  onSlidingComplete={(axisDegrees) => scan.setSkin({ axisDegrees })}
                  minimumTrackTintColor={colors.secondary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.secondary}
                  accessibilityLabel="Inclinación del miembro en la foto"
                />
              </>
            )}
          </>
        )}

        {mode === 'camera' && proposal.cameraSnapshotUrl && (
          <>
            {proposal.renderedImageUrl ? (
              <AppButton label="Volver a ajustar" variant="secondary" size="M" onPress={proposal.clearRenderedImage} />
            ) : (
              <>
                <AppButton
                  label="Aplicar a la foto"
                  onPress={applyToPhoto}
                  isLoading={isApplying}
                  disabled={!design || !scan.onSkin}
                />
                <Text style={styles.hint}>
                  Se hace aquí, en tu teléfono, y es lo que se guarda con la propuesta.
                </Text>
              </>
            )}
            {skinError && <Text style={styles.error}>{skinError}</Text>}

            <Text style={styles.label}>Sobre la foto</Text>
            <Segmented value={scan.tool} onChange={scan.setTool} options={SCAN_TOOLS} />
            <Text style={styles.hint}>{SCAN_TOOL_HINT[scan.tool]}</Text>

            {scan.tool === 'ampliar' && (
              <View style={styles.toolRow}>
                <AppButton
                  label="Enfocar la zona"
                  variant="secondary"
                  size="S"
                  onPress={() => scan.focusZone(stageSize, proposal.bodyZone)}
                />
                <AppButton label="Ver la foto entera" variant="ghost" size="S" onPress={scan.resetView} />
              </View>
            )}

            {scan.tool === 'perfilar' && (
              <View style={styles.toolRow}>
                <Chip label="Fucsia" selected={scan.tone === 'fuchsia'} onPress={() => scan.setTone('fuchsia')} tone="fuchsia" />
                <Chip label="Azul" selected={scan.tone === 'blue'} onPress={() => scan.setTone('blue')} tone="blue" />
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={scan.undo}
                  disabled={scan.strokes.length === 0}
                  style={[styles.toolButton, scan.strokes.length === 0 && { opacity: 0.4 }]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Deshacer el último trazo"
                >
                  <Icon name="undo" size={20} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={scan.clearStrokes}
                  disabled={scan.strokes.length === 0}
                  style={[styles.toolButton, scan.strokes.length === 0 && { opacity: 0.4 }]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Borrar todo el perfil"
                >
                  <Icon name="trash" size={20} color={colors.text} />
                </Pressable>
              </View>
            )}

            <AppButton
              label={proposal.renderedImageUrl ? 'Rehacer con IA' : 'Resultado realista con IA'}
              variant="secondary"
              onPress={composeWithAI}
              isLoading={proposal.isRendering}
              disabled={!design}
            />
            <Text style={styles.hint}>
              La IA aplica el tatuaje siguiendo la curvatura y la luz de tu piel. Tu foto se envía a Google para
              esto; el resto de la app no sale del teléfono.
            </Text>
            {proposal.renderError && <Text style={styles.error}>{proposal.renderError}</Text>}
            <AppButton
              label="Repetir la foto"
              variant="secondary"
              size="M"
              onPress={retakePhoto}
            />
          </>
        )}

        {design && !proposal.cameraSnapshotUrl && (
          <>
            <Text style={styles.hint}>
              {mode === 'mannequin'
                ? 'Un dedo gira el maniquí, dos lo recorren de arriba a abajo. Toca dónde quieres el tatuaje y pellizca para su tamaño.'
                : 'Arrastra el boceto con un dedo; con dos, gíralo y cambia su tamaño. Doble toque lo recentra.'}
            </Text>

            <Text style={styles.label}>Fondo del boceto</Text>
            <Segmented
              value={proposal.hideBackground ? 'sin' : 'con'}
              onChange={(v) => proposal.setHideBackground(v === 'sin')}
              options={[
                { value: 'sin', label: 'Sin fondo' },
                { value: 'con', label: 'Con fondo' },
              ]}
            />
            <Text style={styles.hint}>
              &quot;Sin fondo&quot; vuelve transparente el papel del boceto al instante, aquí en el teléfono. Si está
              sobre un fondo complicado y no basta, el recorte con IA entiende la escena.
            </Text>

            <AppButton
              label={hasCutout ? 'Deshacer recorte con IA' : 'Recortar con IA'}
              variant="secondary"
              size="M"
              isLoading={isProcessingImage}
              onPress={() => (hasCutout ? restoreBackground(design.id) : removeBackground(design.id))}
            />
            {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}

        {mode === 'mannequin' && (
          <>
            <Text style={styles.label}>Cuerpo</Text>
            <View style={styles.zoneRow}>
              {BODY_SILHOUETTES.map((silhouette) => (
                <Chip
                  key={silhouette}
                  label={SILHOUETTE_LABEL[silhouette]}
                  selected={proposal.silhouette === silhouette}
                  onPress={() => proposal.setSilhouette(silhouette)}
                  tone="fuchsia"
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Zona del cuerpo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneRow}>
          {BODY_ZONES.map((zone: BodyZone) => (
            <Chip
              key={zone}
              label={BODY_ZONE_LABELS[zone]}
              selected={proposal.bodyZone === zone}
              onPress={() => proposal.setZone(zone)}
              tone="blue"
            />
          ))}
        </ScrollView>

        <View style={styles.sliderLabel}>
          <Text style={[typo.bodyStrong, { color: colors.text }]}>Tamaño</Text>
          <Text style={[typo.bodyStrong, { color: colors.primary }]}>
            {Math.round(proposal.placement.scale * 100)} %
          </Text>
        </View>
        <Slider
          minimumValue={0.3}
          maximumValue={2.5}
          value={proposal.placement.scale}
          onValueChange={proposal.scale}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />

        <View style={styles.sliderLabel}>
          <Text style={[typo.bodyStrong, { color: colors.text }]}>Opacidad</Text>
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>
            {Math.round(proposal.placement.opacity * 100)} %
          </Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={proposal.placement.opacity}
          onValueChange={proposal.setOpacity}
          minimumTrackTintColor={colors.secondary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.secondary}
        />

        <View style={{ height: 8 }} />
        <AppButton label="Guardar propuesta" onPress={handleSave} disabled={!design} />
      </ScrollView>

      <CreateIntroModal visible={introOpen} onClose={closeIntro} />
      <AiPhotoConsentModal
        visible={consentOpen}
        onAccept={acceptConsent}
        onCancel={() => setConsentOpen(false)}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    stage: { flex: 1, backgroundColor: '#131015' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
    topBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleGroup: { flexDirection: 'row', alignItems: 'center' },
    // Encima de la camara y del visor 3D el fondo siempre es oscuro,
    // asi que estos dos van en blanco en los dos temas.
    title: { color: '#FFFFFF', fontSize: 32, lineHeight: 32 * 1.3, marginLeft: 6 },
    roundButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    emptyHint: {
      position: 'absolute',
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: { maxHeight: '52%', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
    modeRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
    modeCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 18,
      borderWidth: 1.5,
    },
    sketchButton: {
      width: 56,
      borderRadius: 18,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { ...typo.label, color: colors.textMuted, marginTop: 8 },
    hint: { ...typo.caption, color: colors.textMuted },
    shutter: { position: 'absolute', alignSelf: 'center' },
    rendering: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    error: { ...typo.caption, color: colors.danger },
    zoneRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    toolButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceRaised,
    },
    sliderLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    sliderValue: { ...typo.bodyStrong, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  });
}
