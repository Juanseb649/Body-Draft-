# Arquitectura de BodyDraft

Este documento describe la arquitectura implementada en `src/` para BodyDraft:
una app React Native (Expo) para disenar, visualizar (camara AR y maniquin 3D)
y agendar tatuajes, con soporte tanto para clientes como para tatuadores que
publican sus propias plantillas. Pensada para poder previsualizarse en un
iPhone con **Expo Go**, sin necesitar Xcode/macOS durante el desarrollo.

> Nota de migracion: el proyecto se construyo primero en Flutter/Dart. Se
> reescribio por completo en React Native + Expo porque Expo Go — la app que
> permite previsualizar en un iPhone fisico sin Mac — es exclusiva de ese
> ecosistema; Flutter no tiene un equivalente. Las decisiones de arquitectura
> (MVC, entidades, flujo principal) se mantuvieron, solo cambio el stack.

---

## 1. Patron: MVC adaptado a React Native + Expo Router

```text
┌─────────────────────────────────────────────────────────────┐
│                            VIEW                              │
│  src/app/**  (rutas, Expo Router)                             │
│  src/components/**  (Atomic Design)                           │
│  Solo UI: lee el estado del Controller (hook de Zustand) y    │
│  le reenvia eventos de usuario. No contiene logica de         │
│  negocio ni llama servicios directamente.                     │
└───────────────────────────────┬───────────────────────────────┘
                                 │ hook (useXStore())
┌───────────────────────────────▼───────────────────────────────┐
│                          CONTROLLER                            │
│  src/controllers/**                                            │
│  Un store de Zustand por pantalla/flujo (equivalente al         │
│  StateNotifier de la version Flutter). Orquesta llamadas a     │
│  Repositories, transforma resultados en estado inmutable que   │
│  la View observa via hook.                                     │
└───────────────────────────────┬───────────────────────────────┘
                                 │
┌───────────────────────────────▼───────────────────────────────┐
│                       MODEL (+ acceso a datos)                 │
│  src/models/**              entidades (types/interfaces TS)    │
│  src/data/**                 un repositorio por entidad; combina│
│                               src/services/** (IA, storage,     │
│                               maniquin 3D)                      │
└─────────────────────────────────────────────────────────────┘
```

**Por que Zustand como Controller:** cumple el mismo rol que un
`StateNotifier` de Riverpod (recibe intenciones de la View, actualiza
estado, notifica cambios) sin acoplar la logica a un componente concreto —
los stores se importan y usan como hooks (`useDesignStore()`) desde
cualquier pantalla, y son testeables de forma aislada.

**Por que Expo Router:** en vez de una tabla de rutas centralizada (como
GoRouter en la version Flutter), cada archivo dentro de `src/app/` es una
ruta automaticamente. `_layout.tsx` define el navegador (Stack). Es la
convencion oficial y recomendada por Expo (ver `AGENTS.md` del proyecto).

**Por que un repositorio entre Controller y Servicios:** el Controller no
deberia saber si un diseno viene de SQLite local o de un backend remoto, ni
si "generar con IA" implica una o varias llamadas al proveedor. El repositorio
absorbe esa decision (ver `data/designRepository.ts`).

---

## 2. Mapa de carpetas

```text
src/
  app/                          VIEW — rutas (Expo Router, file-based)
    _layout.tsx                  Stack raiz: fuentes, gestos, tema, auth listener
    welcome.tsx                   Bienvenida (primera pantalla, sin sesion)
    auth/
      _layout.tsx                 Stack; redirige a "/" si ya hay sesion
      login.tsx
      register.tsx
    (tabs)/                      Area autenticada (grupo — no agrega segmento a la URL)
      _layout.tsx                 Stack (sin barra inferior); redirige a /welcome si NO hay sesion — ver seccion 6/7
      index.tsx                    Inicio = el dashboard ("/"): grid de secciones (icono + nombre)
      disena.tsx                   Diseña
      agenda.tsx                   Agenda (Mis citas)
      ajustes.tsx                  Ajustes
    editor.tsx                   Crea: camara Y maniquin 3D en la misma pantalla
    artists/index.tsx             Lista de tatuadores — apilada
    artists/[id].tsx              Perfil del artista — apilada
    appointment/[artistId].tsx    Agendar cita (calendario) — apilada

  components/                   VIEW — Atomic Design (no-route UI)
    atoms/AppButton.tsx, Chip.tsx, Segmented.tsx, Spinner.tsx, NeonWall.tsx,
      SectionIcon.tsx + sectionIcons.ts (icono por seccion), useNeonFlicker.ts, ...
    molecules/TattooCard.tsx, ArtistCard.tsx, BodyDraftLogo.tsx,
      SectionLogo.tsx, SectionHeader.tsx (chevron de volver + icono + nombre)
    organisms/CameraOverlay.tsx, BodyModelViewer.tsx

  controllers/                  CONTROLLER — un store Zustand por flujo
    useAuthStore.ts               sesion/usuario + signUp/signIn/signOut
    useSettingsStore.ts           apariencia/notificaciones/cuenta (persistido)
    useDesignStore.ts
    useEditorStore.ts
    useCameraController.ts       (hook, no store: envuelve el ref de camara)
    useArtistStore.ts
    useAppointmentStore.ts

  models/                       MODEL — entidades (types/interfaces)
    user.ts, artist.ts, tattooDesign.ts, tattooProposal.ts,
    bodyZone.ts, placement.ts, appointment.ts

  data/                         acceso a datos por entidad
    designRepository.ts, artistRepository.ts, appointmentRepository.ts

  services/                     integraciones externas (puerto + adaptador)
    authService.ts / supabaseClient.ts  (backend de autenticacion)
    aiService.ts (puerto) / aiProvider.ts (elige) / openAiService.ts / geminiAiService.ts
    storageService.ts / inMemoryStorageService.ts
    bodyModelService.ts

  core/
    services.ts                  cableado de DI (que implementacion usa cada interfaz)

  theme/
    colors.ts                    tokens exactos de la guia de diseno (darkColors/lightColors)
    ThemeContext.tsx               ThemeProvider + useTheme() — resuelve appearance.theme
    typography.ts                 escala tipografica (Sacramento/TiltNeon/Manrope)
    motion.ts                     duraciones y curvas (react-native-reanimated)
```

> Todo el sistema de diseno (colores, tipografia, botones, animaciones,
> ajustes) sigue al pie de la letra "Body Draft — App móvil y guía para
> código", el documento de diseno del proyecto. Cuando ese documento y el
> codigo difieran, el documento manda; si encuentras una discrepancia,
> es un bug de implementacion.

---

## 3. Modelos y relaciones

```text
AppUser 1───* TattooProposal *───1 TattooDesign
   │                 │
   │                 └── BodyZone + BodySilhouette + Placement
   │
   └───────────────────────────────* Appointment *───1 Artist
                                          │
                                    proposalId (opcional)

Artist 1───* TattooDesign (source: 'artistTemplate')
```

- **TattooDesign**: la referencia visual del tatuaje. `source` distingue si
  vino de una subida del usuario, de la IA, o de la plantilla de un
  tatuador (`artistId` presente). Un tatuador y un cliente usan la **misma
  entidad**: no hay un tipo "plantilla" separado, solo un `source` distinto,
  para que ambos flujos compartan el mismo pipeline de visualizacion.
- **TattooProposal**: el diseno ya ubicado sobre una `BodyZone`, con su
  `Placement` (offset, rotacion, escala, opacidad) y la `BodySilhouette`
  usada en el maniquin 3D. Es la unidad que se guarda, se agenda y se
  muestra en "Mis disenos".
- **Placement**: el dato central que hace posible ver el mismo diseno de
  dos formas (ver seccion 5) sin duplicar informacion.

---

## 4. Flujo principal (mapeado a rutas/Controllers)

```text
app/welcome.tsx ──> "Ya tengo cuenta" ──> app/auth/login.tsx
       │                                      │ useAuthStore.signIn
       │ "Comenzar"                           ▼ router.replace('/')
       ▼                                 (tabs)/index.tsx  ← pantalla distinta a login
app/auth/register.tsx ──useAuthStore.signUp──┘
                                                  │ (AppButton "Crear diseño", o tab "Diseña")
                                                  ▼
(tabs)/disena.tsx  ──uses──> useDesignStore ──> designRepository ──> aiService / storageService
   │ (elige/crea diseno)
   ▼
useEditorStore.selectDesign(designId)
   │
   ▼
app/(drawer)/editor.tsx ──uses──> useEditorStore + useCameraController + useBodyModel
   │  CameraOverlay o BodyModelViewer segun el modo elegido
   │  DesignOverlay (molecule): arrastre → editor.move(...), igual sobre los dos
   │
   ▼ (AppButton "Guardar propuesta")
useEditorStore.save() ──> designRepository.saveProposal()
   ▼
app/artists/index.tsx ──uses──> useArtistStore ──> artistRepository
   │ (fila → perfil, boton "Agendar" → directo a agendar)
   ▼
app/artists/[id].tsx  o  app/appointment/[artistId].tsx ──uses──> useAppointmentStore ──> appointmentRepository
   ▼
Confirmacion → (tabs)/agenda.tsx ("Mis citas")
```

---

## 5. Visualizacion: camara AR y maniquin 3D comparten estado

Punto central de la idea del proyecto: el usuario debe poder ver el tatuaje
**superpuesto en su cuerpo real (camara)** y tambien **como maqueta 3D
rotable**, sin que sean dos features independientes.

Decision de arquitectura: **no se genera un modelo 3D por propuesta**.
En su lugar:

1. `useEditorStore` mantiene una unica `TattooProposal` (con su
   `Placement`) mientras el usuario ajusta el diseno.
2. `app/(drawer)/editor.tsx` tiene los dos modos —camara y maniquin— y
   ambos leen y escriben sobre **el mismo store**, asi que cambiar de
   modo conserva zona, escala y colocacion. Arranca en camara, que es a
   lo que se entra a esta seccion; el maniquin es la alternativa para
   quien no da permiso de camara o quiere ver una zona que no alcanza
   (la espalda).

   Hubo una seccion aparte, "Explora", solo para el maniquin. Se quito:
   eran dos formas de hacer lo mismo y obligaban a saltar de seccion a
   mitad del flujo.
3. `bodyModelService.ts` resuelve dos cosas:
   - `modelUriFor(silhouette)`: que maniquin `.glb` generico cargar
     (`masculine` o `feminine`, ver `models/bodyZone.ts`).
   - `mapToMeshUV(...)`: traduce la colocacion 2D ajustada en camara a la
     region UV de esa malla (mismo `BodyZone` en las dos siluetas).
4. La foto capturada con camara (`cameraSnapshotUrl`) se guarda aparte,
   como snapshot puntual; el maniquin 3D, al ser generico + reutilizable,
   no necesita guardarse como asset: se **re-renderiza** a partir de
   `designId + bodyZone + silhouette + placement` cada vez que se abre.

**Como se renderiza el maniquin 3D dentro de Expo Go:** `BodyModelViewer`
(organism) usa `react-native-webview` (incluido en Expo Go) para cargar una
pagina HTML con el web component `<model-viewer>` de Google, que sabe
cargar y rotar un `.glb`/glTF con gestos nativos del navegador embebido —
es la ruta mas simple sin necesitar codigo nativo adicional ni un dev
client. La alternativa (`expo-gl` + `expo-three` + `three.js`) da mas
control pero muchisimo mas trabajo de integracion; se documenta como
posible evolucion futura si se necesita renderizado nativo real.

Esto evita el costo (tecnico y de scope de un MVP academico) de reconstruir
el cuerpo real del usuario en 3D via fotogrametria, que queda fuera de
alcance (ver seccion 12).

---

## 6. Autenticacion (Supabase) y navegacion por sesion

El backend de la app es **Supabase** (Postgres + Auth administrado, sin
servidor propio que mantener). `AuthService` (`services/authService.ts`) es
la unica puerta de entrada; `SupabaseAuthService` la implementa sobre
`@supabase/supabase-js` (`services/supabaseClient.ts`, sesion persistida en
`AsyncStorage`). `useAuthStore` (`controllers/useAuthStore.ts`) expone
`session`, `user`, y las acciones `signUp` / `signIn` / `signOut`; se
suscribe una unica vez a `supabase.auth.onAuthStateChange(...)` (llamado
desde `app/_layout.tsx` via `initAuth()`) para que toda la app reaccione
automaticamente cuando cambia la sesion, y engancha `AppState` para
pausar/reanudar el auto-refresh del token segun la app esta en foreground o
background.

**Navegacion segun sesion:**

```text
app/
  welcome.tsx          primera pantalla, sin sesion
  auth/
    _layout.tsx          Stack; si ya hay sesion, <Redirect> a "/"
    login.tsx             al loguear, router.replace('/') — una
                           pantalla DISTINTA, no el mismo login re-pintado
    register.tsx
  (tabs)/                grupo — no agrega segmento a la URL
    _layout.tsx            Tabs; si NO hay sesion, <Redirect> a /welcome
    index.tsx ...          (resto de las pantallas, ver seccion 7)
```

No hay un `index.tsx` suelto en la raiz de `app/`: como `(tabs)` es un
grupo, `(tabs)/index.tsx` ya resuelve el path `"/"` — un `index.tsx`
adicional fuera del grupo colisionaria con esa misma ruta. La decision de
"a donde entrar primero" no vive en un archivo dedicado sino en el propio
guard de `(tabs)/_layout.tsx`: si no hay sesion, ese guard redirige a
`/welcome` en cuanto Expo Router intenta resolver `"/"`.

Los dos `_layout.tsx` de cada grupo son los que realmente "cuidan la
puerta": `(app)/_layout.tsx` redirige a login si `session` es null, y
`(auth)/_layout.tsx` redirige a dashboard si ya hay sesion (p. ej. si el
usuario navega hacia atras con el gesto del sistema). El `index.tsx` raiz
solo decide el destino inicial una vez.

**Requisito para que la app arranque de verdad:** crear un proyecto gratis
en [supabase.com](https://supabase.com) y copiar su Project URL y
anon/publishable key a un archivo `.env` en la raiz:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxxx
```

Sin esto, `signUp`/`signIn`/`signOut` fallan (ver seccion 11).

---

## 7. Navegacion (dashboard), sistema de diseno y tema

**Historia de esta decision** (dos pivotes, en orden):

1. La primera version usaba un Drawer (sidebar) con gesto estilo
   Twitter/X.
2. La guia de diseno del proyecto ("Body Draft — App móvil y guía para
   código") especifica explicitamente una navegacion por **pestanas
   inferiores**, asi que se reemplazo el Drawer por `Tabs` de
   `expo-router` para seguir la guia al pie de la letra.
3. Instruccion explicita posterior del usuario: sin barra inferior,
   **dashboard** en su lugar, con el logo/icono de cada seccion y su
   nombre al lado. `(tabs)/_layout.tsx` paso de `Tabs` a un `Stack` sin
   barra visible, e `index.tsx` ("Inicio") se convirtio en ese dashboard:
   una grilla con las secciones (Diseña, Crea, Agenda, Artistas,
   Ajustes — Mensajes se elimino por completo a pedido del usuario, ver
   seccion 12).

Como ya no hay una barra persistente para volver, cada pantalla de
seccion (incluidas las que viven **fuera** de `(tabs)/` como rutas
apiladas: calendario, perfil) usa
`components/molecules/SectionHeader.tsx` (chevron de volver + su
`SectionIcon` + nombre) para regresar al dashboard — ver el mapa de
carpetas (seccion 2).

**Sistema de diseno** (todo definido en la guia, implementado tal cual):

- `theme/colors.ts`: tokens exactos por nombre (`background`, `surface`,
  `surfaceSunken`, `border`, `textStrong`, `text`, `textMuted`,
  `placeholder`, `primary`, `onPrimary`, `primaryTint`, `secondary`,
  `secondaryTint`, `accent`, `success`, `danger`) en `darkColors` y
  `lightColors`. `palette`/`glow` (los tres tubos de neon: fuchsia, azul,
  ambar) son fijos, iguales en ambos temas.
- `theme/typography.ts`: la escala exacta de la guia (`logoHero`,
  `logoSection`, `logoInline`, `logoTile`, `title`, `sectionTitle`,
  `tagline`, `button`, `body`, `bodyStrong`, `label`, `caption`, `tab`)
  sobre tres familias (`Sacramento`, `TiltNeon`, `Manrope`).
- `theme/motion.ts`: duraciones (`fast`/`base`/`slow`/`intro`) y curvas
  (`standard`/`exit`) para animar con `react-native-reanimated`.
- `components/atoms/AppButton.tsx`, `Chip.tsx`, `Segmented.tsx`,
  `Spinner.tsx`: los atomos reutilizables que documenta la guia
  ("Botones y estados"). `AppButton` en oscuro es un tubo de neon (borde +
  `boxShadow` de halo); en claro es solido/outline segun variante — la guia
  es explicita en que "el neón no brilla sobre papel". La animacion de
  presion (escala 0.97, resorte al soltar) usa Reanimated
  (`useSharedValue` + `withSpring`), no solo `Pressable` opacity.

**Tema claro/oscuro:** a diferencia de la primera version (un toggle suelto
en el sidebar), ahora la preferencia de tema es un ajuste persistido mas —
`appearance.theme` en `useSettingsStore` (`'system' | 'light' | 'dark'`,
Zustand + `persist` sobre AsyncStorage). `theme/ThemeContext.tsx` solo
*resuelve* esa preferencia contra `useColorScheme()` (si es `'system'`) y
expone `{ scheme, colors }` de solo lectura via `useTheme()` — exactamente
como lo documenta la guia en "Cómo se resuelve el tema". El control real
(segmentado Sistema/Claro/Oscuro) vive en la pestana Ajustes
(`(tabs)/ajustes.tsx`), no en un interruptor flotante.

Cada pantalla/componente que necesita color llama a `useTheme()` y arma sus
estilos con una funcion `createStyles(colors)` (en vez de un
`StyleSheet.create` estatico con colores fijos), para que cambiar el tema
en Ajustes re-renderice con la paleta correcta en toda la app.

---

## 8. IA (sin proveedor fijo)

`AIService` (`services/aiService.ts`) es la unica puerta de entrada a IA
y NO esta atada a ningun proveedor: describe lo que la app necesita, y
cada proveedor lo implementa como pueda. Hoy hay dos,
`OpenAiService` y `GeminiAIService`, y añadir un tercero es escribir
una clase mas y registrarla en `services/aiProvider.ts`, sin tocar una
sola pantalla ni Controller.

Cual se usa lo decide el entorno:

1. `EXPO_PUBLIC_AI_PROVIDER` (`openai` | `gemini`), si esta puesto.
2. Si no, el primero que tenga clave.

Sin ninguna clave la app arranca igual y es `UnconfiguredAiService`
quien responde, fallando con un mensaje que dice que variable falta.
Esto es a proposito: dejar pasar una clave vacia convierte un error de
configuracion en un 401 del servidor mucho mas tarde y mucho mas
dificil de leer.

Las dos operaciones que mas se usan —recortar un fondo y componer un
tatuaje sobre una foto— son EDICIONES de imagenes que ya existen, no
generacion desde cero, y cada API las expresa distinto: Gemini las manda
como `inlineData` en un JSON, y OpenAI como campos `image[]` repetidos
de un `multipart/form-data`. Eso obliga a un detalle: el `FormData` de
React Native solo adjunta archivos reales, asi que un diseño que vive
como data URI se vuelca antes a un archivo de cache
(`services/imageFileCache.ts`).

Responsabilidades cubiertas por la interfaz:

| Metodo                     | Uso                                                   |
| --------------------------- | ------------------------------------------------------ |
| `generateFromDescription`   | "Serpiente con flores, estilo japones..." → TattooDesign |
| `analyzeReferenceImage`     | Identificar elementos principales de una imagen subida |
| `generateVariations`        | Variaciones de un diseno existente                     |
| `adaptToStyle`               | Adaptar una referencia a un estilo distinto             |
| `removeBackground`          | Dejar solo el trazo, listo para superponerse            |
| `composeOnPhoto`            | Aplicar el tatuaje sobre la piel de una foto real       |

Ningun Controller ni ninguna View habla con un proveedor directamente:
pasan por `aiService`, que `core/services.ts` construye una sola vez.
Las claves se leen de variables `EXPO_PUBLIC_` (ver seccion 11 y
`.env.example`).

---

## 9. Tatuadores y plantillas

Un tatuador es un `AppUser` con `role: 'artist'`. Cuando publica una
plantilla, crea un `TattooDesign` con `source: 'artistTemplate'` y su
propio `artistId` — usando el **mismo** `useDesignStore` /
`designRepository` que un cliente usa para sus disenos personales o
generados por IA. Consecuencia directa de este diseno: una plantilla de
tatuador entra automaticamente al mismo `editor/index.tsx` /
`editor.tsx` que cualquier otro diseno, sin pantallas ni pipelines
separados. `designRepository.getArtistTemplates(artistId)` filtra el
catalogo de un tatuador para mostrarlo en su perfil/portafolio.

---

## 10. Persistencia

- **Local (`StorageService` → `SqliteStorageService`, sobre
  `expo-sqlite/kv-store`):** disenos y propuestas del usuario — datos de
  una sola cuenta, sin necesidad de verse desde otra, asi que sobreviven
  a cerrar la app pero no salen del dispositivo.
- **Remota (Supabase, `ArtistRepository` + `AppointmentRepository`):**
  catalogo de tatuadores (`profiles` con `role = 'artist'`) y citas —
  datos que por definicion tienen que verse desde DOS cuentas distintas
  (cliente y tatuador), asi que no pueden vivir solo en el storage local
  de una de ellas. Esquema y RLS versionados en `supabase/migrations/`
  (ver `supabase/README.md` para aplicarlos/mantenerlos al dia).

`core/services.ts` centraliza que implementacion concreta usa cada
interfaz (`AIService`, `StorageService`, `BodyModelService`), de modo que
sustituir un proveedor de IA por otro, o `SqliteStorageService` por otra
cosa, no toca Controllers ni Views. `ArtistRepository` y
`AppointmentRepository` no implementan una interfaz compartida con
`StorageService` a proposito: hablan con Supabase directamente porque su
dato es compartido entre cuentas, no local a una.

---

## 11. Variables de entorno y Expo Go

- Las variables que el bundle de JS necesita en tiempo de ejecucion (como
  las API keys de IA y de Supabase) deben llevar el prefijo `EXPO_PUBLIC_`
  (`.env` en la raiz: `EXPO_PUBLIC_GEMINI_API_KEY`,
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — es el
  mecanismo que Expo inlinea automaticamente en el bundle; sin ese
  prefijo, la variable no llega al cliente.
- Todo lo usado en esta version (`expo-camera`, `expo-image-picker`,
  `expo-sqlite`, `expo-crypto`, `react-native-webview`, `@expo/vector-icons`,
  `react-native-reanimated`/`react-native-worklets`, `@supabase/supabase-js`
  + `@react-native-async-storage/async-storage`) esta **incluido en el
  bundle nativo de Expo Go** — se puede probar en un iPhone real con la
  app Expo Go de la App Store, sin generar un development build.

---

## 12. Pendiente / fuera del MVP

- Subida de imagenes: resuelta para el portafolio de los tatuadores
  (bucket `portfolio` de Supabase Storage, ver
  20261002140000_portfolio_storage.sql y `services/imageUploadService.ts`),
  porque esas imagenes las tienen que ver OTRAS cuentas. Los disenos
  personales del usuario y los snapshots de camara siguen siendo URIs
  locales del dispositivo a proposito: no se comparten con nadie.
- Notificar al tatuador de una cita nueva es pasivo: la ve cuando abre su
  propia Agenda (RLS de `appointments` se lo permite), pero no hay push
  notification todavia. Requiere Expo push tokens + Supabase Realtime o
  una Edge Function.
- Migrar `appointments`/`profiles` de RLS "cualquiera de las dos partes
  puede actualizar cualquier campo" a policies mas finas (ej. que el
  cliente no pueda poner `status = 'confirmed'`, eso deberia ser solo del
  tatuador) — ver el TODO dentro de la migracion.
- La composicion realista sobre foto (`AIService.composeOnPhoto`) es el
  UNICO punto de la app donde una imagen del cuerpo del usuario sale
  del telefono. Por eso: es bajo demanda y nunca automatica, exige
  consentimiento explicito guardado en
  `settings.privacy.allowAiPhotoUpload` (arranca en false, revocable
  desde Ajustes), y la vista previa en vivo y el maniquin 3D siguen
  siendo locales para que decir que no no inutilice la app. Sigue
  abierto el hallazgo #5 de la auditoria: la API key viaja en el
  bundle, asi que antes de abrir esto al publico hay que moverla a una
  Edge Function.
- Tests: ya no son cero (`npm test`, preset `jest-expo`). Cubren la
  logica donde un fallo es SILENCIOSO: el mapeo de `profiles` a `Artist`,
  la limpieza de la imagen cuando falla el insert de un trabajo, el
  rollback del borrado optimista, el saludo por franja horaria y la
  geometria de los `.glb`. No hay todavia tests de componentes ni de
  navegacion.
- Texturizado real del diseno sobre la malla 3D en `editor.tsx`. El
  maniquin ya no es un placeholder remoto. Los `.glb` viven en
  `assets/models/` y tienen dos origenes distintos:
  Los dos (`masculine`, `feminine`) son **base meshes reales**
  importados con `tools/import-obj-model.mjs`, que convierte un `.obj`
  a `.glb` y lo normaliza a la convencion de la app: 1.80 m de alto,
  pies en y = 0, centrado en x/z y mirando a +Z. Rondan los 48.000
  triangulos y 870 KB cada uno, con dedos, rasgos y musculatura.

  Hubo un `tools/build-mannequin.mjs` que los generaba por codigo
  (lofts de secciones elipticas, sin assets externos) mientras no
  habia modelos de verdad. Se borro al llegar estos: ya no producia
  nada que se usara, y correrlo sobrescribia los modelos buenos. Esta
  en el historial de git si hiciera falta la tecnica.

  Los `.glb` se entregan como **asset de Metro** (ver `metro.config.js`,
  que añade `glb` a `assetExts`), no como cadena dentro del bundle JS:
  en base64 el femenino solo ya pesaria 1,2 MB de bundle, y habria que
  pasarlo entero por el puente hacia el WebView en cada cambio de
  silueta. `bodyModelService.modelUriFor()` lo lee en runtime con
  `expo-asset` + `expo-file-system` y lo convierte a data URI, cacheando
  la promesa por silueta; `controllers/useBodyModel.ts` expone eso a la
  pantalla con su estado de carga.

  Falta el pipeline de aplicar el PNG del diseno como decal. Los
  generados no llevan UVs (habria que emitirlas en el script:
  u = angulo del anillo, v = recorrido del loft); el importado si las
  tiene en el `.obj`, pero hoy se descartan con `--no-uv` porque nadie
  las usa todavia. Despues hay que mapear cada `BodyZone` a su rango uv
  en `bodyModelService.mapToMeshUV`.
- Mensajeria: se elimino por completo a pedido del usuario (pantalla
  `(tabs)/mensajes.tsx`, ruta `messages/[id].tsx`, entrada en el dashboard
  y en `sectionIcons.ts`). Si se vuelve a pedir, lo natural es una tabla
  de Supabase + `supabase.channel(...)` para tiempo real.
- Encendido/pulso de neon: implementado (`useNeonFlicker.ts`, usado por
  `NeonText`, `SectionIcon` y `NeonSwoosh`) y apagable desde "Reducir
  animaciones" en Ajustes. Quedan sin implementar micro-interacciones mas
  puntuales de la guia (trazo del subrayado, brillo que barre mientras
  "Genera con IA" esta cargando) — decorativas, priorizadas por debajo de
  tener cada pantalla y flujo completos. `theme/motion.ts` ya tiene las
  duraciones/curvas listas para sumarlas.
- "Privacidad y datos", "Centro de ayuda" y "Términos y privacidad" en
  Ajustes son filas sin pantalla destino todavia (placeholders visuales).
- Endurecer el storage de sesion de Supabase: hoy usa `AsyncStorage` plano;
  Supabase documenta una variante con `expo-secure-store` + cifrado AES
  para produccion.
- `userId` en `useEditorStore` sigue con el fallback `'current-user'`
  cuando no hay sesion resuelta a tiempo; las pantallas que si tienen
  session ya usan `useAuthStore().user.id` (crear diseno, mis citas,
  saludo del dashboard).
- Build de produccion / distribucion real: usar **EAS** (`eas build`,
  `eas submit`, `eas update`) para compilar y firmar en la nube sin Xcode
  ni Android Studio locales, y publicar en TestFlight/Play Store — Expo Go
  es solo para desarrollo, no para el build final.
