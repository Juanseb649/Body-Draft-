-- BodyDraft — dos tatuadores de demostracion, con portafolio.
--
-- Por que esto existe: la app arrancaba vacia. "Artistas" no listaba a
-- nadie, el feed de Inicio no tenia nada que mostrar y "Nueva cita" no
-- ofrecia con quien agendar, porque `profiles` solo se llena cuando
-- alguien se registra y ninguna cuenta real tenia `role = 'artist'`.
-- Sin datos no se puede probar ni enseñar ninguno de esos flujos.
--
-- Por que se insertan las cuentas a mano en vez de registrarlas desde
-- la app: este proyecto tiene la confirmacion por correo ACTIVADA
-- (`mailer_autoconfirm = false`), asi que un registro normal deja la
-- cuenta sin confirmar y sin sesion — y sin sesion las policies de RLS
-- impiden rellenar el perfil. El SQL Editor corre con privilegios
-- elevados, asi que aqui si se puede dejar la cuenta ya confirmada.
--
-- Requiere haber aplicado antes 20261002120000_role_from_signup.sql:
-- el rol y la especialidad llegan por `raw_user_meta_data` y es ese
-- trigger el que los escribe en `profiles`.
--
-- Como aplicar: pegar este archivo completo en el SQL Editor del
-- proyecto de Supabase (Dashboard > SQL Editor > New query) y ejecutar.
-- Es idempotente: se puede correr mas de una vez sin duplicar nada.
--
-- CUIDADO: son cuentas de DEMO con contrasena conocida
-- (`BodyDraft2026!`). No aplicar este archivo en produccion; al final
-- hay un bloque comentado para borrarlas.

-- `crypt()` y `gen_salt()` son de pgcrypto, que Supabase instala en el
-- esquema `extensions`, no en `public`.
set search_path = public, extensions;

do $$
declare
  demo record;
  new_user_id uuid;
begin
  for demo in
    select *
    from (
      values
        (
          'nora.vega@bodydraft.demo',
          'Nora Vega',
          'Blackwork',
          'Line work y blackwork de inspiracion botanica. Doce años tatuando, los ultimos seis en estudio propio. Cito con boceto previo y una prueba de tamaño sobre la piel.',
          'Bogota, Colombia',
          4.8
        ),
        (
          'ruben.salas@bodydraft.demo',
          'Ruben Salas',
          'Realismo',
          'Realismo en negro y gris, retrato y fauna. Trabajo por sesiones largas y pido referencia fotografica en alta resolucion antes de agendar.',
          'Medellin, Colombia',
          4.6
        )
    ) as t(email, name, specialty, bio, location, rating)
  loop
    -- ── la cuenta ────────────────────────────────────────────────────
    select id into new_user_id from auth.users where email = demo.email;

    if new_user_id is null then
      new_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        -- GoTrue espera cadena vacia, no NULL, en los tokens: con NULL
        -- el inicio de sesion falla al intentar compararlos.
        confirmation_token, recovery_token, email_change_token_new, email_change
      )
      values (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
        demo.email, crypt('BodyDraft2026!', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        -- Esto es lo que lee handle_new_user(): el trigger crea la fila
        -- de `profiles` con el rol y la especialidad ya puestos.
        jsonb_build_object('name', demo.name, 'role', 'artist', 'specialty', demo.specialty),
        '', '', '', ''
      );

      -- Sin fila en auth.identities el login por email/contrasena no
      -- encuentra la identidad y devuelve "Invalid login credentials".
      insert into auth.identities (
        provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      )
      values (
        new_user_id::text, new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', demo.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;

    -- ── el perfil ────────────────────────────────────────────────────
    -- El trigger ya deberia haber creado la fila con id/name/role/
    -- specialty, pero se hace upsert y no update por si la cuenta ya
    -- existia de antes sin perfil. `coalesce` deja intacto cualquier
    -- dato que el propio tatuador haya editado ya desde la app.
    insert into public.profiles (id, name, role, specialty, bio, location, rating, portfolio_image_urls)
    values (
      new_user_id, demo.name, 'artist', demo.specialty, demo.bio, demo.location, demo.rating,
      array[
        'https://picsum.photos/seed/' || split_part(demo.email, '@', 1) || '-p1/800/1000',
        'https://picsum.photos/seed/' || split_part(demo.email, '@', 1) || '-p2/800/1000',
        'https://picsum.photos/seed/' || split_part(demo.email, '@', 1) || '-p3/800/1000'
      ]
    )
    on conflict (id) do update set
      role = 'artist',
      name = coalesce(profiles.name, excluded.name),
      specialty = coalesce(profiles.specialty, excluded.specialty),
      bio = coalesce(profiles.bio, excluded.bio),
      location = coalesce(profiles.location, excluded.location),
      rating = coalesce(profiles.rating, excluded.rating),
      portfolio_image_urls = case
        when profiles.portfolio_image_urls = '{}' then excluded.portfolio_image_urls
        else profiles.portfolio_image_urls
      end;
  end loop;
end
$$;

-- ── trabajos publicados (feed de Inicio y portafolio) ────────────────
-- `designs.id` se genera solo, asi que la guarda contra duplicados es
-- por (artista, titulo) y no un ON CONFLICT.
insert into public.designs (artist_id, title, description, image_url, style)
select u.id, d.title, d.description, d.image_url, d.style
from (
  values
    ('nora.vega@bodydraft.demo', 'Helecho en el antebrazo', 'Line work fino, sin relleno.', 'https://picsum.photos/seed/nora-d1/800/1000', 'Blackwork'),
    ('nora.vega@bodydraft.demo', 'Polilla geometrica', 'Simetria a mano alzada sobre el esternon.', 'https://picsum.photos/seed/nora-d2/800/1000', 'Blackwork'),
    ('nora.vega@bodydraft.demo', 'Rama de olivo', 'Pieza pequeña, una sola sesion.', 'https://picsum.photos/seed/nora-d3/800/1000', 'Fine line'),
    ('ruben.salas@bodydraft.demo', 'Retrato en negro y gris', 'Tres sesiones de cuatro horas.', 'https://picsum.photos/seed/ruben-d1/800/1000', 'Realismo'),
    ('ruben.salas@bodydraft.demo', 'Lobo en el hombro', 'Degradado suave, sin linea de contorno.', 'https://picsum.photos/seed/ruben-d2/800/1000', 'Realismo'),
    ('ruben.salas@bodydraft.demo', 'Reloj de bolsillo', 'Detalle de engranajes a escala 1:1.', 'https://picsum.photos/seed/ruben-d3/800/1000', 'Realismo')
) as d(email, title, description, image_url, style)
join auth.users u on u.email = d.email
where not exists (
  select 1 from public.designs x where x.artist_id = u.id and x.title = d.title
);

-- ── comprobacion ─────────────────────────────────────────────────────
-- Deberia devolver dos filas, cada una con 3 trabajos y 3 imagenes.
select
  p.name,
  p.role,
  p.specialty,
  p.location,
  array_length(p.portfolio_image_urls, 1) as imagenes_portafolio,
  (select count(*) from public.designs d where d.artist_id = p.id) as trabajos
from public.profiles p
join auth.users u on u.id = p.id
where u.email in ('nora.vega@bodydraft.demo', 'ruben.salas@bodydraft.demo');

-- ── para deshacer ────────────────────────────────────────────────────
-- Borrar las cuentas de demo arrastra en cascada su perfil, sus
-- disenos y sus citas (todas las FK son ON DELETE CASCADE):
--
--   delete from auth.users
--   where email in ('nora.vega@bodydraft.demo', 'ruben.salas@bodydraft.demo');
