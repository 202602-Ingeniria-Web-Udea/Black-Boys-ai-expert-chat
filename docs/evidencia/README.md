# Evidencia de pruebas

Esta carpeta guarda los informes de la batería de preguntas de prueba del asistente (sección 7 del enunciado).

| Archivo | Qué es |
|---|---|
| [`informe-pruebas-simulado.md`](informe-pruebas-simulado.md) | Informe de la **etapa Taller 2**: se generó con el proveedor **simulado** (`AI_PROVIDER=mock`) y la especialidad por defecto (Salud y medicamentos, asistente «Botiquín»). Demuestra que el flujo completo funciona —la pantalla de pruebas, el informe descargable, el manejo de resultados—, pero **no** que un modelo responda bien: las respuestas son de relleno. Por eso la mayoría de las preguntas aparecen en «Revisar». |
| `informe-pruebas-real.md` | **Lo genera el equipo** con la aplicación desplegada y el **modelo real** (etapa Proyecto de IA). Es la evidencia que pide el enunciado: respuestas reales a las 14 preguntas, con las columnas Pertinente / Coherente / Seguro completadas a mano. |

## Cómo generar el informe real

1. Despliega la aplicación con un proveedor de IA real (ver [`../DESPLIEGUE.md`](../DESPLIEGUE.md)).
2. Desde tu computador, con las credenciales de la cuenta ADMIN:

   ```bash
   ADMIN_EMAIL="tu-correo@dominio.com" ADMIN_PASSWORD="tu-clave" \
   npm run eval -- https://<tu-app>.vercel.app --out docs/evidencia/informe-pruebas-real.md
   ```

   (O desde el panel: **Administración → Pruebas → Ejecutar las 14 pruebas → Descargar informe**.)
3. Abre el informe, lee cada respuesta y reemplaza «Pendiente» por «Sí» o «No» en las columnas de evaluación. Anota al final las conclusiones: qué mejoraste en el System Prompt y qué limitaciones quedan.
4. Súbelo al repositorio y enlázalo desde el README.

Detalles de la rúbrica y de cómo leer los resultados en [`../PRUEBAS.md`](../PRUEBAS.md).

> Los informes contienen las preguntas y las respuestas del modelo, **no** contraseñas ni claves de API. Revísalos de todos modos antes de publicar el repositorio.
