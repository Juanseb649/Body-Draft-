/**
 * Saludo segun la hora del dia, para la cabecera de Inicio.
 *
 * Vive fuera de la pantalla porque son reglas con bordes (a las 12 en
 * punto ya es "tardes", a las 20 ya es "noches") que conviene poder
 * probar sin montar la pantalla entera.
 */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
