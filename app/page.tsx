import { CalendarCheck, Check, ChevronDown, FileText, HeartPulse, KeyRound, Lock, Pill, ShieldCheck, Siren, X, History } from "lucide-react";
import { Markdown } from "@/components/chat/Markdown";
import { HelpLines } from "@/components/safety/HelpLines";
import { UrgencyBanner } from "@/components/safety/UrgencyBanner";
import { Blister } from "@/components/site/Blister";
import { LogoMark } from "@/components/site/Logo";
import { PillboxPreview } from "@/components/site/PillboxPreview";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { getPreset } from "@/lib/assistant/presets";
import { getCurrentUser } from "@/lib/auth/session";
import { getAssistantSettingsSafe, toPublicAssistant } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

const SAMPLE_QUESTION = "¿Puedo tomar ibuprofeno con el estómago vacío?";

const SAMPLE_ANSWER = `### Qué es y para qué se usa
El ibuprofeno es un antiinflamatorio no esteroideo (AINE). Se usa para aliviar el dolor leve o moderado, bajar la fiebre y reducir la inflamación.

### Cómo usarlo con seguridad
Tomarlo con comida o con un vaso de leche suele disminuir las molestias de estómago. Sigue la cantidad que dice el empaque o la que te indicó tu médico, y no la superes.

> **Atención:** Consulta antes de usarlo si tienes úlcera, gastritis fuerte, problemas de riñón o de corazón, asma que empeora con antiinflamatorios, o si estás embarazada.

### Cuándo consultar
Acude al médico si el dolor o la fiebre siguen después de unos días. Ve a urgencias si aparecen heces negras, vómito con sangre, hinchazón de la cara o dificultad para respirar.

> **Consejo:** Lleva el empaque a tu cita para que el médico o el farmacéutico revisen el nombre del medicamento y sus ingredientes.`;

const TOPICS = [
  {
    icon: Pill,
    title: "Medicamentos",
    text: "Para qué sirve, cómo se guarda, qué hacer si olvidas una toma y en qué se diferencian un genérico y uno de marca.",
  },
  {
    icon: FileText,
    title: "Prospectos y etiquetas",
    text: "Traduce el lenguaje técnico: contraindicaciones, efectos no deseados, interacciones y fechas de vencimiento.",
  },
  {
    icon: HeartPulse,
    title: "Hábitos saludables",
    text: "Sueño, alimentación, actividad física y presión arterial, con información educativa y sin promesas milagrosas.",
  },
];

const DOES = [
  "Explica para qué sirve un medicamento y cómo usarlo con seguridad en general.",
  "Te ayuda a leer un prospecto o una etiqueta.",
  "Te dice qué señales son de cuidado y cuándo consultar.",
  "Reconoce cuando no sabe algo, en lugar de inventarlo.",
];
const DOES_NOT = [
  "No diagnostica: no puede examinarte ni ver tu historia clínica.",
  "No receta ni indica cantidades de un tratamiento.",
  "No reemplaza a tu médico, a tu farmacéutico ni a una urgencia.",
  "No responde sobre temas ajenos a la salud y los medicamentos.",
];

const PRIVACY = [
  { icon: KeyRound, title: "Contraseñas cifradas", text: "Se guardan con bcrypt; nunca en texto plano." },
  { icon: Lock, title: "Sesión protegida", text: "Cookie httpOnly firmada. El rol se verifica en el servidor en cada petición." },
  { icon: ShieldCheck, title: "Claves de IA en el servidor", text: "Tu navegador nunca ve la clave del proveedor de inteligencia artificial." },
  { icon: History, title: "Historial privado", text: "Solo tú puedes leer, exportar o eliminar tus conversaciones." },
];

const FAQ = [
  {
    q: "¿Botiquín reemplaza a mi médico o a mi farmacéutico?",
    a: "No. Ofrece información educativa para que entiendas mejor tus medicamentos y tus hábitos. No diagnostica, no receta y no cambia lo que te indicó un profesional. Si tienes síntomas o dudas sobre tu tratamiento, consulta con quien te atiende.",
  },
  {
    q: "¿Me dirá cuánto medicamento debo tomar?",
    a: "No. No da cantidades ni horarios de tratamiento, porque lo correcto depende de tu edad, tu peso, tus enfermedades y los demás medicamentos que usas. Te remite al prospecto, a tu fórmula médica o a tu farmacéutico.",
  },
  {
    q: "¿Qué pasa si escribo algo urgente?",
    a: "Si el mensaje suena a intoxicación, a una emergencia médica o a una crisis emocional, aparece primero un aviso con los números de ayuda (123, toxicología y Línea 106) y la respuesta se vuelve breve y prioritaria.",
  },
  {
    q: "¿Mis conversaciones son privadas?",
    a: "Sí. Cada conversación pertenece a tu cuenta y solo tú puedes verla. El panel de administración muestra estadísticas generales, no el contenido de los chats. Puedes renombrar, exportar o eliminar tus conversaciones cuando quieras.",
  },
  {
    q: "¿Dónde se guardan los datos de mi pastillero?",
    a: "Solo en este navegador, en tu dispositivo. No se envían al servidor, así que no los verás en otro equipo, y borrar los datos del navegador los elimina.",
  },
  {
    q: "¿Qué inteligencia artificial usa?",
    a: "Un modelo de lenguaje configurado en el servidor (por ejemplo Groq, Gemini u OpenAI). La clave nunca llega al navegador. El administrador puede cambiar el modelo y la personalidad del asistente desde el panel.",
  },
];

export default async function HomePage() {
  const [user, settings] = await Promise.all([getCurrentUser().catch(() => null), getAssistantSettingsSafe()]);
  const assistant = toPublicAssistant(settings);
  const questions = assistant.suggestedQuestions.length > 0 ? assistant.suggestedQuestions : (getPreset("salud")?.assistant.suggestedQuestions ?? []);
  const name = assistant.name;

  return (
    <>
      <SiteHeader user={user} name={name} />
      <main id="contenido">
        {/* Portada */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-12 pb-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:pt-20 lg:pb-24">
          <div>
            <h1 className="text-[2.6rem] leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-[3.4rem]">Tus medicamentos, explicados con claridad</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              {name} responde dudas sobre medicamentos, prospectos y hábitos saludables en lenguaje sencillo. No diagnostica ni receta: te ayuda a
              entender y te dice cuándo consultar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <ButtonLink href="/chat" size="lg">
                  Ir al chat
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/register" size="lg">
                    Crear cuenta
                  </ButtonLink>
                  <ButtonLink href="/login" variant="secondary" size="lg">
                    Ya tengo cuenta
                  </ButtonLink>
                </>
              )}
            </div>
            <div className="mt-10 flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:gap-5">
              <p className="flex shrink-0 items-center gap-2 text-sm font-bold text-red-800">
                <Siren className="size-4" aria-hidden="true" />
                ¿Es una urgencia?
              </p>
              <HelpLines />
            </div>
          </div>

          <Blister questions={questions} assistantName={name} loggedIn={!!user} />
        </section>

        {/* Qué puedes preguntar */}
        <section id="preguntas" className="border-t border-line" aria-labelledby="preguntas-title">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <h2 id="preguntas-title" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Preguntas de todos los días, respondidas con calma
            </h2>
            <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0">
              {TOPICS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="border-line md:border-l md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold tracking-tight">{title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo responde */}
        <section id="respuestas" className="border-t border-line" aria-labelledby="respuestas-title">
          <div className="mx-auto grid max-w-6xl items-start gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
            <div className="lg:sticky lg:top-28">
              <h2 id="respuestas-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Respuestas ordenadas como un prospecto
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Cada respuesta separa lo esencial en apartados cortos y resalta lo que no conviene pasar por alto.
              </p>
              <ul className="mt-6 space-y-3 text-slate-700">
                {[
                  "Qué es y para qué se usa.",
                  "Cómo usarlo con seguridad.",
                  "Precauciones y efectos no deseados.",
                  "Cuándo consultar a un profesional.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <figure>
              <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_28px_60px_-34px_rgba(13,43,51,0.4)]">
                <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                  <LogoMark className="size-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{name}</p>
                    <p className="truncate text-xs text-slate-600">{assistant.specialty}</p>
                  </div>
                </div>
                <div className="space-y-6 px-5 py-6 sm:px-7">
                  <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand-50 px-4 py-3 text-ink">{SAMPLE_QUESTION}</p>
                  <div className="flex gap-3">
                    <LogoMark className="mt-0.5 size-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Markdown content={SAMPLE_ANSWER} />
                    </div>
                  </div>
                </div>
              </div>
              <figcaption className="mt-3 text-sm text-slate-600">Ejemplo ilustrativo del formato de las respuestas.</figcaption>
            </figure>
          </div>
        </section>

        {/* Límites claros */}
        <section id="limites" className="border-t border-line" aria-labelledby="limites-title">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <h2 id="limites-title" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Límites claros, pensados para cuidarte
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-brand-200 bg-white p-6 sm:p-8">
                <h3 className="text-lg font-bold text-brand-700">{name} sí</h3>
                <ul className="mt-4 space-y-3">
                  {DOES.map((item) => (
                    <li key={item} className="flex items-start gap-3 leading-relaxed">
                      <Check className="mt-1 size-5 shrink-0 text-brand-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                <h3 className="text-lg font-bold text-slate-800">{name} no</h3>
                <ul className="mt-4 space-y-3">
                  {DOES_NOT.map((item) => (
                    <li key={item} className="flex items-start gap-3 leading-relaxed">
                      <X className="mt-1 size-5 shrink-0 text-red-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 grid items-center gap-8 rounded-3xl bg-mist p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Si suena a urgencia, primero la ayuda</h3>
                <p className="mt-3 leading-relaxed text-slate-700">
                  Cuando un mensaje habla de una intoxicación, de una emergencia médica o de una crisis emocional, {name} muestra en el acto a quién llamar y
                  responde de forma breve. Primero la ayuda; la explicación, después.
                </p>
              </div>
              <div className="space-y-3">
                <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md border border-line bg-white px-4 py-3">
                  Me tomé una pastilla de más por error, ¿qué hago?
                </p>
                <UrgencyBanner kind="poisoning" example />
              </div>
            </div>
          </div>
        </section>

        {/* Pastillero */}
        <section id="pastillero" className="border-t border-line" aria-labelledby="pastillero-title">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
            <div>
              <h2 id="pastillero-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Un pastillero para no perder el hilo
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Anota tus medicamentos y sus horarios, marca cada toma y mira cómo vas en la semana. Puedes imprimir el plan o llevarlo a tu calendario.
              </p>
              <ul className="mt-6 space-y-3 text-slate-700">
                <li className="flex items-start gap-3">
                  <CalendarCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
                  Vista de hoy, de la semana y lista de medicamentos.
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
                  Se guarda solo en tu dispositivo, no en el servidor.
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
                  Registra lo que te indicó tu médico; nunca sugiere cantidades.
                </li>
              </ul>
              <div className="mt-8">
                <ButtonLink href={user ? "/pastillero" : `/register?next=${encodeURIComponent("/pastillero")}`} variant="soft" size="lg">
                  {user ? "Abrir mi pastillero" : "Crear cuenta y abrirlo"}
                </ButtonLink>
              </div>
            </div>
            <PillboxPreview />
          </div>
        </section>

        {/* Privacidad */}
        <section className="border-t border-line" aria-labelledby="privacidad-title">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <h2 id="privacidad-title" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Tu información, protegida
            </h2>
            <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {PRIVACY.map(({ icon: Icon, title, text }) => (
                <div key={title}>
                  <Icon className="size-6 text-brand-700" aria-hidden="true" />
                  <dt className="mt-3 font-bold">{title}</dt>
                  <dd className="mt-1 leading-relaxed text-slate-600">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section id="faq" className="border-t border-line" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:py-24">
            <h2 id="faq-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
              Preguntas frecuentes
            </h2>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-1">
                  <summary className="flex min-h-14 list-none items-center justify-between gap-4 rounded-lg py-3 text-left text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="pb-4 leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="border-t border-line bg-brand-50" aria-labelledby="cierre-title">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
            <h2 id="cierre-title" className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">
              ¿Tienes una duda sobre un medicamento? Pregúntala ahora.
            </h2>
            <ButtonLink href={user ? "/chat" : "/register"} size="lg">
              {user ? "Ir al chat" : "Crear cuenta"}
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter name={name} />
    </>
  );
}
