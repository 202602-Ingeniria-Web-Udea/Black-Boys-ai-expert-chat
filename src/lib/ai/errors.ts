export type AIErrorCode =
  | "CONFIG"
  | "AUTH"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "MODEL_NOT_FOUND"
  | "BAD_REQUEST"
  | "EMPTY"
  | "TOKEN_LIMIT"
  | "ABORTED"
  | "UNKNOWN";

/** Mensajes pensados para el usuario final (en español, sin detalles técnicos ni secretos). */
const USER_MESSAGES: Record<AIErrorCode, string> = {
  CONFIG: "El asistente de IA aún no está configurado (falta el proveedor o su clave). Avisa al administrador.",
  AUTH: "El proveedor de IA rechazó las credenciales (clave inválida o sin permisos). Avisa al administrador.",
  RATE_LIMIT: "El proveedor de IA está recibiendo demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo.",
  TIMEOUT: "El modelo tardó demasiado en responder. Inténtalo de nuevo.",
  UNAVAILABLE: "El servicio de IA no está disponible en este momento. Inténtalo de nuevo en unos minutos.",
  MODEL_NOT_FOUND: "El modelo configurado no existe o no está disponible. El administrador puede cambiarlo en el panel.",
  BAD_REQUEST: "El proveedor rechazó la solicitud. Prueba con un mensaje más corto o reformulado.",
  EMPTY: "El modelo no devolvió contenido. Inténtalo de nuevo.",
  TOKEN_LIMIT:
    "El modelo agotó el límite de tokens antes de redactar la respuesta. El administrador puede aumentar «Longitud máxima de respuesta» en el panel.",
  ABORTED: "Generación cancelada.",
  UNKNOWN: "Ocurrió un error inesperado con el modelo. Inténtalo de nuevo.",
};

export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    /** Detalle técnico (solo para logs del servidor; nunca se envía al navegador). */
    public readonly detail?: string,
    public readonly status?: number,
  ) {
    super(USER_MESSAGES[code]);
    this.name = "AIError";
  }
}

/** Oculta cualquier cosa que parezca una API key antes de escribir un log. */
export function redactSecrets(text: string): string {
  return text.replace(/\b(sk-[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9]{8,}|AIza[A-Za-z0-9_-]{10,})/g, "[redactado]");
}

export function aiErrorFromHttp(status: number, bodyText: string): AIError {
  const detail = redactSecrets(bodyText).slice(0, 500);
  const lower = bodyText.toLowerCase();
  if (status === 401 || status === 403) return new AIError("AUTH", detail, status);
  if (status === 404) return new AIError("MODEL_NOT_FOUND", detail, status);
  if (status === 429) return new AIError("RATE_LIMIT", detail, status);
  if (status === 408 || status === 504) return new AIError("TIMEOUT", detail, status);
  if (status >= 500) return new AIError("UNAVAILABLE", detail, status);
  if (status === 400) {
    if (/api[ _-]?key|unauthori[sz]ed|permission|credentials/.test(lower)) return new AIError("AUTH", detail, status);
    if (/model/.test(lower) && /(not found|does not exist|decommission|not supported|unknown|invalid)/.test(lower)) {
      return new AIError("MODEL_NOT_FOUND", detail, status);
    }
    return new AIError("BAD_REQUEST", detail, status);
  }
  return new AIError("UNKNOWN", detail, status);
}
