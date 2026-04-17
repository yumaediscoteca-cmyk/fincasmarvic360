import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import type { Database, Json } from '../integrations/supabase/types';
import { logLiaEvento } from '@/utils/liaLogger';
import { toast } from '@/hooks/use-toast';
import { useCreatedBy } from './useCreatedBy';

// ── Utilidades ──────────────────────────────────────────────

function addDays(fecha: string, n: number): string {
  const d = new Date(fecha + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Tipos locales ────────────────────────────────────────────
export type TipoBloque =
  | 'logistica'
  | 'maquinaria_agricola'
  | 'mano_obra_interna'
  | 'mano_obra_externa';

const TIPO_BLOQUE_VALUES: readonly TipoBloque[] = [
  'logistica',
  'maquinaria_agricola',
  'mano_obra_interna',
  'mano_obra_externa',
];

/** Normaliza texto de BD a la unión usada en la app; valores desconocidos → fallback seguro. */
export function normalizeTipoBloque(raw: string | null | undefined): TipoBloque {
  if (raw != null && (TIPO_BLOQUE_VALUES as readonly string[]).includes(raw)) {
    return raw as TipoBloque;
  }
  return 'maquinaria_agricola';
}

export type EstadoIncidencia = 'abierta' | 'en_proceso' | 'resuelta';
export type EstadoPlanificacion = 'borrador' | 'confirmado' | 'ejecutado' | 'pendiente' | 'cancelado';
export type Prioridad = 'alta' | 'media' | 'baja';
export type EstadoCampana = 'planificado' | 'en_curso' | 'completado' | 'cancelado';

export interface TrabajoRegistro {
  id:                    string;
  tipo_bloque:           TipoBloque;
  fecha:                 string;
  hora_inicio:           string | null;
  hora_fin:              string | null;
  finca:                 string | null;
  parcel_id:             string | null;
  tipo_trabajo:          string;
  num_operarios:         number | null;
  nombres_operarios:     string | null;
  foto_url:              string | null;
  notas:                 string | null;
  created_at:            string;
  created_by:            string | null;
  // Campos planificación
  estado_planificacion:  EstadoPlanificacion | null;
  prioridad:             Prioridad | null;
  fecha_planificada:     string | null;
  fecha_original:        string | null;
  recursos_personal:     string[] | null;
  tractor_id:            string | null;
  apero_id:              string | null;
  materiales_previstos:  Json | null;
}

type TrabajoRegistroDbRow = Database['public']['Tables']['trabajos_registro']['Row'] & {
  maquinaria_tractores?: { matricula: string | null; marca: string | null } | null;
  maquinaria_aperos?: { tipo: string | null; descripcion: string | null } | null;
};

/** Fila de planificación del día: dominio de app + joins de maquinaria (solo lectura UI). */
export type TrabajoRegistroPlanificado = TrabajoRegistro & {
  maquinaria_tractores?: { matricula: string | null; marca: string | null } | null;
  maquinaria_aperos?: { tipo: string | null; descripcion: string | null } | null;
};

function toTrabajoRegistroPlanificado(row: TrabajoRegistroDbRow): TrabajoRegistroPlanificado {
  return {
    id: row.id,
    tipo_bloque: normalizeTipoBloque(row.tipo_bloque),
    fecha: row.fecha ?? '',
    hora_inicio: row.hora_inicio,
    hora_fin: row.hora_fin,
    finca: row.finca,
    parcel_id: row.parcel_id,
    tipo_trabajo: row.tipo_trabajo,
    num_operarios: row.num_operarios,
    nombres_operarios: row.nombres_operarios,
    foto_url: row.foto_url,
    notas: row.notas,
    created_at: row.created_at ?? new Date().toISOString(),
    created_by: row.created_by,
    estado_planificacion: row.estado_planificacion as EstadoPlanificacion | null,
    prioridad: row.prioridad as Prioridad | null,
    fecha_planificada: row.fecha_planificada,
    fecha_original: row.fecha_original,
    recursos_personal: row.recursos_personal,
    tractor_id: row.tractor_id,
    apero_id: row.apero_id,
    materiales_previstos: row.materiales_previstos,
    maquinaria_tractores: row.maquinaria_tractores ?? null,
    maquinaria_aperos: row.maquinaria_aperos ?? null,
  };
}

export interface TrabajoIncidencia {
  id:               string;
  urgente:          boolean;
  titulo:           string;
  descripcion:      string | null;
  finca:            string | null;
  parcel_id:        string | null;
  estado:           EstadoIncidencia;
  foto_url:         string | null;
  fecha:            string;
  fecha_resolucion: string | null;
  notas_resolucion: string | null;
  created_at:       string;
  created_by:       string | null;
}

export interface PlanificacionCampana {
  id:                       string;
  finca:                    string;
  parcel_id:                string | null;
  /** Metros cuadrados del sector asignados a esta línea (mismo sector → varias filas con distinto cultivo). */
  superficie_m2?:           number | null;
  cultivo:                  string;
  fecha_prevista_plantacion: string | null;
  fecha_estimada_cosecha:   string | null;
  recursos_estimados:       string | null;
  observaciones:            string | null;
  estado:                   EstadoCampana;
  created_at:               string;
  created_by:               string | null;
}

export interface CierreJornada {
  id:                  string;
  fecha:               string;
  parte_diario_id:     string | null;
  trabajos_ejecutados: number | null;
  trabajos_pendientes: number | null;
  trabajos_arrastrados: number | null;
  notas:               string | null;
  cerrado_at:          string;
  cerrado_by:          string | null;
}

// ── useRegistrosTrabajos ─────────────────────────────────────
export function useRegistrosTrabajos(tipoBloque?: TipoBloque) {
  return useQuery({
    queryKey: ['trabajos_registro', tipoBloque ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('trabajos_registro')
        .select('*, maquinaria_tractores(matricula, marca), maquinaria_aperos(tipo, descripcion)')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });
      if (tipoBloque) q = q.eq('tipo_bloque', tipoBloque);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30000,
  });
}

// ── useAddTrabajoRegistro ────────────────────────────────────
export function useAddTrabajoRegistro() {
  const createdBy = useCreatedBy();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TrabajoRegistro, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('trabajos_registro')
        .insert([{ ...payload, created_at: new Date().toISOString(), created_by: createdBy }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, payload) => {
      logLiaEvento('planificacion', 'trabajo_creado', {
        tipo_bloque: payload.tipo_bloque,
        finca: payload.finca,
        tipo_trabajo: payload.tipo_trabajo,
        num_operarios: payload.num_operarios,
      });
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useIncidencias ────────────────────────────────────────────
export function useIncidencias(soloAbiertas = false) {
  return useQuery<TrabajoIncidencia[]>({
    queryKey: ['trabajos_incidencias', soloAbiertas],
    queryFn: async () => {
      let q = supabase
        .from('trabajos_incidencias')
        .select('*')
        .order('urgente', { ascending: false })
        .order('fecha', { ascending: false });
      if (soloAbiertas) q = q.neq('estado', 'resuelta');
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TrabajoIncidencia[];
    },
    staleTime: 30000,
  });
}

// ── useAddIncidencia ──────────────────────────────────────────
export function useAddIncidencia() {
  const createdBy = useCreatedBy();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TrabajoIncidencia, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('trabajos_incidencias')
        .insert([{ ...payload, created_at: new Date().toISOString(), created_by: createdBy }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_incidencias'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useUpdateIncidencia ───────────────────────────────────────
export function useUpdateIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      estado,
      notas_resolucion,
      fecha_resolucion,
      ...rest
    }: {
      id: string;
      estado: EstadoIncidencia;
      notas_resolucion?: string;
      fecha_resolucion?: string;
      [key: string]: unknown;
    }) => {
      const { error } = await supabase
        .from('trabajos_incidencias')
        .update({ estado, notas_resolucion, fecha_resolucion, ...rest })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_incidencias'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useDeleteIncidencia ───────────────────────────────────────
export function useDeleteIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trabajos_incidencias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_incidencias'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useKPIsTrabajos ───────────────────────────────────────────
export function useKPIsTrabajos() {
  return useQuery({
    queryKey: ['trabajos_kpis'],
    queryFn: async () => {
      const [registros, incidencias] = await Promise.all([
        supabase.from('trabajos_registro').select('tipo_bloque', { count: 'exact' }),
        supabase.from('trabajos_incidencias').select('urgente, estado', { count: 'exact' }),
      ]);
      const totalRegistros = registros.count ?? 0;
      const incAbiertas    = (incidencias.data ?? []).filter(i => i.estado !== 'resuelta').length;
      const incUrgentes    = (incidencias.data ?? []).filter(i => i.urgente && i.estado !== 'resuelta').length;
      return { totalRegistros, incAbiertas, incUrgentes };
    },
    staleTime: 30000,
  });
}

// ════════════════════════════════════════════════════════════
// HOOKS NUEVOS — PLANIFICACIÓN
// ════════════════════════════════════════════════════════════

// ── usePlanificacionDia ───────────────────────────────────────
export function usePlanificacionDia(fecha: string) {
  return useQuery({
    queryKey: ['planificacion_dia', fecha],
    queryFn: async (): Promise<TrabajoRegistroPlanificado[]> => {
      const { data, error } = await supabase
        .from('trabajos_registro')
        .select('*, maquinaria_tractores(matricula, marca), maquinaria_aperos(tipo, descripcion)')
        .eq('fecha_planificada', fecha)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const orden: Record<string, number> = { alta: 1, media: 2, baja: 3 };
      return (data ?? [])
        .sort(
          (a, b) => (orden[a.prioridad ?? 'media'] ?? 2) - (orden[b.prioridad ?? 'media'] ?? 2)
        )
        .map((row) => toTrabajoRegistroPlanificado(row as TrabajoRegistroDbRow));
    },
    staleTime: 30000,
    enabled: !!fecha,
  });
}

// ── useAddTrabajoPlanificado ──────────────────────────────────
export function useAddTrabajoPlanificado() {
  const createdBy = useCreatedBy();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TrabajoRegistro, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('trabajos_registro')
        .insert([{ ...payload, created_at: new Date().toISOString(), created_by: createdBy }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
      qc.invalidateQueries({ queryKey: ['planificacion_dia'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useUpdateTrabajoPlanificado ───────────────────────────────
export function useUpdateTrabajoPlanificado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<TrabajoRegistro> & { id: string }) => {
      const { error } = await supabase
        .from('trabajos_registro')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
      qc.invalidateQueries({ queryKey: ['planificacion_dia'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useDeleteTrabajo ──────────────────────────────────────────
export function useDeleteTrabajo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trabajos_registro').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
      qc.invalidateQueries({ queryKey: ['planificacion_dia'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useUpdateEstadoPlanificacion ──────────────────────────────
export function useUpdateEstadoPlanificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado_planificacion }: { id: string; estado_planificacion: EstadoPlanificacion }) => {
      const { error } = await supabase
        .from('trabajos_registro')
        .update({ estado_planificacion })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
      qc.invalidateQueries({ queryKey: ['planificacion_dia'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── usePlanificacionCampana ───────────────────────────────────
export function usePlanificacionCampana() {
  return useQuery<PlanificacionCampana[]>({
    queryKey: ['planificacion_campana'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planificacion_campana')
        .select('*')
        .order('fecha_prevista_plantacion', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as PlanificacionCampana[];
    },
    staleTime: 30000,
  });
}

// ── useAddPlanificacionCampana ────────────────────────────────
export function useAddPlanificacionCampana() {
  const createdBy = useCreatedBy();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<PlanificacionCampana, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('planificacion_campana')
        .insert([{ ...payload, created_at: new Date().toISOString(), created_by: createdBy }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion_campana'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useUpdatePlanificacionCampana ─────────────────────────────
export function useUpdatePlanificacionCampana() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PlanificacionCampana> & { id: string }) => {
      const { error } = await supabase
        .from('planificacion_campana')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion_campana'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useDeletePlanificacionCampana ─────────────────────────────
export function useDeletePlanificacionCampana() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planificacion_campana')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion_campana'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useCierresJornada ─────────────────────────────────────────
export function useCierresJornada() {
  return useQuery<CierreJornada[]>({
    queryKey: ['cierres_jornada'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cierres_jornada')
        .select('*')
        .order('fecha', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CierreJornada[];
    },
    staleTime: 60000,
  });
}

// ── useAddCierreJornada ───────────────────────────────────────
export function useAddCierreJornada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CierreJornada, 'id' | 'cerrado_at'>) => {
      const { data, error } = await supabase
        .from('cierres_jornada')
        .insert([{ ...payload, cerrado_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cierres_jornada'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useUpdateEstadoTrabajo ──────────────────────────────────
export function useUpdateEstadoTrabajo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado_planificacion, prioridad }: { id: string; estado_planificacion: EstadoPlanificacion; prioridad: Prioridad }) => {
      const { error } = await supabase
        .from('trabajos_registro')
        .update({ estado_planificacion, prioridad })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
      qc.invalidateQueries({ queryKey: ['planificacion_dia'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

/*
================================================
29. CERRAR JORNADA — lógica completa de arrastre
================================================
*/

export function useCerrarJornada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fecha: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUser = user?.email || 'sistema';

      // Llamada a la función RPC atómica en la base de datos
      const { data, error } = await supabase.rpc('cerrar_jornada_atomica', {
        p_fecha: fecha,
        p_usuario: currentUser,
      });

      if (error) {
        throw error;
      }
      
      // La función RPC debe devolver un objeto con la misma estructura que el anterior
      return data;
    },
    onSuccess: () => {
      // Invalidar las queries relevantes para que la UI se actualice
      qc.invalidateQueries({ queryKey: ['planificacion_dia'] });
      qc.invalidateQueries({ queryKey: ['cierres_jornada'] });
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
      qc.invalidateQueries({ queryKey: ['trabajos_kpis'] });
      qc.invalidateQueries({ queryKey: ['trabajos_incidencias'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      console.error('[Hook Error]: Cierre de jornada fallido', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
