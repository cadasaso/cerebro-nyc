# Base territorial NTA 2020

Usamos 262 áreas NTA 2020: 197 residenciales y 65 áreas especiales. Las variables ACS 2020-2024 se unen por código oficial. Los registros de infraestructura se asignan por punto dentro del polígono y los casos inválidos, ambiguos o externos quedan documentados en la auditoría.

No repartimos promedios de borough entre barrios. Conservamos nulos cuando no existe cobertura NTA. La base derivada no contiene identificadores, fechas ni coordenadas de colisiones individuales.

Reconstrucción: `npm run data:territories`. Verificación: `node scripts/verify-territories.mjs`.
