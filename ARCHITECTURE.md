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
    _layout.tsx                  Stack navigator raiz
    index.tsx                    Home
    design/create.tsx            Crear diseno
    editor/index.tsx             Editor (camara + ajustes)
    model3d/index.tsx            Maniquin 3D
    artists/index.tsx            Tatuadores
    appointment/[artistId].tsx   Agendar cita (ruta dinamica)
    appointment/mine.tsx         Mis citas

  components/                   VIEW — Atomic Design (no-route UI)
    atoms/AppButton.tsx
    molecules/TattooCard.tsx, ArtistCard.tsx
    organisms/CameraOverlay.tsx, BodyModelViewer.tsx

  controllers/                  CONTROLLER — un store Zustand por flujo
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
    aiService.ts / geminiAiService.ts
    storageService.ts / inMemoryStorageService.ts
    bodyModelService.ts

  core/
    services.ts                  cableado de DI (que implementacion usa cada interfaz)
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
app/index.tsx (Home)
   │ (AppButton "Crear diseno")
   ▼
app/design/create.tsx  ──uses──> useDesignStore ──> designRepository ──> aiService / storageService
   │ (elige/crea diseno)
   ▼
useEditorStore.selectDesign(designId)
   │
   ▼
app/editor/index.tsx  ──uses──> useEditorStore + useCameraController
   │  CameraOverlay (organism): arrastre → editor.move(...)
   │
   ├──(boton "Ver en maniquin 3D")──> app/model3d/index.tsx ──uses──> useEditorStore (mismo estado)
   │
   ▼ (AppButton "Guardar propuesta")
useEditorStore.save() ──> designRepository.saveProposal()
   ▼
app/artists/index.tsx ──uses──> useArtistStore ──> artistRepository
   │ (elige tatuador)
   ▼
app/appointment/[artistId].tsx ──uses──> useAppointmentStore ──> appointmentRepository
   ▼
Confirmacion → Home
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
alcance (ver seccion 10).

---

## 6. IA (Gemini)

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
(variable de entorno publica de Expo — ver seccion 9).

---

## 7. Tatuadores y plantillas

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

## 8. Persistencia

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

## 9. Variables de entorno y Expo Go

- Las variables que el bundle de JS necesita en tiempo de ejecucion (como
  la API key de Gemini) deben llevar el prefijo `EXPO_PUBLIC_` (p. ej.
  `EXPO_PUBLIC_GEMINI_API_KEY` en un archivo `.env` en la raiz) — es el
  mecanismo que Expo inlinea automaticamente en el bundle; sin ese
  prefijo, la variable no llega al cliente.
- Todo lo usado en esta primera version (`expo-camera`, `expo-image-picker`,
  `expo-sqlite`, `expo-crypto`, `react-native-webview`,
  `@react-native-community/datetimepicker`) esta **incluido en el bundle
  nativo de Expo Go** — se puede probar en un iPhone real con la app Expo
  Go de la App Store, sin generar un development build.

---

## 10. Pendiente / fuera del MVP

- Implementacion real de `StorageService` con expo-sqlite (`SQLiteProvider`
  + `useSQLiteContext`, esquema de tablas). Hoy `core/services.ts` usa
  `InMemoryStorageService` (`services/inMemoryStorageService.ts`), con
  datos de ejemplo, solo para poder navegar la app y revisar el diseno sin
  backend. Lo mismo con `ArtistRepository`, que devuelve una lista de
  tatuadores de prueba en lugar de llamar a un backend real.
- Subida de imagenes/snapshots a storage remoto (hoy se guardan URIs
  locales del dispositivo).
- Texturizado real del diseno sobre la malla 3D en `model3d/index.tsx`
  (`BodyModelViewer` ya renderiza un `.glb` de ejemplo; falta el asset real
  del maniquin y el pipeline de aplicar el PNG del diseno como decal).
- Autenticacion (hoy `userId` esta hardcodeado a `'current-user'`).
- Build de produccion / distribucion real: usar **EAS** (`eas build`,
  `eas submit`, `eas update`) para compilar y firmar en la nube sin Xcode
  ni Android Studio locales, y publicar en TestFlight/Play Store — Expo Go
  es solo para desarrollo, no para el build final.
