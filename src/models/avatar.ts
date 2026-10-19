/**
 * La inicial que representa a una persona cuando no tiene foto.
 *
 * La primera letra o digito del nombre, en mayuscula (con las reglas
 * del español: "ñ" → "Ñ", "á" → "Á"). Se saltan espacios, comillas y
 * emojis del principio. Sin nada utilizable, "?".
 */
export function initialOf(name: string | null | undefined): string {
  if (!name) return '?';
  const match = name.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase('es') : '?';
}

export interface GlyphBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * La caja de vista (cuadrada) que deja la TINTA de una letra justo en
 * el centro del avatar, ocupando `fill` (0..1) de su lado mayor.
 *
 * Se centra por la caja real del trazado y no por las metricas de la
 * fuente: en una cursiva cada mayuscula tiene su propio vuelo a un lado
 * y su propia altura, y centrar el <Text> dejaba la "B" corrida a la
 * derecha y la "J" colgando hacia abajo.
 */
export function centeredViewBox(box: GlyphBox, fill = 0.56): { x: number; y: number; size: number } {
  const width = box.x2 - box.x1;
  const height = box.y2 - box.y1;
  const size = Math.max(width, height) / fill;
  const cx = (box.x1 + box.x2) / 2;
  const cy = (box.y1 + box.y2) / 2;
  return { x: cx - size / 2, y: cy - size / 2, size };
}
