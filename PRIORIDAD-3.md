# Diagnóstico Midtown

El diagnóstico compara nueve celdas de Midtown con tres dimensiones: electricidad declarada, huella edificada atribuida y oferta de metro. La oferta de metro está marcada como `PROXY` porque no mide frecuencia, pasajeros, accesibilidad peatonal ni presión vial.

Los pesos son visibles y se normalizan. Los periodos se conservan por variable y el resultado no se presenta como calidad de vida, déficit o capacidad eléctrica. `npm run data:urban` actualiza los cortes y `node scripts/verify-priority3.mjs` comprueba filtros, IDs, áreas, pesos, nulos y empates.

## Aforos observados F36

La vista complementaria incorpora mediciones DOT 2023–2025 en horas completas de 15 minutos, con segmentos, sentidos, fechas y cobertura por celda. Las celdas sin observaciones conservan nulos. No sustituye el índice de metro ni permite inferir congestión o presión vial de toda la celda. Consultas y SHA-256 en `data-sources/outcomes-manifest.json`; transformación de WKT de EPSG:2263 a EPSG:4326 con pyproj 3.8.0.
