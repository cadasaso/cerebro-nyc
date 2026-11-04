# Verificacion en produccion

Resultado: APROBADO. URL: [Cerebro NYC](https://cerebro-nyc-datos-publicos.vercel.app/).

El equipo subio los archivos compilados mediante Vercel Drop el 3 de noviembre de 2026. La conexion autenticada de Vercel confirmo el despliegue `dpl_tfgzRoeo2rhhMvdWpFNJVXEMSfM6`, proyecto `cerebro-nyc-datos-publicos`, entorno `production`, estado `READY`. No se le atribuye un commit Git, porque la subida fue manual.

## Comprobaciones sobre la URL publica

Prueba iniciada el 3 de noviembre de 2026 a las 18:18:12 America/Bogota (23:18:12 UTC), con Microsoft Edge 156.0.4314.58 y Playwright 1.62.1. Se cargo la web directamente desde el dominio de produccion, sin servidor local. Los datos locales de entrega solo se usaron como referencia para contrastar la respuesta y las cifras.

| Pendiente original | Resultado | Evidencia |
|---|---|---|
| Publicacion F34-F36 | Publicada y comprobada en la URL de produccion | `docs/qa/produccion/despliegue.json` y `resultado.json` |
| Prueba real del nuevo comparador | Aprobada en produccion, escritorio y vistas moviles | Capturas `comparador-1440.png`, `comparador-390.png`, `comparador-412.png`; descarga SVG y resultado JSON |
| Defensa de herramienta descartada | Preparada; prototipo Leaflet publicado y comprobado | `docs/DEFENSA-HERRAMIENTA-DESCARTADA.md`, prototipo y capturas Leaflet |

En 1440 x 1000, 390 x 844 y 412 x 915 se comprobaron:

- F34: cinco boroughs, solicitudes, cierres validos, sin cierre, excluidos, media y mediana contra los JSON de entrega.
- F35: cinco boroughs, denominadores, respuestas positivas y porcentaje contra los JSON de entrega.
- F36: nueve celdas, tres con observaciones y seis sin dato; horas completas y medias reconciliadas. Los nulos se muestran como Sin dato.
- Ambos JSON de indicadores accesibles con HTTP 200 y contenido igual a las instantaneas probadas.
- Comparador: cinco totales censales, control 8.804.190, selector coordinado, clic real sobre barra y poligono, mapa no vacio y seleccion visible verificados por pixeles, y descarga SVG real.
- Ausencia de desbordamiento horizontal del documento y cero errores JavaScript no controlados.

El prototipo Leaflet cargo cinco poligonos SVG, selector y clic sobre poligono. Su cambio de escritorio a movil mantuvo el encuadre, con 32.678 pixeles de relleno cartografico detectados a 390 px. Al simular la falta de WebGL en el comparador principal se mantuvieron tabla, barras y selector.

## Auditoria de fuentes repetida

En la pagina publicada `/trazabilidad.html` se activo el boton de auditoria y se descargaron sus informes reales. Esta auditoria es independiente de la prueba especifica de F34-F36.

| Anchura del iframe bajo prueba | Controles aprobados | IDs | Errores | Desbordamiento horizontal |
|---|---:|---:|---:|---|
| 1180 px | 143/143 | 30 | 0 | No |
| 390 px | 143/143 | 30 | 0 | No |
| 412 px | 143/143 | 30 | 0 | No |

El resumen se guardo a las 18:20:07 America/Bogota, 3 de noviembre de 2026. Su alcance sigue siendo F01-F21 y F25-F33. No se cuentan estas tres ejecuciones como 429 controles distintos. Los datos de F34-F36 se comprobaron por separado mediante `browser-release.cjs`.

## Evidencia y reproduccion

Todas las rutas de evidencia de este informe parten de la raiz del repositorio:

Los JSON y SVG estan versionados en GitHub. Las capturas PNG se entregan por separado en el ZIP de revision, en `evidencias/produccion/`.

- `docs/qa/produccion/resultado.json`: navegador, URL, viewports, selecciones, pixeles, descarga y SHA-256 de las instantaneas de referencia.
- `docs/qa/produccion/despliegue.json`: datos del despliegue READY consultado.
- `docs/qa/produccion/trazabilidad-1180.json`, `trazabilidad-390.json`, `trazabilidad-412.json`: informes descargados desde la web publicada.
- `docs/qa/produccion/resumen-trazabilidad.json`: resumen de las tres ejecuciones de fuentes.
- `docs/qa/produccion/poblacion-censo2020.svg`: exportacion real. Las capturas PNG citadas en los controles estan en el ZIP de revision.

Los scripts reproducibles estan en `scripts/browser-release.cjs` y `scripts/browser-audit.cjs`; ambos aceptan `BASE_URL` y `QA_OUTPUT`. Las pruebas locales previas permanecen separadas en `docs/qa/navegador/`.

## Alcance

WebGL se probo con SwiftShader (GPU por software), movimiento reducido y peticiones externas bloqueadas. Las vistas moviles son un navegador de escritorio redimensionado, no telefonos fisicos. No se acreditan disponibilidad de todos los proveedores externos, rendimiento, usabilidad con participantes, accesibilidad completa ni todo el Gemelo 3D. Los enlaces de las fichas se comprobaron por su formato HTTPS, no por la disponibilidad de cada destino.

La verificacion corresponde al despliegue y fecha indicados. Los errores `git_info_fail` de los dos intentos antiguos siguen documentados como antecedentes; no afectan el estado READY de este nuevo proyecto. Esta actualizacion de informes no modifica la web y no requiere otra subida.
