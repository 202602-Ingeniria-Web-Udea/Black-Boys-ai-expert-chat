"use client";

import { useCallback, useSyncExternalStore } from "react";

export type TextSize = "md" | "lg" | "xl";

const KEY = "botiquin:text";
const listeners = new Set<() => void>();

function read(): TextSize {
  try {
    const value = localStorage.getItem(KEY);
    return value === "lg" || value === "xl" ? value : "md";
  } catch {
    return "md";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Tamaño del texto del chat. Se guarda en este navegador y lo aplica `data-text` en <html> (ver layout.tsx y globals.css). */
export function useTextSize() {
  const size = useSyncExternalStore(subscribe, read, () => "md" as TextSize);
  const setSize = useCallback((next: TextSize) => {
    try {
      if (next === "md") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Sin almacenamiento disponible: el cambio vale solo para esta visita.
    }
    if (next === "md") document.documentElement.removeAttribute("data-text");
    else document.documentElement.setAttribute("data-text", next);
    listeners.forEach((listener) => listener());
  }, []);
  return [size, setSize] as const;
}
