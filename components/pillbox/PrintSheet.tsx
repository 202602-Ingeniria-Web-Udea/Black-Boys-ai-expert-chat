import { WEEKDAY_SHORT, formatShortDate, formatTime, weekDates } from "@/lib/pillbox/dates";
import { isActiveOn } from "@/lib/pillbox/schedule";
import type { PillboxState } from "@/lib/pillbox/types";

/** Plan semanal para imprimir: una casilla por cada toma programada, para marcarla a mano. Solo se ve al imprimir. */
export function PrintSheet({ state, weekStart, userName }: { state: PillboxState; weekStart: string; userName: string }) {
  const days = weekDates(weekStart);
  const rows = state.medications
    .flatMap((medication) =>
      days.some((day) => isActiveOn(medication, day)) ? medication.times.map((time) => ({ medication, time })) : [],
    )
    .sort((a, b) => a.time.localeCompare(b.time) || a.medication.name.localeCompare(b.medication.name, "es"));

  return (
    <div className="print-only print-sheet text-black">
      <h1 className="text-2xl font-bold">Plan semanal de medicamentos</h1>
      <p className="mt-1 text-base">
        {userName} · Semana del {formatShortDate(days[0])} al {formatShortDate(days[6])}
      </p>
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-black px-2 py-2 text-left">Medicamento</th>
            <th className="border border-black px-2 py-2 text-left">Hora</th>
            {days.map((day, index) => (
              <th key={day} className="border border-black px-2 py-2 text-center">
                {WEEKDAY_SHORT[index]} {Number(day.slice(8))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ medication, time }) => (
            <tr key={`${medication.id}|${time}`}>
              <td className="border border-black px-2 py-2">
                <strong>{medication.name}</strong>
                {medication.note ? <span className="block text-xs">{medication.note}</span> : null}
              </td>
              <td className="border border-black px-2 py-2 whitespace-nowrap">{formatTime(time)}</td>
              {days.map((day) => (
                <td key={day} className="border border-black px-2 py-2 text-center text-lg">
                  {isActiveOn(medication, day) ? "☐" : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-5 text-xs">
        Este plan lo escribió la persona con lo que le indicó su médico. No es una prescripción ni reemplaza la consulta con un profesional de la
        salud. En una emergencia, llama al 123.
      </p>
    </div>
  );
}
