# Defensa de la herramienta descartada

Fecha: 3 de noviembre de 2026. Alternativa evaluada: Leaflet 1.9.4, licencia BSD-2-Clause. Decision: no sustituir el motor del Gemelo/Atlas con Leaflet. Se conservan MapLibre GL JS 5.6.2, su capa Three.js y los graficos ECharts 5.6.0.

## Ensayo reproducible

Abrir `/comparacion/alternativa-leaflet.html` despues de iniciar el proyecto. El prototipo usa los mismos cinco totales del Censo 2020 (F31), cinco poligonos F01 y control de 8.804.190 habitantes que el comparador ECharts/MapLibre. Incluye mapa SVG, selector, clic sobre poligonos, tabla, zoom y licencia. Biblioteca y datos se sirven localmente, sin cuenta, llave, proveedor de teselas o peticiones externas.

La alternativa se incorporo en esta revision. No se afirma que formara parte de las pruebas anteriores del grupo. El ensayo y su evidencia automatizada se entregan para que el equipo pueda reproducirlos y defender la decision con conocimiento del caso.

## Criterios y decision

| Necesidad del proyecto | Leaflet 1.9.4 | Solucion conservada | Consecuencia |
|---|---|---|---|
| Coropletas de cinco boroughs | GeoJSON y SVG resuelven este caso | MapLibre tambien lo resuelve | El mapa 2D aislado no basta para descartar Leaflet |
| Equipo sin WebGL | El prototipo SVG no necesita WebGL | El mapa MapLibre requiere WebGL; tabla, barras y selector siguen disponibles | Ventaja concreta de Leaflet para mapas 2D en esos equipos |
| Vista con inclinacion y edificios 3D | El nucleo ensayado ofrece cartografia 2D; aqui no se implementaron extensiones 3D | El proyecto ya integra Three.js como capa personalizada del mapa MapLibre | Migrar exige rehacer esa integracion o introducir otra extension |
| Capas y seleccion territorial existentes | Requiere adaptar controles, estilos y eventos del proyecto | La implementacion actual ya usa fuentes, capas y filtros MapLibre | Conservarla reduce el trabajo de migracion; no es una medicion de velocidad |
| Ranking y diferencia de cantidades | El mapa exige consultar los valores y su tabla | ECharts usa una linea base comun para las barras | Se mantiene ECharts para la pregunta estadistica |
| Licencia y exposicion de datos | BSD-2-Clause; datos entregados al navegador | BSD-3-Clause MapLibre y Apache-2.0 ECharts; datos tambien publicos | Ninguna oculta datos por el hecho de ser biblioteca libre |

La decision es especifica del alcance actual: mapa territorial con Gemelo 3D y controles ya integrados. Leaflet es una alternativa valida para un mapa 2D mas sencillo y para equipos sin WebGL. No se descarta por ser de pago, por necesitar una cuenta o por no admitir GeoJSON: esas afirmaciones serian incorrectas para este prototipo.

## Guion de defensa oral

"Evaluamos Leaflet con los mismos cinco totales censales y limites territoriales. El prototipo puede localizar los boroughs, seleccionarlos y mostrar sus valores sin WebGL. Lo descartamos como reemplazo del motor del Gemelo porque nuestro alcance tambien incluye inclinacion, edificios 3D y controles territoriales ya integrados con MapLibre y Three.js. Cambiarlo exige desarrollar de nuevo esa parte o anadir extensiones. Para comparar cantidades conservamos ECharts. Si el alcance fuera solo cartografia 2D para equipos sin WebGL, reconsiderariamos Leaflet."

## Limites de la evidencia

El informe JSON del navegador esta en `qa/navegador/`, relativa a este documento. Las capturas PNG complementarias se conservan en el ZIP de revision, en `evidencias/navegador/`. El script es `scripts/browser-release.cjs`, desde la raiz del proyecto. No se midieron tiempos, memoria, facilidad de aprendizaje, usabilidad con participantes ni todas las extensiones disponibles. La afirmacion sobre trabajo de migracion es una evaluacion de arquitectura basada en `src/maps.js`, no una estimacion medida en horas. Las pruebas de vistas moviles usan un navegador de escritorio redimensionado.

## Fuentes primarias

- [API Leaflet 1.9.4: GeoJSON, SVG y Canvas](https://leafletjs.com/reference-1.9.4.html).
- [Licencia Leaflet 1.9.4](https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE). Copia incluida en `public/comparacion/leaflet/LEAFLET-LICENSE.txt`.
- [Modelo de capas MapLibre](https://maplibre.org/maplibre-style-spec/layers/).
- [Capa personalizada 3D MapLibre](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/).
- Evidencia del proyecto: `src/maps.js`, capa `nyc-buildings-three` y controles del Gemelo. El comparador simple no representa una prueba completa del Gemelo.
