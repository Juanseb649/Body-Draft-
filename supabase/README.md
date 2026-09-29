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
