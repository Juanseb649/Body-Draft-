-- BodyDraft — bucket de Storage para el portafolio de los tatuadores.
--
-- Por que esto existe: hasta ahora toda imagen que subia el usuario se
-- guardaba como URI local del dispositivo (`file:///data/user/0/...`).
-- Eso funciona para un diseno personal, que nunca sale de ese telefono,
-- pero NO para el portafolio de un tatuador: `designs.image_url` lo
-- leen otras cuentas desde otros telefonos, donde esa ruta no existe y
-- la imagen sale rota. Hace falta que el binario viva en el servidor.
--
-- El bucket es publico de lectura a proposito: un portafolio esta hecho
-- para enseñarse, y asi `<Image source={{ uri }}>` funciona sin tener
-- que firmar cada URL ni meter el token de sesion en la peticion. La
-- escritura si esta cerrada: cada tatuador solo puede tocar su propia
-- carpeta.
--
-- Como aplicar: pegar este archivo completo en el SQL Editor del
-- proyecto de Supabase (Dashboard > SQL Editor > New query) y ejecutar.
-- Es idempotente: se puede correr mas de una vez.

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

-- Las rutas son `<uid>/<archivo>`, asi que el primer segmento del path
-- identifica al dueno. `storage.foldername(name)` lo devuelve como
-- array; el elemento 1 es esa carpeta.
drop policy if exists "portfolio: public read" on storage.objects;
create policy "portfolio: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'portfolio');

drop policy if exists "portfolio: owner uploads to own folder" on storage.objects;
create policy "portfolio: owner uploads to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolio: owner updates own files" on storage.objects;
create policy "portfolio: owner updates own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolio: owner deletes own files" on storage.objects;
create policy "portfolio: owner deletes own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
