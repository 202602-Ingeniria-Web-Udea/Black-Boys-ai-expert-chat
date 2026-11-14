// Detección de señales de urgencia en lo que escribe una persona (función pura: sin red ni base de datos).
//
// Se usa en dos lugares:
//   · Servidor → añade una «alerta de seguridad» al System Prompt para que el modelo empiece por lo urgente.
//   · Navegador → muestra, justo debajo del mensaje, un aviso con los números de ayuda de Colombia.
//
// Es una red de seguridad ADICIONAL al System Prompt; no diagnostica nada. Prefiere avisar de más antes que
// quedarse corta, pero evita saltar con preguntas informativas («¿qué es una sobredosis?», «¿qué pasa si tomo
// doble dosis?») y con frases negadas («no tengo dolor de pecho»).

export type UrgencyKind = "crisis" | "poisoning" | "emergency";

export interface UrgencySignal {
  /** El tipo más grave detectado (crisis › intoxicación › emergencia médica). */
  kind: UrgencyKind;
  /** Todos los tipos detectados, del más al menos grave. */
  kinds: UrgencyKind[];
}

const SEVERITY: UrgencyKind[] = ["crisis", "poisoning", "emergency"];

/** Minúsculas, sin tildes, sin signos de puntuación y con espacios simples. */
export function normalizeForDetection(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Patrones (sobre texto normalizado: sin tildes y en minúsculas)
// ---------------------------------------------------------------------------

const CRISIS: RegExp[] = [
  /\bquiero (morir|morirme|desaparecer|matarme|suicidarme|dejar de existir|no despertar|acabar con (todo|mi vida)|terminar con (todo|mi vida))\b/g,
  /\b(voy a|pienso|pensando en|estoy pensando en|he pensado en|ganas de|tengo ganas de|idea de|ideas de) (matarme|suicidarme|quitarme la vida|morirme|acabar con mi vida|terminar con mi vida|hacerme dano)\b/g,
  /\bquitarme la vida\b/g,
  /\bno quiero (seguir )?(viviendo|vivir|despertar)\b/g,
  /\bya no quiero seguir (asi|adelante)\b/g,
  /\b(seria|es|estaria) mejor (estar )?(muerto|muerta|no existir|desaparecer)\b/g,
  /\bno vale la pena (seguir|vivir)\b/g,
  /\b(hacerme dano|hacerme mal|lastimarme|cortarme las venas|cortarme los brazos|autolesion\w*|autolesionarme)\b/g,
  /\b(pienso|pensando|pensado|pensamientos|ideas?|ganas) (de |en |sobre )?(el )?suicidio\b/g,
  /\b(quiero|pienso en|pensando en|ganas de|voy a|me voy a) (tomarme|tragarme|beberme) (todas|todo|todos) (las |mis |el |los |mi )?(pastillas|pastilla|frasco|medicamentos|medicinas|tabletas|capsulas|blister)\b/g,
];

const INGEST = "(?:tome|tomo|tomamos|tomaron|trague|trago|tragaron|bebi|bebio|bebieron|ingeri|ingirio|ingirieron|consumi|consumio|comi|comio|inyecte|me pase|se paso|nos pasamos|me excedi|se excedio|duplique|duplico)";
const EXCESS =
  "(?:de mas|demasiad\\w+|muchas|muchos|exceso|el doble|doble dosis|dosis doble|de golpe|todo el|toda la|todos los|todas las|varias|sobredosis|por error|por accidente|sin querer|equivocad\\w+|mas de lo (?:indicado|recetado|permitido|normal)|mas de la dosis)";

const POISONING: RegExp[] = [
  new RegExp(`\\b${INGEST}\\b(?:\\s+\\w+){0,8}?\\s+${EXCESS}`, "g"),
  /\b(tuve|tengo|tiene|tuvo|sufri|sufrio|creo que tuve|creo que tiene|le dio|me dio|entro en|esta con|estoy con) (una )?sobredosis\b/g,
  /\b(me|se|lo|la|nos) (intoxi\w+|envenen\w+)\b/g,
  /\b(estoy|esta|estan|estamos|quedo|quedaron) (intoxicad\w+|envenenad\w+)\b/g,
  /\b(creo|cree|creemos|sospecho|parece) que (estoy|esta|se|me|le) (intoxi\w+|envenen\w+)\b/g,
  /\b(mi|el|la|un|una) (hij[oa]|bebe|nin[oa]|nieto|nieta|sobrin[oa]|hermanit[oa]|pequen[oa]|chiquit[oa])\b(?:\s+\w+){0,6}?\s+(tomo|trago|bebio|comio|ingirio|se metio|se llevo)\b(?:\s+\w+){0,6}?\s+(pastilla|pastillas|medicamento|medicamentos|medicina|medicinas|jarabe|tableta|tabletas|capsula|capsulas|gotas|veneno|cloro|detergente|soda caustica|insecticida|raticida|producto de limpieza)\b/g,
  /\b(me )?(tome|trague|bebi|tomo|trago) (todas|todo|todos) (las |el |los )?(pastillas|pastilla|frasco|blister|medicamentos|medicinas|tabletas|capsulas|gotas|jarabe)\b/g,
];

const EMERGENCY: RegExp[] = [
  /\bno (puedo|logro|consigo) respirar\b/g,
  /\b(me ahogo|me estoy ahogando|se esta ahogando|se ahoga)\b/g,
  /\b(labios|cara|manos|piel) (morad[oa]s?|azulad[oa]s?|amoratad[oa]s?)\b/g,
  /\b(tengo|siento|tiene|presento|presenta|con) (mucha |bastante |gran )?(dificultad|problemas?) para respirar\b/g,
  /\b(tengo|siento|tiene|presento|presenta|sufro|sufre|me da|le da)\b(?:\s+\w+){0,4}?\s+dolor (muy )?(fuerte |intenso |opresivo |agudo )?(en|del|de) (el )?pecho\b/g,
  /\b(me|le) duele (mucho )?(el )?pecho\b/g,
  /\b(opresion|presion fuerte|peso) en (el )?pecho\b/g,
  /\b(se me|me|se le|le) (hincho|hincha|hincharon|inflamo|inflama|cerro|cierra) (la |el |los |las )?(cara|lengua|labios?|garganta|boca|cuello)\b/g,
  /\bhinchazon (de|en) (la |el |los |las )?(cara|lengua|labios?|garganta)\b/g,
  /\banafilax\w*\b/g,
  /\breaccion alergica (grave|fuerte|severa|seria)\b/g,
  /\b(tuvo|tuve|tiene|esta|estoy|le dio|me dio|presenta|presento|sufrio|sufri|entro en) (una |un )?(convulsion\w*|convulsionando|ataque (epileptico|de epilepsia)|crisis convulsiva)\b/g,
  /\b(se desmayo|me desmaye|se desmayaron|perdio el conocimiento|perdi el conocimiento)\b/g,
  /\b(esta|quedo|se puso|estoy) (inconsciente|desmayad[oa])\b/g,
  /\b(vomit\w+|escupo|escupe|toso|tose|tosiendo|vomitando) sangre\b/g,
  /\b(sangrado|hemorragia) (muy )?(abundante|fuerte|intensa|que no (para|cede|se detiene))\b/g,
  /\bno (para|deja|puedo parar) de sangrar\b/g,
  /\b(tengo|tiene|tuvo|tuve|le dio|me dio|esta teniendo|estoy teniendo|sufrio|sufri|creo que tengo|creo que tiene)\b(?:\s+\w+){0,3}?\s+(derrame cerebral|acv|ictus|infarto|ataque (al corazon|cardiaco)|paro cardiaco)\b/g,
];

const BY_KIND: Record<UrgencyKind, RegExp[]> = { crisis: CRISIS, poisoning: POISONING, emergency: EMERGENCY };

/** Negación justo antes de la coincidencia: «no tengo dolor de pecho», «nunca quise morir». */
const NEGATED = /\b(no|nunca|ni|sin|jamas)\s+(?:\w+\s+){0,1}$/;
/** Pregunta hipotética o informativa: «¿qué pasa si me tomo…?», «puedo tomar…». */
const HYPOTHETICAL = /\b(si|cuando|que pasa|que pasaria|que ocurre|que ocurriria|que sucede|puedo|puede|podria|podrian|debo|deberia|permitido|peligroso|riesgo|se puede)\b[^.]{0,40}$/;

function hasMatch(normalized: string, patterns: RegExp[], opts: { hypotheticalGuard: boolean }): boolean {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of normalized.matchAll(pattern)) {
      const before = normalized.slice(Math.max(0, (match.index ?? 0) - 45), match.index ?? 0);
      if (NEGATED.test(before)) continue;
      if (opts.hypotheticalGuard && HYPOTHETICAL.test(before)) continue;
      return true;
    }
  }
  return false;
}

/**
 * Devuelve la señal de urgencia presente en el texto, o null si no hay ninguna.
 * Ejemplos que SÍ avisan: «me tomé 10 pastillas de más», «mi hijo se tragó un jarabe», «tengo dolor fuerte en el pecho»,
 * «quiero morir». Ejemplos que NO: «¿qué es una sobredosis?», «¿qué pasa si tomo doble dosis?», «no tengo dolor de pecho».
 */
export function detectUrgency(text: string): UrgencySignal | null {
  if (!text || text.length > 20_000) return null;
  const normalized = normalizeForDetection(text);
  if (!normalized) return null;

  const kinds = SEVERITY.filter((kind) => hasMatch(normalized, BY_KIND[kind], { hypotheticalGuard: kind !== "crisis" }));
  return kinds.length > 0 ? { kind: kinds[0], kinds } : null;
}

// ---------------------------------------------------------------------------
// Instrucciones adicionales para el modelo (servidor)
// ---------------------------------------------------------------------------

const MODEL_RULES: Record<UrgencyKind, string> = {
  emergency:
    "Posible emergencia médica. Empieza por decir con claridad que llame YA al 123 (línea única de emergencias de Colombia) o vaya al servicio de urgencias más cercano, y que no espere a que se le pase. Si hay alguien cerca, que le acompañe. Después, en pocas líneas, qué datos conviene tener a mano para el operador (qué ocurrió, hora, edad y qué medicamentos tomó).",
  poisoning:
    "Posible sobredosis o intoxicación. Empieza por decir con claridad que llame YA al 123 o a la Línea nacional de toxicología (018000 916012, gratuita y las 24 horas), aunque la persona se sienta bien: algunos efectos tardan en aparecer. Que tenga a mano la caja o el envase del producto, que NO provoque el vómito ni dé remedios caseros salvo que el personal de salud se lo indique, y que no deje sola a la persona afectada.",
  crisis:
    "Posible crisis emocional con riesgo para la vida. Responde con calidez y sin juzgar: reconoce lo que siente y pregunta si está a salvo ahora mismo. Si hay riesgo inmediato, que llame al 123; en cualquier caso, la Línea 106 (gratuita, confidencial, 24 horas) y contarle a una persona de confianza. Sugiere alejar los medicamentos y otros medios peligrosos y no quedarse a solas. No entregues dosis, cantidades ni métodos.",
};

/** Bloque que se agrega al System Prompt cuando el último mensaje de la persona contiene una señal de urgencia. */
export function urgencyPromptBlock(signal: UrgencySignal): string {
  const rules = signal.kinds.map((kind) => `- ${MODEL_RULES[kind]}`).join("\n");
  return [
    "# ALERTA DE SEGURIDAD (detectada automáticamente en el último mensaje)",
    "Esta alerta tiene prioridad sobre el formato habitual. Para esta respuesta:",
    rules,
    "- Máximo unas 120 palabras, tono sereno y cercano, sin tecnicismos y sin minimizar lo que cuenta la persona.",
    "- No des dosis ni cantidades, ni digas cuánto «es mortal». No hagas diagnósticos.",
    "- Usa un aviso destacado al inicio con el formato `> **Urgente:** …` y cierra preguntando si ya pidió ayuda o si hay alguien con ella.",
  ].join("\n");
}
