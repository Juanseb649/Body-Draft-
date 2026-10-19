import { bodyModelHtml } from '../organisms/bodyModelScene';

/**
 * La escena del maniquin es una cadena que corre en el WebView: un
 * error de sintaxis no lo ve TypeScript y en el telefono solo deja la
 * pantalla en negro. Los `import` del modulo se quitan (no se pueden
 * evaluar aqui); lo demas tiene que compilar.
 */
describe('bodyModelHtml', () => {
  it('el script de la escena compila', () => {
    const html = bodyModelHtml({
      modelUrl: 'data:model/gltf-binary;base64,AA',
      textureUrl: null,
      anchors: '{}',
      zone: null,
      background: '#131015',
    });
    const script = html.split('<script type="module">')[1].split('</script>')[0].replace(/^\s*import .*$/gm, '');
    expect(() => new Function(script)).not.toThrow();
  });

  it('trae el basurero para quitar el tatuaje arrastrandolo', () => {
    const html = bodyModelHtml({ modelUrl: 'x', textureUrl: null, anchors: '{}', zone: null, background: '#000' });
    expect(html).toContain('id="trash"');
    expect(html).toContain("post({ type: 'remove' })");
  });
});
