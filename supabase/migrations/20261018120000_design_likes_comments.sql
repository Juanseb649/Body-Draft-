-- BodyDraft — "me gusta", comentarios y citas a partir de un diseno.
--
-- Por que esto existe: el feed de Inicio solo dejaba MIRAR el trabajo
-- de un tatuador. Un cliente que encontraba un diseno que le gustaba no
-- podia decirlo, preguntar nada sobre el, ni agendar llevando ESE
-- diseno: tenia que ir al perfil y agendar "en general". Esta migracion
-- agrega:
--   1) `design_likes`: un "me gusta" por persona y diseno.
--   2) `design_comments`: comentarios publicos debajo de un diseno. No
--      es mensajeria (se quito a pedido del usuario, ver
--      ARCHITECTURE.md seccion 12): no hay conversaciones privadas, solo
--      lo que cualquiera que vea el diseno puede leer.
--   3) `appointments.design_id`: la cita recuerda de que diseno salio.
--
-- Como aplicar: pegar este archivo completo en el SQL Editor del
-- proyecto de Supabase (Dashboard > SQL Editor > New query) y ejecutar,
-- o `npx supabase db push`. Es idempotente: se puede correr mas de una vez.

-- ── design_likes ─────────────────────────────────────────────────────

create table if not exists public.design_likes (
  design_id uuid not null references public.designs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- La clave primaria ES la regla "un me gusta por persona": un
  -- segundo insert igual falla, sin depender de que la app lo evite.
  primary key (design_id, user_id)
);

create index if not exists design_likes_user_idx on public.design_likes (user_id);

alter table public.design_likes enable row level security;

-- Los contadores son publicos, igual que el diseno.
drop policy if exists "design_likes: readable by any signed-in user" on public.design_likes;
create policy "design_likes: readable by any signed-in user"
  on public.design_likes for select
  to authenticated
  using (true);

drop policy if exists "design_likes: users like as themselves" on public.design_likes;
create policy "design_likes: users like as themselves"
  on public.design_likes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "design_likes: users remove only their own" on public.design_likes;
create policy "design_likes: users remove only their own"
  on public.design_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- Sin policy de update a proposito: un "me gusta" se pone o se quita.

-- ── design_comments ──────────────────────────────────────────────────

create table if not exists public.design_comments (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Nombre visible del autor, copiado de `profiles` por el trigger de
  -- abajo. Hace falta guardarlo aqui porque la RLS de `profiles` NO
  -- deja que un cliente lea el perfil de otro cliente, asi que un join
  -- devolveria el nombre vacio para casi todos los comentarios.
  author_name text,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists design_comments_design_idx on public.design_comments (design_id, created_at);

alter table public.design_comments enable row level security;

drop policy if exists "design_comments: readable by any signed-in user" on public.design_comments;
create policy "design_comments: readable by any signed-in user"
  on public.design_comments for select
  to authenticated
  using (true);

drop policy if exists "design_comments: users comment as themselves" on public.design_comments;
create policy "design_comments: users comment as themselves"
  on public.design_comments for insert
  to authenticated
  with check (user_id = auth.uid());

-- Borra su comentario el autor, o el tatuador dueno del diseno (para
-- poder moderar lo que aparece debajo de su propio trabajo).
drop policy if exists "design_comments: author or design owner can delete" on public.design_comments;
create policy "design_comments: author or design owner can delete"
  on public.design_comments for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.designs d
      where d.id = design_comments.design_id and d.artist_id = auth.uid()
    )
  );

-- Sin policy de update: editar un comentario ya respondido cambiaria
-- el sentido de la conversacion debajo. Se borra y se escribe otro.

-- El nombre del autor no se acepta del cliente (podria firmar como
-- otra persona): el trigger lo pisa siempre con el de su perfil.
create or replace function public.design_comments_set_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.author_name := (select p.name from public.profiles p where p.id = new.user_id);
  new.body := btrim(new.body);
  return new;
end;
$$;

drop trigger if exists design_comments_set_author on public.design_comments;
create trigger design_comments_set_author
  before insert on public.design_comments
  for each row execute function public.design_comments_set_author();

-- ── appointments.design_id ───────────────────────────────────────────

alter table public.appointments
  add column if not exists design_id uuid references public.designs (id) on delete set null;

-- El diseno tiene que ser del MISMO tatuador con el que se agenda: si
-- no, un cliente podria pedirle a un artista el trabajo de otro.
create or replace function public.appointments_check_design_artist()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.design_id is not null and not exists (
    select 1 from public.designs d where d.id = new.design_id and d.artist_id = new.artist_id
  ) then
    raise exception 'El diseno % no pertenece al tatuador de la cita', new.design_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_check_design_artist on public.appointments;
create trigger appointments_check_design_artist
  before insert or update of design_id, artist_id on public.appointments
  for each row execute function public.appointments_check_design_artist();
