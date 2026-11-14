// Cliente HTTP del navegador para hablar con nuestra API (nunca con el proveedor de IA directamente).

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const NETWORK_MESSAGE = "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException ? err.name === "AbortError" : (err as { name?: string } | null)?.name === "AbortError";
}

/** Convierte una respuesta HTTP con error en un ApiError con el mensaje que envió el servidor. */
export async function toApiError(res: Response): Promise<ApiError> {
  let body: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const details =
    body?.error?.details && typeof body.error.details === "object"
      ? (body.error.details as Record<string, string>)
      : undefined;
  return new ApiError(
    res.status,
    body?.error?.code ?? `HTTP_${res.status}`,
    body?.error?.message ?? "Ocurrió un error inesperado. Inténtalo de nuevo.",
    details,
  );
}

/** Si la sesión caducó, lleva al login (recarga completa) conservando la página a la que se quería volver. */
export function redirectToLogin() {
  if (typeof window === "undefined") return;
  const here = window.location.pathname + window.location.search;
  const target = new URL("/login", window.location.origin);
  target.searchParams.set("next", here);
  window.location.assign(target.toString());
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T = unknown>(url: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError(0, "NETWORK", NETWORK_MESSAGE);
  }
  if (!res.ok) {
    const error = await toApiError(res);
    if (res.status === 401 && !url.startsWith("/api/auth/")) redirectToLogin();
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/** Copia texto al portapapeles (con alternativa para páginas servidas por http en red local). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* se usa la alternativa */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Descarga un archivo de texto generado en el navegador. */
export function downloadText(filename: string, content: string, mime = "text/markdown;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
