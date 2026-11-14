import { describe, expect, it } from "vitest";
import { AIError, aiErrorFromHttp, redactSecrets, type AIErrorCode } from "@/lib/ai/errors";

describe("aiErrorFromHttp", () => {
  it.each<[number, string, AIErrorCode]>([
    [401, "", "AUTH"],
    [403, "", "AUTH"],
    [404, "", "MODEL_NOT_FOUND"],
    [408, "", "TIMEOUT"],
    [504, "", "TIMEOUT"],
    [429, "", "RATE_LIMIT"],
    [500, "", "UNAVAILABLE"],
    [503, "", "UNAVAILABLE"],
    [418, "", "UNKNOWN"],
    [400, "Invalid API key", "AUTH"],
    [400, "The model `foo` does not exist", "MODEL_NOT_FOUND"],
    [400, "model decommissioned", "MODEL_NOT_FOUND"],
    [400, "context length exceeded", "BAD_REQUEST"],
  ])("HTTP %i «%s» → %s", (status, body, code) => {
    expect(aiErrorFromHttp(status, body).code).toBe(code);
  });

  it("guarda el estado HTTP y un detalle acotado", () => {
    const err = aiErrorFromHttp(500, "x".repeat(2_000));
    expect(err.status).toBe(500);
    expect(err.detail).toHaveLength(500);
  });
});

describe("AIError", () => {
  it("el mensaje es para el usuario final y no incluye el detalle técnico", () => {
    const err = new AIError("RATE_LIMIT", "429 {\"error\":\"quota exceeded for org-123\"}");
    expect(err.message).toMatch(/demasiadas solicitudes/i);
    expect(err.message).not.toMatch(/org-123/);
    expect(err.detail).toContain("org-123");
  });

  it("todos los códigos tienen un mensaje en español", () => {
    const codes: AIErrorCode[] = ["CONFIG", "AUTH", "RATE_LIMIT", "TIMEOUT", "UNAVAILABLE", "MODEL_NOT_FOUND", "BAD_REQUEST", "EMPTY", "TOKEN_LIMIT", "ABORTED", "UNKNOWN"];
    for (const code of codes) expect(new AIError(code).message.length).toBeGreaterThan(10);
  });
});

describe("redactSecrets", () => {
  it("oculta claves de OpenAI, Groq y Google", () => {
    const text = "key sk-proj-abcdefgh12345678 y gsk_abcdefgh12345678 y AIzaSyA-abcdefghij12345";
    const out = redactSecrets(text);
    expect(out).not.toMatch(/sk-proj|gsk_abc|AIzaSy/);
    expect(out.match(/\[redactado\]/g)).toHaveLength(3);
  });

  it("no toca texto normal", () => {
    expect(redactSecrets("Todo normal, sin secretos")).toBe("Todo normal, sin secretos");
  });
});
