import type { ChatProvider } from "./types";

/** Título provisional: el inicio de la primera pregunta, recortado en un límite de palabra. */
export function heuristicTitle(text: string): string {
  const withoutCode = text.replace(/```[\s\S]*?```/g, " ");
  const clean = withoutCode.replace(/[`*_#>]/g, "").replace(/\s+/g, " ").trim();
  const base = clean || text.replace(/\s+/g, " ").trim();
  if (!base) return "Nueva conversación";
  if (base.length <= 60) return base;
  const cut = base.slice(0, 60);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Pide al modelo un título corto (3–6 palabras). Si algo falla devuelve null y se conserva el provisional. */
export async function generateTitle(
  provider: ChatProvider,
  model: string,
  userText: string,
  assistantText: string,
): Promise<string | null> {
  try {
    const raw = await provider.complete(
      [
        {
          role: "system",
          content:
            "Eres un asistente que pone títulos a conversaciones. Responde SOLO con un título de 3 a 6 palabras, en español, sin comillas ni punto final.",
        },
        {
          role: "user",
          content: `Mensaje del usuario:\n${userText.slice(0, 500)}\n\nRespuesta del asistente:\n${assistantText.slice(0, 300)}\n\nTítulo:`,
        },
      ],
      { model, temperature: 0.2, maxTokens: 512, signal: AbortSignal.timeout(9_000) },
    );
    const title = (raw.split("\n").find((l) => l.trim()) ?? "")
      .replace(/^[\s"'«»“”*#-]+|[\s"'«»“”*.]+$/g, "")
      .trim();
    return title.length >= 3 && title.length <= 80 ? title : null;
  } catch {
    return null;
  }
}
