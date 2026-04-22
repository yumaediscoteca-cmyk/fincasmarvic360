import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

// ── Tipos ─────────────────────────────────────────────────────

export interface Camion {
  id:                       string;
  matricula:                string;
  activo:                   boolean;
  marca:                    string | null;
  modelo:                   string | null;
  anio:                     number | null;
  fecha_itv:                string | null;
  notas_mantenimiento:      string | null;
  foto_url:                 string | null;
  created_by:               string | null;
  kilometros_actuales:      number | null;
  fecha_proxima_itv:        string | null;
  fecha_proxima_revision:   string | null;
  km_proximo_mantenimiento: number | null;
  gps_info:                 string | null;
  capacidad_kg:             number | null;
  empresa_transporte:       string | null;
  tipo:                     string | null;
  codigo_interno:           string | null;
  estado_operativo:         string | null;
}

export interface VehiculoEmpresa {
  id:                    string;
  codigo_interno:        string | null;
  matricula:             string;
  marca:                 string | null;
  modelo:                string | null;
  anio:                  number | null;
  tipo:                  string | null;
  conductor_habitual_id: string | null;
  km_actuales:           number | null;
  estado_operativo:      string | null;
  fecha_proxima_itv:     string | null;
  fecha_proxima_revision:string | null;
  foto_url:              string | null;
  notas:                 string | null;
  gps_info:              string | null;
  created_at:            string;
  created_by:            string | null;
}

export interface Viaje {
  id:                    string;
  conductor_id:          string | null; // legacy — solo lectura histórica
  personal_id:           string | null;
  camion_id:             string | null;
  finca:                 string | null;
  destino:               string | null;
  trabajo_realizado:     string | null;
  ruta:                  string | null;
  hora_salida:           string | null;
  hora_llegada:          string | null;
  gasto_gasolina_litros: number | null;
  gasto_gasolina_euros:  number | null;
  km_recorridos:         number | null;
  notas:                 string | null;
  created_at:            string;
  created_by:            string | null;
}

export interface MantenimientoCamion {
  id:          string;
  camion_id:   string | null;
  tipo:        string;
  descripcion: string | null;
  fecha:       string;
  coste_euros: number | null;
  proveedor:   string | null;
  foto_url:    string | null;
  foto_url_2:  string | null;
  created_at:  string;
  created_by:  string | null;
}

export interface Combustible {
  id:            string;
  vehiculo_tipo: string;
  vehiculo_id:   string;
  conductor_id:  string | null;
  fecha:         string | null;
  litros:        number | null;
  coste_total:   number | null;
  gasolinera:    string | null;
  foto_url:      string | null;
  notas:         string | null;
  created_at:    string;
  created_by:    string | null;
}

export interface LogisticaInventarioSync {
  id:           string;
  tipo:         string;
  vehiculo_id:  string;
  ubicacion_id: string;
  activo:       boolean;
  created_at:   string;
}

export interface TipoTrabajoLogistica {
  id:       string;
  nombre:   string;
  categoria:string;
  activo:   boolean;
}

// ── useCamiones ───────────────────────────────────────────────

export function useCamiones() {
  return useQuery<Camion[]>({
    queryKey: ['camiones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camiones')
        .select('*')
        .order('matricula');
      if (error) throw error;
      return (data ?? []) as Camion[];
    },
    staleTime: 60000,
  });
}

// ── useAddCamion ──────────────────────────────────────────────

export function useAddCamion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Camion, 'id' | 'codigo_interno'> & { ubicacion_id?: string | null }) => {
      const { ubicacion_id, ...camionPayload } = payload;

      // Calcular siguiente código interno CM001, CM002…
      const { data: existentes } = await supabase
        .from('camiones')
        .select('codigo_interno')
        .not('codigo_interno', 'is', null);
      
      const nums = (existentes ?? [])
        .map(c => {
          const match = (c.codigo_interno ?? '').match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(n => !isNaN(n));
      const siguiente = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const codigo_interno = 'CM' + String(siguiente).padStart(3, '0');

      const { data, error } = await supabase
        .from('camiones')
        .insert([{ ...camionPayload, codigo_interno }])
        .select()
        .single();
      if (error) throw error;

      // Sync inventario si se especificó ubicación
      if (ubicacion_id && data) {
        await supabase.from('logistica_inventario_sync').insert({
          tipo:        'camion',
          vehiculo_id: (data as { id: string }).id,
          ubicacion_id,
          activo:      true,
        });
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camiones'] });
      qc.invalidateQueries({ queryKey: ['logistica_inventario_sync'] });
    },
  });
}

// ── useUpdateCamion ───────────────────────────────────────────

export function useUpdateCamion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Camion> & { id: string }) => {
      const { error } = await supabase
        .from('camiones')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['camiones'] }),
  });
}

// ── useDeleteCamion ───────────────────────────────────────────

export function useDeleteCamion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('camiones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camiones'] });
      qc.invalidateQueries({ queryKey: ['logistica_inventario_sync'] });
    },
  });
}

// ── useVehiculosEmpresa ───────────────────────────────────────

export function useVehiculosEmpresa() {
  return useQuery<VehiculoEmpresa[]>({
    queryKey: ['vehiculos_empresa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehiculos_empresa')
        .select('*')
        .order('matricula');
      if (error) throw error;
      return (data ?? []) as VehiculoEmpresa[];
    },
    staleTime: 60000,
  });
}

// ── useAddVehiculoEmpresa ─────────────────────────────────────

export function useAddVehiculoEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<VehiculoEmpresa, 'id' | 'created_at' | 'codigo_interno'> & { ubicacion_id?: string | null }) => {
      const { ubicacion_id, ...vehiculoPayload } = payload;

      const { data: existentes } = await supabase
        .from('vehiculos_empresa')
        .select('codigo_interno')
        .not('codigo_interno', 'is', null);
      
      const nums = (existentes ?? [])
        .map(v => {
          const match = (v.codigo_interno ?? '').match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(n => !isNaN(n));
      const siguiente = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const codigo_interno = 'VH' + String(siguiente).padStart(3, '0');

      const { data, error } = await supabase
        .from('vehiculos_empresa')
        .insert([{ ...vehiculoPayload, codigo_interno }])
        .select()
        .single();
      if (error) throw error;

      if (ubicacion_id && data) {
        await supabase.from('logistica_inventario_sync').insert({
          tipo:        'vehiculo',
          vehiculo_id: (data as { id: string }).id,
          ubicacion_id,
          activo:      true,
        });
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehiculos_empresa'] });
      qc.invalidateQueries({ queryKey: ['logistica_inventario_sync'] });
    },
  });
}

// ── useUpdateVehiculoEmpresa ──────────────────────────────────

export function useUpdateVehiculoEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<VehiculoEmpresa> & { id: string }) => {
      const { error } = await supabase
        .from('vehiculos_empresa')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehiculos_empresa'] }),
  });
}

// ── useDeleteVehiculoEmpresa ──────────────────────────────────

export function useDeleteVehiculoEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehiculos_empresa').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehiculos_empresa'] });
      qc.invalidateQueries({ queryKey: ['logistica_inventario_sync'] });
    },
  });
}

// ── useViajes ─────────────────────────────────────────────────

export function useViajes(personalId?: string) {
  return useQuery<Viaje[]>({
    queryKey: ['logistica_viajes', personalId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('logistica_viajes')
        .select('*')
        .order('hora_salida', { ascending: false });
      if (personalId) q = q.eq('personal_id', personalId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Viaje[];
    },
    staleTime: 30000,
  });
}

// ── useAddViaje ───────────────────────────────────────────────

export function useAddViaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Viaje, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('logistica_viajes')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_viajes'] }),
  });
}

// ── useUpdateViaje ────────────────────────────────────────────

export function useUpdateViaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Viaje> & { id: string }) => {
      const { error } = await supabase
        .from('logistica_viajes')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_viajes'] }),
  });
}

// ── useDeleteViaje ────────────────────────────────────────────

export function useDeleteViaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('logistica_viajes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_viajes'] }),
  });
}

// ── useMantenimientoCamion ────────────────────────────────────

export function useMantenimientoCamion(camionId?: string) {
  return useQuery<MantenimientoCamion[]>({
    queryKey: ['logistica_mantenimiento', camionId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('logistica_mantenimiento')
        .select('*')
        .order('fecha', { ascending: false });
      if (camionId) q = q.eq('camion_id', camionId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MantenimientoCamion[];
    },
    staleTime: 60000,
  });
}

// ── useAddMantenimientoCamion ─────────────────────────────────

export function useAddMantenimientoCamion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<MantenimientoCamion, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('logistica_mantenimiento')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_mantenimiento'] }),
  });
}

// ── useUpdateMantenimientoCamion ──────────────────────────────

export function useUpdateMantenimientoCamion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<MantenimientoCamion> & { id: string }) => {
      const { error } = await supabase
        .from('logistica_mantenimiento')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_mantenimiento'] }),
  });
}

// ── useDeleteMantenimiento ────────────────────────────────────

export function useDeleteMantenimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('logistica_mantenimiento').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_mantenimiento'] }),
  });
}

// ── useCombustible ────────────────────────────────────────────

export function useCombustible(vehiculoId?: string, vehiculoTipo?: string) {
  return useQuery<Combustible[]>({
    queryKey: ['logistica_combustible', vehiculoId ?? 'all', vehiculoTipo ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('logistica_combustible')
        .select('*')
        .order('fecha', { ascending: false });
      if (vehiculoId)   q = q.eq('vehiculo_id', vehiculoId);
      if (vehiculoTipo) q = q.eq('vehiculo_tipo', vehiculoTipo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Combustible[];
    },
    staleTime: 30000,
  });
}

// ── useAddCombustible ─────────────────────────────────────────

export function useAddCombustible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Combustible, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('logistica_combustible')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_combustible'] }),
  });
}

// ── useUpdateCombustible ──────────────────────────────────────

export function useUpdateCombustible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Combustible> & { id: string }) => {
      const { error } = await supabase
        .from('logistica_combustible')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_combustible'] }),
  });
}

// ── useDeleteCombustible ──────────────────────────────────────

export function useDeleteCombustible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('logistica_combustible').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_combustible'] }),
  });
}

// ── useLogisticaInventarioSync ────────────────────────────────

export function useLogisticaInventarioSync() {
  return useQuery<LogisticaInventarioSync[]>({
    queryKey: ['logistica_inventario_sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistica_inventario_sync')
        .select('*')
        .eq('activo', true);
      if (error) throw error;
      return (data ?? []) as LogisticaInventarioSync[];
    },
    staleTime: 60000,
  });
}

export function useAddLogisticaSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<LogisticaInventarioSync, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('logistica_inventario_sync')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistica_inventario_sync'] }),
  });
}

// ── useTiposTrabajoLogistica ──────────────────────────────────

export function useTiposTrabajoLogistica() {
  return useQuery<TipoTrabajoLogistica[]>({
    queryKey: ['catalogo_tipos_trabajo', 'logistica'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_tipos_trabajo')
        .select('id, nombre, categoria, activo')
        .eq('categoria', 'logistica')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return (data ?? []) as TipoTrabajoLogistica[];
    },
    staleTime: 60000,
  });
}

export function useAddTipoTrabajoLogistica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { data, error } = await supabase
        .from('catalogo_tipos_trabajo')
        .insert({ nombre, categoria: 'logistica', activo: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogo_tipos_trabajo', 'logistica'] }),
  });
}

// ── useTiposMantenimientoLogistica ────────────────────────────

export function useTiposMantenimientoLogistica() {
  return useQuery<{ id: string; nombre: string }[]>({
    queryKey: ['catalogo_tipos_mantenimiento', 'logistica'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_tipos_mantenimiento')
        .select('id, nombre')
        .eq('modulo', 'logistica')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return (data ?? []) as { id: string; nombre: string }[];
    },
    staleTime: 60000,
  });
}

// ── useKPIsLogistica ──────────────────────────────────────────

export function useKPIsLogistica() {
  return useQuery({
    queryKey: ['logistica_kpis'],
    queryFn: async () => {
      const [camiones, vehiculos, conductores, viajes] = await Promise.all([
        supabase.from('camiones').select('activo'),
        supabase.from('vehiculos_empresa').select('estado_operativo'),
        supabase.from('personal').select('id').eq('categoria', 'conductor_camion').eq('activo', true),
        supabase.from('logistica_viajes').select('id', { count: 'exact', head: true }),
      ]);
      const totalCamiones    = (camiones.data ?? []).length;
      const camionesActivos  = (camiones.data ?? []).filter(c => c.activo).length;
      const totalVehiculos   = (vehiculos.data ?? []).length;
      const totalConductores = (conductores.data ?? []).length;
      const totalViajes      = viajes.count ?? 0;
      return { totalCamiones, camionesActivos, totalVehiculos, totalConductores, totalViajes };
    },
    staleTime: 30000,
  });
}