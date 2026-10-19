import { skinWrapHtml } from '../organisms/skinWrapScene';

/**
 * La escena es una cadena que corre dentro del WebView: un error de
 * sintaxis no lo ve TypeScript y en el telefono solo deja la foto sin
 * tatuaje. Esto al menos comprueba que el script compila.
 */
describe('skinWrapHtml', () => {
  it.each([
    ['con foto', 'data:image/jpeg;base64,AA'],
    ['sin foto (camara en vivo)', null],
  ])('el script compila %s', (_, photoUrl) => {
    const html = skinWrapHtml({ photoUrl, designUrl: 'data:image/png;base64,AA' });
    const script = html.split('<script>')[1].split('</script>')[0];
    expect(() => new Function(script)).not.toThrow();
  });
});
