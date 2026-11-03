# Uso de fuentes del Excel y prioridad 2

Corte: 26 de octubre de 2026.

## Resultado de la revisión

Antes de este cambio faltaba integrar F25, F31, F32 y F33. Se descargaron y se conectaron a vistas reales. Las 30 fuentes tienen ahora un uso identificado: 22 fuentes de datos, 4 transcripciones/selecciones, 3 servicios externos configurados y 1 catálogo interno. Esto no acredita cobertura completa ni disponibilidad en vivo de los servicios externos. La fuente adicional ACS por NTA no forma parte de las 30 originales.

## Matriz de las 30 fuentes

| ID | Fuente | Uso actual | Estado y límite |
|---|---|---|---|
| F01 | Limites de boroughs | Gemelo y contexto del atlas | Datos integrados y utilizados. Cinco boroughs; contexto distinto de NTA. |
| F02 | Areas estadisticas NTA 2020 | Polígonos NTA del atlas, gemelo y cruces espaciales | Datos integrados y utilizados. 197 áreas residenciales y 65 especiales separadas. |
| F03 | Huellas y alturas de edificios | Diagnóstico Midtown, edificios 3D y conteos parciales NTA | Datos integrados y utilizados. Diagnóstico: extracción completa y filtros de tipo; NTA conserva la muestra histórica de 10.000 huellas. No cubre toda NYC. |
| F04 | Colisiones por borough y mes | Seguridad y diagnóstico de boroughs | Datos integrados y utilizados. 2025; no medida de tráfico. |
| F05 | Personas fallecidas y lesionadas en colisiones por borough y mes (agregado) | Seguridad: totales mensuales y tasas agregadas por borough | Datos integrados y utilizados. No se publican identificadores, fechas exactas ni coordenadas de eventos. |
| F06 | Solicitudes 311 por tema y borough | Escucha social y selector de diciembre | Datos integrados y utilizados. Diciembre 2025, no sumar a F25. |
| F07 | Solicitudes 311 por mes | Serie mensual de Municipio | Datos integrados y utilizados. Corte histórico; no se fuerza conciliación con descargas revisadas. |
| F08 | Censo de arbolado urbano | Ambiente y contexto de boroughs | Datos integrados y utilizados. Árboles de calle 2015, no cobertura arbórea actual. |
| F09 | Establecimientos con inspecciones sanitarias | Turismo, establecimientos registrados | Datos integrados y utilizados. CAMIS distintos; historial no acredita apertura. |
| F10 | Denuncias registradas por tipo y borough | Seguridad y contexto de boroughs | Datos integrados y utilizados. Denuncias 2024; no condenas ni victimización total. |
| F11 | Estaciones de metro y Staten Island Railway | Gemelo, presencia de transporte en índice NTA | Datos integrados y utilizados. Registros de estación; no frecuencia ni cobertura peatonal. |
| F12 | Propiedades administradas por Parks | Capa geográfica e índice de equipamientos NTA | Datos integrados y utilizados. Propiedades, no hectáreas verdes calculadas. |
| F13 | Organizaciones culturales | Directorio DCLA, gemelo e índice NTA | Datos integrados y utilizados. Organizaciones registradas, no toda la oferta cultural. |
| F14 | Centros de NYC Health + Hospitals | Centros H+H, gemelo e índice NTA | Datos integrados y utilizados. Solo red H+H; no sumar con F33. |
| F15 | Consumo energetico declarado LL84 | Diagnóstico eléctrico, capa LL84 elegible y conteo NTA | Datos integrados y utilizados. Año calendario 2023 confirmado por metadatos y year_ending; diagnóstico excluye IDs repetidos y campus. |
| F16 | Atencion a boroughs y lugares en Wikipedia | Escucha social: series y artículos | Datos integrados y utilizados. Vistas brutas, no personas únicas ni opinión. |
| F17 | Serie de clima de Manhattan | Ambiente: serie 2015–2025 | Datos integrados y utilizados. Reanálisis en un punto de Manhattan. |
| F18 | Titulares sobre Nueva York | Escucha social: titulares y temas | Datos integrados y utilizados. Muestra RSS, no cobertura exhaustiva ni sentimiento. |
| F19 | QuickFacts de NYC y sus cinco condados | Transcripción QuickFacts en población, economía y boroughs | Transcripción / selección utilizada. Productos PEP/ACS/censos separados; datos en src/seed.js. |
| F20 | Balance turístico anual 2025 | Tarjetas y gráfico turístico | Transcripción / selección utilizada. Transcripción en src/main.js, toda NYC. |
| F21 | Comentarios al presupuesto adoptado FY2026 | Tarjetas y gráfico presupuestal | Transcripción / selección utilizada. FY2026 adoptado, no ejecución ni presupuesto actual FY2027. |
| F31 | Población por borough, sexo y edad — Censo 2020 | Gente: pirámide por sexo/edad y selector de borough | Datos integrados y utilizados. 220 registros censales 2020; intervalos de amplitud desigual. |
| F32 | Financiación de instituciones culturales CIG — FY2025 | Cultura: apoyos operativos/energéticos CIG FY2025 | Datos integrados y utilizados. 35 instituciones; no gasto cultural total ni imputación a barrios. |
| F33 | Directorio estatal de instalaciones sanitarias en NYC | Gente: directorio estatal filtrable completo | Datos integrados y utilizados. 2.141 filas originales; 2.116 registros distintos tras excluir 25 filas idénticas de la vista. Tipos diversos, no solo hospitales. |
| F25 | 311 anual agrupado por borough y tema | Escucha social: selector 2025 completo, temas y boroughs | Datos integrados y utilizados. 946 grupos en la nueva descarga; no sumar F06 ni F07. |
| F26 | Mapa base de OpenStreetMap | Gemelo: mapa base OSM | Servicio externo configurado. Servicio externo configurado; no se acredita aquí renderizado de teselas. |
| F27 | World Imagery de Esri | Gemelo y Ambiente: World Imagery | Servicio externo configurado. Servicio externo configurado; mosaico de fechas distintas. |
| F28 | Pronóstico de Manhattan | Pronóstico y cabecera del sitio | Servicio externo configurado. Consulta en navegador con estado de error; sin éxito en vivo acreditado en pruebas DOM. |
| F29 | Catálogo y metadatos internos del proyecto | Fuentes, fichas y exportación del catálogo | Metadatos utilizados. Producto interno, no observación independiente. |
| F30 | Selección de hitos para el recorrido | Recorrido y búsqueda de hitos | Transcripción / selección utilizada. 12 lugares curados en src/seed.js, no censo turístico. |

## Prioridad 2 implementada

- Índice NTA con cuatro dimensiones, pesos configurables, restablecimiento y casos completos.
- Recursos económicos (ingreso y pobreza), alquiler menor, presencia de estaciones y equipamientos registrados. El resultado no se denomina calidad de vida ni asequibilidad.
- Normalización global fija en las 197 áreas residenciales. Filtrar borough no altera la escala; las posiciones son globales.
- Mapa SVG seleccionable y operable por teclado, tabla ordenada, comparación de valores originales, CSV con dimensiones y pesos.
- Correlaciones NTA Pearson/Spearman, n válido, exclusiones, fuentes/períodos y relaciones exploratorias entre fuentes distintas.
- Se conserva el contexto por borough separado del análisis NTA.

## Nuevas fuentes utilizadas

- F25: 311 anual 2025, 946 grupos; selector anual/diciembre por borough en Escucha social.
- F31: Censo 2020, 220 registros, 8.804.190 personas; pirámide en Gente con 22 grupos de edad originales.
- F32: 35 instituciones CIG, apoyos operativos y energéticos FY2025; gráfico y tabla en Cultura.
- F33: 2.141 registros de instalaciones sanitarias; directorio completo buscable en Gente. No se suma con H+H.

## Límites pendientes

- Prioridad 3: diagnóstico Midtown implementado con oferta de metro como proxy; aforos históricos DOT 2023–2025 añadidos como F36 en una vista separada; la cobertura no permite medir congestión ni puntuar toda la red. Véase PRIORIDAD-3.md.
- El índice mezcla períodos documentados y conteos dependientes del tamaño de área. Los márgenes de error originales no se propagan al índice.
- No se asignan a NTA fuentes disponibles solo por borough o institución sin un cruce validado.
- Las fuentes externas OSM, Esri y pronóstico están configuradas; las pruebas locales no prueban su disponibilidad en el navegador del usuario.
- El repositorio incluye la configuración de publicación en Vercel.

## Reproducción

`npm run build` reconstruye NTA y matriz de fuentes antes de compilar. `npm run verify` comprueba datos, NTA e índice.

Las cuatro instantáneas nuevas se actualizan con `python scripts/pull-excel-sources.py` (requiere openpyxl y curl). Para seleccionar fuentes: `python scripts/pull-excel-sources.py F25 F32`. El Excel original no se modifica.

La matriz descargable es `public/data/sourceUsage.json`.

## Calidad y validación de esta entrega

Con pesos iniciales, 191 de las 197 NTA tienen índice completo; seis quedan sin posición por falta de comparabilidad. F33 contiene 25 filas idénticas: la vista conserva 2.116 registros distintos sin modificar las 2.141 filas originales.

Comprobaciones: `npm run verify`, prueba funcional DOM `scripts/ui-check.mjs` y compilación Vite. Se añadió `scripts/browser-priority2.cjs` para comprobar en Edge real el mapa SVG y las correlaciones, en escritorio de 1440 px y móvil de 390 px. El resultado y las capturas están en `qa-priority2/`. La prueba bloquea deliberadamente las peticiones externas: no acredita teselas, pronóstico en vivo ni toda la funcionalidad WebGL del gemelo.

El informe previo `ESTADO-ACTUAL-Y-PENDIENTES.md` conserva la revisión anterior como historial y tiene una actualización al principio que remite a este documento.