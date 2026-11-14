import { describe, expect, it } from "vitest";
import { generateTitle, heuristicTitle } from "@/lib/ai/title";
import type { ChatProvider } from "@/lib/ai/types";

describe("heuristicTitle", () => {
  it("conserva una pregunta corta", () => {
    expect(heuristicTitle("¿Qué es la recursión?")).toBe("¿Qué es la recursión?");
  });

  it("recorta en un límite de palabra y agrega puntos suspensivos", () => {
    const title = heuristicTitle("Explícame detalladamente cómo funciona el recolector de basura en Java y cuándo se ejecuta");
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
    expect(title).not.toMatch(/\s…$/);
  });

  it("ignora los bloques de código y la sintaxis Markdown", () => {
    expect(heuristicTitle("**Ayuda** con esto:\n```python\nprint('x')\n```")).toBe("Ayuda con esto:");
  });

  it("usa un título genérico si no hay texto", () => {
    expect(heuristicTitle("   ")).toBe("Nueva conversación");
  });

  it("si solo hay código, usa el texto original", () => {
    expect(heuristicTitle("```js\nconsole.log(1)\n```").length).toBeGreaterThan(0);
  });
});

function providerReturning(result: string | Error): ChatProvider {
  return {
    id: "stub",
    label: "stub",
    defaultModel: "m",
    stream: async function* () {
      yield "";
    },
    complete: async () => {
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

describe("generateTitle", () => {
  it("limpia comillas, asteriscos y punto final", async () => {
    await expect(generateTitle(providerReturning('  "**Recursión en Python**."\n'), "m", "u", "a")).resolves.toBe("Recursión en Python");
  });

  it("toma la primera línea no vacía", async () => {
    await expect(generateTitle(providerReturning("\n\nDiferencias entre let y var\nOtra línea"), "m", "u", "a")).resolves.toBe("Diferencias entre let y var");
  });

  it("devuelve null si el proveedor falla", async () => {
    await expect(generateTitle(providerReturning(new Error("boom")), "m", "u", "a")).resolves.toBeNull();
  });

  it("devuelve null si el título es demasiado corto o largo", async () => {
    await expect(generateTitle(providerReturning("ok"), "m", "u", "a")).resolves.toBeNull();
    await expect(generateTitle(providerReturning("x".repeat(120)), "m", "u", "a")).resolves.toBeNull();
  });
});
