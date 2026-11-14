"use client";

import { CalendarPlus, Download, Info, Plus, Printer, Upload } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { downloadText } from "@/lib/client/api";
import { startOfWeek, toISODate } from "@/lib/pillbox/dates";
import { buildICS } from "@/lib/pillbox/ics";
import { withDoseStatus } from "@/lib/pillbox/schedule";
import { sanitizeState } from "@/lib/pillbox/storage";
import { LIMITS, type ColorId, type LogStatus, type Medication, type PillboxState } from "@/lib/pillbox/types";
import { MedicationForm } from "./MedicationForm";
import { MedicationsView } from "./MedicationsView";
import { PrintSheet } from "./PrintSheet";
import { TodayView } from "./TodayView";
import { usePillbox, useNow } from "./usePillbox";
import { WeekView } from "./WeekView";

type Tab = "hoy" | "semana" | "medicamentos";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "medicamentos", label: "Medicamentos" },
];

function Skeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando tu pastillero">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

export function PillboxApp({ userId, userName }: { userId: string; userName: string }) {
  const { state, update } = usePillbox(userId);
  const now = useNow();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("hoy");
  const [weekOverride, setWeekOverride] = useState<string | null>(null);
  const [editing, setEditing] = useState<Medication | "new" | null>(null);
  const [deleting, setDeleting] = useState<Medication | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!state || !now) return <Skeleton />;

  const today = toISODate(now);
  const weekStart = weekOverride ?? startOfWeek(today);

  function apply(change: (current: PillboxState) => PillboxState) {
    if (!update(change)) toast("Tu navegador no permite guardar datos: el pastillero se perderá al cerrar esta pestaña.", "error");
  }

  const setDose = (key: string, status: LogStatus | null) => apply((s) => withDoseStatus(s, key, status));

  function saveMedication(medication: Medication) {
    const isNew = !state!.medications.some((m) => m.id === medication.id);
    if (isNew && state!.medications.length >= LIMITS.medications) {
      toast(`Puedes guardar hasta ${LIMITS.medications} medicamentos.`, "error");
      return;
    }
    apply((s) => ({
      ...s,
      medications: isNew ? [...s.medications, medication] : s.medications.map((m) => (m.id === medication.id ? medication : m)),
    }));
    setEditing(null);
    toast(isNew ? "Medicamento agregado" : "Cambios guardados", "success");
  }

  function deleteMedication(medication: Medication) {
    apply((s) => ({
      ...s,
      medications: s.medications.filter((m) => m.id !== medication.id),
      log: Object.fromEntries(Object.entries(s.log).filter(([key]) => !key.startsWith(`${medication.id}|`))),
    }));
    setDeleting(null);
    toast("Medicamento eliminado", "success");
  }

  function exportCalendar() {
    if (state!.medications.length === 0) {
      toast("Agrega un medicamento antes de exportar el calendario.", "info");
      return;
    }
    downloadText("pastillero-botiquin.ics", buildICS(state!.medications), "text/calendar;charset=utf-8");
    toast("Calendario descargado. Ábrelo para importarlo en tu aplicación de calendario.", "success");
  }

  function exportBackup() {
    downloadText(`pastillero-copia-${today}.json`, JSON.stringify(state, null, 2), "application/json;charset=utf-8");
    toast("Copia de seguridad descargada.", "success");
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("size");
      const restored = sanitizeState(JSON.parse(await file.text()));
      if (restored.medications.length === 0) throw new Error("empty");
      apply(() => restored);
      toast(`Copia restaurada: ${restored.medications.length} ${restored.medications.length === 1 ? "medicamento" : "medicamentos"}.`, "success");
    } catch {
      toast("No se pudo leer ese archivo. Elige una copia que hayas descargado desde el pastillero.", "error");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((t) => t.id === tab);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
      setTab(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    }
  }

  const usedColors: ColorId[] = state.medications.map((m) => m.color);

  return (
    <>
      <div className="no-print">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mi pastillero</h1>
            <p className="mt-1 max-w-xl text-slate-600">Tus medicamentos y sus horarios, en un solo lugar.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => window.print()} disabled={state.medications.length === 0}>
              <Printer className="size-[18px]" aria-hidden="true" />
              Imprimir
            </Button>
            <Button variant="secondary" onClick={exportCalendar}>
              <CalendarPlus className="size-[18px]" aria-hidden="true" />
              Llevar al calendario
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-[18px]" aria-hidden="true" />
              Agregar medicamento
            </Button>
          </div>
        </div>

        <Alert kind="info" className="mt-5">
          <p>
            <strong>Solo en este navegador.</strong> Lo que anotas aquí no se envía al servidor ni lo ve nadie más. Botiquín no sugiere cantidades ni
            horarios de tratamiento: sigue siempre lo que te indicó tu médico.
          </p>
        </Alert>

        <div role="tablist" aria-label="Vistas del pastillero" onKeyDown={onTabKey} className="mt-7 flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px h-12 rounded-t-xl border-b-[3px] px-4 text-[15px] font-semibold transition-colors sm:px-6",
                tab === t.id ? "border-brand-600 text-brand-800" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-7">
          {tab === "hoy" ? <TodayView state={state} now={now} onSet={setDose} onAdd={() => setEditing("new")} /> : null}
          {tab === "semana" ? (
            <WeekView state={state} now={now} weekStart={weekStart} onWeekChange={setWeekOverride} onSet={setDose} onAdd={() => setEditing("new")} />
          ) : null}
          {tab === "medicamentos" ? (
            <>
              <MedicationsView medications={state.medications} onAdd={() => setEditing("new")} onEdit={setEditing} onDelete={setDeleting} />
              <div className="mt-10 rounded-2xl bg-mist p-5">
                <h3 className="flex items-center gap-2 font-bold">
                  <Info className="size-[18px] text-slate-600" aria-hidden="true" />
                  Copia de seguridad
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Como tus datos viven solo en este navegador, descarga una copia si quieres llevarlos a otro equipo o guardarlos por si borras los datos
                  del navegador.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={exportBackup} disabled={state.medications.length === 0}>
                    <Download className="size-4" aria-hidden="true" />
                    Descargar copia
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="size-4" aria-hidden="true" />
                    Restaurar copia
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Elegir archivo de copia de seguridad"
                    onChange={(e) => void importBackup(e.target.files?.[0])}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <PrintSheet state={state} weekStart={weekStart} userName={userName} />

      {editing ? (
        <MedicationForm
          key={editing === "new" ? "nuevo" : editing.id}
          medication={editing === "new" ? null : editing}
          today={today}
          usedColors={usedColors}
          onSave={saveMedication}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title="¿Eliminar este medicamento?"
        description={deleting ? `Se quitarán «${deleting.name}» y su registro de tomas. No se puede deshacer.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => deleting && deleteMedication(deleting)}>
              Eliminar
            </Button>
          </>
        }
      />
    </>
  );
}
