import type { Metadata, Viewport } from "next";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/jetbrains-mono";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Botiquín · Tu guía de salud y medicamentos", template: "%s · Botiquín" },
  description:
    "Botiquín es un asistente de IA que explica medicamentos y hábitos saludables en lenguaje claro: sin diagnósticos, sin recetas y con ayuda inmediata si hay una urgencia.",
  applicationName: "Botiquín",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

// Aplica el tamaño de texto elegido ANTES de pintar, para evitar un salto visual al cargar.
const TEXT_SIZE_SCRIPT = `try{var s=localStorage.getItem("botiquin:text");if(s==="lg"||s==="xl")document.documentElement.setAttribute("data-text",s)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-white text-ink antialiased">
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
