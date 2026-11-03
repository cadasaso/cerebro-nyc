# Verificación de trazabilidad en la web publicada

Fecha: 3 de noviembre de 2026 (America/Bogota).

Sitio comprobado: https://cerebro-nyc-taller.dorisot.chatgpt.site/

Auditoría utilizada: https://cerebro-nyc-taller.dorisot.chatgpt.site/trazabilidad

La prueba se ejecutó desde el botón «Verificar clics en la web» en el navegador, sobre la aplicación publicada. Los archivos JSON se descargaron desde «Descargar evidencia JSON» después de cada ejecución. No son resultados de la simulación local de DOM.

| Vista comprobada | Controles aprobados | IDs | Errores | Desbordamiento horizontal |
|---|---:|---:|---:|---|
| 1180 × 844 px | 143/143 | 30 | 0 | No |
| 390 × 844 px | 143/143 | 30 | 0 | No |
| 412 × 844 px | 143/143 | 30 | 0 | No |

## Qué se comprobó

Cada control de cifra o fuente abrió su ficha mediante el manejador de la aplicación y la cerró. La prueba exigió ID Fxx, fuente, entidad, vigencia, fecha de prueba, estado, método y enlace HTTPS original. Los 30 IDs son F01–F21 y F25–F33; F22–F24 no fueron asignados en el inventario original.

## Evidencia descargada

- [1180 px](qa/trazabilidad-web/cerebro-nyc-trazabilidad-1180px.json) · ejecución 2026-11-03T18:55:52.657Z
- [390 px](qa/trazabilidad-web/cerebro-nyc-trazabilidad-390px.json) · ejecución 2026-11-03T18:56:41.314Z
- [412 px](qa/trazabilidad-web/cerebro-nyc-trazabilidad-412px.json) · ejecución 2026-11-03T18:57:14.204Z

## Alcance y límites

La activación es programática en un navegador real. Comprueba los 143 controles presentes en la versión publicada; no certifica cada secuencia manual de navegación, la disponibilidad de las fuentes externas, WebGL ni toda la accesibilidad. Las vistas móviles son anchos del documento de prueba, no pruebas en dispositivos físicos. Tampoco cambia las fechas de consulta de los datos. Los indicadores complementarios F34–F36 de la versión nueva del repositorio no forman parte de estos 30 IDs ni de esta versión publicada.

## Repositorio público

El repositorio del grupo está disponible en https://github.com/cadasaso/cerebro-nyc y el README incluye su enlace. Este requisito está completado. La publicación nueva en Vercel es un asunto separado y no se certifica en esta revisión.
