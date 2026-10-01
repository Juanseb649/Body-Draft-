-- BodyDraft — catalogo publico de trabajos/plantillas de tatuadores.
--
-- Por que esto existe: los disenos vivian solo en el almacenamiento
-- local del dispositivo (expo-sqlite), asi que el "feed" de Inicio solo
-- podia mostrar lo que el propio usuario tuviera en su telefono — nunca
-- el trabajo de OTROS artistas. Igual que con `appointments`, un dato
-- que se ve desde varias cuentas no puede vivir solo en una.
--
-- Los disenos personales del usuario (generados con IA o subidos por el)
-- siguen siendo locales: son de una sola cuenta y no se comparten.
--
-- Como aplicar: pegar este archivo completo en el SQL Editor del
-- proyecto de Supabase (Dashboard > SQL Editor > New query) y ejecutar.
-- Es idempotente: se puede volver a correr sin error.

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,
  style text,
  created_at timestamptz not null default now()
);

create index if not exists designs_created_at_idx on public.designs (created_at desc);

alter table public.designs enable row level security;

-- Catalogo publico: cualquier usuario logueado puede ver el trabajo de
-- cualquier tatuador (es justamente el feed de Inicio).
drop policy if exists "designs: readable by any signed-in user" on public.designs;
create policy "designs: readable by any signed-in user"
  on public.designs for select
  to authenticated
  using (true);

-- Solo el tatuador dueno publica/edita/borra su propio trabajo.
drop policy if exists "designs: artists insert their own" on public.designs;
create policy "designs: artists insert their own"
  on public.designs for insert
  to authenticated
  with check (artist_id = auth.uid());

drop policy if exists "designs: artists update their own" on public.designs;
create policy "designs: artists update their own"
  on public.designs for update
  to authenticated
  using (artist_id = auth.uid());

drop policy if exists "designs: artists delete their own" on public.designs;
create policy "designs: artists delete their own"
  on public.designs for delete
  to authenticated
  using (artist_id = auth.uid());
