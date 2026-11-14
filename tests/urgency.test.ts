import { describe, expect, it } from "vitest";
import { detectUrgency, normalizeForDetection, urgencyPromptBlock } from "@/lib/safety/urgency";
import { HELP_LINES, TRUSTED_SOURCES } from "@/lib/safety/resources";

describe("normalizeForDetection", () => {
  it("quita tildes, signos y espacios repetidos", () => {
    expect(normalizeForDetection("  ¡Me TOMÉ   2 pastillas, de más!  ")).toBe("me tome 2 pastillas de mas");
  });
});

describe("detectUrgency · lo que SÍ debe avisar", () => {
  it.each<[string, "crisis" | "poisoning" | "emergency"]>([
    // intoxicación / sobredosis
    ["Me tomé 10 pastillas de más", "poisoning"],
    ["me tome las pastillas por error", "poisoning"],
    ["Ayer mi mamá se tomó el doble de la dosis sin querer", "poisoning"],
    ["Mi hijo se tomó un jarabe que estaba en la mesa", "poisoning"],
    ["mi bebe se trago varias pastillas", "poisoning"],
    ["Creo que tuve una sobredosis de paracetamol", "poisoning"],
    ["Mi papá está intoxicado con un medicamento", "poisoning"],
    ["me intoxiqué con unas gotas", "poisoning"],
    ["Me tomé todas las pastillas del frasco", "poisoning"],
    // emergencia médica
    ["Tengo un dolor fuerte en el pecho desde hace una hora", "emergency"],
    ["me duele mucho el pecho y me sudan las manos", "emergency"],
    ["No puedo respirar bien", "emergency"],
    ["después de la pastilla se me hinchó la cara y la lengua", "emergency"],
    ["Creo que es una reacción alérgica grave", "emergency"],
    ["Mi esposo tuvo una convulsión", "emergency"],
    ["mi abuela se desmayó hace un momento", "emergency"],
    ["está inconsciente y no reacciona", "emergency"],
    ["estoy vomitando sangre", "emergency"],
    ["tiene un sangrado muy abundante", "emergency"],
    ["Creo que le dio un infarto", "emergency"],
    // crisis emocional
    ["Quiero morir", "crisis"],
    ["ya no quiero seguir viviendo", "crisis"],
    ["Estoy pensando en quitarme la vida", "crisis"],
    ["quiero tomarme todas las pastillas", "crisis"],
    ["A veces pienso en tomarme todas mis pastillas para dejar de sentir", "crisis"],
    ["Me tomé varias pastillas de más porque ya no quiero seguir así", "poisoning"],
    ["Me tomé varias pastillas de más porque ya no quiero seguir así", "crisis"],
    ["tengo ganas de hacerme daño", "crisis"],
    ["siento que no vale la pena seguir", "crisis"],
  ])("«%s» → %s", (text, kind) => {
    const signal = detectUrgency(text);
    expect(signal, text).not.toBeNull();
    expect(signal!.kinds).toContain(kind);
  });
});

describe("detectUrgency · lo que NO debe avisar", () => {
  it.each([
    "¿Qué es una sobredosis?",
    "¿Qué pasa si me tomo una pastilla de más?",
    "¿Qué pasa si tomo doble dosis de ibuprofeno?",
    "¿Puedo tomar paracetamol con el estómago vacío?",
    "No tengo dolor de pecho, solo ardor en el estómago",
    "Nunca he tenido una convulsión",
    "¿Para qué sirve el acetaminofén?",
    "¿Cómo guardo los medicamentos lejos de los niños?",
    "¿Cuáles son los efectos secundarios del ibuprofeno?",
    "Explícame qué es la presión arterial",
    "¿Qué hago si olvidé tomar una dosis?",
    "Quiero saber cómo funciona un antibiótico",
    "¿Cuántas horas debo dormir?",
    "Escribe una función en JavaScript que valide un correo",
    "Mi hijo tiene tos desde ayer, ¿qué puedo darle?",
    "La campaña de prevención del suicidio llegó a mi universidad",
    "",
    "   ",
  ])("«%s»", (text) => {
    expect(detectUrgency(text)).toBeNull();
  });

  it("ignora textos enormes sin recorrerlos", () => {
    expect(detectUrgency("me tomé pastillas de más ".repeat(2000))).toBeNull();
  });
});

describe("detectUrgency · gravedad", () => {
  it("combina tipos y los ordena de más a menos grave", () => {
    const signal = detectUrgency("Quiero morir y me tomé todas las pastillas del frasco");
    expect(signal?.kind).toBe("crisis");
    expect(signal?.kinds).toEqual(["crisis", "poisoning"]);
  });

  it("no mantiene estado entre llamadas (expresiones con la bandera g)", () => {
    for (let i = 0; i < 4; i++) expect(detectUrgency("Quiero morir")?.kind).toBe("crisis");
    for (let i = 0; i < 4; i++) expect(detectUrgency("No puedo respirar")?.kind).toBe("emergency");
  });
});

describe("urgencyPromptBlock", () => {
  it("indica los números correctos y prohíbe dar dosis", () => {
    const poisoning = urgencyPromptBlock({ kind: "poisoning", kinds: ["poisoning"] });
    expect(poisoning).toContain("ALERTA DE SEGURIDAD");
    expect(poisoning).toContain("123");
    expect(poisoning).toContain("018000 916012");
    expect(poisoning).toMatch(/No des dosis/);

    const crisis = urgencyPromptBlock({ kind: "crisis", kinds: ["crisis", "poisoning"] });
    expect(crisis).toContain("106");
    expect(crisis).toContain("018000 916012");
    expect(crisis).toMatch(/No entregues dosis/);
  });
});

describe("recursos de ayuda", () => {
  it("coinciden con las líneas oficiales verificadas", () => {
    expect(HELP_LINES.emergency.tel).toBe("123");
    expect(HELP_LINES["mental-health"].tel).toBe("106");
    expect(HELP_LINES.poison.tel).toBe("018000916012");
    expect(HELP_LINES.poison.display).toBe("018000 916012");
  });

  it("las fuentes confiables son enlaces https", () => {
    expect(TRUSTED_SOURCES.length).toBeGreaterThanOrEqual(3);
    for (const source of TRUSTED_SOURCES) expect(source.href).toMatch(/^https:\/\//);
  });
});
