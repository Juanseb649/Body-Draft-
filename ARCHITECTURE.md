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
si "generar con IA" implica una o varias llamadas a Gemini. El repositorio
absorbe esa decision (ver `data/designRepository.ts`).

---

## 2. Mapa de carpetas

```text
src/
  app/                          VIEW — rutas (Expo Router, file-based)
    _layout.tsx                  Stack raiz: fuentes, gestos, tema, auth listener
    index.tsx                    Puerta de entrada: redirige a (auth) o (app) segun sesion
    (auth)/                      Grupo SIN sesion (Expo Router route group)
      _layout.tsx                 Stack; redirige a /dashboard si ya hay sesion
      login.tsx
      register.tsx
    (app)/                       Grupo CON sesion
      _layout.tsx                 Drawer (sidebar) — ver seccion 6
      dashboard.tsx                Home del area autenticada
      design/create.tsx            Crear diseno
      editor/index.tsx             Editor (camara + ajustes)
      model3d/index.tsx            Maniquin 3D
      artists/index.tsx            Tatuadores
      appointment/[artistId].tsx   Agendar cita (ruta dinamica, sin item en el sidebar)
      appointment/mine.tsx         Mis citas

  components/                   VIEW — Atomic Design (no-route UI)
    atoms/AppButton.tsx, NeonWall.tsx, ...
    molecules/TattooCard.tsx, ArtistCard.tsx, BodyDraftLogo.tsx
    organisms/CameraOverlay.tsx, BodyModelViewer.tsx, DrawerContent.tsx

  controllers/                  CONTROLLER — un store Zustand por flujo
    useAuthStore.ts               sesion/usuario + signUp/signIn/signOut
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
    aiService.ts / geminiAiService.ts
    storageService.ts / inMemoryStorageService.ts
    bodyModelService.ts

  core/
    services.ts                  cableado de DI (que implementacion usa cada interfaz)

  theme/
    colors.ts                    palette (marca, fija) + darkColors/lightColors
    ThemeContext.tsx               ThemeProvider + useTheme() — interruptor real
    typography.ts
```

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
app/index.tsx ──> (sin sesion) app/(auth)/login.tsx o register.tsx
   │                              │ useAuthStore.signIn/signUp
   │                              ▼ router.replace('/dashboard')
   └──> (con sesion) ────> app/(app)/dashboard.tsx  ← pantalla distinta a login
                               │ (AppButton "Crear diseno", o sidebar)
                               ▼
app/(app)/design/create.tsx  ──uses──> useDesignStore ──> designRepository ──> aiService / storageService
   │ (elige/crea diseno)
   ▼
useEditorStore.selectDesign(designId)
   │
   ▼
app/(app)/editor/index.tsx  ──uses──> useEditorStore + useCameraController
   │  CameraOverlay (organism): arrastre → editor.move(...)
   │
   ├──(boton "Ver en maniquin 3D")──> app/(app)/model3d/index.tsx ──uses──> useEditorStore (mismo estado)
   │
   ▼ (AppButton "Guardar propuesta")
useEditorStore.save() ──> designRepository.saveProposal()
   ▼
app/(app)/artists/index.tsx ──uses──> useArtistStore ──> artistRepository
   │ (elige tatuador)
   ▼
app/(app)/appointment/[artistId].tsx ──uses──> useAppointmentStore ──> appointmentRepository
   ▼
Confirmacion → Dashboard

En cualquier punto dentro de (app)/, deslizar desde el borde izquierdo abre
el sidebar (DrawerContent) con acceso directo a cualquier seccion + tema +
cerrar sesion — ver seccion 7.
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
2. `app/editor/index.tsx` (camara) y `app/model3d/index.tsx` (maniquin)
   leen y escriben sobre **el mismo store**, asi que un cambio de zona o
   escala en una vista se refleja en la otra.
3. `bodyModelService.ts` resuelve dos cosas:
   - `modelAssetFor(silhouette)`: que maniquin `.glb` generico cargar
     (`neutral`, `masculine`, `feminine` — la app es neutral por defecto
     respecto al sexo del usuario, ver `models/bodyZone.ts`).
   - `mapToMeshUV(...)`: traduce la colocacion 2D ajustada en camara a la
     region UV de esa malla (mismo `BodyZone` en las tres siluetas, por
     compartir topologia).
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

**Navegacion segun sesion, con Expo Router route groups:**

```text
app/
  index.tsx        "/" — puerta de entrada: espera isInitialized y
                    hace <Redirect> a (auth)/login o (app)/dashboard
  (auth)/            grupo SIN sesion — no agrega segmento a la URL
    _layout.tsx        Stack; si ya hay sesion, <Redirect> a /dashboard
    login.tsx           al loguear, router.replace('/dashboard') — una
                         pantalla DISTINTA, no el mismo login re-pintado
    register.tsx
  (app)/              grupo CON sesion
    _layout.tsx        Drawer (sidebar); si NO hay sesion, <Redirect> a /login
    dashboard.tsx ...  (resto de las pantallas, ver seccion 7)
```

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

## 7. Sidebar (Drawer) y tema claro/oscuro

**Sidebar:** `(app)/_layout.tsx` usa `Drawer` de `expo-router/drawer`
(bundlado en `expo-router` desde SDK 56+, sobre `react-native-drawer-layout`
+ `react-native-reanimated`/`react-native-worklets`). El contenido del
sidebar es un componente 100% propio, `DrawerContent`
(`components/organisms/DrawerContent.tsx`): logo, lista de secciones
(navega con `router.push`), el interruptor de tema y "Cerrar sesion" — no
depende de las props que Drawer inyecta, asi que no esta atado a la forma
exacta de esa API.

Para el efecto "estilo Twitter/X" (deslizar desde el borde izquierdo revela
el sidebar *detras* del contenido, que se desliza para mostrarlo) se usa
`screenOptions={{ drawerType: 'back' }}`: el sidebar queda fijo detras y la
pantalla activa se desliza encima al arrastrar. Es el mismo mecanismo base
que usa la app de Twitter/X. **Simplificacion consciente:** no se implemento
el efecto adicional de que la tarjeta de contenido se *encoja* en escala
mientras se desliza (el detalle mas fino de esa animacion) — requeriria
leer el progreso del gesto con Reanimated y animar `transform: scale`
manualmente, y el paquete que Expo Router usa para el Drawer no documenta un
hook publico para eso. Con `drawerType: 'back'` el gesto de arrastre, la
revelacion del sidebar detras del contenido y el cierre por swipe ya
funcionan de forma nativa; la animacion de escala queda como posible
refinamiento futuro (ver seccion 12).

**Tema claro/oscuro:** `theme/ThemeContext.tsx` expone `ThemeProvider` +
`useTheme()`. Arranca con la preferencia del sistema (`useColorScheme`),
persiste la eleccion del usuario en `AsyncStorage`, y expone
`{ scheme, colors, toggleTheme }`. `theme/colors.ts` separa dos capas:

- `palette` / `glow`: los acentos de marca (fuchsia/azul/ambar del efecto
  neon) — **fijos**, se ven igual en ambos temas.
- `darkColors` / `lightColors`: fondo, superficie y texto — estos si
  cambian con el tema.

Cada pantalla/componente que necesita color llama a `useTheme()` y arma sus
estilos con una funcion `createStyles(colors)` (en vez de un
`StyleSheet.create` estatico con colores fijos), para que cambiar el
interruptor re-renderice con la paleta correcta en toda la app. El
interruptor en si vive en `DrawerContent` (siempre a un swipe de distancia,
sin pantalla de "Ajustes" separada).

---

## 8. IA (Gemini)

`AIService` (`services/aiService.ts`) es la unica puerta de entrada a IA;
`GeminiAIService` es su implementacion concreta, sobre el SDK
`@google/generative-ai`. Responsabilidades cubiertas por la interfaz:

| Metodo                     | Uso                                                   |
| --------------------------- | ------------------------------------------------------ |
| `generateFromDescription`   | "Serpiente con flores, estilo japones..." → TattooDesign |
| `analyzeReferenceImage`     | Identificar elementos principales de una imagen subida |
| `generateVariations`        | Variaciones de un diseno existente                     |
| `adaptToStyle`               | Adaptar una referencia a un estilo distinto             |
| `removeBackground`          | Dejar solo el trazo, listo para superponerse            |

`useDesignStore` es el unico Controller que llama `AIService` (via
`designRepository`); ningun otro Controller ni ninguna View habla con
Gemini directamente. La API key se lee de `process.env.EXPO_PUBLIC_GEMINI_API_KEY`
(variable de entorno publica de Expo — ver seccion 11).

---

## 9. Tatuadores y plantillas

Un tatuador es un `AppUser` con `role: 'artist'`. Cuando publica una
plantilla, crea un `TattooDesign` con `source: 'artistTemplate'` y su
propio `artistId` — usando el **mismo** `useDesignStore` /
`designRepository` que un cliente usa para sus disenos personales o
generados por IA. Consecuencia directa de este diseno: una plantilla de
tatuador entra automaticamente al mismo `editor/index.tsx` /
`model3d/index.tsx` que cualquier otro diseno, sin pantallas ni pipelines
separados. `designRepository.getArtistTemplates(artistId)` filtra el
catalogo de un tatuador para mostrarlo en su perfil/portafolio.

---

## 10. Persistencia

- **Local (`StorageService`, implementacion pendiente con expo-sqlite):**
  disenos, propuestas y citas del usuario, para que "Mis disenos" y "Mis
  citas" funcionen sin conexion.
- **Remota (`ArtistRepository`, pendiente de backend real):** catalogo de
  tatuadores y disponibilidad, que cambia independientemente del uso local
  del usuario.

`core/services.ts` centraliza que implementacion concreta usa cada
interfaz (`AIService`, `StorageService`, `BodyModelService`), de modo que
sustituir Gemini por otro proveedor, o el storage en memoria por
expo-sqlite, no toca Controllers ni Views.

---

## 11. Variables de entorno y Expo Go

- Las variables que el bundle de JS necesita en tiempo de ejecucion (como
  las API keys de Gemini y Supabase) deben llevar el prefijo `EXPO_PUBLIC_`
  (`.env` en la raiz: `EXPO_PUBLIC_GEMINI_API_KEY`,
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — es el
  mecanismo que Expo inlinea automaticamente en el bundle; sin ese
  prefijo, la variable no llega al cliente.
- Todo lo usado en esta version (`expo-camera`, `expo-image-picker`,
  `expo-sqlite`, `expo-crypto`, `react-native-webview`,
  `@react-native-community/datetimepicker`, `expo-router/drawer` +
  `react-native-reanimated`/`react-native-worklets`,
  `@supabase/supabase-js` + `@react-native-async-storage/async-storage`)
  esta **incluido en el bundle nativo de Expo Go** — se puede probar en un
  iPhone real con la app Expo Go de la App Store, sin generar un
  development build.

---

## 12. Pendiente / fuera del MVP

- Implementacion real de `StorageService` con expo-sqlite (`SQLiteProvider`
  + `useSQLiteContext`, esquema de tablas). Hoy `core/services.ts` usa
  `InMemoryStorageService` (`services/inMemoryStorageService.ts`), con
  datos de ejemplo, solo para poder navegar la app y revisar el diseno sin
  backend. Lo mismo con `ArtistRepository`, que devuelve una lista de
  tatuadores de prueba en lugar de llamar a un backend real. (Ninguna de
  las dos depende de Supabase; solo la autenticacion lo usa por ahora.)
- Subida de imagenes/snapshots a storage remoto (hoy se guardan URIs
  locales del dispositivo).
- Texturizado real del diseno sobre la malla 3D en `model3d/index.tsx`
  (`BodyModelViewer` ya renderiza un `.glb` de ejemplo; falta el asset real
  del maniquin y el pipeline de aplicar el PNG del diseno como decal).
- El efecto de escala tipo Twitter/X en el sidebar (ver seccion 7) — hoy
  solo esta el `drawerType: 'back'` nativo.
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
