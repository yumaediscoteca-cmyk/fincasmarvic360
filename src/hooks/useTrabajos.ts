import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

// ── Tipos locales ────────────────────────────────────────────
export type TipoBloque =
  | 'logistica'
  | 'maquinaria_agricola'
  | 'mano_obra_interna'
  | 'mano_obra_externa';

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
  materiales_previstos:  Record<string, unknown> | null;
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
  return useQuery<TrabajoRegistro[]>({
    queryKey: ['trabajos_registro', tipoBloque ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('trabajos_registro')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });
      if (tipoBloque) q = q.eq('tipo_bloque', tipoBloque);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TrabajoRegistro[];
    },
    staleTime: 30000,
  });
}

// ── useAddTrabajoRegistro ────────────────────────────────────
export function useAddTrabajoRegistro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TrabajoRegistro, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('trabajos_registro')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TrabajoIncidencia, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('trabajos_incidencias')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_incidencias'] });
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
  return useQuery<TrabajoRegistro[]>({
    queryKey: ['planificacion_dia', fecha],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trabajos_registro')
        .select('*')
        .eq('fecha_planificada', fecha)
        .order('created_at', { ascending: true });
      if (error) throw error;
      // Ordenar por prioridad: alta=1, media=2, baja=3
      const orden: Record<string, number> = { alta: 1, media: 2, baja: 3 };
      return ((data ?? []) as TrabajoRegistro[]).sort(
        (a, b) => (orden[a.prioridad ?? 'media'] ?? 2) - (orden[b.prioridad ?? 'media'] ?? 2)
      );
    },
    staleTime: 30000,
    enabled: !!fecha,
  });
}

// ── useAddTrabajoPlanificado ──────────────────────────────────
export function useAddTrabajoPlanificado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TrabajoRegistro, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('trabajos_registro')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
      qc.invalidateQueries({ queryKey: ['planificacion_dia'] });
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
  });
}

// ── usePlanificacionCampana ───────────────────────────────────
export function usePlanificacionCampana() {
  return useQuery<PlanificacionCampana[]>({
    queryKey: ['planificacion_campana'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<PlanificacionCampana, 'id' | 'created_at'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('planificacion_campana')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion_campana'] });
    },
  });
}

// ── useUpdatePlanificacionCampana ─────────────────────────────
export function useUpdatePlanificacionCampana() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PlanificacionCampana> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('planificacion_campana')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion_campana'] });
    },
  });
}

// ── useDeletePlanificacionCampana ─────────────────────────────
export function useDeletePlanificacionCampana() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('planificacion_campana')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion_campana'] });
    },
  });
}

// ── useCierresJornada ─────────────────────────────────────────
export function useCierresJornada() {
  return useQuery<CierreJornada[]>({
    queryKey: ['cierres_jornada'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
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
  });
}

// ── useCerrarJornada ──────────────────────────────────────────
// Lógica completa de cierre:
// 1. Busca parte_diario del día
// 2. Marca ejecutados los trabajos planificados que aparecen en parte_trabajo
// 3. Marca pendientes los que no aparecen
// 4. Crea copias de pendientes para mañana con prioridad=alta
// 5. Crea trabajos desde incidencias urgentes abiertas del día
// 6. Inserta resumen en cierres_jornada
export function useCerrarJornada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fecha: string) => {
      // 1 — Buscar parte_diario del día
      const { data: parteData } = await supabase
        .from('partes_diarios')
        .select('id')
        .eq('fecha', fecha)
        .maybeSingle();
      const parteId = parteData?.id ?? null;

      // 2 — Trabajos planificados para este día
      const { data: planificados } = await supabase
        .from('trabajos_registro')
        .select('*')
        .eq('fecha_planificada', fecha)
        .neq('estado_planificacion', 'cancelado');
      const listaPlanificados = (planificados ?? []) as TrabajoRegistro[];

      // 3 — Trabajos del parte (ejecutados realmente)
      let idsEjecutados = new Set<string>();
      if (parteId) {
        const { data: parteTrabajo } = await supabase
          .from('parte_trabajo')
          .select('tipo_trabajo, finca')
          .eq('parte_id', parteId);
        // Match por tipo_trabajo + finca (aproximación sin FK directa)
        const tiposEnParte = new Set((parteTrabajo ?? []).map(pt => `${pt.tipo_trabajo}|${pt.finca ?? ''}`));
        idsEjecutados = new Set(
          listaPlanificados
            .filter(t => tiposEnParte.has(`${t.tipo_trabajo}|${t.finca ?? ''}`))
            .map(t => t.id)
        );
      }

      const pendientes = listaPlanificados.filter(t => !idsEjecutados.has(t.id));
      const ejecutados = listaPlanificados.filter(t => idsEjecutados.has(t.id));

      // 4 — Marcar ejecutados
      if (ejecutados.length > 0) {
        await supabase
          .from('trabajos_registro')
          .update({ estado_planificacion: 'ejecutado' })
          .in('id', ejecutados.map(t => t.id));
      }

      // 5 — Marcar pendientes
      if (pendientes.length > 0) {
        await supabase
          .from('trabajos_registro')
          .update({ estado_planificacion: 'pendiente' })
          .in('id', pendientes.map(t => t.id));
      }

      // 6 — Calcular fecha mañana
      const mañana = new Date(fecha + 'T12:00:00');
      mañana.setDate(mañana.getDate() + 1);
      const fechaMañana = mañana.toISOString().slice(0, 10);

      // 7 — Crear copias de pendientes para mañana
      let arrastrados = 0;
      if (pendientes.length > 0) {
        const copias = pendientes.map(t => ({
          tipo_bloque:          t.tipo_bloque,
          fecha:                fechaMañana,
          hora_inicio:          null,
          hora_fin:             null,
          finca:                t.finca,
          parcel_id:            t.parcel_id,
          tipo_trabajo:         t.tipo_trabajo,
          num_operarios:        t.num_operarios,
          nombres_operarios:    t.nombres_operarios,
          foto_url:             null,
          notas:                t.notas,
          created_by:           'JuanPe',
          estado_planificacion: 'borrador' as EstadoPlanificacion,
          prioridad:            'alta' as Prioridad,
          fecha_planificada:    fechaMañana,
          fecha_original:       t.fecha_original ?? fecha,
          recursos_personal:    t.recursos_personal,
          tractor_id:           t.tractor_id,
          apero_id:             t.apero_id,
          materiales_previstos: t.materiales_previstos,
        }));
        const { data: insertadas } = await supabase
          .from('trabajos_registro')
          .insert(copias)
          .select();
        arrastrados = insertadas?.length ?? 0;
      }

      // 8 — Incidencias urgentes abiertas del día → crear trabajo para mañana
      const { data: incUrgentes } = await supabase
        .from('trabajos_incidencias')
        .select('*')
        .eq('urgente', true)
        .eq('fecha', fecha)
        .neq('estado', 'resuelta');
      const listaInc = (incUrgentes ?? []) as TrabajoIncidencia[];

      if (listaInc.length > 0) {
        const trabajosInc = listaInc.map(inc => ({
          tipo_bloque:          'mano_obra_interna' as TipoBloque,
          fecha:                fechaMañana,
          hora_inicio:          null,
          hora_fin:             null,
          finca:                inc.finca,
          parcel_id:            inc.parcel_id,
          tipo_trabajo:         `Incidencia: ${inc.titulo}`,
          num_operarios:        null,
          nombres_operarios:    null,
          foto_url:             null,
          notas:                inc.descripcion,
          created_by:           'JuanPe',
          estado_planificacion: 'borrador' as EstadoPlanificacion,
          prioridad:            'alta' as Prioridad,
          fecha_planificada:    fechaMañana,
          fecha_original:       null,
        }));
        await supabase.from('trabajos_registro').insert(trabajosInc);
      }

      // 9 — Insertar cierre
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cierre } = await (supabase as any)
        .from('cierres_jornada')
        .insert([{
          fecha,
          parte_diario_id:     parteId,
          trabajos_ejecutados: ejecutados.length,
          trabajos_pendientes: pendientes.length,
          trabajos_arrastrados: arrastrados,
          cerrado_by:          'JuanPe',
          cerrado_at:          new Date().toISOString(),
        }])
        .select()
        .single();

      return {
        ejecutados:      ejecutados.length,
        arrastrados,
        incidenciasNuevasTrabajo: listaInc.length,
        pendientes:      pendientes.length,
        fechaMañana,
        cierre,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion_dia'] });
      qc.invalidateQueries({ queryKey: ['trabajos_registro'] });
      qc.invalidateQueries({ queryKey: ['cierres_jornada'] });
      qc.invalidateQueries({ queryKey: ['trabajos_incidencias'] });
    },
  });
}