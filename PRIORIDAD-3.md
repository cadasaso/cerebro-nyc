# Diagnóstico Midtown

El diagnóstico compara nueve celdas de Midtown con tres dimensiones: electricidad declarada, huella edificada atribuida y oferta de metro. La oferta de metro está marcada como `PROXY` porque no mide frecuencia, pasajeros, accesibilidad peatonal ni presión vial.

Los pesos son visibles y se normalizan. Los periodos se conservan por variable y el resultado no se presenta como calidad de vida, déficit o capacidad eléctrica. `npm run data:urban` actualiza los cortes y `node scripts/verify-priority3.mjs` comprueba filtros, IDs, áreas, pesos, nulos y empates.
