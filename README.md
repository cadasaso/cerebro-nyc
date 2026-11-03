# Cerebro NYC

Sistema territorial de Nueva York construido para la segunda entrega del Taller de Datos. El sitio es público, de solo lectura y funciona sin una llave paga ni tarjeta de crédito.

## Integrantes

- Carlos David Sanchez Soto
- Alejandro Garcia Cortes

## Enlaces de entrega

- Sistema publicado y verificado: https://cerebro-nyc-taller.dorisot.chatgpt.site/
- Espejo anterior en Vercel: https://nueva-yorkcerebro-digital.vercel.app/
- Repositorio público del grupo: https://github.com/cadasaso/cerebro-nyc

## Qué decidimos mostrar

Como grupo decidimos mostrar diferencias territoriales de población, vivienda, economía, servicios, movilidad, cultura, ambiente, seguridad y reportes 311. Usamos los cinco boroughs como contexto comparable y las áreas NTA 2020 para el detalle barrial. Conservamos la vigencia y el ID `Fxx` de cada fuente para no mezclar censos, estimaciones, encuestas y registros administrativos como si fueran equivalentes.

No presentamos los índices como calidad de vida, riesgo o causalidad. Los marcamos como lecturas exploratorias y mostramos sus pesos, periodos y límites. Cuando una variable es aproximada, como la oferta de metro en el diagnóstico de Midtown, aparece como `PROXY`.

## Preguntas de la primera entrega

| Pregunta | Estado | Respuesta en el sistema |
|---|---|---|
| ¿Cómo varían la población, la vivienda y la actividad económica entre los cinco boroughs? | Respondida | Secciones Gente, Economía y Atlas. Usamos F19, F31 y ACS NTA 2020-2024. |
| ¿Dónde se concentran los servicios, la infraestructura y los registros de seguridad y ambiente? | Respondida | Gemelo, Atlas, Cultura, Seguridad y Ambiente. Publicamos infraestructura puntual y seguridad agregada por territorio. |
| ¿Cómo cambian los reportes ciudadanos y la atención pública hacia Nueva York? | Parcial | Mostramos 311 anual y mensual, prensa y Wikipedia. Quedan pendientes tiempos de cierre y satisfacción porque no contamos con una fuente verificada comparable en el lago. |

## Uso y protección de los datos

Las fuentes son públicas, pero cada una conserva su licencia o la indicación `No declara` cuando la fuente no publica una licencia nominal. El Excel actualizado contiene la redacción copiada de la fuente, la fecha real de prueba y únicamente los conjuntos usados por el sistema o las conexiones externas claramente separadas.

Aplicamos minimización de datos. No publicamos nombres de residentes, teléfonos, placas, IDs de colisiones, fechas exactas ni coordenadas de eventos viales. Las colisiones se exponen como totales mensuales y tasas agregadas por borough. Los directorios contienen infraestructura e instituciones públicas, no registros de pacientes o usuarios.

## Fuentes integradas

Las vistas usan más de tres fuentes reales. Entre las principales están NYC DCP (F01 y F02), NYC OTI (F03 y F25), NYPD (F04, F05 y F10), MTA (F11), NYC Parks (F08 y F12), DCLA (F13 y F32), NYC H+H (F14), NYC DOB (F15), U.S. Census Bureau (F19 y F31) y NYS Department of Health (F33).

`public/data/sourceUsage.json` relaciona los 30 registros del Excel con su uso, límite, evidencia y estado. F26, F27 y F28 se identifican como servicios externos configurados, no como archivos almacenados en el lago.

## Auditoría de trazabilidad F01-F33

La prueba `npm run verify:ui` recorre todos los botones de cifras y fuentes que renderiza la aplicación. Cada clic debe abrir una ficha con ID `Fxx`, fuente, entidad, vigencia, fecha probada, estado, método y enlace HTTPS original. La versión actual aprueba 143 clics y los 30 IDs del inventario: F01-F21 y F25-F33; F22-F24 no fueron asignados en la primera entrega. El resultado completo se publica en `/trazabilidad.html` y su evidencia estructurada queda en `public/data/traceabilityAudit.json`.

En la página de auditoría se puede pulsar **Verificar clics en la web** para repetir la activación programática en la aplicación publicada, sin sustituirla por un DOM simulado. Permite escoger escritorio, móvil de 390 px o móvil de 412 px y descargar la evidencia JSON. Comprueba apertura y cierre de cada ficha, sus campos y el desbordamiento horizontal. No certifica que las fuentes externas respondan ni valida WebGL o todos los recorridos de accesibilidad. Una prueba de interfaz no cambia la fecha real de consulta de los datos.

## Bitácora de exploración de visualización

Probamos los mismos datos de población por borough en dos herramientas que están implementadas en el sitio.

| Herramienta | Qué pidió para empezar | Licencia | Dónde quedan los datos al publicar | Qué resolvió | Qué no resolvió | Decisión |
|---|---|---|---|---|---|---|
| Apache ECharts 5.6 | Node.js, instalación con `npm` y un contenedor HTML | Apache License 2.0 | Los valores quedan en los JSON y módulos estáticos del sitio; el gráfico se genera en el navegador | Comparaciones, series, tooltips, SVG y adaptación móvil | No dibuja por sí solo la geografía NTA ni administra mapas base | Se conserva para gráficos y comparaciones |
| MapLibre GL JS 5.6 | Node.js, WebGL, GeoJSON y un estilo de mapa | BSD 3-Clause | Las capas propias quedan en `public/data`; OSM y Esri se consultan como teselas externas con atribución | Polígonos, selección territorial, capas, navegación y edificios 3D | No reemplaza los gráficos estadísticos y depende de WebGL; las teselas externas pueden fallar | Se conserva para el Gemelo y Atlas |

ECharts publica su licencia en https://echarts.apache.org/en/download.html. MapLibre publica su licencia en https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt.

## Decisión de herramienta

Elegimos una aplicación estática con Vite. ECharts resuelve los gráficos, MapLibre la cartografía y Three.js la extrusión 3D. Esta combinación permite publicar en alojamiento estático, mantener los datos de la entrega dentro del repositorio y evitar una base de datos o servicio pago. Los mapas base externos son opcionales: las capas locales siguen disponibles si las teselas no responden.

## Bitácora de IA

Usamos IA para localizar fuentes oficiales, comparar esquemas, proponer consultas SODA, redactar scripts y revisar la interfaz. No aceptamos automáticamente los resultados. Comprobamos conteos, periodos, campos y enlaces con scripts reproducibles.

Errores y correcciones principales:

- La API ACS sin clave redirigió a `missing_key`. Conservamos QuickFacts y NYC Population FactFinder sin inventar datos faltantes.
- La primera consulta anual de 311 agotó el tiempo. La repetimos, guardamos el corte anual y mantuvimos diciembre separado para no duplicar.
- Un conjunto cultural inicial no correspondía al universo buscado. Lo sustituimos por DCLA y registramos el límite del directorio.
- Los códigos de borough de MTA no coincidían con los nombres del resto de fuentes. Creamos una correspondencia explícita y la verificamos.
- El primer prototipo publicaba eventos viales con coordenadas y fechas exactas. Los retiramos del despliegue y dejamos únicamente agregados territoriales.
- La fecha global del catálogo estaba desactualizada. La interfaz ahora calcula y muestra la prueba más reciente, sin reemplazar las fechas de cada fuente.
- La versión comprimida incluía `node_modules`. La entrega final lo excluye y se reconstruye con `npm ci`.

## Reflexión sobre datos

Nuestra posición es que una cifra no es útil si se separa de su definición, periodo y territorio. Un censo, una estimación PEP y una encuesta ACS no son intercambiables. Tampoco una mediana puede repartirse entre barrios ni una correlación con cinco boroughs demuestra causalidad. Por eso preferimos dejar un valor pendiente o nulo antes que completar el sistema con una cifra inventada.

## Reflexión sobre seguridad

Nuestra posición es que el hecho de que un dato sea público no obliga a republicarlo con el máximo detalle. Al cruzar una fecha y una coordenada de una colisión con noticias se puede aumentar el riesgo de identificación indirecta. Por eso reducimos el detalle antes de publicar, mantenemos el sistema en modo de solo lectura, no incluimos secretos en el cliente y no recolectamos información de visitantes.

## Reconstrucción

Requisitos: Node.js 24 LTS y npm.

```sh
npm ci
npm run data
npm run verify:all
npm run build
```

`npm run data` reconstruye consultas, derivados NTA, diagnóstico Midtown y matriz de fuentes. `npm run verify` comprueba totales, geometrías, privacidad, uniones territoriales, pesos, nulos y archivos. Los datos necesarios para abrir la entrega están incluidos; actualizar fuentes externas es opcional.

## Prueba móvil

Revisamos el sitio en 390 x 844 y 412 x 915. Comprobamos navegación, tablas, tarjetas, modales de fuentes, gráficos y ausencia de desbordamiento horizontal. El script `scripts/browser-priority3.cjs` documenta la prueba de 390 x 844 y WebGL. Los mapas base externos no forman parte de la verificación local.

## Estructura

- `scripts/`: ingesta, transformaciones y verificaciones.
- `data-sources/`: cortes de apoyo y metadatos de reconstrucción.
- `public/data/`: archivos que alimentan las vistas.
- `src/`: interfaz, gráficos, mapas y cálculos.
- `public/metodo.html`: contrato de datos y bitácora pública.
- `Diccionario_de_datos_Cerebro_NYC_ACTUALIZADO.xlsx`: diccionario entregable.

El repositorio no incluye `node_modules`, contraseñas, llaves ni datos individuales de residentes.
