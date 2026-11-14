// Líneas de ayuda de Colombia que muestra la aplicación. Datos verificados en las páginas oficiales del
// Ministerio de Salud y Protección Social (noviembre de 2026). Si cambian, se corrigen aquí y en ningún otro lugar.
//
//   · 123            → línea única de emergencias.
//   · 106            → Línea nacional de orientación en salud mental (gratuita, confidencial, 24 h).
//   · Toxicología    → Línea nacional de toxicología: 018000 916012 (gratuita) o (601) 288 6012, 24 h.

export interface HelpLine {
  id: "emergency" | "mental-health" | "poison";
  name: string;
  /** Texto que se muestra (con espacios para leerlo mejor). */
  display: string;
  /** Valor del enlace tel: (solo dígitos y +). */
  tel: string;
  note: string;
}

export const HELP_LINES: Record<HelpLine["id"], HelpLine> = {
  emergency: {
    id: "emergency",
    name: "Emergencias",
    display: "123",
    tel: "123",
    note: "Línea única de emergencias de Colombia",
  },
  "mental-health": {
    id: "mental-health",
    name: "Salud mental",
    display: "106",
    tel: "106",
    note: "Gratuita, confidencial y atiende las 24 horas",
  },
  poison: {
    id: "poison",
    name: "Toxicología",
    display: "018000 916012",
    tel: "018000916012",
    note: "Línea nacional de toxicología, gratuita y las 24 horas. Desde Bogotá: (601) 288 6012",
  },
};

export interface TrustedSource {
  name: string;
  description: string;
  href: string;
}

/** Sitios oficiales para verificar información (se abren en una pestaña nueva). */
export const TRUSTED_SOURCES: TrustedSource[] = [
  {
    name: "INVIMA · Consulta de registros sanitarios",
    description: "Comprueba que un medicamento tiene registro sanitario vigente en Colombia.",
    href: "https://www.invima.gov.co/consulta-registros-sanitarios",
  },
  {
    name: "MedlinePlus · Medicinas, hierbas y suplementos",
    description: "Información en español para el público, de la Biblioteca Nacional de Medicina de EE. UU.",
    href: "https://medlineplus.gov/spanish/druginformation.html",
  },
  {
    name: "Punto Azul · Medicamentos vencidos",
    description: "Dónde entregar medicamentos vencidos o sobrantes y sus empaques.",
    href: "https://www.puntoazul.com.co/",
  },
];
