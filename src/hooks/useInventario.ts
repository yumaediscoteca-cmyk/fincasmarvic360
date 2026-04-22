import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { TablesInsert } from '@/integrations/supabase/types'

/*
================================================
UBICACIONES
================================================
*/

export function useUbicaciones() {
  return useQuery({
    queryKey: ['inventario_ubicaciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_ubicaciones')
        .select('*')
        .eq('activa', true)
        .order('orden')
      if (error) throw error
      return data ?? []
    },
    staleTime: 60000
  })
}

/*
================================================
CATEGORÍAS
================================================
*/

export function useCategorias() {
  return useQuery({
    queryKey: ['inventario_categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_categorias')
        .select('*')
        .order('orden')
      if (error) throw error
      return data ?? []
    },
    staleTime: 60000
  })
}

/*
================================================
REGISTROS — todos los de una ubicación + categoría
================================================
*/

export function useRegistros(ubicacionId: string | null, categoriaId: string | null) {
  return useQuery({
    queryKey: ['inventario_registros', ubicacionId, categoriaId],
    queryFn: async () => {
      if (!ubicacionId || !categoriaId) return []
      const { data, error } = await supabase
        .from('inventario_registros')
        .select('*')
        .eq('ubicacion_id', ubicacionId)
        .eq('categoria_id', categoriaId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!ubicacionId && !!categoriaId,
    staleTime: 30000
  })
}

/*
================================================
ÚLTIMO REGISTRO — estado actual de una ubicación + categoría
================================================
*/

export function useUltimoRegistro(ubicacionId: string | null, categoriaId: string | null) {
  return useQuery({
    queryKey: ['inventario_ultimo_registro', ubicacionId, categoriaId],
    queryFn: async () => {
      if (!ubicacionId || !categoriaId) return null
      const { data, error } = await supabase
        .from('inventario_registros')
        .select('*')
        .eq('ubicacion_id', ubicacionId)
        .eq('categoria_id', categoriaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data ?? null
    },
    enabled: !!ubicacionId && !!categoriaId,
    staleTime: 30000
  })
}

/*
================================================
RESUMEN POR UBICACIÓN — último registro de cada categoría
================================================
*/

export function useResumenUbicacion(ubicacionId: string | null) {
  return useQuery({
    queryKey: ['inventario_resumen_ubicacion', ubicacionId],
    queryFn: async () => {
      if (!ubicacionId) return []
      const { data, error } = await supabase
        .from('inventario_registros')
        .select('*, inventario_categorias(nombre, slug, icono, orden)')
        .eq('ubicacion_id', ubicacionId)
        .order('created_at', { ascending: false })
      if (error) throw error

      // Conservar solo el registro más reciente por categoría
      const porCategoria = new Map<string, typeof data[number]>()
      for (const row of data ?? []) {
        if (!porCategoria.has(row.categoria_id)) {
          porCategoria.set(row.categoria_id, row)
        }
      }
      return Array.from(porCategoria.values())
    },
    enabled: !!ubicacionId,
    staleTime: 30000
  })
}

/*
================================================
AÑADIR REGISTRO
================================================
*/

export function useAddRegistro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: TablesInsert<'inventario_registros'>) => {
      const { data, error } = await supabase
        .from('inventario_registros')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['inventario_registros',      vars.ubicacion_id, vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_ultimo_registro', vars.ubicacion_id, vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_resumen_ubicacion', vars.ubicacion_id] })
      qc.invalidateQueries({ queryKey: ['inventario_total_registros'] })
      qc.invalidateQueries({ queryKey: ['inventario_conteos_ubicaciones'] })
    }
  })
}

/*
================================================
INFORMES — insertar snapshot manual
================================================
*/

export function useAddInforme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: TablesInsert<'inventario_informes'>) => {
      const { data, error } = await supabase
        .from('inventario_informes')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario_informes'] })
    }
  })
}

/*
================================================
TOTAL REGISTROS — conteo global
================================================
*/

export function useTotalRegistros() {
  return useQuery({
    queryKey: ['inventario_total_registros'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('inventario_registros')
        .select('*', { count: 'exact', head: true })
      if (error) throw error
      return count ?? 0
    },
    staleTime: 30000
  })
}

/*
================================================
CONTEOS POR UBICACIÓN — Map<ubicacion_id, count>
================================================
*/

export function useConteosUbicaciones() {
  return useQuery({
    queryKey: ['inventario_conteos_ubicaciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_registros')
        .select('ubicacion_id')
      if (error) throw error
      const map = new Map<string, number>()
      for (const r of data ?? []) {
        map.set(r.ubicacion_id, (map.get(r.ubicacion_id) ?? 0) + 1)
      }
      return map
    },
    staleTime: 30000
  })
}

/*
================================================
INFORMES — listar por rango de fechas y ubicación
================================================
*/

/*
================================================
CATÁLOGO DE PRODUCTOS
================================================
*/

export function useProductosCatalogo(categoriaId: string | null) {
  return useQuery({
    queryKey: ['inventario_productos_catalogo', categoriaId],
    queryFn: async () => {
      if (!categoriaId) return []
      const { data, error } = await supabase
        .from('inventario_productos_catalogo')
        .select('*')
        .eq('categoria_id', categoriaId)
        .eq('activo', true)
        .order('nombre')
      if (error) throw error
      return data ?? []
    },
    enabled: !!categoriaId,
    staleTime: 60000,
  })
}

export function useAddProductoCatalogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: TablesInsert<'inventario_productos_catalogo'>) => {
      const { data, error } = await supabase
        .from('inventario_productos_catalogo')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['inventario_productos_catalogo', vars.categoria_id] })
    },
  })
}

export function useUpdatePrecioProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, precio_unitario }: { id: string; precio_unitario: number }) => {
      const { data, error } = await supabase
        .from('inventario_productos_catalogo')
        .update({ precio_unitario })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario_productos_catalogo'] })
    },
  })
}

/*
================================================
MOVIMIENTOS ENTRE UBICACIONES
================================================
*/

export function useMovimientos(ubicacionId: string | null, categoriaId: string | null) {
  return useQuery({
    queryKey: ['inventario_movimientos', ubicacionId, categoriaId],
    queryFn: async () => {
      if (!ubicacionId || !categoriaId) return []
      const { data, error } = await supabase
        .from('inventario_movimientos')
        .select('*')
        .eq('categoria_id', categoriaId)
        .or(`ubicacion_origen_id.eq.${ubicacionId},ubicacion_destino_id.eq.${ubicacionId}`)
        .order('fecha', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!ubicacionId && !!categoriaId,
    staleTime: 30000,
  })
}

export function useAddMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: TablesInsert<'inventario_movimientos'>) => {
      const { data, error } = await supabase
        .from('inventario_movimientos')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['inventario_movimientos',     vars.ubicacion_origen_id,  vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_movimientos',     vars.ubicacion_destino_id, vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_registros',       vars.ubicacion_origen_id,  vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_registros',       vars.ubicacion_destino_id, vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_ultimo_registro',  vars.ubicacion_origen_id,  vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_ultimo_registro',  vars.ubicacion_destino_id, vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_resumen_ubicacion', vars.ubicacion_origen_id]  })
      qc.invalidateQueries({ queryKey: ['inventario_resumen_ubicacion', vars.ubicacion_destino_id] })
    },
  })
}

export function useInformes(ubicacionId?: string | null, desde?: string, hasta?: string) {
  return useQuery({
    queryKey: ['inventario_informes', ubicacionId, desde, hasta],
    queryFn: async () => {
      let query = supabase
        .from('inventario_informes')
        .select('*')
        .order('generado_at', { ascending: false })

      if (ubicacionId) query = query.eq('ubicacion_id', ubicacionId)
      if (desde)       query = query.gte('fecha_inicio', desde)
      if (hasta)       query = query.lte('fecha_fin', hasta)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: true,
    staleTime: 60000
  })
}

/*
================================================
MAQUINARIA EN UBICACIÓN — puente inventario_ubicacion_activo + vista
================================================
*/

export function useActivosEnUbicacionVista(ubicacionId: string | null) {
  return useQuery({
    queryKey: ['v_inventario_activos_en_ubicacion', ubicacionId],
    queryFn: async () => {
      if (!ubicacionId) return []
      const { data, error } = await supabase
        .from('v_inventario_activos_en_ubicacion')
        .select('*')
        .eq('ubicacion_id', ubicacionId)
        .order('tipo_activo')
        .order('etiqueta')
      if (error) throw error
      return data ?? []
    },
    enabled: !!ubicacionId,
    staleTime: 30000,
  })
}

/** Todas las asignaciones (para saber qué tractores/aperos están libres). */
export function useInventarioUbicacionActivosAll() {
  return useQuery({
    queryKey: ['inventario_ubicacion_activo', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_ubicacion_activo')
        .select('id, ubicacion_id, maquinaria_tractor_id, apero_id, maquinaria_apero_id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 30000,
  })
}

type FilaMapero = {
  id: string
  maquinaria_apero_id: string | null
  maquinaria_aperos: {
    tipo: string
    descripcion: string | null
    tractor_id: string | null
  } | null
}

/** Asignaciones en esta ubicación de aperos del módulo Maquinaria (maquinaria_aperos). */
export function useMaquinariaAperosAsignadosUbicacion(ubicacionId: string | null) {
  return useQuery({
    queryKey: ['inventario_uact_maquinaria_apero', ubicacionId],
    queryFn: async () => {
      if (!ubicacionId) return [] as FilaMapero[]
      const { data, error } = await supabase
        .from('inventario_ubicacion_activo')
        .select('id, maquinaria_apero_id, maquinaria_aperos(tipo, descripcion, tractor_id)')
        .eq('ubicacion_id', ubicacionId)
        .not('maquinaria_apero_id', 'is', null)
      if (error) throw error
      return (data ?? []) as FilaMapero[]
    },
    enabled: !!ubicacionId,
    staleTime: 30000,
  })
}

/** Tabla legacy `aperos` (vinculada al puente de inventario; distinta de maquinaria_aperos). */
export function useAperosTablaInventario() {
  return useQuery({
    queryKey: ['aperos', 'inventario_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aperos')
        .select('id, codigo, denominacion, marca, estado')
        .order('denominacion')
      if (error) throw error
      return data ?? []
    },
    staleTime: 60000,
  })
}

export function useAssignActivoUbicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: TablesInsert<'inventario_ubicacion_activo'>) => {
      const { data, error } = await supabase
        .from('inventario_ubicacion_activo')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['v_inventario_activos_en_ubicacion', vars.ubicacion_id] })
      qc.invalidateQueries({ queryKey: ['inventario_ubicacion_activo', 'all'] })
      qc.invalidateQueries({ queryKey: ['v_tractores_en_inventario'] })
      qc.invalidateQueries({ queryKey: ['v_maquinaria_aperos_en_inventario'] })
      qc.invalidateQueries({ queryKey: ['inventario_uact_maquinaria_apero', vars.ubicacion_id] })
    },
  })
}

export function useRemoveActivoUbicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ubicacion_id }: { id: string; ubicacion_id: string }) => {
      const { error } = await supabase
        .from('inventario_ubicacion_activo')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['v_inventario_activos_en_ubicacion', vars.ubicacion_id] })
      qc.invalidateQueries({ queryKey: ['inventario_ubicacion_activo', 'all'] })
      qc.invalidateQueries({ queryKey: ['v_tractores_en_inventario'] })
      qc.invalidateQueries({ queryKey: ['v_maquinaria_aperos_en_inventario'] })
      qc.invalidateQueries({ queryKey: ['inventario_uact_maquinaria_apero', vars.ubicacion_id] })
    },
  })
}

/*
================================================
PROVEEDORES
================================================
*/

export function useProveedores(tipo?: string | null) {
  return useQuery({
    queryKey: ['proveedores', tipo ?? null],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('proveedores')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      if (tipo) q = q.eq('tipo', tipo)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as import('@/integrations/supabase/types').Tables<'proveedores'>[]
    },
    staleTime: 60000,
  })
}

export function useAddProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: import('@/integrations/supabase/types').TablesInsert<'proveedores'>) => {
      // Generar código interno PR + correlativo 3 dígitos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('proveedores')
        .select('codigo_interno')
        .like('codigo_interno', 'PR%')
        .order('codigo_interno', { ascending: false })
        .limit(1)
      const last = existing?.[0]?.codigo_interno ?? 'PR000'
      const num = parseInt(last.replace('PR', ''), 10)
      const codigo_interno = 'PR' + String(num + 1).padStart(3, '0')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('proveedores')
        .insert({ ...record, codigo_interno })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}

export function useUpdateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<import('@/integrations/supabase/types').Tables<'proveedores'>> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('proveedores')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}

export function useDeleteProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('proveedores').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}

/*
================================================
PRECIOS DE PROVEEDOR
================================================
*/

export function usePreciosProveedor(proveedorId: string | null) {
  return useQuery({
    queryKey: ['proveedores_precios', proveedorId],
    queryFn: async () => {
      if (!proveedorId) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('proveedores_precios')
        .select('*')
        .eq('proveedor_id', proveedorId)
        .eq('activo', true)
        .order('producto')
      if (error) throw error
      return (data ?? []) as import('@/integrations/supabase/types').Tables<'proveedores_precios'>[]
    },
    enabled: !!proveedorId,
    staleTime: 60000,
  })
}

export function useAddPrecioProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: import('@/integrations/supabase/types').TablesInsert<'proveedores_precios'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('proveedores_precios')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['proveedores_precios', vars.proveedor_id] })
    },
  })
}

export function useUpdatePrecioProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, proveedor_id, ...patch }: Partial<import('@/integrations/supabase/types').Tables<'proveedores_precios'>> & { id: string; proveedor_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('proveedores_precios')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { data, proveedor_id }
    },
    onSuccess: ({ proveedor_id }) => {
      qc.invalidateQueries({ queryKey: ['proveedores_precios', proveedor_id] })
    },
  })
}

/*
================================================
ENTRADAS DE STOCK
================================================
*/

type EntradaConRel = import('@/integrations/supabase/types').Tables<'inventario_entradas'> & {
  proveedor_nombre?: string | null
  producto_nombre?: string | null
}

export function useEntradas(ubicacionId?: string | null, desde?: string, hasta?: string) {
  return useQuery({
    queryKey: ['inventario_entradas', ubicacionId ?? null, desde ?? null, hasta ?? null],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('inventario_entradas')
        .select(`
          *,
          proveedores(nombre),
          inventario_productos_catalogo(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (ubicacionId) q = q.eq('ubicacion_id', ubicacionId)
      if (desde)       q = q.gte('fecha', desde)
      if (hasta)       q = q.lte('fecha', hasta)
      const { data, error } = await q
      if (error) throw error
      return ((data ?? []) as (import('@/integrations/supabase/types').Tables<'inventario_entradas'> & {
        proveedores: { nombre: string } | null
        inventario_productos_catalogo: { nombre: string } | null
      })[]).map(r => ({
        ...r,
        proveedor_nombre: r.proveedores?.nombre ?? null,
        producto_nombre: r.inventario_productos_catalogo?.nombre ?? null,
      })) as EntradaConRel[]
    },
    staleTime: 30000,
  })
}

export function useAddEntrada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: import('@/integrations/supabase/types').TablesInsert<'inventario_entradas'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('inventario_entradas')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      // Crear registro en inventario_registros automáticamente
      if (data) {
        await supabase.from('inventario_registros').insert({
          ubicacion_id: record.ubicacion_id,
          categoria_id: record.categoria_id,
          producto_id: record.producto_id ?? null,
          cantidad: record.cantidad,
          unidad: record.unidad,
          precio_unitario: record.precio_unitario ?? null,
          created_by: record.receptor ?? record.created_by ?? null,
        })
      }
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['inventario_entradas'] })
      qc.invalidateQueries({ queryKey: ['inventario_registros',       vars.ubicacion_id, vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_ultimo_registro',  vars.ubicacion_id, vars.categoria_id] })
      qc.invalidateQueries({ queryKey: ['inventario_resumen_ubicacion', vars.ubicacion_id] })
      qc.invalidateQueries({ queryKey: ['inventario_total_registros'] })
      qc.invalidateQueries({ queryKey: ['inventario_conteos_ubicaciones'] })
    },
  })
}

export function useDeleteEntrada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('inventario_entradas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario_entradas'] })
    },
  })
}

/** Alias semántico de useUltimoRegistro — stock actual de una ubicación+categoría. */
export { useUltimoRegistro as useStockActual }