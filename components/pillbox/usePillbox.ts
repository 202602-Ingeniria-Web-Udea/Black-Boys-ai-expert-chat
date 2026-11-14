"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { readState, subscribeState, writeState } from "@/lib/pillbox/store";
import type { PillboxState } from "@/lib/pillbox/types";

/** Estado del pastillero de la persona. Es null en el servidor y durante la hidratación (se muestra un esqueleto). */
export function usePillbox(userId: string) {
  const subscribe = useCallback((listener: () => void) => subscribeState(userId, listener), [userId]);
  const state = useSyncExternalStore(subscribe, () => readState(userId), () => null);
  /** Aplica un cambio y lo guarda. Devuelve false si el navegador no permitió guardar. */
  const update = useCallback((change: (current: PillboxState) => PillboxState) => writeState(userId, change(readState(userId))), [userId]);
  return { state, update };
}

function subscribeClock(listener: () => void) {
  const id = window.setInterval(listener, 20_000);
  return () => window.clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);

/** La hora actual, redondeada al minuto. Es null en el servidor. */
export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribeClock, currentMinute, () => 0);
  return useMemo(() => (minute === 0 ? null : new Date(minute * 60_000)), [minute]);
}
