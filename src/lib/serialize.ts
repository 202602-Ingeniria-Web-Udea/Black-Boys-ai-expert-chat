// Convierte los resultados de la base de datos (con objetos Date) en datos planos serializables
// (fechas ISO en texto) para pasarlos de componentes de servidor a componentes de cliente.

export type Plain<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<Plain<U>>
    : T extends object
      ? { [K in keyof T]: Plain<T[K]> }
      : T;

export function plain<T>(value: T): Plain<T> {
  return JSON.parse(JSON.stringify(value)) as Plain<T>;
}
