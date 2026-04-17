/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUDITORIA_TIPOS_OMNIA.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * MISIÓN CRÍTICA: Fuente única de verdad (SSOT) para la arquitectura de datos
 * del ERP Agrícola MARVIC 360.
 *
 * Este documento centraliza:
 * • Definiciones de entidades (interfaces TypeScript)
 * • Mapeo a tablas Supabase (rastreabilidad FK)
 * • Enumeraciones de estados y categorías
 * • Lógica computada (banderas de alerta, colores, validaciones)
 * • Consumidores de cada entidad (qué hooks/páginas la usan)
 *
 * CONVENCIONES:
 * - @origin: tabla Supabase de origen
 * - @consumers: páginas React que consumen esta entidad
 * - @logic: propiedades computadas o reglas de negocio
 * - @fk: relaciones foráneas explícitas
 *
 * Versión: 1.1.0 (07/04/2026 - FINAL PRODUCCIÓN)
 * Autor: Copilot (GitHub)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════════════════════
// ENUMERACIONES GLOBALES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin catalogo_tipos_trabajo
 * @logic Categoría de trabajo para clasificación y permisos. Utilizadas en Personal
 *        para asignar responsabilidades y en trabajos_registro para trazabilidad.
 */
export enum TipoTrabajoCategoria {
  OPERARIO_CAMPO = 'operario_campo',
  ENCARGADO = 'encargado',
  CONDUCTOR_MAQUINARIA = 'conductor_maquinaria',
  CONDUCTOR_CAMION = 'conductor_camion',
}

export const TIPO_TRABAJO_CATEGORIA_LABELS: Record<TipoTrabajoCategoria, string> = {
  [TipoTrabajoCategoria.OPERARIO_CAMPO]: 'Operario de campo',
  [TipoTrabajoCategoria.ENCARGADO]: 'Encargado',
  [TipoTrabajoCategoria.CONDUCTOR_MAQUINARIA]: 'Conductor de maquinaria',
  [TipoTrabajoCategoria.CONDUCTOR_CAMION]: 'Conductor de camión',
};

export const TIPO_TRABAJO_CATEGORIA_COLORS: Record<TipoTrabajoCategoria, string> = {
  [TipoTrabajoCategoria.OPERARIO_CAMPO]: '#22c55e',     // green
  [TipoTrabajoCategoria.ENCARGADO]: '#6d9b7d',          // sky
  [TipoTrabajoCategoria.CONDUCTOR_MAQUINARIA]: '#fb923c', // orange
  [TipoTrabajoCategoria.CONDUCTOR_CAMION]: '#a78bfa',   // purple
};

/**
 * @origin personal.codigo_interno
 * @logic Prefijos de código interno para identificación única por categoría.
 *        Incrementa automático: OP001, OP002... EN001...
 */
export const CATEGORIA_PREFIJOS: Record<TipoTrabajoCategoria, string> = {
  [TipoTrabajoCategoria.OPERARIO_CAMPO]: 'OP',
  [TipoTrabajoCategoria.ENCARGADO]: 'EN',
  [TipoTrabajoCategoria.CONDUCTOR_MAQUINARIA]: 'CM',
  [TipoTrabajoCategoria.CONDUCTOR_CAMION]: 'CC',
};

/**
 * @origin maquinaria_tractores.codigo_interno, maquinaria_aperos.codigo_interno
 * @logic Prefijos específicos para maquinaria: tractores (TR), aperos (AP), externos (EX)
 */
export enum CodigoInternoMaquinaria {
  TRACTOR = 'TR',
  APERO = 'AP',
}

/**
 * @origin camiones.codigo_interno, vehiculos_empresa.codigo_interno
 * @logic Prefijos para logística: camiones (CM), vehículos empresa (VH)
 */
export enum CodigoInternoLogistica {
  CAMION = 'CM',
  VEHICULO = 'VH',
}

/**
 * @origin personal_externo.codigo_interno
 * @logic Prefijo único para personal externo (destajistas, contratistas)
 */
export const CODIGO_INTERNO_EXTERNO = 'EX';

/**
 * @origin maquinaria_tractores.estado_operativo, maquinaria_aperos.estado, etc.
 * @logic Estados de operatividad de activos: operativo, mantenimiento, fuera_servicio, baja
 */
export enum EstadoOperativo {
  OPERATIVO = 'operativo',
  MANTENIMIENTO = 'mantenimiento',
  FUERA_SERVICIO = 'fuera_servicio',
  BAJA = 'baja',
}

export const ESTADO_OPERATIVO_LABELS: Record<EstadoOperativo, string> = {
  [EstadoOperativo.OPERATIVO]: 'Operativo',
  [EstadoOperativo.MANTENIMIENTO]: 'En mantenimiento',
  [EstadoOperativo.FUERA_SERVICIO]: 'Fuera de servicio',
  [EstadoOperativo.BAJA]: 'Dado de baja',
};

export const ESTADO_OPERATIVO_COLORS: Record<EstadoOperativo, string> = {
  [EstadoOperativo.OPERATIVO]: '#22c55e',       // green
  [EstadoOperativo.MANTENIMIENTO]: '#f97316',   // orange
  [EstadoOperativo.FUERA_SERVICIO]: '#ef4444',  // red
  [EstadoOperativo.BAJA]: '#6b7280',            // gray
};

/**
 * @origin maquinaria_tractores.fecha_proxima_itv, camiones.fecha_proxima_itv
 * @logic Alerta de ITV: CRÍTICA (< 0 días), URGENTE (≤ 30 días)
 */
export enum AlertaITV {
  CRITICA = 'critica',    // < 0 días = vencida
  URGENTE = 'urgente',    // ≤ 30 días
  NORMAL = 'normal',      // > 30 días
}

export const ALERTA_ITV_COLORS: Record<AlertaITV, string> = {
  [AlertaITV.CRITICA]: '#dc2626',   // red-600
  [AlertaITV.URGENTE]: '#f59e0b',   // amber-500
  [AlertaITV.NORMAL]: '#22c55e',    // green-500
};

/**
 * @origin usuario_roles.rol
 * @logic Roles de usuario para control de acceso: admin (full), encargado (supervisión), operario (operativo)
 */
export enum RolUsuario {
  ADMIN = 'admin',
  ENCARGADO = 'encargado',
  OPERARIO = 'operario',
}

export const ROL_USUARIO_LABELS: Record<RolUsuario, string> = {
  [RolUsuario.ADMIN]: 'Administrador',
  [RolUsuario.ENCARGADO]: 'Encargado',
  [RolUsuario.OPERARIO]: 'Operario',
};

/**
 * @origin inventario_registros.unidad (UOM — Unit of Measure)
 * @logic Unidades de medida soportadas en inventario
 */
export enum UnidadInventario {
  KILOGRAMO = 'kg',
  GRAMO = 'g',
  LITRO = 'l',
  MILILITRO = 'ml',
  METRO = 'm',
  CENTIMETRO = 'cm',
  PIEZA = 'pz',
  CAJA = 'caja',
  METRO_LINEAL = 'm_lineal',
}

export const UNIDAD_INVENTARIO_LABELS: Record<UnidadInventario, string> = {
  [UnidadInventario.KILOGRAMO]: 'Kg',
  [UnidadInventario.GRAMO]: 'g',
  [UnidadInventario.LITRO]: 'L',
  [UnidadInventario.MILILITRO]: 'ml',
  [UnidadInventario.METRO]: 'm',
  [UnidadInventario.CENTIMETRO]: 'cm',
  [UnidadInventario.PIEZA]: 'pz',
  [UnidadInventario.CAJA]: 'caja',
  [UnidadInventario.METRO_LINEAL]: 'm lineal',
};

/**
 * @origin parte_diario.estado_planificacion, trabajos_registro.estado_planificacion
 * @logic Estados de planificación de trabajos
 */
export enum EstadoPlanificacion {
  PENDIENTE = 'pendiente',
  PLANIFICADO = 'planificado',
  EN_EJECUCION = 'en_ejecucion',
  COMPLETADO = 'completado',
  SUSPENDIDO = 'suspendido',
}

export const ESTADO_PLANIFICACION_LABELS: Record<EstadoPlanificacion, string> = {
  [EstadoPlanificacion.PENDIENTE]: 'Pendiente',
  [EstadoPlanificacion.PLANIFICADO]: 'Planificado',
  [EstadoPlanificacion.EN_EJECUCION]: 'En ejecución',
  [EstadoPlanificacion.COMPLETADO]: 'Completado',
  [EstadoPlanificacion.SUSPENDIDO]: 'Suspendido',
};

/**
 * @origin trabajos_registro.prioridad
 * @logic Niveles de prioridad para trabajos
 */
export enum PrioridadTrabajo {
  BAJA = 'baja',
  NORMAL = 'normal',
  ALTA = 'alta',
  CRITICA = 'critica',
}

export const PRIORIDAD_TRABAJO_LABELS: Record<PrioridadTrabajo, string> = {
  [PrioridadTrabajo.BAJA]: 'Baja',
  [PrioridadTrabajo.NORMAL]: 'Normal',
  [PrioridadTrabajo.ALTA]: 'Alta',
  [PrioridadTrabajo.CRITICA]: 'Crítica',
};

export const PRIORIDAD_TRABAJO_COLORS: Record<PrioridadTrabajo, string> = {
  [PrioridadTrabajo.BAJA]: '#3b82f6',      // blue
  [PrioridadTrabajo.NORMAL]: '#22c55e',    // green
  [PrioridadTrabajo.ALTA]: '#f97316',      // orange
  [PrioridadTrabajo.CRITICA]: '#dc2626',   // red
};

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: PERSONAL (Fijo)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin personal (tabla Supabase)
 *
 * @consumers
 *   - Página /personal (5 tabs: Operarios, Encargados, Maquinaria, Camión, Externa)
 *   - usePersonal.ts (10+ hooks)
 *   - Logística (filtro conductor_id)
 *   - Maquinaria (filtro personal_id en maquinaria_uso)
 *   - Parte Diario (bloque residuos vegetales)
 *   - Trabajos (trabajos_registro.nombres_operarios)
 *
 * @logic
 *   - codigo_interno: Generado automático (OP/EN/CM/CC + padStart 3)
 *   - qr_code: Generada con librería qrcode (200px) — descargar PNG desde ficha
 *   - carnet_caducidad: Alerta roja si < 30 días
 *   - ITV: Derivado de carnet de conducir (conductor_camion + conductor_maquinaria)
 *
 * @fk
 *   - catalogo_tipos_trabajo (N:N vía personal_tipos_trabajo)
 *   - vehiculos_empresa.conductor_habitual_id (1:N)
 *   - logistica_viajes.personal_id (1:N)
 *   - maquinaria_uso.personal_id (1:N)
 *   - parte_residuos_vegetales.personal_id (1:N)
 *   - logistica_combustible.conductor_id (1:N)
 */
export interface Personal {
  /** UUID primaria */
  id: string;

  /** Nombre completo */
  nombre: string;

  /** DNI/NIF (puede ser null para personal sin doc formalizado) */
  dni: string | null;

  /** Teléfono de contacto */
  telefono: string | null;

  /** Categoría laboral (operario, encargado, conductor_maquinaria, conductor_camion) */
  categoria: TipoTrabajoCategoria;

  /** ¿Activo? Controla visibilidad en selectores. */
  activo: boolean;

  /** URL a foto de perfil (Storage bucket: personal-fotos/) */
  foto_url: string | null;

  /** Código interno automático (OP001, EN002, etc.) */
  codigo_interno: string | null;

  /** Notas internas / observaciones */
  notas: string | null;

  /** Registro QR único (valor numérico o UUID para escaneo en campo) */
  qr_code: string;

  /** Fecha de alta en MARVIC */
  fecha_alta: string | null;

  /** Tipo de carnet de conducir (B, BTP, CAP, etc.) */
  carnet_tipo: string | null;

  /** Fecha de caducidad del carnet (alerta si ≤ 30 días) */
  carnet_caducidad: string | null;

  /** ¿Tiene tacógrafo? (solo para conductores_camion) */
  tacografo: boolean | null;

  /** Finca asignada habitualmente (para operarios campo) */
  finca_asignada: string | null;

  /** Licencias acumuladas (JSON string: ["manipulador fitosanitario", "PRL", ...]) */
  licencias: string | null;

  /** Auditoría: creado el... */
  created_at: string;

  /** Auditoría: creado por (user ID) */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: PERSONAL_EXTERNO (Contratistas, destajistas)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin personal_externo (tabla Supabase)
 *
 * @consumers
 *   - Página /personal (Tab "Externa")
 *   - usePersonal.ts (hooks específicos)
 *
 * @logic
 *   - codigo_interno: Generado automático (EX + padStart 3)
 *   - tipo: "destajo" o "jornal_servicio" (clasificación de contratación)
 *   - presupuesto: Monto declarado en JSON (ej: "{ EUR: 5000 }")
 *
 * @fk
 *   - Relación N:N con personal_tipos_trabajo (no es directo en esta tabla)
 */
export interface PersonalExterno {
  /** UUID primaria */
  id: string;

  /** Nombre de la empresa / razón social */
  nombre_empresa: string;

  /** NIF/CIF de la empresa */
  nif: string | null;

  /** Teléfono de contacto principal */
  telefono_contacto: string | null;

  /** Tipo de contratación: "destajo" o "jornal_servicio" */
  tipo: 'destajo' | 'jornal_servicio';

  /** ¿Activo? Controla visibilidad. */
  activo: boolean;

  /** Código interno automático (EX001, EX002, etc.) */
  codigo_interno: string | null;

  /** Persona de contacto (nombre) */
  persona_contacto: string | null;

  /** Presupuesto estimado (JSON: "{ EUR: 1500 }" o texto) */
  presupuesto: string | null;

  /** Trabajos que realizan (separados por comas o JSON array) */
  trabajos_realiza: string | null;

  /** Notas internas */
  notas: string | null;

  /** Código QR de identificación */
  qr_code: string;

  /** Auditoría: creado el... */
  created_at: string;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: MAQUINARIA_TRACTORES (Vehículos agrícolas)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin maquinaria_tractores (tabla Supabase)
 *
 * @consumers
 *   - Página /maquinaria (Tab "Tractores")
 *   - useMaquinaria.ts (hooks CRUD)
 *   - InventarioUbicacion.ts (view v_tractores_en_inventario)
 *   - maquinaria_uso (trabajos con tractor)
 *   - maquinaria_mantenimiento (historial de reparos)
 *   - maquinaria_inventario_sync (asignación ubicación)
 *
 * @logic
 *   - codigo_interno: Generado automático (TR + padStart 3)
 *   - estado_operativo: Enum (operativo, mantenimiento, fuera_servicio, baja)
 *   - fecha_proxima_itv: Alerta CRÍTICA si < 0, URGENTE si ≤ 30 días
 *   - horas_motor: Métrica de desgaste; alerta si ≥ horas_proximo_mantenimiento
 *   - gps_info: Preparado para integración futura de GPS/telemática
 *
 * @fk
 *   - maquinaria_aperos.tractor_id (1:N) — aperos asignados
 *   - maquinaria_uso.tractor_id (1:N) — historial de usos
 *   - maquinaria_mantenimiento.tractor_id (1:N) — reparaciones
 *   - maquinaria_inventario_sync.maquinaria_id (1:N) — ubicación actual
 *   - trabajos_registro.tractor_id (1:N) — trabajos ejecutados
 */
export interface MaquinariaTractor {
  /** UUID primaria */
  id: string;

  /** Matrícula del tractor (identificador legal) */
  matricula: string;

  /** Marca (CLAAS, Deutz, New Holland, etc.) */
  marca: string | null;

  /** Modelo específico */
  modelo: string | null;

  /** Año de fabricación */
  anio: number | null;

  /** Código interno automático (TR001, TR002, etc.) */
  codigo_interno: string | null;

  /** Estado operativo: operativo | mantenimiento | fuera_servicio | baja */
  estado_operativo: EstadoOperativo | null;

  /** Horas de motor acumuladas */
  horas_motor: number | null;

  /** Horas de motor para próximo mantenimiento preventivo */
  horas_proximo_mantenimiento: number | null;

  /** Fecha de próxima ITV obligatoria (alerta si ≤ 30 días) */
  fecha_proxima_itv: string | null;

  /** Fecha de próxima revisión técnica interna */
  fecha_proxima_revision: string | null;

  /** Ficha técnica / especificaciones (URL Storage o texto) */
  ficha_tecnica: string | null;

  /** URL a foto del tractor (Storage bucket: maquinaria-fotos/) */
  foto_url: string | null;

  /** Datos GPS para seguimiento (JSON: { lat, lng, last_update }) */
  gps_info: string | null;

  /** Notas de mantenimiento / incidencias */
  notas: string | null;

  /** ¿Activo? Controla visibilidad. */
  activo: boolean;

  /** Auditoría: creado el... */
  created_at: string | null;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: MAQUINARIA_APEROS (Implementos agrícolas)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin maquinaria_aperos (tabla Supabase)
 *
 * @consumers
 *   - Página /maquinaria (Tab "Aperos")
 *   - useMaquinaria.ts
 *   - maquinaria_uso.apero_id (historial de trabajos con apero)
 *   - InventarioUbicacion.ts (v_maquinaria_aperos_en_inventario)
 *
 * @logic
 *   - codigo_interno: Generado automático (AP + padStart 3)
 *   - estado: Enum (operativo, mantenimiento, fuera_servicio, baja)
 *   - tractor_id: FK hacia maquinaria_tractores (apero asignado a tractor)
 *
 * @fk
 *   - maquinaria_tractores.id (N:1) — tractor asignado
 *   - maquinaria_uso.apero_id (1:N) — trabajos ejecutados
 *   - maquinaria_inventario_sync.maquinaria_id (1:N) — ubicación
 *   - trabajos_registro.apero_id (1:N) — trabajos planificados
 */
export interface MaquinariaApero {
  /** UUID primaria */
  id: string;

  /** Tipo/denominación (arado, desbrozadora, sembradora, etc.) */
  tipo: string;

  /** Descripción detallada */
  descripcion: string | null;

  /** Código interno automático (AP001, AP002, etc.) */
  codigo_interno: string | null;

  /** Estado operativo: operativo | mantenimiento | fuera_servicio | baja */
  estado: EstadoOperativo | null;

  /** Tractor al cual está usualmente asignado (FK) */
  tractor_id: string | null;

  /** URL a foto del apero */
  foto_url: string | null;

  /** Notas técnicas / incidencias */
  notas: string | null;

  /** ¿Activo? */
  activo: boolean;

  /** Auditoría: creado el... */
  created_at: string | null;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: CAMIONES (Vehículos de transporte propio)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin camiones (tabla Supabase)
 *
 * @consumers
 *   - Página /logistica (Tab "Camiones")
 *   - useLogistica.ts
 *   - logistica_viajes.camion_id (N:1) — viajes realizados
 *   - logistica_mantenimiento.camion_id (1:N) — reparaciones
 *   - logistica_inventario_sync.vehiculo_id (1:N) — ubicación actual
 *   - tickets_pesaje.camion_id (1:N) — transportes de cosecha
 *   - logistica_combustible.vehiculo_id (1:N) — carburante
 *
 * @logic
 *   - codigo_interno: Generado automático (CM + padStart 3)
 *   - estado_operativo: Enum (operativo, mantenimiento, fuera_servicio, baja)
 *   - fecha_proxima_itv: Alerta CRÍTICA si < 0, URGENTE si ≤ 30 días
 *   - kilometros_actuales: Métrica de desgaste
 *   - km_proximo_mantenimiento: Alerta si kilometros ≥ este valor
 *   - empresa_transporte: Contratista externo (si tipo = "contratado")
 *
 * @fk
 *   - logistica_viajes.camion_id (1:N)
 *   - logistica_mantenimiento.camion_id (1:N)
 *   - tickets_pesaje.camion_id (1:N)
 */
export interface Camion {
  /** UUID primaria */
  id: string;

  /** Matrícula (identificador legal) */
  matricula: string;

  /** Código interno automático (CM001, CM002, etc.) */
  codigo_interno: string | null;

  /** Marca (Volvo, Scania, MAN, etc.) */
  marca: string | null;

  /** Modelo específico */
  modelo: string | null;

  /** Año de fabricación */
  anio: number | null;

  /** Tipo de vehículo: "propio" | "contratado" | null */
  tipo: string | null;

  /** Empresa de transporte (si es "contratado") */
  empresa_transporte: string | null;

  /** Capacidad de carga en Kg */
  capacidad_kg: number | null;

  /** Estado operativo: operativo | mantenimiento | fuera_servicio | baja */
  estado_operativo: EstadoOperativo | null;

  /** Kilómetros actuales del vehículo */
  kilometros_actuales: number | null;

  /** Kilómetros para próximo mantenimiento preventivo */
  km_proximo_mantenimiento: number | null;

  /** Fecha de última ITV */
  fecha_itv: string | null;

  /** Fecha de próxima ITV obligatoria (alerta si ≤ 30 días) */
  fecha_proxima_itv: string | null;

  /** Fecha de próxima revisión técnica */
  fecha_proxima_revision: string | null;

  /** Notas de mantenimiento / incidencias */
  notas_mantenimiento: string | null;

  /** URL a foto del camión */
  foto_url: string | null;

  /** Datos GPS para seguimiento */
  gps_info: string | null;

  /** ¿Activo? */
  activo: boolean | null;

  /** Auditoría: creado el... */
  created_at: string | null;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: VEHICULOS_EMPRESA (Turismos, furgonetas, pick-up corporativos)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin vehiculos_empresa (tabla Supabase)
 *
 * @consumers
 *   - Página /logistica (Tab "Vehículos")
 *   - useLogistica.ts
 *   - logistica_combustible.vehiculo_id (1:N) — carburante
 *
 * @logic
 *   - codigo_interno: Generado automático (VH + padStart 3)
 *   - estado_operativo: Enum (operativo, mantenimiento, fuera_servicio, baja)
 *   - conductor_habitual_id: FK hacia personal (N:1) — conductor asignado
 *   - fecha_proxima_itv: Alerta si ≤ 30 días
 *
 * @fk
 *   - personal.id (N:1) — conductor_habitual_id
 *   - logistica_combustible.vehiculo_id (1:N)
 */
export interface VehiculoEmpresa {
  /** UUID primaria */
  id: string;

  /** Matrícula */
  matricula: string;

  /** Código interno automático (VH001, VH002, etc.) */
  codigo_interno: string | null;

  /** Marca (Renault, Peugeot, IVECO, etc.) */
  marca: string | null;

  /** Modelo */
  modelo: string | null;

  /** Año de fabricación */
  anio: number | null;

  /** Tipo de vehículo (turismo, furgoneta, pick-up, etc.) */
  tipo: string | null;

  /** Conductor habitual asignado (FK personal) */
  conductor_habitual_id: string | null;

  /** Kilómetros actuales */
  km_actuales: number | null;

  /** Estado operativo: operativo | mantenimiento | fuera_servicio | baja */
  estado_operativo: EstadoOperativo | null;

  /** Fecha de próxima ITV */
  fecha_proxima_itv: string | null;

  /** Fecha de próxima revisión */
  fecha_proxima_revision: string | null;

  /** URL a foto del vehículo */
  foto_url: string | null;

  /** Notas internas */
  notas: string | null;

  /** GPS info (JSON) */
  gps_info: string | null;

  /** Auditoría: creado el... */
  created_at: string;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: LOGISTICA_VIAJES (Movimientos de transporte)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin vehicle_positions
 * @logic Posición GPS en tiempo real e histórica para maquinaria y camiones
 */
export interface VehiclePosition {
  /** UUID primaria */
  id: string;
  /** ID del vehículo (tractor o camión) */
  vehicle_id: string;
  /** Tipo de vehículo: 'tractor' | 'camion' | 'vehiculo' */
  vehicle_tipo: 'tractor' | 'camion' | 'vehiculo' | null;
  /** Fecha y hora exacta del registro GPS */
  timestamp: string;
  latitud: number;
  longitud: number;
  velocidad_kmh: number | null;
  parcel_id_detectada: string | null;
  estado: string | null;
}

/**
 * @origin logistica_viajes (tabla Supabase)
 *
 * @consumers
 *   - Página /logistica (Tab "Viajes")
 *   - useLogistica.ts
 *   - PDF exportar (resumen viajes diarios)
 *
 * @logic
 *   - conductor_id: Legacy (solo lectura histórica) → usar personal_id
 *   - personal_id: FK moderno hacia personal (categoria=conductor_camion)
 *   - camion_id: FK hacia camiones (1:N)
 *   - km_recorridos: Calculado desde origen/destino (si GPS disponible)
 *   - gasto_gasolina_euros: Derivado de gasto_gasolina_litros * precio/litro
 *
 * @fk
 *   - camiones.id (N:1)
 *   - personal.id (N:1) — personal_id
 *   - logistica_conductores.id (N:1) — conductor_id (legacy)
 */
export interface LogisticaViaje {
  /** UUID primaria */
  id: string;

  /** Camión utilizado (FK) */
  camion_id: string | null;

  /** Conductor moderno (FK personal, categoria=conductor_camion) */
  personal_id: string | null;

  /** Conductor legacy (solo lectura) */
  conductor_id: string | null;

  /** Finca de origen */
  finca: string | null;

  /** Destino del viaje */
  destino: string | null;

  /** Descripción del trabajo realizado */
  trabajo_realizado: string | null;

  /** Ruta seguida o referencia geográfica */
  ruta: string | null;

  /** Hora de salida (HH:MM) */
  hora_salida: string | null;

  /** Hora de llegada */
  hora_llegada: string | null;

  /** Litros de gasolina consumidos */
  gasto_gasolina_litros: number | null;

  /** Costo total en euros */
  gasto_gasolina_euros: number | null;

  /** Kilómetros recorridos */
  km_recorridos: number | null;

  /** Notas del viaje */
  notas: string | null;

  /** Auditoría: creado el... */
  created_at: string | null;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: LOGISTICA_COMBUSTIBLE (Repostajes)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin logistica_combustible (tabla Supabase)
 *
 * @consumers
 *   - Página /logistica (Tab "Combustible")
 *   - useLogistica.ts
 *   - PDF exportar (resumen combustible diario)
 *
 * @logic
 *   - vehiculo_tipo: "camion" | "vehiculo_empresa"
 *   - vehiculo_id: FK variable según vehiculo_tipo
 *   - conductor_id: FK opcional hacia personal (quien repostó)
 *   - coste_unitario: coste_total / litros
 *
 * @fk
 *   - camiones.id (N:1) — si vehiculo_tipo = "camion"
 *   - vehiculos_empresa.id (N:1) — si vehiculo_tipo = "vehiculo_empresa"
 *   - personal.id (N:1) — conductor_id
 */
export interface LogisticaCombustible {
  /** UUID primaria */
  id: string;

  /** Tipo de vehículo: "camion" | "vehiculo_empresa" */
  vehiculo_tipo: string;

  /** ID del vehículo (FK variable) */
  vehiculo_id: string;

  /** Conductor que repostó (FK opcional) */
  conductor_id: string | null;

  /** Fecha del repostaje */
  fecha: string | null;

  /** Litros suministrados */
  litros: number | null;

  /** Costo total en euros */
  coste_total: number | null;

  /** Gasolinera / estación de servicio */
  gasolinera: string | null;

  /** Foto del recibo o factura */
  foto_url: string | null;

  /** Notas (octanaje, observaciones) */
  notas: string | null;

  /** Auditoría: creado el... */
  created_at: string;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: INVENTARIO_UBICACIONES (Almacenes, naves, sectores de almacenamiento)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin inventario_ubicaciones (tabla Supabase)
 *
 * @consumers
 *   - Página /inventario (grid 6 ubicaciones)
 *   - useInventario.ts
 *   - InventarioUbicacion.tsx (detalle ubicación)
 *   - inventario_registros.ubicacion_id (N:1) — stock en cada ubicación
 *   - inventario_movimientos.ubicacion_origen_id, ubicacion_destino_id (N:1)
 *
 * @logic
 *   - orden: Número para ordenar el grid de ubicaciones
 *   - activa: Controla si aparece en selectores
 *   - foto_url: Foto de la ubicación (Storage bucket: inventario-ubicaciones/)
 *
 * @fk
 *   - inventario_registros.ubicacion_id (1:N)
 *   - inventario_movimientos.ubicacion_origen_id (1:N)
 *   - inventario_movimientos.ubicacion_destino_id (1:N)
 *   - maquinaria_inventario_sync.ubicacion_id (1:N)
 *   - logistica_inventario_sync.ubicacion_id (1:N)
 */
export interface InventarioUbicacion {
  /** UUID primaria */
  id: string;

  /** Nombre de la ubicación (Nave Principal, Almacén Fitosanitarios, etc.) */
  nombre: string;

  /** Descripción o notas sobre la ubicación */
  descripcion: string | null;

  /** Orden visual en el grid (1-6) */
  orden: number;

  /** ¿Activa? Controla visibilidad en selectores. */
  activa: boolean | null;

  /** Foto de la ubicación (Storage URL) */
  foto_url: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: INVENTARIO_CATEGORIAS (Clasificación de productos)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin inventario_categorias (tabla Supabase)
 *
 * @consumers
 *   - InventarioUbicacion.tsx (7 tabs por categoría)
 *   - useInventario.ts
 *
 * @logic
 *   - slug: Identificador URL-safe (ej: "fitosanitarios", "semillas")
 *   - icono: Emoji o clase FontAwesome (ej: "🐛", "fa-vial")
 *   - orden: Número para ordenar tabs
 *
 * @fk
 *   - inventario_registros.categoria_id (1:N)
 *   - inventario_movimientos.categoria_id (1:N)
 *   - inventario_productos_catalogo.categoria_id (1:N)
 */
export interface InventarioCategoria {
  /** UUID primaria */
  id: string;

  /** Nombre visible (Fitosanitarios, Semillas, Plásticos, etc.) */
  nombre: string;

  /** Slug único (URL-safe) */
  slug: string;

  /** Icono (emoji o class) */
  icono: string;

  /** Orden visual en tabs (1-7) */
  orden: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: INVENTARIO_REGISTROS (Movimientos de stock por ubicación/categoría)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin inventario_registros (tabla Supabase)
 *
 * @consumers
 *   - InventarioUbicacion.tsx (tab por categoría)
 *   - useInventario.ts (useRegistros, useUltimoRegistro, useResumenUbicacion)
 *
 * @logic
 *   - cantidad: Positiva en entrada, se resta en salida (UI logic)
 *   - precio_unitario: Para calcular valor total del stock
 *   - unidad: UOM (kg, l, m, pz, etc.)
 *   - El "último registro" por categoría = estado actual (cantidad disponible)
 *   - Entrada reciente: badge si created_at < 7 días
 *
 * @fk
 *   - inventario_ubicaciones.id (N:1)
 *   - inventario_categorias.id (N:1)
 *   - inventario_productos_catalogo.id (N:1) — opcional
 */
export interface InventarioRegistro {
  /** UUID primaria */
  id: string;

  /** Ubicación donde se almacena */
  ubicacion_id: string;

  /** Categoría del producto */
  categoria_id: string;

  /** Producto del catálogo (FK opcional) */
  producto_id: string | null;

  /** Cantidad en unidad */
  cantidad: number;

  /** Unidad de medida (kg, l, m, pz, etc.) */
  unidad: UnidadInventario | string;

  /** Precio unitario para cálculo de valor total */
  precio_unitario: number | null;

  /** Descripción adicional del lote o entrada */
  descripcion: string | null;

  /** Fotos del lote (URL Storage) */
  foto_url: string | null;
  foto_url_2: string | null;

  /** Notas específicas */
  notas: string | null;

  /** Auditoría: creado el... */
  created_at: string | null;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: TRABAJOS_REGISTRO (Núcleo transaccional: trabajos ejecutados)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin trabajos_registro (tabla Supabase)
 *
 * @consumers
 *   - Página /trabajos (4 sub-bloques + incidencias)
 *   - useTrabajos.ts (hooks CRUD)
 *   - ParteDiario.tsx (bloque B: resumen de trabajos del día)
 *   - PDF exportar (Trabajos)
 *   - cierres_jornada (KPI: trabajos ejecutados, pendientes, arrastrados)
 *
 * @logic
 *   - tipo_bloque: Clasificación interna (A, B, C, D) para parte diario
 *   - tipo_trabajo: Nombre del trabajo (Siembra, Cosecha, Riego, etc.)
 *   - estado_planificacion: PENDIENTE → PLANIFICADO → EN_EJECUCION → COMPLETADO
 *   - prioridad: BAJA, NORMAL, ALTA, CRITICA
 *   - fecha_planificada vs fecha_original: fecha_original = fecha del parte; fecha_planificada = cuándo se va a hacer
 *   - tractor_id, apero_id: FK opcionales si utiliza maquinaria
 *   - names_operarios: Lista de nombres operarios (no es FK normalizado)
 *
 * @fk
 *   - parcels.parcel_id (N:1) — parcela donde se realiza
 *   - maquinaria_tractores.id (N:1) — si aplica
 *   - maquinaria_aperos.id (N:1) — si aplica
 *   - catalogo_tipos_trabajo.id (N:1) — tipo de trabajo
 */
export interface TrabajosRegistro {
  /** UUID primaria */
  id: string;

  /** Tipo de bloque en parte diario (A, B, C, D) */
  tipo_bloque: string;

  /** Tipo de trabajo (Siembra, Riego, Cosecha, etc.) */
  tipo_trabajo: string;

  /** Finca donde se realiza */
  finca: string | null;

  /** Parcela (FK opcional) */
  parcel_id: string | null;

  /** Número de operarios involucrados */
  num_operarios: number | null;

  /** Nombres de operarios (lista separada por comas o JSON) */
  nombres_operarios: string | null;

  /** Fecha original del parte diario */
  fecha_original: string | null;

  /** Fecha planificada para ejecución */
  fecha_planificada: string | null;

  /** Fecha real de ejecución registrada */
  fecha: string;

  /** Hora de inicio (HH:MM) */
  hora_inicio: string | null;

  /** Hora de fin (HH:MM) */
  hora_fin: string | null;

  /** Estado de planificación: PENDIENTE | PLANIFICADO | EN_EJECUCION | COMPLETADO */
  estado_planificacion: EstadoPlanificacion | null;

  /** Prioridad: BAJA | NORMAL | ALTA | CRITICA */
  prioridad: PrioridadTrabajo | null;

  /** Tractor utilizado (FK opcional) */
  tractor_id: string | null;

  /** Apero utilizado (FK opcional) */
  apero_id: string | null;

  /** URL a foto del trabajo */
  foto_url: string | null;

  /** Entrada vía escaneo QR (TIMESTAMPTZ) */
  qr_scan_entrada: string | null;

  /** Salida vía escaneo QR (TIMESTAMPTZ) */
  qr_scan_salida: string | null;

  /** Horas calculadas automáticamente por el sistema QR */
  horas_calculadas: number | null;

  /** Notas / observaciones */
  notas: string | null;

  /** Auditoría: creado el... */
  created_at: string | null;

  /** Auditoría: creado por */
  created_by: string | null;
}

/**
 * @origin presencia_tiempo_real
 * @logic Registro de presencia en tiempo real para cuadrillas.
 */
export interface PresenciaTiempoReal {
  /** UUID primaria */
  id: string;
  /** ID de la cuadrilla (FK) */
  cuadrilla_id: string;
  /** ID de la parcela (TEXT FK) */
  parcel_id: string | null;
  /** ID del registro de trabajo vinculado (FK) */
  work_record_id: string | null;
  hora_entrada: string;
  hora_salida: string | null;
  activo: boolean;
  created_at: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: PARTES_DIARIOS (Agregación diaria de trabajos, estados, residuos)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin partes_diarios (tabla Supabase)
 *
 * @consumers
 *   - Página /parte-diario
 *   - useParteDiario.ts (10+ hooks)
 *   - PDF exportar (Parte Diario ejecutivo corporativo)
 *   - cierres_jornada.parte_diario_id (1:N)
 *
 * @logic
 *   - fecha: Índice único (una parte por día)
 *   - responsable: Usuario/operario que cierra la parte
 *   - notas_generales: Observaciones del día (AudioInput)
 *   - 4 bloques (A, B, C, D) ligados vía FK a tablas específicas:
 *       A: parte_estado_finca (1:N)
 *       B: parte_trabajo (1:N)
 *       C: parte_personal (1:N)
 *       D: parte_residuos_vegetales (1:N)
 *
 * @fk
 *   - parte_estado_finca.parte_id (1:N)
 *   - parte_trabajo.parte_id (1:N)
 *   - parte_personal.parte_id (1:N)
 *   - parte_residuos_vegetales.parte_id (1:N)
 *   - cierres_jornada.parte_diario_id (1:N)
 */
export interface ParteDiario {
  /** UUID primaria */
  id: string;

  /** Fecha del parte (YYYY-MM-DD) — índice único */
  fecha: string;

  /** Responsable de cierre (nombre o ID) */
  responsable: string;

  /** Notas generales del día (AudioInput transcrito) */
  notas_generales: string | null;

  /** Auditoría: creado el... */
  created_at: string | null;
}

/**
 * @origin parte_estado_finca (Bloque A del parte diario)
 *
 * @consumers
 *   - ParteDiario.tsx (Bloque A: Estado de Fincas)
 *   - useParteDiario.ts
 *
 * @logic
 *   - estado: "saludable" | "alerta" | "critica" | "preparacion" (visual badge)
 *   - num_operarios: Contar en tiempo real desde UI
 *   - nombres_operarios: Lista de nombres (no normalizado)
 *
 * @fk
 *   - partes_diarios.id (N:1)
 *   - parcels.parcel_id (N:1) — opcional
 */
export interface ParteEstadoFinca {
  /** UUID primaria */
  id: string;

  /** Parte diario (FK) */
  parte_id: string;

  /** Finca */
  finca: string;

  /** Parcela (opcional) */
  parcel_id: string | null;

  /** Estado general (saludable, alerta, crítica, preparación) */
  estado: string | null;

  /** Número de operarios */
  num_operarios: number | null;

  /** Nombres de operarios */
  nombres_operarios: string | null;

  /** Notas (AudioInput) */
  notas: string | null;

  /** Foto 1 */
  foto_url: string | null;

  /** Foto 2 */
  foto_url_2: string | null;

  /** Auditoría: creado el... */
  created_at: string | null;
}

/**
 * @origin parte_trabajo (Bloque B del parte diario)
 *
 * @consumers
 *   - ParteDiario.tsx (Bloque B: Trabajos realizados)
 *   - useParteDiario.ts
 *
 * @logic
 *   - tipo_trabajo: Siembra, Riego, Cosecha, etc.
 *   - ambito: "Bloque" | "Línea" | "Finca completa"
 *   - parcelas: Array JSON de parcel_id
 *
 * @fk
 *   - partes_diarios.id (N:1)
 */
export interface ParteTrabajo {
  /** UUID primaria */
  id: string;

  /** Parte diario (FK) */
  parte_id: string;

  /** Tipo de trabajo */
  tipo_trabajo: string;

  /** Finca */
  finca: string | null;

  /** Ámbito (Bloque, Línea, Finca completa) */
  ambito: string | null;

  /** Parcelas afectadas (JSON array de parcel_id) */
  parcelas: string[] | null;

  /** Número de operarios */
  num_operarios: number | null;

  /** Nombres de operarios */
  nombres_operarios: string | null;

  /** Hora de inicio */
  hora_inicio: string | null;

  /** Hora de fin */
  hora_fin: string | null;

  /** Notas (AudioInput) */
  notas: string | null;

  /** Foto 1 */
  foto_url: string | null;

  /** Foto 2 */
  foto_url_2: string | null;

  /** Auditoría: creado el... */
  created_at: string | null;
}

/**
 * @origin parte_personal (Bloque C del parte diario)
 *
 * @consumers
 *   - ParteDiario.tsx (Bloque C: Anotaciones personales)
 *   - useParteDiario.ts
 *
 * @logic
 *   - Anotaciones personales del responsable (reuniones, comunicaciones)
 *   - fecha_hora: Timestamp de la anotación
 *
 * @fk
 *   - partes_diarios.id (N:1)
 */
export interface PartePersonal {
  /** UUID primaria */
  id: string;

  /** Parte diario (FK) */
  parte_id: string;

  /** Texto de la anotación (AudioInput) */
  texto: string;

  /** Con quién */
  con_quien: string | null;

  /** Dónde */
  donde: string | null;

  /** Fecha y hora */
  fecha_hora: string | null;

  /** Foto */
  foto_url: string | null;

  /** Auditoría: creado el... */
  created_at: string | null;
}

/**
 * @origin parte_residuos_vegetales (Bloque D del parte diario)
 *
 * @consumers
 *   - ParteDiario.tsx (Bloque D: Residuos vegetales — retirada)
 *   - useParteDiario.ts
 *
 * @logic
 *   - Registro de retirada de residuos vegetales por ganadero
 *   - hora_salida_nave → hora_llegada_ganadero → hora_regreso_nave
 *   - personal_id: Conductor/responsable que acompañó la retirada
 *
 * @fk
 *   - partes_diarios.id (N:1)
 *   - ganaderos.id (N:1) — ganadero_id
 *   - personal.id (N:1) — personal_id
 */
export interface ParteResiduosVegetales {
  /** UUID primaria */
  id: string;

  /** Parte diario (FK) */
  parte_id: string;

  /** Ganadero que retira los residuos (FK) */
  ganadero_id: string | null;

  /** Nombre del ganadero (para UI sin FK) */
  nombre_ganadero: string | null;

  /** Hora de salida de la nave */
  hora_salida_nave: string | null;

  /** Hora de llegada del ganadero */
  hora_llegada_ganadero: string | null;

  /** Hora de regreso a la nave */
  hora_regreso_nave: string | null;

  /** Nombre del conductor del camión (legacy) */
  nombre_conductor: string | null;

  /** Personal que acompañó (FK) */
  personal_id: string | null;

  /** Notas de descarga */
  notas_descarga: string | null;

  /** Foto */
  foto_url: string | null;

  /** Auditoría: creado el... */
  created_at: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: CIERRES_JORNADA (KPI cierre diario)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin cierres_jornada (tabla Supabase)
 *
 * @consumers
 *   - ParteDiario.tsx (botón "Cerrar Jornada" → modal con 4 KPIs)
 *   - useParteDiario.ts (useCerrarJornada)
 *
 * @logic
 *   - KPIs calculados desde trabajos_registro de la fecha:
 *       • trabajos_ejecutados: COUNT WHERE estado_planificacion = 'completado'
 *       • trabajos_pendientes: COUNT WHERE estado_planificacion IN ('pendiente', 'planificado')
 *       • trabajos_arrastrados: Conteo manual (puede no haber completado)
 *   - Generar resumen con botón "Ver Planificación" → hoja de trabajo futuro
 *
 * @fk
 *   - partes_diarios.id (N:1) — parte_diario_id
 */
export interface CierreJornada {
  /** UUID primaria */
  id: string;

  /** Fecha del cierre (YYYY-MM-DD) */
  fecha: string;

  /** Parte diario relacionado */
  parte_diario_id: string | null;

  /** KPI: trabajos ejecutados hoy */
  trabajos_ejecutados: number | null;

  /** KPI: trabajos pendientes (arrastrados mañana) */
  trabajos_pendientes: number | null;

  /** KPI: trabajos que arrastramos de ayer */
  trabajos_arrastrados: number | null;

  /** Notas del cierre */
  notas: string | null;

  /** Auditoría: cerrado el... */
  cerrado_at: string;

  /** Auditoría: cerrado por */
  cerrado_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// RESUMEN DE RELACIONES (ENTITY-RELATIONSHIP MAPPING)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * RELACIONES CLAVE — Vista de arquitectura de datos:
 *
 * PERSONAL (Core de RH)
 * ├─→ personal_tipos_trabajo (N:N) → catalogo_tipos_trabajo
 * ├─→ maquinaria_uso.personal_id (1:N)
 * ├─→ logistica_viajes.personal_id (1:N)
 * ├─→ logistica_combustible.conductor_id (1:N)
 * ├─→ vehiculos_empresa.conductor_habitual_id (1:N)
 * └─→ parte_residuos_vegetales.personal_id (1:N)
 *
 * MAQUINARIA (Activos agrícolas)
 * ├─ TRACTORES
 * │  ├─→ maquinaria_aperos.tractor_id (1:N) — aperos asignados
 * │  ├─→ maquinaria_uso.tractor_id (1:N) — historial de uso
 * │  ├─→ maquinaria_mantenimiento.tractor_id (1:N) — reparaciones
 * │  ├─→ maquinaria_inventario_sync.maquinaria_id (1:N) — ubicación
 * │  └─→ trabajos_registro.tractor_id (1:N) — trabajos planificados
 * │
 * └─ APEROS
 *    ├─→ maquinaria_uso.apero_id (1:N)
 *    ├─→ maquinaria_inventario_sync.maquinaria_id (1:N)
 *    ├─→ trabajos_registro.apero_id (1:N)
 *    └─→ inventario_ubicacion_activo.maquinaria_apero_id (1:N)
 *
 * LOGÍSTICA (Transporte)
 * ├─ CAMIONES
 * │  ├─→ logistica_viajes.camion_id (1:N)
 * │  ├─→ logistica_mantenimiento.camion_id (1:N)
 * │  ├─→ logistica_combustible.vehiculo_id (1:N) — si vehiculo_tipo='camion'
 * │  ├─→ tickets_pesaje.camion_id (1:N) — cosechas transportadas
 * │  └─→ logistica_inventario_sync.vehiculo_id (1:N)
 * │
 * └─ VEHÍCULOS EMPRESA
 *    ├─→ vehiculos_empresa.conductor_habitual_id (N:1) → personal
 *    ├─→ logistica_combustible.vehiculo_id (1:N) — si vehiculo_tipo='vehiculo_empresa'
 *    └─→ logistica_inventario_sync.vehiculo_id (1:N)
 *
 * INVENTARIO (Almacenamiento)
 * ├─ UBICACIONES
 * │  ├─→ inventario_registros.ubicacion_id (1:N) — stock actual
 * │  ├─→ inventario_movimientos.ubicacion_origen_id (1:N) — salidas
 * │  ├─→ inventario_movimientos.ubicacion_destino_id (1:N) — entradas
 * │  ├─→ maquinaria_inventario_sync.ubicacion_id (1:N) — activos almacenados
 * │  └─→ logistica_inventario_sync.ubicacion_id (1:N) — vehículos parqueados
 * │
 * ├─ CATEGORÍAS
 * │  ├─→ inventario_registros.categoria_id (1:N)
 * │  ├─→ inventario_movimientos.categoria_id (1:N)
 * │  └─→ inventario_productos_catalogo.categoria_id (1:N)
 * │
 * └─ REGISTROS
 *    ├─→ inventario_productos_catalogo.id (N:1) — catálogo
 *    └─→ inventario_informes (snapshots históricos)
 *
 * TRABAJOS (Transaccional — Núcleo de operaciones)
 * ├─ TRABAJOS_REGISTRO
 * │  ├─→ parcels.parcel_id (N:1)
 * │  ├─→ maquinaria_tractores.id (N:1) — tractor_id
 * │  ├─→ maquinaria_aperos.id (N:1) — apero_id
 * │  ├─→ catalogo_tipos_trabajo.id (N:1) — clasificación
 * │  └─→ cierres_jornada (agregaciones)
 * │
 * └─ PARTES DIARIOS
 *    ├─→ parte_estado_finca (1:N) — Bloque A
 *    ├─→ parte_trabajo (1:N) — Bloque B
 *    ├─→ parte_personal (1:N) — Bloque C
 *    ├─→ parte_residuos_vegetales (1:N) — Bloque D
 *    └─→ cierres_jornada.parte_diario_id (1:N)
 *
 * AUDITORÍA TRANSVERSAL
 * • Todas las tablas tienen: created_at, created_by
 * • Todas tienen: id (UUID PK)
 * • Campos booleanos "activo" controlan visibilidad (soft delete)
 */

// ════════════════════════════════════════════════════════════════════════════════
// LÓGICA COMPUTADA — Funciones de negocio clave
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Calcula alerta de ITV basada en fecha de próxima ITV
 *
 * @param fechaProximaITV - Fecha de próxima ITV (ISO 8601)
 * @returns Tipo de alerta: CRITICA | URGENTE | NORMAL
 *
 * @logic
 *   - CRÍTICA: fecha < hoy (vencida)
 *   - URGENTE: 0 días ≤ (fecha - hoy) ≤ 30 días
 *   - NORMAL: > 30 días
 */
export function calcularAlertaITV(fechaProximaITV: string | null | undefined): AlertaITV {
  if (!fechaProximaITV) return AlertaITV.NORMAL;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaProximaITV);
  fecha.setHours(0, 0, 0, 0);
  const diasRestantes = Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return AlertaITV.CRITICA;
  if (diasRestantes <= 30) return AlertaITV.URGENTE;
  return AlertaITV.NORMAL;
}

/**
 * Genera código interno automático basado en categoría y correlativo
 *
 * @param categoria - Categoría de personal o maquinaria
 * @param siguienteNumero - Número correlativo (1-indexed)
 * @returns Código con formato: PREFIX + padStart(3, '0')
 */
export function generarCodigoInterno(
  categoria: TipoTrabajoCategoria | CodigoInternoMaquinaria,
  siguienteNumero: number
): string {
  let prefijo = '';
  if (categoria in CATEGORIA_PREFIJOS) {
    prefijo = CATEGORIA_PREFIJOS[categoria as TipoTrabajoCategoria];
  } else if (Object.values(CodigoInternoMaquinaria).includes(categoria as CodigoInternoMaquinaria)) {
    prefijo = categoria as string;
  }
  return `${prefijo}${String(siguienteNumero).padStart(3, '0')}`;
}

/**
 * Calcula urgencia de mantenimiento basada en horas de motor o km
 *
 * @param actual - Horas/km actuales
 * @param proximo - Horas/km para próximo mantenimiento
 * @returns boolean — true si urgente mantenimiento
 */
export function esMantenimientoUrgente(actual: number | null, proximo: number | null): boolean {
  if (!actual || !proximo) return false;
  return actual >= proximo;
}

/**
 * Calcula días de entrada reciente en inventario
 *
 * @param createdAt - Timestamp de creación del registro
 * @returns boolean — true si entrada < 7 días
 */
export function esEntradaReciente(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const hoy = new Date();
  const fecha = new Date(createdAt);
  const diasTranscurridos = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
  return diasTranscurridos < 7;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: PLANIFICACION_CAMPANA (Planificación estratégica de cultivos)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin planificacion_campana (tabla Supabase)
 *
 * @consumers
 *   - Página /trabajos (tab Planificación de Campaña)
 *   - useTrabajos.ts (hooks CRUD para planificación)
 *   - PDF exportar (Planificación de Campaña)
 *
 * @logic
 *   - Planificación estratégica por finca y parcela
 *   - Estado: PLANIFICADO → EN_CURSO → COMPLETADO
 *   - Recursos estimados: texto libre con necesidades de maquinaria, personal, etc.
 *   - Fechas: prevista plantación vs estimada cosecha
 *
 * @fk
 *   - parcels.parcel_id (N:1) — parcela planificada
 */
export interface PlanificacionCampana {
  /** UUID primaria */
  id: string;

  /** Finca donde se planifica */
  finca: string;

  /** Parcela específica (FK opcional) */
  parcel_id: string | null;

  /** Superficie del sector dedicada a esta línea (m²); mismo sector puede repetirse con otro cultivo */
  superficie_m2?: number | null;

  /** Cultivo a plantar */
  cultivo: string;

  /** Fecha prevista para plantación */
  fecha_prevista_plantacion: string | null;

  /** Fecha estimada de cosecha */
  fecha_estimada_cosecha: string | null;

  /** Recursos estimados (maquinaria, personal, etc.) */
  recursos_estimados: string | null;

  /** Observaciones adicionales */
  observaciones: string | null;

  /** Estado: PLANIFICADO | EN_CURSO | COMPLETADO | CANCELADO */
  estado: string;

  /** Auditoría: creado el... */
  created_at: string;

  /** Auditoría: creado por */
  created_by: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: CIERRES_JORNADA (Cierre diario con KPIs de productividad)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin cierres_jornada (tabla Supabase)
 *
 * @consumers
 *   - Página /parte-diario (botón Cerrar Jornada)
 *   - useParteDiario.ts (useCerrarJornada hook)
 *   - EstadoGeneral.tsx (KPIs de productividad)
 *   - PDF exportar (Resumen de cierres)
 *
 * @logic
 *   - Cierre diario obligatorio al finalizar jornada
 *   - KPIs calculados: ejecutados, pendientes, arrastrados
 *   - Arrastre: trabajos pendientes pasan al día siguiente
 *   - Solo un cierre por fecha
 *
 * @fk
 *   - partes_diarios.id (N:1) — parte diario del día
 */
export interface CierresJornada {
  /** UUID primaria */
  id: string;

  /** Fecha del cierre (única) */
  fecha: string;

  /** Parte diario asociado (FK opcional) */
  parte_diario_id: string | null;

  /** Número de trabajos ejecutados */
  trabajos_ejecutados: number;

  /** Número de trabajos pendientes */
  trabajos_pendientes: number;

  /** Número de trabajos arrastrados al día siguiente */
  trabajos_arrastrados: number;

  /** Notas del cierre */
  notas: string | null;

  /** Timestamp del cierre */
  cerrado_at: string;

  /** Usuario que cerró la jornada */
  cerrado_by: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDAD: USUARIO_ROLES (Control de acceso y roles de usuario)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin usuario_roles (tabla Supabase)
 *
 * @consumers
 *   - AuthContext.tsx (hook useAuth para obtener rol del usuario)
 *   - Login.tsx (pantalla de autenticación)
 *   - Dashboard.tsx (mostrar email y botón cerrar sesión)
 *   - App.tsx (envolver rutas con AuthProvider)
 *
 * @logic
 *   - Control de acceso básico: admin (full), encargado (supervisión), operario (operativo)
 *   - Un usuario puede tener múltiples roles activos
 *   - Si no existe rol, asumir 'admin' temporalmente
 *   - RLS: anon full access (igual que otras tablas)
 *
 * @fk
 *   - auth.users.id (N:1) — user_id de Supabase Auth
 */
export interface UsuarioRol {
  /** UUID primaria */
  id: string;

  /** ID del usuario en Supabase Auth */
  user_id: string;

  /** Rol asignado: admin | encargado | operario */
  rol: RolUsuario;

  /** Estado activo del rol */
  activo: boolean;

  /** Timestamp de creación */
  created_at: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// FOTOS CAMPO — rev. 28 (05/04/2026)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Tipo de foto de campo — clasifica la foto en la galería
 * - 'general'    : foto estándar subida desde UploadParcelPhoto
 * - 'inspeccion' : foto de inspección estructurada (InspeccionForm)
 * - 'estado'     : foto de estado de parcela
 * - 'trabajo'    : foto de trabajo registrado
 */
export type TipoFotoCampo = 'general' | 'inspeccion' | 'estado' | 'trabajo';

/**
 * Resultado de inspección de campo
 */
export type ResultadoInspeccion = 'OK' | 'Alerta' | 'Crítico';

/**
 * Registro de fotos_campo con geolocalización (rev. 28)
 *
 * @table fotos_campo
 * @columns id, parcel_id, url_imagen, descripcion, fecha, latitud, longitud, tipo
 *
 * @usage
 *   - UploadParcelPhoto.tsx — sube foto con tipo='general' + coords GPS
 *   - InspeccionForm.tsx    — sube foto con tipo='inspeccion' + resultado embed en descripcion
 *   - ParcelHistory.tsx     — tab GALERÍA lee y filtra por tipo
 */
export interface FotoCampo {
  id: string;
  parcel_id: string;
  url_imagen: string | null;
  descripcion: string | null;
  fecha: string | null;
  /** Latitud GPS (NUMERIC 10,7) */
  latitud: number | null;
  /** Longitud GPS (NUMERIC 10,7) */
  longitud: number | null;
  /** Tipo de foto para filtrado en galería */
  tipo: TipoFotoCampo | null;
}

/**
 * InspeccionForm — datos del formulario de inspección
 * Guarda en fotos_campo con tipo='inspeccion'
 * La descripcion embedea: "[Resultado] Tipo — Observaciones"
 */
export interface InspeccionFormData {
  tipo: string;
  resultado: ResultadoInspeccion;
  observaciones: string;
  fotoFile: File;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTIDADES DE SOPORTE FINAL (MATERIALES Y AUDITORÍA)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @origin inventario_registros (tabla Supabase)
 * @logic Extensión específica de stock de campo (Fitosanitarios, Plásticos, Riego)
 *        Filtra el historial de movimientos usando un Map interno por `ubicacion_id_producto_id`
 *        para obtener exclusivamente el último stock neto actual.
 */
export interface MaterialStockRow {
  id: string;
  cantidad: number;
  unidad: string;
  descripcion: string | null;
  precio_unitario: number | null;
  ubicacion_id: string;
  categoria_id: string;
  producto_id: string | null;
  inventario_productos_catalogo: { nombre: string; precio_unitario: number | null } | null;
  inventario_ubicaciones: { nombre: string } | null;
}

/**
 * @origin Multi-tabla (trabajos, inventario, logística, personal)
 * @logic Unifica los eventos más críticos del sistema generados en el rango de fechas.
 *        Se ordenan en memoria (React Query) para trazar la línea temporal de auditoría.
 */
export interface AuditEntry {
  id: string;
  timestamp: string;
  modulo: string;
  usuario: string;
  accion: string;
  detalle: string;
  url?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// NOTA: Todos los tipos e interfaces anteriores ya están exportados directamente
// en sus declaraciones. Este archivo es la fuente única de verdad para la
// arquitectura de datos del sistema MARVIC 360.
// ════════════════════════════════════════════════════════════════════════════════
