/** Literales alineados con `src/constants/farms.ts` → `FINCAS_DATA[].nombre` */
export const FINCAS_PILOTO = ['LA BARDA', 'LA CONCEPCION', 'LONSORDO', 'LA NUEVA'] as const;
export type FincaPiloto = (typeof FINCAS_PILOTO)[number];
