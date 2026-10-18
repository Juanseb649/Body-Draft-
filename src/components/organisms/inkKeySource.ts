/**
 * Recorte del fondo y color del boceto, como CODIGO FUENTE para los
 * WebView (piel en la camara/foto y maniquin 3D). Es una cadena porque
 * corre dentro del WebView, no en React Native; los dos lo incrustan
 * igual, y los tests lo evaluan tal cual (ver __tests__/inkKey.test.ts),
 * asi que lo que se prueba es exactamente lo que corre.
 *
 * Antes el fondo se quitaba con "alfa = 1 - luminancia": funciona para
 * tinta negra sobre papel blanco, pero borraba cualquier color claro
 * (un amarillo o un celeste quedaban casi transparentes) y el modo por
 * defecto pintaba todo de negro: los disenos a color no se veian a color.
 *
 * Ahora:
 * 1. Fondo: se mide el color del papel en el BORDE de la imagen (la
 *    mediana, para que una mancha no lo cambie). Si el borde ya es
 *    transparente (un PNG recortado), no se toca.
 * 2. Cada pixel es tinta segun cuanto se ALEJA de ese color de papel,
 *    no segun lo oscuro que es: un rojo sobre blanco se queda entero.
 *    La transicion es suave para que el borde del trazo no quede dentado.
 * 3. Se le quita al pixel el tinte del papel que traia mezclado (asi el
 *    borde no queda con halo blanco) y se aplica el modo:
 *    - 'color': los colores del diseno, apenas apagados, como tinta bajo
 *      la piel.
 *    - 'bn': blanco y negro; los tonos pasan a negro/gris de tatuaje.
 */
export const INK_KEY_SOURCE = String.raw`
function keyInk(p, w, h, opts) {
  var mode = opts.mode === 'bn' ? 'bn' : 'color';
  var removeBg = opts.removeBg !== false;
  var INK = [24, 26, 34];

  // --- 1. color del papel: mediana del borde -------------------------
  var rs = [], gs = [], bs = [], transparentEdge = 0, samples = 0;
  var step = Math.max(1, Math.floor((w + h) / 200));
  function sample(x, y) {
    var i = (y * w + x) * 4;
    samples++;
    if (p[i + 3] < 16) { transparentEdge++; return; }
    rs.push(p[i]); gs.push(p[i + 1]); bs.push(p[i + 2]);
  }
  for (var x = 0; x < w; x += step) { sample(x, 0); sample(x, h - 1); }
  for (var y = 0; y < h; y += step) { sample(0, y); sample(w - 1, y); }
  function median(a) { if (!a.length) return 255; a.sort(function (m, n) { return m - n; }); return a[a.length >> 1]; }
  var bg = [median(rs), median(gs), median(bs)];
  // Un PNG que ya viene recortado no tiene papel que quitar.
  var alreadyCut = samples > 0 && transparentEdge / samples > 0.5;

  var T0 = 0.09, T1 = 0.26; // distancia (0..1) donde empieza / termina la tinta

  for (var i = 0; i < p.length; i += 4) {
    var r = p[i], g = p[i + 1], b = p[i + 2], a = p[i + 3] / 255;

    if (removeBg && !alreadyCut) {
      var dr = r - bg[0], dg = g - bg[1], db = b - bg[2];
      var d = Math.sqrt(dr * dr + dg * dg + db * db) / 441.7;
      var t = (d - T0) / (T1 - T0);
      var k = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
      a = Math.min(a, k);
      // --- 3. quitar el tinte del papel en los bordes ----------------
      if (k > 0 && k < 1) {
        r = (r - bg[0] * (1 - k)) / k;
        g = (g - bg[1] * (1 - k)) / k;
        b = (b - bg[2] * (1 - k)) / k;
      }
    }

    if (mode === 'bn') {
      var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      lum = lum < 0 ? 0 : lum > 1 ? 1 : lum;
      // Lo oscuro es tinta negra; lo claro, gris (sombreado), algo mas transparente.
      var v = lum * 170;
      r = INK[0] + (v - INK[0]) * lum; g = INK[1] + (v - INK[1]) * lum; b = INK[2] + (v - INK[2]) * lum;
      a = a * (1 - lum * 0.45);
    } else {
      // Tinta bajo la piel: un 12 % menos saturada que en el papel.
      var gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = r * 0.88 + gray * 0.12; g = g * 0.88 + gray * 0.12; b = b * 0.88 + gray * 0.12;
    }

    p[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    p[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    p[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    p[i + 3] = Math.round((a < 0 ? 0 : a > 1 ? 1 : a) * 255);
  }
  return { background: bg, alreadyCut: alreadyCut };
}
`;
