// Lectura tolerante de variables de entorno (solo servidor).
// Se evalúan de forma perezosa para que `next build` no falle si faltan en la fase de build.

export function envString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function envInt(name: string, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const raw = envString(name);
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function envBool(name: string, fallback: boolean): boolean {
  const raw = envString(name)?.toLowerCase();
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on", "si", "sí"].includes(raw);
}
