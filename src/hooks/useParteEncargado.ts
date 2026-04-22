import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert } from '@/integrations/supabase/types'
import { useAuth } from '@/context/AuthContext'
import { esRolEncargado, type RolUsuario } from '@/types/roles'

const PILOT_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

type TareaDia = Tables<'parte_enc_tarea_dia'>
type TrabajoRegistroRow = Tables<'trabajos_registro'>

function mapTipoBloqueToTipo(
  tipoBloque: string | null,
): 'cuadrilla' | 'tractor' | 'logistica' | 'riego' | 'otro' {
  switch (tipoBloque) {
    case 'logistica':
      return 'logistica'
    case 'maquinaria_agricola':
      return 'tractor'
    case 'mano_obra_interna':
    case 'mano_obra_externa':
      return 'cuadrilla'
    default:
      return 'otro'
  }
}

function personalAsignadoDesdeTrabajo(row: TrabajoRegistroRow): string[] | null {
  if (row.recursos_personal?.length) return row.recursos_personal
  if (row.nombres_operarios) {
    return row.nombres_operarios
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(Boolean)
  }
  return null
}

function nivelCierreDesdeRol(rol: RolUsuario | null): string {
  switch (rol) {
    case 'encargado_general':
      return 'general'
    case 'encargado_tractores':
      return 'tractores'
    case 'encargado_logistica':
      return 'logistica'
    case 'subencargado':
    case 'subtractorista':
    case 'camionero':
      return 'subcuadrilla'
    case 'admin':
      return 'admin'
    case 'director':
      return 'direccion'
    default:
      return 'general'
  }
}

/** Perfil del encargado logueado (user_profiles). */
export function useEncargadoPerfil() {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: ['encargado_perfil', user?.id],
    enabled: !!user?.id && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, role, rol_encargado, fincas_permitidas, company_id, status')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}

/** Tareas del día: `parte_enc_tarea_dia` o siéntesis desde `trabajos_registro` (solo lectura). */
export function useTareasHoy(fecha: string) {
  const { user, companyId, fincas_permitidas, rol, rol_encargado } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useQuery({
    queryKey: ['parte_enc_tarea_dia', fecha, cid, user?.id, fincas_permitidas],
    queryFn: async (): Promise<TareaDia[]> => {
      if (!user?.id) return []

      const { data: existing, error: e1 } = await supabase
        .from('parte_enc_tarea_dia')
        .select('*')
        .eq('company_id', cid)
        .eq('fecha', fecha)
        .order('orden', { ascending: true })
        .order('created_at', { ascending: true })

      if (e1) throw e1
      if (existing?.length) return existing as TareaDia[]

      const fincas = fincas_permitidas ?? []
      if (!fincas.length || !esRolEncargado(rol ?? '')) {
        return []
      }

      const { data: trabajos, error: e2 } = await supabase
        .from('trabajos_registro')
        .select('*')
        .or(`fecha.eq.${fecha},fecha_planificada.eq.${fecha}`)

      if (e2) throw e2

      const filtrados = (trabajos ?? []).filter(
        (t): t is TrabajoRegistroRow =>
          (!t.company_id || t.company_id === cid) && !!t.finca && fincas.includes(t.finca),
      )

      if (!filtrados.length) return []

      const asignado =
        rol_encargado ?? (esRolEncargado(rol ?? '') ? (rol as string) : 'encargado_general')

      const inserts: TablesInsert<'parte_enc_tarea_dia'>[] = filtrados.map((t, idx) => ({
        company_id: cid,
        fecha,
        finca: t.finca ?? '',
        sector: t.parcel_id ?? null,
        trabajo_registro_id: t.id,
        titulo: t.tipo_trabajo,
        descripcion: t.notas ?? null,
        tipo: mapTipoBloqueToTipo(t.tipo_bloque),
        estado: 'pendiente',
        personal_asignado: personalAsignadoDesdeTrabajo(t),
        maquinaria_id: t.tractor_id ?? null,
        apero_descripcion: null,
        asignado_a_rol: asignado,
        orden: idx,
        created_by: user.id,
      }))

      const { error: e3 } = await supabase.from('parte_enc_tarea_dia').insert(inserts)
      if (e3) throw e3

      const { data: seeded, error: e4 } = await supabase
        .from('parte_enc_tarea_dia')
        .select('*')
        .eq('company_id', cid)
        .eq('fecha', fecha)
        .order('orden', { ascending: true })

      if (e4) throw e4
      return (seeded ?? []) as TareaDia[]
    },
    enabled: !!user?.id && !!fecha,
    staleTime: 15_000,
  })
}

/** Confirmación de lectura de planificación del día. */
export function useConfirmarPlanificacion() {
  const qc = useQueryClient()
  const { user, companyId } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useMutation({
    mutationFn: async (fecha: string) => {
      if (!user?.id) throw new Error('No autenticado')
      const { error } = await supabase.from('parte_enc_plan_confirmacion').insert({
        company_id: cid,
        user_id: user.id,
        fecha,
      })
      if (error) throw error
    },
    onSuccess: (_void, fecha) => {
      toast.success('Planificación confirmada')
      qc.invalidateQueries({ queryKey: ['parte_enc_plan_confirmacion', fecha] })
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'No se pudo confirmar')
    },
  })
}

/** Actualizar estado de tarea (pendiente ↔ en_curso ↔ completada). */
export function useActualizarTarea() {
  const qc = useQueryClient()
  const { companyId } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useMutation({
    mutationFn: async ({
      tareaId,
      nuevoEstado,
      fecha,
    }: {
      tareaId: string
      nuevoEstado: 'pendiente' | 'en_curso' | 'completada' | 'cancelada'
      fecha: string
    }) => {
      const { data: row, error: e0 } = await supabase
        .from('parte_enc_tarea_dia')
        .select('estado')
        .eq('id', tareaId)
        .eq('company_id', cid)
        .single()
      if (e0) throw e0

      const actual = row.estado
      const now = new Date().toISOString()
      let patch: Record<string, unknown> = { estado: nuevoEstado, updated_at: now }

      if (actual === 'pendiente' && nuevoEstado === 'en_curso') {
        patch = { ...patch, hora_inicio: now }
      } else if (actual === 'en_curso' && nuevoEstado === 'completada') {
        patch = { ...patch, hora_fin: now }
      } else if (
        !(
          (actual === 'pendiente' && nuevoEstado === 'en_curso') ||
          (actual === 'en_curso' && nuevoEstado === 'completada') ||
          nuevoEstado === 'cancelada'
        )
      ) {
        throw new Error('Transición de estado no válida')
      }

      const { error } = await supabase.from('parte_enc_tarea_dia').update(patch).eq('id', tareaId)
      if (error) throw error
    },
    onSuccess: (_void, { fecha }) => {
      toast.success('Tarea actualizada')
      qc.invalidateQueries({ queryKey: ['parte_enc_tarea_dia', fecha] })
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar tarea')
    },
  })
}

/** Output al completar tarea. */
export function useRegistrarOutput() {
  const qc = useQueryClient()
  const { companyId } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useMutation({
    mutationFn: async ({
      tareaId,
      output_cantidad,
      output_unidad,
      output_notas,
      fecha,
    }: {
      tareaId: string
      output_cantidad: number | null
      output_unidad: 'kg' | 'piezas' | 'cajas' | 'palots' | null
      output_notas: string | null
      fecha: string
    }) => {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('parte_enc_tarea_dia')
        .update({
          output_cantidad,
          output_unidad,
          output_notas,
          updated_at: now,
        })
        .eq('id', tareaId)
        .eq('company_id', cid)
      if (error) throw error
    },
    onSuccess: (_void, { fecha }) => {
      toast.success('Output registrado')
      qc.invalidateQueries({ queryKey: ['parte_enc_tarea_dia', fecha] })
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Error al registrar output')
    },
  })
}

/** Incidencia + outbox si grave / muy_grave. */
export function useRegistrarIncidencia() {
  const qc = useQueryClient()
  const { user, companyId } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useMutation({
    mutationFn: async (payload: {
      fecha: string
      tarea_id: string | null
      gravedad: 'leve' | 'grave' | 'muy_grave'
      tipo: TablesInsert<'parte_enc_incidencia'>['tipo']
      finca: string | null
      sector: string | null
      descripcion: string
      foto_url?: string | null
      latitud?: number | null
      longitud?: number | null
    }) => {
      if (!user?.id) throw new Error('No autenticado')

      const insert: TablesInsert<'parte_enc_incidencia'> = {
        company_id: cid,
        fecha: payload.fecha,
        tarea_id: payload.tarea_id,
        reportado_por: user.id,
        gravedad: payload.gravedad,
        tipo: payload.tipo,
        finca: payload.finca,
        sector: payload.sector,
        descripcion: payload.descripcion,
        foto_url: payload.foto_url ?? null,
        latitud: payload.latitud ?? null,
        longitud: payload.longitud ?? null,
        alerta_registrada: payload.gravedad === 'grave' || payload.gravedad === 'muy_grave',
        alerta_timestamp:
          payload.gravedad === 'grave' || payload.gravedad === 'muy_grave'
            ? new Date().toISOString()
            : null,
      }

      const { data: inc, error } = await supabase
        .from('parte_enc_incidencia')
        .insert(insert)
        .select('id')
        .single()
      if (error) throw error

      if (payload.gravedad === 'grave' || payload.gravedad === 'muy_grave') {
        const outbox: TablesInsert<'parte_enc_alerta_outbox'> = {
          company_id: cid,
          incidencia_id: inc.id,
          gravedad: payload.gravedad,
          payload: { descripcion: payload.descripcion, finca: payload.finca, sector: payload.sector },
          estado: 'pendiente',
        }
        const { error: e2 } = await supabase.from('parte_enc_alerta_outbox').insert(outbox)
        if (e2) throw e2
      }

      return inc
    },
    onSuccess: (_data, vars) => {
      if (vars.gravedad === 'muy_grave') {
        toast.error('Incidencia MUY GRAVE registrada')
      } else if (vars.gravedad === 'grave') {
        toast('Incidencia grave registrada', { style: { background: '#F59E0B', color: '#fff' } })
      } else {
        toast.success('Incidencia registrada')
      }
      qc.invalidateQueries({ queryKey: ['parte_enc_incidencias', vars.fecha] })
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Error al registrar incidencia')
    },
  })
}

/** Cambio de personal en jornada. */
export function useRegistrarCambioPersonal() {
  const qc = useQueryClient()
  const { user, companyId } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useMutation({
    mutationFn: async (payload: {
      fecha: string
      tarea_origen_id: string | null
      tarea_destino_id: string | null
      numero_empleado: string
      justificacion: string
      decidido_por: string
    }) => {
      if (!user?.id) throw new Error('No autenticado')
      const row: TablesInsert<'parte_enc_cambio_personal'> = {
        company_id: cid,
        fecha: payload.fecha,
        tarea_origen_id: payload.tarea_origen_id,
        tarea_destino_id: payload.tarea_destino_id,
        reportado_por: user.id,
        numero_empleado: payload.numero_empleado,
        justificacion: payload.justificacion,
        decidido_por: payload.decidido_por,
      }
      const { error } = await supabase.from('parte_enc_cambio_personal').insert(row)
      if (error) throw error
    },
    onSuccess: (_void, vars) => {
      toast.success('Cambio de personal registrado')
      qc.invalidateQueries({ queryKey: ['parte_enc_cambios', vars.fecha] })
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Error al registrar cambio')
    },
  })
}

/** Estado de maquinaria al cierre. */
export function useRegistrarMaquinariaCierre() {
  const qc = useQueryClient()
  const { user, companyId } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useMutation({
    mutationFn: async (payload: {
      fecha: string
      maquinaria_id: string | null
      descripcion_maquinaria: string | null
      estado_cierre: 'operativo' | 'incidencia_menor' | 'averia'
      notas: string | null
    }) => {
      if (!user?.id) throw new Error('No autenticado')
      const row: TablesInsert<'parte_enc_maquinaria_cierre'> = {
        company_id: cid,
        fecha: payload.fecha,
        cerrado_por: user.id,
        maquinaria_id: payload.maquinaria_id,
        descripcion_maquinaria: payload.descripcion_maquinaria,
        estado_cierre: payload.estado_cierre,
        notas: payload.notas,
      }
      const { error } = await supabase.from('parte_enc_maquinaria_cierre').insert(row)
      if (error) throw error
    },
    onSuccess: (_void, vars) => {
      toast.success('Estado de maquinaria registrado')
      qc.invalidateQueries({ queryKey: ['parte_enc_maquinaria', vars.fecha] })
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Error al registrar maquinaria')
    },
  })
}

/** Cierre de jornada encargado → escalado. */
export function useCerrarParteEncargado() {
  const qc = useQueryClient()
  const { user, companyId, rol } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useMutation({
    mutationFn: async (fecha: string) => {
      if (!user?.id) throw new Error('No autenticado')

      const { data: tareas, error: e1 } = await supabase
        .from('parte_enc_tarea_dia')
        .select('id, titulo, estado')
        .eq('company_id', cid)
        .eq('fecha', fecha)
      if (e1) throw e1

      if (!tareas?.length) {
        throw new Error('No hay tareas para este día')
      }

      const pendientes = tareas.filter(t => t.estado !== 'completada' && t.estado !== 'cancelada')
      if (pendientes.length) {
        const lista = pendientes.map(t => `• ${t.titulo} (${t.estado})`).join('\n')
        throw new Error(`Tareas sin cerrar:\n${lista}`)
      }

      const nivel = nivelCierreDesdeRol(rol)
      const row: TablesInsert<'parte_enc_cierre_escalado'> = {
        company_id: cid,
        fecha,
        nivel,
        estado: 'pendiente_revision',
        iniciado_por: user.id,
        payload_resumen: {
          tareas: tareas.length,
          fecha,
        },
      }
      const { error: e2 } = await supabase.from('parte_enc_cierre_escalado').insert(row)
      if (e2) throw e2
    },
    onSuccess: (_void, fecha) => {
      toast.success('Jornada cerrada correctamente')
      qc.invalidateQueries({ queryKey: ['parte_enc_tarea_dia', fecha] })
      qc.invalidateQueries({ queryKey: ['parte_enc_cierre', fecha] })
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Error al cerrar'
      if (msg.startsWith('Tareas sin cerrar')) {
        toast.error(msg)
      } else {
        toast.error(msg)
      }
    },
  })
}

/** ¿Ya confirmó planificación hoy? */
export function usePlanConfirmado(fecha: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['parte_enc_plan_confirmacion', fecha, user?.id],
    enabled: !!user?.id && !!fecha,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parte_enc_plan_confirmacion')
        .select('*')
        .eq('fecha', fecha)
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 15_000,
  })
}

/** Incidencias del día (resumen). */
export function useIncidenciasDia(fecha: string) {
  const { companyId } = useAuth()
  const cid = companyId ?? PILOT_COMPANY_ID

  return useQuery({
    queryKey: ['parte_enc_incidencias', fecha],
    enabled: !!fecha,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parte_enc_incidencia')
        .select('id, gravedad, tipo')
        .eq('company_id', cid)
        .eq('fecha', fecha)
      if (error) throw error
      return data ?? []
    },
    staleTime: 15_000,
  })
}
