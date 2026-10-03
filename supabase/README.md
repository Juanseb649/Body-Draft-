# Esquema de Supabase

Este directorio es la fuente de verdad versionada del esquema/RLS del
backend (antes no existía — ver auditoría, hallazgo #7). Las migraciones
en `migrations/` son SQL plano; se pueden aplicar a mano (pegándolas en
el SQL Editor del dashboard) o con la Supabase CLI.

## Aplicar lo que ya existe (primera vez)

1. Abrir el proyecto en [supabase.com](https://supabase.com) → **SQL
   Editor** → **New query**.
2. Pegar el contenido completo de cada archivo en `migrations/`, en
   orden (por nombre/fecha), y ejecutar.

El orden importa en dos de ellas: `20261002130000_seed_demo_artists.sql`
siembra cuentas cuyo rol lo escribe el trigger que define
`20261002120000_role_from_signup.sql`.

## Qué hay en cada migración

| Archivo | Qué hace |
| --- | --- |
| `20260929120000_profiles_and_appointments.sql` | `profiles` + `appointments`, RLS y el trigger que crea el perfil al registrarse |
| `20260930120000_artist_designs.sql` | `designs`: el catálogo público que alimenta el feed de Inicio |
| `20261002120000_role_from_signup.sql` | El rol y la especialidad se eligen **al registrarse**, no después en Ajustes |
| `20261002130000_seed_demo_artists.sql` | Dos tatuadores de demostración con portafolio (**solo desarrollo**) |
| `20261002140000_portfolio_storage.sql` | Bucket `portfolio` de Storage: lectura pública, escritura solo en la carpeta propia |

## Comprobar que quedó bien

Después de aplicar las dos últimas:

```bash
node tools/verify-artists.mjs
```

Inicia sesión con una de las cuentas sembradas y lee `profiles` y
`designs` por la API pública, con la misma anon key y las mismas
policies de RLS que usa la app — o sea, comprueba lo que la app va a
ver, no lo que hay en la base por detrás.

## Adoptar la Supabase CLI (recomendado, no obligatorio)

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>   # Project Settings > General
```

**Capturar cualquier cambio hecho a mano en el dashboard que no esté en
git** (por ejemplo, si el esquema real del proyecto ya tenía algo antes
de que existiera este directorio):

```bash
npx supabase db pull
```

Esto genera una migración nueva con la diferencia entre lo que hay en
`migrations/` y lo que realmente existe en el proyecto — revisarla antes
de commitearla, puede incluir objetos que Supabase crea por defecto.

**Para el próximo cambio de esquema** (nueva tabla, columna, policy):
editar el esquema en el dashboard como de costumbre y despues correr

```bash
npx supabase db diff -f nombre_del_cambio
```

para generar el archivo de migración correspondiente, en vez de dejar el
cambio solo en el dashboard sin registro en git.

## Migraciones

| Archivo | Qué agrega |
| --- | --- |
| `20260929120000_profiles_and_appointments.sql` | `profiles` (rol cliente/tatuador, se crea solo al registrarse) y `appointments` (citas compartidas entre cliente y tatuador, con RLS). |
