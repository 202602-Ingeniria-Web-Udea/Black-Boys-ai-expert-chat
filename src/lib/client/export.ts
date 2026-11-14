import { formatDateTime } from "@/lib/format";
import type { MessageDto } from "@/lib/types";

/** Convierte una conversación a Markdown para descargarla. */
export function conversationToMarkdown(opts: { title: string; assistantName: string; userName: string; messages: MessageDto[] }): string {
  const lines = [`# ${opts.title}`, "", `Exportado el ${formatDateTime(new Date())}.`, ""];
  for (const message of opts.messages) {
    lines.push(`## ${message.role === "USER" ? opts.userName : opts.assistantName}`, "", message.content.trim(), "");
  }
  return lines.join("\n");
}

/** Nombre de archivo seguro a partir de un título. */
export function fileSlug(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return slug || "conversacion";
}
