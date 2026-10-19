import { POSE_DOWNLOAD, poseHtml } from '../organisms/poseScene';

describe('poseHtml', () => {
  it('el script compila (corre dentro del WebView, TypeScript no lo ve)', () => {
    const html = poseHtml('data:image/jpeg;base64,AA');
    const script = html.split('<script type="module">')[1].split('</script>')[0];
    // Es un modulo con await de primer nivel: se envuelve en una funcion async.
    expect(() => new Function(`return (async () => { ${script} })`)).not.toThrow();
  });

  it('la foto va DENTRO del HTML: no se sube a ningun lado', () => {
    const html = poseHtml('data:image/jpeg;base64,FOTO');
    expect(html).toContain('data:image/jpeg;base64,FOTO');
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest|method: 'POST'/);
  });

  it('carga version fija del CDN y el modelo lite', () => {
    expect(POSE_DOWNLOAD.cdn).toMatch(/@mediapipe\/tasks-vision@\d+\.\d+\.\d+$/);
    expect(POSE_DOWNLOAD.model).toMatch(/pose_landmarker_lite\.task$/);
  });
});
