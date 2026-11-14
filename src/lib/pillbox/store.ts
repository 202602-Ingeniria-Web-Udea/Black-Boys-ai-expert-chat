// Almacén del pastillero en el navegador (localStorage), compatible con useSyncExternalStore.
// Solo se importa desde componentes de cliente.
import { parseStored, serializeState, storageKey } from "./storage";
import type { PillboxState } from "./types";

interface Entry {
  raw: string | null;
  state: PillboxState;
}

const cache = new Map<string, Entry>();
/** Si el navegador no deja guardar (modo privado, almacenamiento lleno), el estado vive en memoria mientras dure la pestaña. */
const memory = new Map<string, PillboxState>();
const listeners = new Map<string, Set<() => void>>();

function readRaw(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

/** Devuelve siempre el mismo objeto mientras el contenido guardado no cambie (requisito de useSyncExternalStore). */
export function readState(userId: string): PillboxState {
  const raw = readRaw(userId);
  const cached = cache.get(userId);
  if (cached && cached.raw === raw) return cached.state;
  const fallback = raw === null ? memory.get(userId) : undefined;
  const state = fallback ?? parseStored(raw);
  cache.set(userId, { raw, state });
  return state;
}

/** Guarda el estado y avisa a quienes lo están mostrando. Devuelve false si no se pudo guardar en el navegador. */
export function writeState(userId: string, state: PillboxState): boolean {
  const raw = serializeState(state);
  let saved = true;
  try {
    localStorage.setItem(storageKey(userId), raw);
    memory.delete(userId);
  } catch {
    saved = false;
    memory.set(userId, state);
  }
  cache.set(userId, { raw: saved ? raw : null, state });
  listeners.get(userId)?.forEach((listener) => listener());
  return saved;
}

export function subscribeState(userId: string, listener: () => void): () => void {
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === storageKey(userId)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
