-- BodyDraft — perfiles de usuario (cliente/tatuador) y citas compartidas.
--
-- Por que esto existe: antes, "Agendar cita" solo escribia en el
-- almacenamiento local del dispositivo del CLIENTE. El tatuador nunca
-- podia enterarse de una reserva porque el dato nunca salia de ese
-- telefono, y el catalogo de tatuadores era un array hardcodeado sin
-- cuentas reales detras. Esta migracion agrega:
--   1) `profiles`: extiende auth.users con name/role/datos de tatuador.
--      Se crea automaticamente al registrarse (trigger mas abajo).
--   2) `appointments`: vive en Supabase (no local) porque una cita la
--      tienen que poder ver DOS cuentas distintas (cliente y tatuador) —
--      un dato compartido no puede vivir solo en el telefono de una.
--
-- Como aplicar: pegar este archivo completo en el SQL Editor del
-- proyecto de Supabase (Dashboard > SQL Editor > New query) y ejecutar.
-- Si mas adelante se adopta la Supabase CLI, este mismo archivo sirve
-- como primera migracion versionada (`supabase db push`).

-- ── profiles ─────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  role text not null default 'client' check (role in ('client', 'artist')),
  specialty text,
  bio text,
  location text,
  portfolio_image_urls text[] not null default '{}',
  rating numeric,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cualquier usuario logueado puede ver: su propio perfil (sea cliente o
-- tatuador) y el de CUALQUIER tatuador (para poder listarlos/agendar).
-- Los perfiles de otros CLIENTES no son visibles entre si.
-- (drop + create en vez de "create or replace": Postgres no tiene una
-- forma nativa de redefinir una policy existente, asi que se borra y se
-- vuelve a crear para que todo este archivo se pueda correr mas de una
-- vez sin error "ya existe".)
drop policy if exists "profiles: own row or any artist is readable" on public.profiles;
create policy "profiles: own row or any artist is readable"
  on public.profiles for select
  to authenticated
  using (role = 'artist' or id = auth.uid());

drop policy if exists "profiles: users insert only their own row" on public.profiles;
create policy "profiles: users insert only their own row"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles: users update only their own row" on public.profiles;
create policy "profiles: users update only their own row"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Crea el perfil automaticamente cuando alguien se registra (el nombre
-- viene de `options.data.name` que ya manda SupabaseAuthService.signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── appointments ─────────────────────────────────────────────────────

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  proposal_id text,
  date_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

-- Solo las dos partes de la cita pueden verla.
drop policy if exists "appointments: visible to the client or the artist involved" on public.appointments;
create policy "appointments: visible to the client or the artist involved"
  on public.appointments for select
  to authenticated
  using (client_id = auth.uid() or artist_id = auth.uid());

-- Un cliente solo puede crear citas a su propio nombre.
drop policy if exists "appointments: clients create only their own bookings" on public.appointments;
create policy "appointments: clients create only their own bookings"
  on public.appointments for insert
  to authenticated
  with check (client_id = auth.uid());

-- Cualquiera de las dos partes puede actualizar el estado (cliente
-- cancela, tatuador confirma). TODO endurecer: hoy no se restringe QUE
-- transicion de status puede hacer cada rol (ej. el cliente tambien
-- podria poner status='confirmed'); para eso hace falta una policy mas
-- fina que compare el valor viejo y el nuevo por columna.
drop policy if exists "appointments: either party can update status" on public.appointments;
create policy "appointments: either party can update status"
  on public.appointments for update
  to authenticated
  using (client_id = auth.uid() or artist_id = auth.uid());
