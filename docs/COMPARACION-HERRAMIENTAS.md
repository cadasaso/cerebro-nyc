# Comparación de herramientas de visualización

Fecha: 3 de noviembre de 2026. Versiones del proyecto: Apache ECharts 5.6.0 y MapLibre GL JS 5.6.2.

## Pregunta, tarea y datos comunes

¿Qué borough concentra más población en el Censo 2020 y dónde se encuentra? Se agregó F31 por borough sumando los registros de sexo y edad sin mezclar PEP ni ACS. Las dos herramientas reciben los mismos cinco totales. Solo MapLibre requiere además los cinco polígonos F01. La unión usa nombres exactos y exige 5 de 5 coincidencias. Control total: 8.804.190 personas.

| Borough | Población usada en ambas herramientas |
|---|---:|
| Brooklyn | 2.736.074 |
| Queens | 2.405.464 |
| Manhattan | 1.694.251 |
| Bronx | 1.472.654 |
| Staten Island | 495.747 |

## Caso reproducible

Después de iniciar el proyecto, abrir /comparacion.html. La página implementa barras ordenadas en ECharts y coropletas en MapLibre. El selector y los clics seleccionan el mismo borough en ambas vistas. La tabla conserva los valores y ECharts permite descargar SVG. Las bibliotecas, licencias, población y geometría se sirven localmente; el mapa no requiere teselas externas.

Archivos: public/comparacion.html, public/comparacion/caso.js y public/data/toolComparison.json.

## Criterios de comparación

| Criterio | ECharts | MapLibre | Consecuencia para el proyecto |
|---|---|---|---|
| Comparar cantidades | Barras ordenadas desde cero y etiquetas exactas | Los colores muestran diferencias generales; requieren consultar valor y leyenda | ECharts para ranking y brechas |
| Posición y vecindad | La barra no conserva posición geográfica | Polígonos, zoom y desplazamiento | MapLibre para preguntas territoriales |
| Preparación | Cinco categorías y cinco valores | Los mismos cinco valores más geometría y unión validada | La cartografía exige trabajo espacial adicional |
| Registro o cuenta | Este prototipo no requiere cuenta externa | Este prototipo no requiere cuenta externa ni proveedor de teselas | Publicación estática reproducible |
| Requisitos | JavaScript; npm para reconstruir la aplicación; SVG en este caso | JavaScript, CSS, GeoJSON y WebGL | Tabla y selector como alternativas al mapa |
| Licencia | Apache License 2.0 | BSD 3-Clause con avisos de componentes adicionales | Conservar licencias incluidas |
| Ubicación de datos | JSON y SVG generados en el navegador | GeoJSON y valores entregados al navegador | Los datos del cliente se consideran públicos |
| Interacción del caso | Tooltip, selección y exportación SVG | Selección de polígonos, zoom y desplazamiento | Interacciones coordinadas por borough |
| Lectura móvil | Reajuste del gráfico y tabla desplazable | Reajuste del mapa; navegación gestual | Debe verificarse en la versión publicada |
| Riesgo de interpretación | Puede ocultar la distribución dentro de cada borough | La superficie territorial puede dominar la lectura; total no es densidad | Mantener tabla, unidades y periodo |
| Límite del ensayo | No es prueba de series grandes o todas las funciones | No valida mapas base, edificios 3D ni capacidad de todos los equipos | No extrapolar a rendimiento general |

## Decisión razonada

Se conservan ambas herramientas. Para identificar que Brooklyn supera a Queens y cuánto difieren, las barras ordenadas permiten comparar sobre una línea base común. Para ubicar esos boroughs y sus relaciones espaciales, se necesita el mapa. Por eso ECharts se usa para comparación estadística y MapLibre para Gemelo/Atlas. No se presenta una herramienta como sustituta universal de la otra.

La comparación anterior describía funciones generales. Esta versión añade tarea y entradas comunes, controles numéricos, interacción reproducible, criterios observables, ubicación de datos y una decisión ligada a las preguntas del sistema. No se inventan tiempos de carga, facilidad percibida por usuarios o puntuaciones de rendimiento.

## Evidencia y alcance

Se comprobaron automáticamente el total censal, las cinco categorías, las versiones de dependencias, la unión territorial y la presencia del caso en el paquete. La prueba real de navegador se registra en [PRUEBA-REAL-COMPARADOR.md](PRUEBA-REAL-COMPARADOR.md), con capturas y resultado JSON. La publicación se registra por separado en ESTADO-PUBLICACION-F34-F36.md. No se da por acreditada una prueba de usuario ni una comparación cronometrada.

## Alternativa descartada como motor del Gemelo

Esta revision incorpora Leaflet 1.9.4 con los mismos datos y poligonos en `/comparacion/alternativa-leaflet.html`. La [defensa de la decision](DEFENSA-HERRAMIENTA-DESCARTADA.md) recoge sus ventajas para mapas 2D sin WebGL y el trabajo que exigiria sustituir la integracion MapLibre/Three.js del Gemelo. Leaflet queda como ensayo reproducible, no como dependencia de la aplicacion principal. Las tres bibliotecas de visualizacion conservan su licencia local y no requieren servicios externos para estos casos.

## Fuentes técnicas oficiales

- Apache ECharts: https://echarts.apache.org/en/download.html
- MapLibre: https://maplibre.org/maplibre-gl-js/docs/
- Licencia MapLibre 5.6.2: https://github.com/maplibre/maplibre-gl-js/blob/v5.6.2/LICENSE.txt
- Licencias distribuidas con el caso: public/comparacion/ECHARTS-LICENSE.txt y MAPLIBRE-LICENSE.txt.
