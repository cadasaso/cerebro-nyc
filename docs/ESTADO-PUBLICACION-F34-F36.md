# Estado de publicación F34–F36

Actualizado: 3 de noviembre de 2026.

**PUBLICADA Y VERIFICADA EN PRODUCCION.** El equipo realizo la subida mediante Vercel Drop. Se comprobo la URL publica en navegador real el 3 de noviembre de 2026.

URL: [Cerebro NYC](https://cerebro-nyc-datos-publicos.vercel.app/). Proyecto `cerebro-nyc-datos-publicos`, equipo `cadasaso`, despliegue `dpl_tfgzRoeo2rhhMvdWpFNJVXEMSfM6`, estado `READY`, entorno `production`, origen `drop`. La conexion autenticada de Vercel confirmo estos valores. No se atribuye un commit Git a una subida manual.

Los dos errores del proyecto anterior `cerebro-nyc` se conservan como antecedente, y no describen el estado de esta publicacion. El paquete de cierre es `entrega-completa-verificada.zip`; la web es la misma del ZIP `publicar-vercel.zip` que subio el equipo.

## Diagnostico de los intentos anteriores

Consulta autenticada del 3 de noviembre de 2026, equipo `cadasaso`, proyecto `prj_z4JxfNxlx1NTNiPN8vmuckTqA8vv`:

| Despliegue | Estado | Codigo comunicado por Vercel |
|---|---|---|
| `dpl_4hjKGaeFyRtaaREgQB7BAyDW2KvH` | ERROR | `git_info_fail` |
| `dpl_HGBNYNMgHbXftWZ7jpTVxANNaSth` | ERROR | `git_info_fail` |

Ambos apuntan al commit `98c723138146cededfcecf126dbd5e18d99e4f92`. Las consultas de eventos devolvieron listas vacias. Por ello se acredita el fallo al obtener informacion Git; no hay registro que permita atribuirlo a un error de compilacion de F34-F36. Para publicar desde GitHub, revisar que la integracion de Vercel tenga acceso al repositorio y a la rama `main`, y seleccionar la revision actual. Al subir la carpeta directamente, elegir la raiz que contiene `package.json` y `vercel.json`.

Los ZIP de entrega conservan la salida estatica y las entradas necesarias para reconstruirla. El repositorio contiene el codigo fuente y las evidencias en `docs/qa/`. La subida mediante Vercel Drop se realizo de forma independiente del historial Git.

La auditoria anterior de 143 controles conserva su alcance F01-F21 y F25-F33. La nueva evidencia especifica de F34-F36 esta en [qa/produccion/resultado.json](qa/produccion/resultado.json). [Informe de verificacion en produccion](VERIFICACION-PRODUCCION.md).

| ID | Contenido publicado y comprobado | Ubicación |
|---|---|---|
| F34 | Cierres administrativos de solicitudes creadas en diciembre de 2025 | Escucha social; `/data/serviceOutcomes.json` |
| F35 | Acuerdo con la resolución, respuestas de encuesta 2025 | Escucha social; `/data/serviceOutcomes.json` |
| F36 | Aforos DOT 2023–2025 de Midtown | Diagnóstico de Midtown; `/data/trafficCounts.json` |

## Comprobaciones en la URL publicada

1. URL publica y despliegue READY confirmados por Vercel.
2. Dos tablas 311: cinco boroughs por tabla; totales, cierres validos, abiertos, excluidos, medias, medianas, denominadores y porcentajes contrastados con los JSON de entrega.
3. Nueve filas F36: tres celdas con datos historicos y seis sin observaciones; las seis medias nulas se muestran como Sin dato. La interfaz conserva las advertencias de cobertura.
4. Ambos JSON publicos respondieron HTTP 200 y coincidieron con las instantaneas probadas.
5. `/comparacion.html`: barras, cinco totales censales, selector coordinado, clic real en barra y poligono, mapa WebGL no vacio y descarga SVG aprobados en 1440, 390 y 412 px. El caso simulado sin WebGL mantuvo barras, tabla y selector.
6. Auditoria de fuentes de la nueva URL: evidencia guardada separadamente. No sustituye los controles especificos de F34-F36.

Los resultados corresponden al despliegue indicado y al momento de la prueba. Una futura subida requiere verificar de nuevo la version publicada.

## Preparación y límites

`npm run build` compila la salida y `npm run verify:all` comprueba datos, comparacion e interfaz. La subida realizada uso los archivos estaticos ya compilados, por lo que Vercel Drop no ejecuto otra compilacion. La alternativa de subir el codigo conserva ambos comandos en `vercel.json`.

La salida publicada omite direcciones y coordenadas del directorio cultural, conserva nombres/boroughs y conteos agregados, y ofrece un índice de referencias públicas. El catálogo de fichas conserva método, vigencia y cobertura. Los cortes originales del repositorio permiten reconstruir los cálculos.

La prueba local se documenta en `PRUEBA-REAL-COMPARADOR.md`; la repeticion completa sobre la URL publica esta en `VERIFICACION-PRODUCCION.md` y `qa/produccion/`. Las vistas moviles son viewports de un navegador de escritorio; WebGL se probo con SwiftShader. No se certifican todos los dispositivos fisicos, el rendimiento, los servicios externos o todo el Gemelo 3D.
