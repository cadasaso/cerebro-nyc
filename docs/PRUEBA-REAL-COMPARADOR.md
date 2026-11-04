# Prueba real del comparador y F34-F36

Resultado: APROBADO sobre la compilacion local incluida en `publicar/`. Ejecucion iniciada el 3 de noviembre de 2026 a las 18:06:29, America/Bogota (23:06:29 UTC). No acredita que esa version este publicada en Vercel.

## Recorrido y entorno

Se sirvio la carpeta `dist` con Vite preview, y se recorrio con Microsoft Edge 156.0.4314.58 y Playwright 1.62.1. No se uso un DOM simulado para estas comprobaciones. WebGL se ejecuto con SwiftShader (GPU por software), con movimiento reducido y peticiones externas bloqueadas. Los datos, bibliotecas y geometrias necesarios se cargaron desde el servidor local.

El recorrido va de la apertura de `/comparacion.html` a sus JSON locales, la tabla de control, las barras SVG y los poligonos WebGL. Se probaron selector, clic real sobre barras, clic real sobre poligonos, descarga SVG, cambio de viewport y ausencia de desbordamiento horizontal del documento.

## Resultados

| Control | 1440 x 1000 | 390 x 844 | 412 x 915 |
|---|---|---|---|
| Cinco boroughs y total 8.804.190 | Aprobado | Aprobado | Aprobado |
| Selector coordinado con barras y contorno del mapa | Aprobado | Aprobado | Aprobado |
| Clic real en barra y poligono | Aprobado | Aprobado | Aprobado |
| Descarga SVG con datos censales | Aprobado | Aprobado | Aprobado |
| Mapa no vacio, poligonos y seleccion con pixeles comprobados | Aprobado | Aprobado | Aprobado |
| Sin desbordamiento horizontal de pagina | Aprobado | Aprobado | Aprobado |
| F34: cinco filas; totales, cierres validos, abiertos, excluidos, media y mediana contra JSON | Aprobado | Aprobado | Aprobado |
| F35: cinco filas; denominador, respuestas positivas y porcentaje contra JSON | Aprobado | Aprobado | Aprobado |
| F36: nueve filas; tres celdas medidas, seis sin dato, medias y horas contra JSON | Aprobado | Aprobado | Aprobado |
| Dos JSON de indicadores accesibles y coincidentes | Aprobado | Aprobado | Aprobado |

En el caso sin WebGL se simulo la ausencia de contexto grafico: la pagina mostro el aviso correspondiente y mantuvo tabla, barras y selector, con cero errores JavaScript no controlados. La seleccion Bronx con 1.472.654 habitantes siguio operativa.

El prototipo Leaflet 1.9.4 cargo cinco poligonos SVG, los mismos valores, selector y clic en poligono; se verifico tambien la anchura movil de 390 px. Su resultado sustenta la defensa de la alternativa descartada, sin afirmar una prueba de rendimiento ni una migracion del Gemelo.

La inspeccion visual detecto que Leaflet perdia el encuadre al redimensionar. Se corrigio con `ResizeObserver`, `invalidateSize` y ajuste de limites. La repeticion especifica del 3 de noviembre a las 18:09:59 America/Bogota verifico el reencuadre, los cinco poligonos dentro del marco y 32.678 pixeles de relleno cartografico en movil. Tambien repitio el caso sin WebGL. Las pruebas del comparador y los indicadores se conservaron de la ejecucion completa anterior tras comprobar que los SHA-256 de sus tres JSON no cambiaron; no se presentan como una segunda ejecucion completa.

## Evidencia incluida

Carpeta `qa/navegador/`, relativa a este documento:

Los JSON y SVG estan versionados en el repositorio. Las capturas PNG indicadas a continuacion se conservan en el ZIP de revision, en `evidencias/navegador/`.

- `resultado.json`: resultado estructurado, navegador, viewports, conteos de pixeles y SHA-256 de los tres JSON probados.
- `comparador-1440.png`, `comparador-390.png`, `comparador-412.png`: capturas completas del comparador.
- `service-outcomes-*.png` y `traffic-counts-*.png`: vistas de los indicadores en escritorio y movil; las tablas anchas mantienen desplazamiento interno.
- `poblacion-censo2020.svg`: descarga real del comparador.
- `alternativa-leaflet-1440.png` y `alternativa-leaflet-390.png`: alternativa ensayada.

`qa/verificacion-compilacion.json` registra la compilacion y las verificaciones de datos/DOM aprobadas. `qa/vercel-intentos-anteriores.json` conserva el estado ERROR y codigo `git_info_fail` de ambos intentos anteriores.

## Reproduccion y limites

Desde `proyecto/`, ejecutar `npm ci`, `npm run build` y `npm run verify:all`. Con Microsoft Edge y Playwright 1.62.1 disponible, ejecutar `node scripts/browser-release.cjs`. La dependencia de navegador se puede instalar opcionalmente con `npm install --no-save --package-lock=false playwright@1.62.1`. En el entorno que preparo este ZIP se utilizo la instalacion de Playwright incluida con la aplicacion.

El script acepta `BASE_URL` para recorrer una publicacion y comparar los JSON con esta misma compilacion. La repeticion sobre la URL publica del equipo se guardo por separado en [qa/produccion/resultado.json](qa/produccion/resultado.json); ver [VERIFICACION-PRODUCCION.md](VERIFICACION-PRODUCCION.md).

Esta prueba no es un estudio con usuarios, un ensayo cronometrado, una auditoria de accesibilidad completa, un telefono fisico ni una prueba de todos los mapas/edificios 3D de la aplicacion principal. Los servicios externos se bloquearon deliberadamente. El total y los indicadores no se reconsultaron al proveedor durante este ensayo: se contrastaron con las instantaneas incluidas y sus controles de reconstruccion.

El equipo completo la subida y se verificaron F34-F36 en produccion el 3 de noviembre de 2026. La auditoria de 143 controles sigue cubriendo F01-F21 y F25-F33; la prueba especifica de los indicadores tiene su evidencia independiente.
