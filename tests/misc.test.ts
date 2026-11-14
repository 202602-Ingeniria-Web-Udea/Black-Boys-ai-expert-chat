import { describe, expect, it } from "vitest";
import { composeSystemPrompt } from "@/lib/assistant/prompt";
import { conversationToMarkdown, fileSlug } from "@/lib/client/export";
import { dayBucket, formatDuration } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { envBool, envInt } from "@/lib/env";
import { plain } from "@/lib/serialize";
import type { MessageDto } from "@/lib/types";

describe("composeSystemPrompt", () => {
  it("agrega la fecha actual (hora de Colombia) al prompt configurado", () => {
    const out = composeSystemPrompt({ systemPrompt: "  Eres un mentor.  " }, new Date("2026-11-12T03:00:00Z"));
    expect(out.startsWith("Eres un mentor.")).toBe(true);
    expect(out).toContain("# CONTEXTO DE LA CONVERSACIÓN");
    expect(out).toMatch(/miércoles, 11 de noviembre de 2026/); // 03:00 UTC = 22:00 del día anterior en Bogotá
    expect(out).not.toContain("ALERTA DE SEGURIDAD");
  });

  it("agrega la alerta de seguridad solo cuando hay una señal de urgencia", () => {
    const now = new Date("2026-11-12T15:00:00Z");
    const out = composeSystemPrompt({ systemPrompt: "Eres un asistente de salud." }, now, { kind: "poisoning", kinds: ["poisoning"] });
    expect(out).toContain("# ALERTA DE SEGURIDAD");
    expect(out).toContain("018000 916012");
    expect(out.indexOf("# CONTEXTO DE LA CONVERSACIÓN")).toBeLessThan(out.indexOf("# ALERTA DE SEGURIDAD"));
    expect(composeSystemPrompt({ systemPrompt: "Eres un asistente de salud." }, now, null)).not.toContain("ALERTA");
  });
});

describe("exportar conversación", () => {
  const message = (role: "USER" | "ASSISTANT", content: string): MessageDto =>
    ({ id: role + content, conversationId: "c", role, content, model: null, latencyMs: null, feedback: null, createdAt: new Date().toISOString() }) as MessageDto;

  it("genera Markdown con título y nombre de cada participante", () => {
    const md = conversationToMarkdown({
      title: "Recursión",
      assistantName: "Mentor de Código",
      userName: "Ana",
      messages: [message("USER", "¿Qué es?"), message("ASSISTANT", "Una función que se llama a sí misma.")],
    });
    expect(md).toContain("# Recursión");
    expect(md).toContain("## Ana\n\n¿Qué es?");
    expect(md).toContain("## Mentor de Código\n\nUna función que se llama a sí misma.");
  });

  it("fileSlug produce nombres de archivo seguros", () => {
    expect(fileSlug("¿Qué es la recursión? (Python)")).toBe("que-es-la-recursion-python");
    expect(fileSlug("../../etc/passwd")).toBe("etc-passwd");
    expect(fileSlug("🙂🙂")).toBe("conversacion");
    expect(fileSlug("x".repeat(200)).length).toBeLessThanOrEqual(50);
  });
});

describe("formato de fechas y duraciones", () => {
  const now = new Date("2026-11-12T15:00:00Z");
  it("agrupa el historial por día (zona horaria de Colombia)", () => {
    expect(dayBucket("2026-11-12T10:00:00Z", now)).toBe("Hoy");
    expect(dayBucket("2026-11-11T15:00:00Z", now)).toBe("Ayer");
    expect(dayBucket("2026-11-08T15:00:00Z", now)).toBe("Últimos 7 días");
    expect(dayBucket("2026-10-01T15:00:00Z", now)).toBe("Anteriores");
  });

  it("formatea duraciones", () => {
    expect(formatDuration(850)).toBe("850 ms");
    expect(formatDuration(2_340)).toBe("2.3 s");
  });
});

describe("utilidades", () => {
  it("isUuid", () => {
    expect(isUuid("6f1b1c3e-0000-4000-8000-000000000000")).toBe(true);
    expect(isUuid("no-es-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
  });

  it("variables de entorno tolerantes", () => {
    process.env.TEST_INT = "42";
    process.env.TEST_BAD = "abc";
    process.env.TEST_BOOL = "Sí";
    expect(envInt("TEST_INT", 1)).toBe(42);
    expect(envInt("TEST_INT", 1, 0, 10)).toBe(10);
    expect(envInt("TEST_BAD", 7)).toBe(7);
    expect(envInt("TEST_MISSING", 9)).toBe(9);
    expect(envBool("TEST_BOOL", false)).toBe(true);
    expect(envBool("TEST_MISSING", true)).toBe(true);
    delete process.env.TEST_INT;
    delete process.env.TEST_BAD;
    delete process.env.TEST_BOOL;
  });

  it("plain() convierte fechas a texto ISO para pasarlas a componentes cliente", () => {
    const out = plain({ at: new Date("2026-01-02T03:04:05Z"), n: 1 });
    expect(out).toEqual({ at: "2026-01-02T03:04:05.000Z", n: 1 });
  });
});
