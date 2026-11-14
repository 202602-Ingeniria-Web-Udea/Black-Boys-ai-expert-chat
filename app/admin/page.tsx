import { ThumbsDown, ThumbsUp } from "lucide-react";
import { DailyChart } from "@/components/admin/DailyChart";
import { Alert } from "@/components/ui/Alert";
import { describeProvider } from "@/lib/ai/provider";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/db/stats";
import { formatDuration } from "@/lib/format";

export const metadata = { title: "Administración: resumen" };
export const dynamic = "force-dynamic";

const KPI_CELL = "border-t-2 border-slate-200 pt-3 pb-4";

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={KPI_CELL}>
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tracking-tight text-ink">{value}</dd>
      {note ? <dd className="mt-0.5 text-sm text-slate-600">{note}</dd> : null}
    </div>
  );
}

const nf = new Intl.NumberFormat("es-CO");

export default async function AdminOverviewPage() {
  await requireAdmin("/admin");
  const [stats, provider] = [await getAdminStats(14), describeProvider()];
  const { overview, daily, topUsers } = stats;
  const topMax = Math.max(...topUsers.map((u) => u.messages), 1);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Resumen</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Uso general de la aplicación. Son datos agregados: por privacidad, el administrador no puede leer el contenido de las conversaciones.
        </p>
      </div>

      {!provider.configured ? (
        <Alert kind="error">
          <p className="font-medium">El asistente no puede responder todavía.</p>
          <p className="mt-0.5">
            {provider.problem ?? "Falta configurar el proveedor de IA."} Define las variables en el archivo <code className="font-mono text-[13px]">.env</code> (o en Vercel) y reinicia.
          </p>
        </Alert>
      ) : provider.isMock ? (
        <Alert kind="info">
          <p className="font-medium">Modo simulado activo.</p>
          <p className="mt-0.5">
            Las respuestas son de ejemplo y no vienen de un modelo real. Para conectar uno, configura <code className="font-mono text-[13px]">AI_PROVIDER</code> y su clave
            en las variables de entorno.
          </p>
        </Alert>
      ) : (
        <Alert kind="success">
          Conectado a {provider.label}
          {provider.endpoint ? ` (${provider.endpoint})` : ""} con el modelo <span className="font-mono text-[13px]">{provider.defaultModel}</span>.
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Usuarios" value={nf.format(overview.totalUsers)} note={`${nf.format(overview.activeUsers)} activos`} />
        <Kpi label="Nuevos (7 días)" value={nf.format(overview.newUsers7d)} />
        <Kpi label="Conversaciones" value={nf.format(overview.totalConversations)} />
        <Kpi label="Preguntas" value={nf.format(overview.userMessages)} note={`${nf.format(overview.messages24h)} mensajes en 24 h`} />
        <Kpi label="Tiempo de respuesta" value={overview.avgLatencyMs > 0 ? formatDuration(overview.avgLatencyMs) : "—"} note="promedio del asistente" />
        <div className={KPI_CELL}>
          <dt className="text-sm text-slate-600">Valoraciones</dt>
          <dd className="mt-1 flex items-center gap-4 text-3xl font-bold tracking-tight text-ink">
            <span className="flex items-center gap-1.5">
              <ThumbsUp className="size-5 text-slate-500" aria-label="Útiles" />
              {nf.format(overview.thumbsUp)}
            </span>
            <span className="flex items-center gap-1.5">
              <ThumbsDown className="size-5 text-slate-500" aria-label="No útiles" />
              {nf.format(overview.thumbsDown)}
            </span>
          </dd>
        </div>
      </dl>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="daily-title">
          <h2 id="daily-title" className="text-lg font-semibold tracking-tight">
            Preguntas por día
          </h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">Últimos 14 días, según la zona horaria {stats.timezone}.</p>
          <DailyChart data={daily} title="Preguntas por día en los últimos 14 días" />
        </section>

        <section aria-labelledby="top-title">
          <h2 id="top-title" className="text-lg font-semibold tracking-tight">
            Usuarios más activos
          </h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">Por número de preguntas enviadas.</p>
          {topUsers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-slate-500">Todavía nadie ha enviado preguntas.</p>
          ) : (
            <ol className="space-y-4">
              {topUsers.map((user) => (
                <li key={user.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-900" title={user.email}>
                      {user.name}
                    </p>
                    <p className="text-sm text-slate-700 tabular-nums">{nf.format(user.messages)}</p>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.max((user.messages / topMax) * 100, 2)}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
