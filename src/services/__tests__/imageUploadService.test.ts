import { pathFromPublicUrl } from '../imageUploadService';

const BASE = 'https://agzwacjslqjrivgmqgqa.supabase.co/storage/v1/object/public/portfolio';

/**
 * De esta funcion depende que al quitar un trabajo tambien se borre su
 * imagen. Si devuelve null de mas, el bucket se va llenando de archivos
 * huerfanos sin que nada lo avise; si devuelve una ruta equivocada, se
 * intenta borrar un archivo ajeno (la policy lo impide, pero el error
 * tampoco se ve porque el borrado va con .catch()).
 */
describe('pathFromPublicUrl', () => {
  it('saca la ruta dentro del bucket', () => {
    expect(pathFromPublicUrl(`${BASE}/abc-123/1700000000-x9k2.jpg`)).toBe('abc-123/1700000000-x9k2.jpg');
  });

  it('ignora los parametros de query que añade el CDN', () => {
    expect(pathFromPublicUrl(`${BASE}/abc-123/foto.png?width=800&t=2`)).toBe('abc-123/foto.png');
  });

  it('decodifica los nombres con caracteres escapados', () => {
    expect(pathFromPublicUrl(`${BASE}/abc-123/boceto%20final.png`)).toBe('abc-123/boceto final.png');
  });

  // Las imagenes sembradas por SQL apuntan a picsum, y las de un diseno
  // personal son file:// del telefono: ninguna es nuestra y borrarlas
  // no tiene sentido.
  it.each([
    ['una imagen de otro servicio', 'https://picsum.photos/seed/nora-d1/800/1000'],
    ['una URI local del telefono', 'file:///data/user/0/host.exp.exponent/cache/boceto.jpg'],
    ['otro bucket del mismo proyecto', `${BASE.replace('/portfolio', '/avatars')}/abc-123/foto.jpg`],
    ['una cadena vacia', ''],
  ])('devuelve null para %s', (_caso, url) => {
    expect(pathFromPublicUrl(url)).toBeNull();
  });

  it('devuelve null si la URL termina en el bucket y no hay archivo', () => {
    expect(pathFromPublicUrl(`${BASE}/`)).toBeNull();
  });
});
