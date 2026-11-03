# Estado de publicación F34–F36

Actualizado: 3 de noviembre de 2026.

**Versión implementada, compilada y comprobada localmente. Publicación a cargo del equipo; pendiente de verificar la URL pública nueva.**

Los dos despliegues consultados en Vercel `cerebro-nyc` terminaron en error. No se encontró un despliegue nuevo READY. El equipo realizará la subida; estos ajustes no inician otra publicación.

La auditoría de 143 controles guardada corresponde al sitio publicado anterior y a F01–F21 / F25–F33. No confirma que F34–F36 estén en producción.

| ID | Contenido preparado | Ubicación |
|---|---|---|
| F34 | Cierres administrativos de solicitudes creadas en diciembre de 2025 | Escucha social; `/data/serviceOutcomes.json` |
| F35 | Acuerdo con la resolución, respuestas de encuesta 2025 | Escucha social; `/data/serviceOutcomes.json` |
| F36 | Aforos DOT 2023–2025 de Midtown | Diagnóstico de Midtown; `/data/trafficCounts.json` |

## Después de subir a Vercel

1. Registrar URL nueva y despliegue READY.
2. Comprobar las dos tablas 311: cinco boroughs por tabla, fechas, denominadores, exclusiones y fuentes F34/F35.
3. Comprobar nueve filas F36: tres celdas con datos históricos y seis sin observaciones. No convertir los nulos en cero ni presentar los aforos como congestión de toda la zona.
4. Abrir los dos JSON anteriores y contrastarlos con las cifras visibles.
5. Abrir `/comparacion.html`: verificar barras, tabla censal, selector coordinado y mapa. Si WebGL falla, registrar el límite y comprobar tabla/selector.
6. Repetir la auditoría de fuentes en la URL nueva y guardar evidencia. Esta auditoría no sustituye los controles específicos F34–F36.

Hasta entonces, conservar **«Publicación pendiente de comprobar»**.

## Preparación y límites

`npm run build` compila la salida y `npm run verify:all` comprueba datos, comparación e interfaz. Vercel ejecuta ambos pasos en ese orden.

La salida publicada omite direcciones y coordenadas del directorio cultural, conserva nombres/boroughs y conteos agregados, y ofrece un índice de referencias públicas. El catálogo de fichas conserva método, vigencia y cobertura. Los cortes originales del repositorio permiten reconstruir los cálculos.

No se certifican todavía el renderizado real del nuevo caso comparativo ni la publicación nueva.
