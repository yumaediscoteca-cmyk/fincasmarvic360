export type RolEncargado =
  | 'encargado_general'
  | 'encargado_tractores'
  | 'encargado_logistica'
  | 'subencargado'
  | 'subtractorista'
  | 'camionero';

export type RolAdmin = 'admin' | 'director' | 'solo_lectura';

export type RolUsuario = RolAdmin | RolEncargado;

export const ROLES_ENCARGADO: RolEncargado[] = [
  'encargado_general',
  'encargado_tractores',
  'encargado_logistica',
  'subencargado',
  'subtractorista',
  'camionero',
];

export const esRolEncargado = (rol: string): rol is RolEncargado =>
  ROLES_ENCARGADO.includes(rol as RolEncargado);
