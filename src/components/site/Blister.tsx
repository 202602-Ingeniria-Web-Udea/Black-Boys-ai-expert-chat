"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { CAPSULE_COLORS, CapsuleShape } from "@/components/art/Capsule";

const COLS = 4;
const ROWS = 2;
const PITCH_X = 126;
const ROW_Y = [88, 232];
const FIRST_X = 71;
/** Celdas que se ven ya usadas, como en un blíster real. */
const EMPTY_CELLS = new Set([3, 4]);

interface BlisterProps {
  questions: string[];
  assistantName: string;
  /** Con sesión iniciada la pregunta va directo al chat; si no, pasa por el registro y vuelve al chat. */
  loggedIn: boolean;
}

function hrefFor(question: string, loggedIn: boolean) {
  const chat = `/chat?q=${encodeURIComponent(question)}`;
  return loggedIn ? chat : `/register?next=${encodeURIComponent(chat)}`;
}

/** Blíster interactivo: cada cápsula lleva una pregunta de ejemplo para el asistente. */
export function Blister({ questions, assistantName, loggedIn }: BlisterProps) {
  const [active, setActive] = useState<number | null>(null);

  // Las preguntas ocupan las celdas que no están marcadas como vacías, en orden.
  const cells: Array<{ cell: number; question: string | null; order: number }> = [];
  let q = 0;
  for (let cell = 0; cell < COLS * ROWS; cell++) {
    const empty = EMPTY_CELLS.has(cell) || q >= Math.min(questions.length, CAPSULE_COLORS.length);
    cells.push({ cell, question: empty ? null : questions[q], order: cell });
    if (!empty) q += 1;
  }
  let nth = -1;
  const filled = cells.map((c) => (c.question ? ++nth : -1));

  function onKey(event: KeyboardEvent, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setActive((current) => (current === index ? null : index));
    }
  }

  const activeQuestion = active === null ? null : (cells.find((c, i) => filled[i] === active)?.question ?? null);

  return (
    <div>
      <svg viewBox="0 0 520 320" className="h-auto w-full" role="group" aria-label={`Blíster con preguntas de ejemplo para ${assistantName}`}>
        {/* Lámina del blíster */}
        <rect x="14" y="20" width="496" height="296" rx="32" fill="#0d2b33" opacity=".06" />
        <rect x="8" y="8" width="504" height="304" rx="32" fill="#f6fafa" stroke="#c0d0d3" strokeWidth="2" />
        <rect x="20" y="20" width="480" height="280" rx="22" fill="none" stroke="#dbe6e8" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
        {/* Líneas de corte */}
        <path d="M24 160H496" stroke="#c0d0d3" strokeWidth="2" strokeDasharray="7 7" strokeLinecap="round" />
        <path d="M260 34V286" stroke="#c0d0d3" strokeWidth="2" strokeDasharray="7 7" strokeLinecap="round" opacity=".7" />

        {cells.map(({ cell, question }, i) => {
          const col = cell % COLS;
          const row = Math.floor(cell / COLS);
          const x = FIRST_X + col * PITCH_X;
          const y = ROW_Y[row];
          const colors = CAPSULE_COLORS[(question ? filled[i] : 0) % CAPSULE_COLORS.length];
          return (
            <g key={cell} transform={`translate(${x} ${y})`}>
              {/* Alvéolo */}
              <rect x="-52" y="-29" width="104" height="58" rx="29" fill="#e4eeef" />
              <rect x="-49" y="-26" width="98" height="52" rx="26" fill={question ? "#ffffff" : "#eef4f5"} stroke="#d3e0e2" strokeWidth="1.5" />
              {!question ? <path d="M-36 -10c14-9 58-9 72 0" fill="none" stroke="#c0d0d3" strokeWidth="2" strokeLinecap="round" opacity=".7" /> : null}
              {question ? (
                <g
                  className="blister-cap"
                  style={{ "--i": filled[i] } as CSSProperties}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active === filled[i]}
                  aria-label={`Ver pregunta de ejemplo: ${question}`}
                  onClick={() => setActive((current) => (current === filled[i] ? null : filled[i]))}
                  onKeyDown={(e) => onKey(e, filled[i])}
                >
                  <rect x="-56" y="-33" width="112" height="66" rx="33" fill="transparent" />
                  <rect className="blister-ring" x="-55" y="-32" width="110" height="64" rx="32" fill="none" stroke="#00835f" strokeWidth="3" />
                  <ellipse className="cap-shadow" cx="0" cy="19" rx="36" ry="4.5" fill="#0d2b33" opacity=".16" />
                  <g className="cap-lift">
                    <CapsuleShape a={colors.a} b={colors.b} />
                  </g>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div aria-live="polite" className="mt-5 flex min-h-28 flex-col justify-center rounded-3xl border border-line bg-white p-5 sm:min-h-24">
        {activeQuestion ? (
          <div key={active} className="flex animate-rise flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg leading-snug font-semibold text-ink sm:max-w-[26ch]">«{activeQuestion}»</p>
            <ButtonLink href={hrefFor(activeQuestion, loggedIn)} className="shrink-0 self-start sm:self-auto">
              {loggedIn ? "Preguntar ahora" : "Crear cuenta y preguntar"}
            </ButtonLink>
          </div>
        ) : (
          <p className="text-slate-600">
            <span className="font-semibold text-ink">Toca una cápsula</span> y mira qué puedes preguntarle a {assistantName}.
          </p>
        )}
      </div>
    </div>
  );
}
