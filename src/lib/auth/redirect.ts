/**
 * Valida el parámetro `next` del login para evitar «open redirects»:
 * solo se aceptan rutas internas de la propia aplicación.
 */
export function safeNext(raw: string | string[] | undefined | null): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  if (!/^\/(chat|account|admin|pastillero)(\/|\?|#|$)/.test(value)) return null;
  return value;
}
